import express from "express";
import { v4 as uuid } from "uuid";
import { db, run, get, all, migrate } from "./db.js";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import OpenAI from "openai";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
// Web Scraper Dependencies
import axios from "axios";
import * as cheerio from "cheerio";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// uploads config
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

app.use("/uploads", express.static("uploads"));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// utils
const assert = (cond, msg, code = 400) => {
  if (!cond) {
    const e = new Error(msg);
    e.status = code;
    throw e;
  }
};

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }
  const token = authHeader.split(" ")[1];
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

const requireTrusted = (req, res, next) => {
  if (req.user.role !== "Trusted" && req.user.role !== "Admin") {
    return res.status(403).json({ error: "Forbidden: Only Trusted sellers can post products." });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== "Admin") {
    return res.status(403).json({ error: "Forbidden: Admin access required." });
  }
  next();
};

// enum values
const Roles = Object.freeze({ Trusted: "Trusted", Untrusted: "Untrusted" });
const Countries = Object.freeze(["RO", "DE", "FR", "UK"]);
const Cities = Object.freeze({
  RO: ["București", "Cluj-Napoca", "Iași", "Timișoara"],
  DE: ["Berlin", "Munich", "Hamburg"],
  FR: ["Paris", "Lyon"],
  UK: ["London", "Manchester"],
});

async function seed() {
  // --- Demo Users ---
  const demoUsers = [
    { name: "a", email: "a@yahoo.com", password: "a", role: "Trusted", country: "RO", city: "București", karma: 50 },
    { name: "b", email: "b@gmail.com", password: "b", role: "Untrusted", country: "RO", city: "Cluj-Napoca", karma: 10 },
    { name: "c", email: "c@gmail.com", password: "c", role: "Untrusted", country: "RO", city: "Cluj-Napoca", karma: 60 },
    { name: "d", email: "d@gmail.com", password: "d", role: "Untrusted", country: "RO", city: "Cluj-Napoca", karma: 110 },
    { name: "admin", email: "admin@edgeup.com", password: "admin", role: "Admin", country: "RO", city: "București", karma: 1000 },
  ];

  for (const u of demoUsers) {
    const exists = await get(`SELECT 1 as ok FROM users WHERE email = ?`, [u.email]);
    if (!exists) {
      const id = uuid();
      const hashed = await bcrypt.hash(u.password, 10);
      await run(
        `INSERT INTO users (id, name, email, password, role, country, city, karma)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, u.name, u.email, hashed, u.role, u.country, u.city, u.karma]
      );
      console.log(`[seed] created user ${u.email} (${u.role})`);
    }
  }

  const sellers = await all(
    `SELECT id, email, role FROM users WHERE email IN (?, ?)`,
    ["a@yahoo.com", "b@gmail.com"]
  );
  const byEmail = Object.fromEntries(sellers.map((s) => [s.email, s]));

  // --- Demo Products ---
  const demoProducts = [
    {
      title: "Carte JS pentru Începători",
      description: "Bazele JavaScript, capitole scurte.",
      price: 120,
      sellerEmail: "a@yahoo.com",
      category: "Books",
      imageUrl: "/uploads/js-book.jpg"
    },
    {
      title: "Mouse Office",
      description: "Mouse optic simplu, USB.",
      price: 60,
      sellerEmail: "a@yahoo.com",
      category: "Electronics",
      imageUrl: "/uploads/office-mouse.jpg"
    },
    {
      title: "Pernă decorativă",
      description: "Pernă 40x40, umplutură sintetică.",
      price: 45,
      sellerEmail: "a@yahoo.com",
      category: "Home",
      imageUrl: "/uploads/decorative-pillow.png"
    },
  ];

  for (const p of demoProducts) {
    const seller = byEmail[p.sellerEmail];
    if (!seller) {
      console.warn(`[seed] nu găsesc seller pentru ${p.title} (${p.sellerEmail})`);
      continue;
    }
    if (seller.role !== "Trusted") {
      console.warn(`[seed] seller ${p.sellerEmail} nu este Trusted, sar produsul ${p.title}`);
      continue;
    }

    const exists = await get(
      `SELECT 1 as ok FROM products WHERE title = ? AND seller = ?`,
      [p.title, seller.id]
    );
    if (exists) {
      console.log(`[seed] product '${p.title}' deja există pentru seller ${p.sellerEmail}`);
      continue;
    }

    const pid = uuid();
    await run(
      `INSERT INTO products (id, title, description, price, seller, category, imageUrl)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [pid, p.title, p.description ?? "", p.price, seller.id, p.category, p.imageUrl ?? null]
    );
    console.log(`[seed] created product '${p.title}' pentru seller ${p.sellerEmail}`);
  }

  // --- Demo Notifications ---
  const demoNotifications = [
    {
      userEmail: "a@yahoo.com",
      message: "Ai primit un review nou de 4 stele pentru 'Mouse Office'!",
      type: "review",
      is_read: 0
    },
    {
      userEmail:"b@gmail.com",
      message: "Comanda ta (#1002) pentru 'Carte JS pentru Începători' a fost expediată.",
      type: "order",
      is_read: 0
    },
    {
      userEmail:"a@yahoo.com",
      message: "Comanda nouă (#1001) plasată de b@gmail.com pentru 'Pernă decorativă'.",
      type: "order",
      is_read: 1
    }];

    for (const n of demoNotifications){
      const user = byEmail[n.userEmail];
      if(!user || !user.id){
        console.warn(`[seed] nu găsesc user pentru notificare: ${n.userEmail}`);
        continue;
      }

      const exists = await get(
        `SELECT 1 AS ok FROM notifications WHERE id_user = ? AND message = ?`,
        [user.id,n.message]
      );
      if(exists){
        console.log(`[seed] notificare deja există pentru ${n.userEmail}`);
        continue;
      }

      const nid = uuid();
      await run(
      `INSERT INTO notifications (id, id_user, message, notification_type, is_read, created_at) 
      VALUES (?, ?, ?, ?, ?, datetime('now'))`, 
      [nid, user.id, n.message, n.type, n.is_read]
      );
      console.log(`[seed] created notification for ${n.userEmail}`);
    }

  // --- Demo Reviews ---
  const products = await all(`SELECT id, title FROM products`);
  const byTitle = Object.fromEntries(products.map((p) => [p.title, p.id]));
  const demoReviews = [
    {
      productTitle: "Carte JS pentru Începători",
      userEmail: "b@gmail.com",
      rating: 5,
      comment: "Excelentă pentru începători, explică clar conceptele!",
    },
    {
      productTitle: "Carte JS pentru Începători",
      userEmail: "a@yahoo.com",
      rating: 4,
      comment: "Utilă, dar putea avea mai multe exemple practice.",
    },
    {
      productTitle: "Mouse Office",
      userEmail: "b@gmail.com",
      rating: 4,
      comment: "Funcționează bine, raport calitate-preț corect.",
    },
    {
      productTitle: "Pernă decorativă",
      userEmail: "b@gmail.com",
      rating: 5,
      comment: "Foarte moale și arată exact ca în poze.",
    },
  ];

  for (const r of demoReviews) {
    const produsId = byTitle[r.productTitle];
    const user = byEmail[r.userEmail];
    if (!produsId || !user) {
      console.warn(`[seed] nu pot crea review pt '${r.productTitle}' / ${r.userEmail}`);
      continue;
    }

    const exists = await get(
      `SELECT 1 AS ok FROM reviews WHERE produs = ? AND user = ?`,
      [produsId, user.id]
    );
    if (exists) {
      console.log(`[seed] review deja există pentru ${r.userEmail} -> ${r.productTitle}`);
      continue;
    }

    const rid = uuid();
    await run(
      `INSERT INTO reviews (id, produs, user, rating, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [rid, produsId, user.id, r.rating, r.comment]
    );
    console.log(
      `[seed] created review '${r.comment.slice(0, 30)}...' pentru ${r.productTitle}`
    );
  }

  // --- Demo Orders ---
  const demoOrders = [
    { buyerEmail: "b@gmail.com", price: 120, status: "pending" },
    { buyerEmail: "b@gmail.com", price: 60, status: "paid" },
    { buyerEmail: "a@yahoo.com", price: 45, status: "shipped" },
  ];

  for (const o of demoOrders) {
    const buyer = byEmail[o.buyerEmail];
    if (!buyer) {
      console.warn(`[seed] nu pot crea order pentru ${o.buyerEmail}`);
      continue;
    }

    const exists = await get(
      `SELECT 1 AS ok FROM orders WHERE buyer = ? AND price = ? AND status = ?`,
      [buyer.id, o.price, o.status]
    );
    if (exists) {
      console.log(
        `[seed] order deja există pentru ${o.buyerEmail} cu status ${o.status}`
      );
      continue;
    }

    const oid = uuid();
    await run(
      `INSERT INTO orders (id, buyer, price, status) VALUES (?, ?, ?, ?)`,
      [oid, buyer.id, o.price, o.status]
    );
    console.log(`[seed] created order for ${o.buyerEmail} (${o.status})`);
  } 
}

const getResponseGPT = async (system, text, expectJson = false) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      { role: "user", content: text },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content?.trim() ?? "";

  if (expectJson) {
    try {
      return JSON.parse(raw);
    } catch {
      return { links: [] };
    }
  }
  return { message: raw };
};

app.get("/users", async (_req, res, next) => {
  try {
    const rows = await all("SELECT id, name, email, role, country, city FROM users ORDER BY name");
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

app.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    assert(email && password, "email & password missing");
    const user = await get(`SELECT * FROM users WHERE email = ?`, [email]);
    if (!user) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "1h" }
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        country: user.country,
        city: user.city,
        karma: user.karma
      },
    });
  } catch (e) {
    next(e);
  }
});

app.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, role = Roles.Untrusted, country, city } = req.body;

    assert(name && email && password, "name, email, password sunt obligatorii");
    assert(Object.values(Roles).includes(role), "invalid role");
    assert(Countries.includes(country), "invalid country");
    assert(Cities[country]?.includes(city), "invalid city for country");

    const exists = await get(`SELECT 1 AS ok FROM users WHERE email = ?`, [email]);
    assert(!exists, "email deja folosit", 409);

    const hashed = await bcrypt.hash(password, 10);

    const id = uuid();
    await run(
      `INSERT INTO users (id, name, email, password, role, country, city)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name, email, hashed, role, country, city]
    );

    const token = jwt.sign(
      { sub: id, role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "1h" }
    );

    return res.status(201).json({
      token,
      user: { id, name, email, role, country, city },
    });
  } catch (e) {
    next(e);
  }
});

app.get("/me", async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1];

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const user = await get(`SELECT id, name, email, role, country, city FROM users WHERE id = ?`, [
      payload.sub,
    ]);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (e) {
    next(e);
  }
});


app.get("/products", async (req, res, next) => {
    try {
        const { category, search } = req.query;

        let sql = `
            SELECT p.id,
                   p.title,
                   p.description,
                   p.price,
                   p.category,
                   p.imageUrl,
                   u.id    AS seller_id,
                   u.name  AS seller_name,
                   u.email AS seller_email,
                   u.role  AS seller_role,
                   u.country  AS seller_country,
                   u.city  AS seller_city
            FROM products p
                     INNER JOIN users u ON p.seller = u.id
        `;

        const conditions = [];
        const params = [];

        if (category) {
            conditions.push("LOWER(p.category) = LOWER(?)");
            params.push(category);
        }

        if (search) {
            conditions.push(
                "(LOWER(p.title) LIKE LOWER(?) OR LOWER(p.description) LIKE LOWER(?))"
            );
            params.push(`%${search}%`, `%${search}%`);
        }

        if (conditions.length > 0) {
            sql += " WHERE " + conditions.join(" AND ");
        }

        sql += " ORDER BY p.title";

        const rows = await all(sql, params);

        res.json(rows);
    } catch (e) {
        next(e);
    }
});


app.get("/categories", async (_req, res, next) => {
    try {
        const rows = await all(`
            SELECT DISTINCT p.category
            FROM products p
            WHERE p.category IS NOT NULL AND p.category <> ''
            ORDER BY p.category COLLATE NOCASE
        `);

        const categories = rows.map((r) => r.category);

        res.json(categories);
    } catch (e) {
        next(e);
    }
});


// Get single product by ID
app.get("/product/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await get(
      `
        SELECT 
          p.id,
          p.title,
          p.description,
          p.price,
          p.category,
          p.imageUrl,
          u.id AS seller_id,
          u.name AS seller_name,
          u.email AS seller_email,
          u.role AS seller_role,
          u.country AS seller_country,
          u.city AS seller_city
        FROM products p
        INNER JOIN users u ON p.seller = u.id
        WHERE p.id = ?
      `,
      [id]
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (e) {
    console.error("Error fetching product:", e);
    next(e);
  }
});

app.get("/reviews", async (_req, res, next) => {
  try {
    const rows = await all("SELECT * FROM reviews");
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// Get reviews for a specific product (by product ID)
app.get("/product/:id/reviews", async (req, res, next) => {
  try {
    const { id } = req.params;

    // First verify the product exists
    const product = await get(`SELECT id, title FROM products WHERE id = ?`, [id]);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Fetch reviews linked to this product ID
    const reviews = await all(
      `
        SELECT 
          r.id,
          r.rating,
          r.comment,
          u.id AS user_id,
          u.name AS user_name,
          u.email AS user_email
        FROM reviews r
        INNER JOIN users u ON r.user = u.id
        WHERE r.produs = ?
        ORDER BY r.rating DESC
      `,
      [id]
    );

    res.json({
      product: {
        id: product.id,
        title: product.title,
      },
      reviews,
    });
  } catch (e) {
    console.error("Error fetching product reviews:", e);
    next(e);
  }
});

app.get("/orders", async (_req, res, next) => {
  try {
    const rows = await all("SELECT * FROM orders");
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// returneaza intreaga conversatie dupa id-ul unui user (buyer sau seller)
app.get("/conversations/user/:userId", authenticate, async (req, res, next) => {
    try{
        const userId = req.params.userId;
        const conversations = await all(
            `SELECT c.id as conversation_id, c.seller_id, c.buyer_id, m.id as id, m.created_at, m.message, m.is_read, m.from_user, m.to_user
                    FROM conversations c INNER JOIN messages m ON m.conversation_id = c.id
                    WHERE c.seller_id = ? OR c.buyer_id = ? ORDER BY m.created_at DESC`,
            [userId, userId]
        );
        res.json(conversations);
    } catch(e){
        next(e);
    }
})

// returneaza intreaga conversatie dupa id
app.get("/conversations/:id/user/:userId", authenticate, async (req, res, next) => {
    try{
        const userId = req.params.userId;
        const conversationId = req.params.id;
        const conversationMessages = await all(
            `SELECT c.id as conversation_id, c.seller_id, c.buyer_id, m.id as id, m.created_at, m.message, m.is_read, m.from_user, m.to_user
                    FROM conversations c INNER JOIN messages m ON m.conversation_id = c.id
                    WHERE (c.seller_id = ? OR c.buyer_id = ?) AND c.id = ? ORDER BY m.created_at ASC`,
            [userId, userId, conversationId]
        );
        if (!conversationMessages || conversationMessages.length === 0) return res.json([]); //conversatia exista dar nu are mesaje

        res.json(conversationMessages);
    } catch(e){
        next(e);
    }
})

app.get("/conversations/:cid/messages/:mid", authenticate, async (req, res, next) => {
    try{
        const conversationId = req.params.cid;
        const messageId = req.params.mid;
        const message = await get(
            `SELECT m.id, m.created_at, m.message, m.is_read, m.from_user, m.to_user
                    FROM messages m WHERE m.conversation_id = ? AND m.id = ?`,
            [conversationId, messageId]
        );
        if(!message) return res.status(404).json({error: "Message not found"});
        res.json(message);
    } catch(e){
        next(e);
    }
})

function validateInteger(price){
    return !isNaN(parseInt(price)) && parseInt(price) > 0;
}

function validateEmail(email) {
    if(!email || typeof email !== 'string'){
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

function validateProduct(product) {
    const {title, description, price, category} = product; 
    let errors = [];
    if(!title) errors.push("Invalid title");
    if(!description) errors.push("Invalid description");
    if(!validateInteger(price)) errors.push("Invalid price");
    if(!category) errors.push("Invalid category");
    if(errors.length > 0) throw new Error(errors.join("; "));
}

function validateOrder(order) {
    const {buyerEmail, price, status} = order;
    let errors = [];
    if(!buyerEmail) errors.push("Invalid buyer");
    if(!validateInteger(price)) errors.push("Invalid price");
    if(!status) errors.push("Invalid status");
    if(errors.length > 0) throw new Error(errors.join("; "));
}

function validateReview(review) {
    const {productTitle,user,rating,comment} = review;
    let errors = [];
    if(!productTitle) errors.push("Invalid product title");
    if(!user) errors.push("Invalid user");
    if(!validateInteger(rating)) errors.push("Invalid rating");
    if(!comment) errors.push("Invalid comment");
    if(errors.length > 0) throw new Error(errors.join("; "));
}

function validateNotification(notification) { //TODO: validations to be determined
    const {user, message, type, is_read, created_at} = notification;
    let errors = [];
    if(!user) errors.push("Invalid user id");
    if(!message) errors.push("Invalid message");
    if(!type) errors.push("Invalid type");
    if(!created_at) errors.push("Invalid creation date");
    if(errors.length > 0) throw new Error(errors.join("; "));
}

app.post("/product", authenticate, requireTrusted, upload.single("image"), async (req, res, next) => {
    try{
        const product = req.body;
        const imageFile = req.file;
        const sellerId = req.user.sub;
        validateProduct(product);
        const newProductId = uuid();
        
        let imageUrl = null;
        if (imageFile) {
          imageUrl = `/uploads/${imageFile.filename}`;
        }
        
        await run(
            `INSERT INTO products (id, title, description, price, seller, category, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [newProductId, product.title, product.description, parseInt(product.price), sellerId, product.category, imageUrl],
        );

        //const newProduct = await get(`SELECT * FROM products WHERE id = ?`, [newProductId]);
        const newProduct = await get(`
          SELECT 
            p.id, p.title, p.description, p.price, p.category, p.imageUrl,
            u.id AS seller_id, u.name AS seller_name, u.email AS seller_email,
            u.role AS seller_role, u.country AS seller_country, u.city AS seller_city
          FROM products p
          INNER JOIN users u ON p.seller = u.id
          WHERE p.id = ?
        `, [newProductId]);
        res.status(201).json(newProduct);

    } catch (e) {
        next(e);
    }
})

app.post("/order", async (req, res, next) => {
    try{
        const order = req.body;
        validateOrder(order);
        const added = await run(
            `INSERT INTO orders (id, buyer, price, status) VALUES (?,?,?,?)`,
            [uuid(), order.buyerEmail, parseInt(order.price), order.status],
        );
        res.json(added);
    } catch (e) {
        next(e);
    }
})

app.post("/review", async (req, res, next) => {
    try{
        const review = req.body;
        validateReview(review);
        const added = await run(
            `INSERT INTO reviews (id, produs, user, rating, comment) VALUES (?, ?, ?, ?, ?)`,
            [uuid(), review.productTitle, review.user, parseInt(review.rating), review.comment],
        );
        await run(`UPDATE users SET karma = karma + 10 WHERE id = ?`, [review.user]);

        res.json(added);
    } catch (e) {
        next(e);
    }
})

/**
 * Fetches product prices from a site by scraping the HTML content
 * @param {string} searchTerm Product title to search for
 * @returns {Promise<Array<{ source: string, title: string, price: number, link: string }>>}
 */
async function scrapePrices(searchTerm) {
    const results = [];
    const searchUrl = `https://www.emag.ro/search/${encodeURIComponent(searchTerm)}`;
    
    try {
        const { data } = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(data); 

        const PRODUCT_CARD_SELECTOR = '.card-item'; 

        $(PRODUCT_CARD_SELECTOR).slice(0, 15).each((index, element) => {
            
            const title = $(element).attr('data-name');
            const link = $(element).attr('data-url');

            const priceText = $(element).find('.product-new-price').text().trim();
            
            const cleanedPriceText = priceText
                .replace('Lei', '') 
                .replace(/\./g, '')  
                .replace(/,/g, '.')  
                .trim();
                
            const price = parseFloat(cleanedPriceText); 
            
            if (title && price && link && !isNaN(price) && link.startsWith('http')) {
                results.push({
                    source: 'eMAG', 
                    title: title,
                    price: price,
                    link: link, 
                });
            }
        });
        
    } catch (error) {
        console.error(`Scraping error for ${searchTerm}:`, error.message);
    }

    return results;
}

app.get("/product/:id/price-comparison", async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const product = await get(`SELECT title FROM products WHERE id = ?`, [id]);
        
        if (!product) {
            return res.status(404).json({ error: "Produsul nu a fost gasit pentru comparatie." });
        }

        const searchTerm = product.title;
        
        const comparisonData = await scrapePrices(searchTerm);
        
        const validPrices = comparisonData
            .filter(item => typeof item.price === 'number' && item.price > 0)
            .map(item => item.price);
            
        const averagePrice = validPrices.length > 0 
            ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length 
            : null;

        res.json({
            searchTerm: searchTerm,
            averageMarketPrice: averagePrice,
            comparisons: comparisonData,
        });

    } catch (e) {
        console.error("Eroare la Price Comparison:", e);
        next(e);
    }
});

app.get("/my-notifications", authenticate,async (req,res,next) =>{
  try{
    const userId = req.user.sub;

    const notifications = await all(
      `SELECT id, id_user, message, notification_type, is_read, created_at
      FROM notifications
      WHERE id_user = ?
      ORDER BY created_at DESC`,
      [userId]
    );
    res.json(notifications);
  }
  catch(e){
    next(e);
  }
});

app.put("/notification/:id/read",authenticate,async (req,res,next) =>{
  try{
    const notificationId = req.params.id;
    const userId = req.user.sub;

    const updated = await run(
      `UPDATE notifications
      SET is_read = 1
      WHERE id = ? AND id_user = ?`,
      [notificationId,userId]
    );

    if(updated.changes === 0){
      return res.status(404).json({error: "Notification not found or you do not have permission to update it."});
    }

    res.status(200).json({message: "Notification marked as read"});
  }
  catch(e){
    next(e);
  }
});

app.put("/my-notifications/read-all",authenticate, async(req,res,next) => {
  try{
    const userId = req.user.sub;

    const updated = await run(
      `UPDATE notifications
      SET is_read = 1
      WHERE id_user = ? AND is_read = 0`,
      [userId]
    );

    res.status(200).json({
      message: "All unread notifications marked as read.",
      count: updated.changes
    });
  }
  catch(e){
    next(e);
  }
});

app.post("/notification", async (req, res, next) => {
    try{
        const notification = req.body;
        notification.is_read = false;
        validateNotification(notification);
        const added = await run(
            `INSERT INTO notifications (id, id_user, message, notification_type, is_read, created_at) VALUES (?,?,?,?,?,?)`,
            [uuid(), notification.user, notification.message, notification.type, notification.is_read, notification.created_at],
        );
        res.json(added);
    } catch (e) {
        next(e);
    }
})

app.delete("/notification/:id",authenticate, async (req,res,next) =>{
  try{
    const notificationId = req.params.id;
    const userId = req.user.sub;

    const deleted = await run(
      `DELETE FROM notifications
      WHERE id=? and id_user= ?`,
      [notificationId,userId]
    );

    if(deleted.changes === 0){
      return res.status(404).json({error: "Notification not found or you do not have permission to delete it."});
    }

    return res.status(200).json({message: "Notification deleted successfully"});
  }
  catch(e){
    next(e);
  }
});

app.post("/conversations",authenticate, async (req,res,next) =>{
    try {
        const {buyer_id, seller_id} = req.body;
        const conversationId = uuid();
        await run(
            `INSERT INTO conversations (id, seller_id, buyer_id) VALUES (?,?,?)`,
            [conversationId, seller_id, buyer_id]
        );
        const newConversation = {
            id: conversationId,
            seller_id,
            buyer_id
        };
        res.status(201).json(newConversation);
    } catch (e) {
        next(e);
    }
})

app.post("/conversations/:id/messages",authenticate, async (req,res,next) =>{
    try {
        const {message, from_user, created_at, is_read, to_user} = req.body;
        const conversation_id = req.params.id;
        const messageId = uuid();
        await run(
            `INSERT INTO messages (id, conversation_id, message, created_at, is_read, from_user, to_user) VALUES (?,?,?,?,?,?,?)`,
            [messageId, conversation_id, message, created_at, parseInt(is_read), from_user, to_user]
        );
        const newMessage = {
            id: messageId,
            conversation_id,
            message,
            created_at,
            is_read: parseInt(is_read),
            from_user,
            to_user
        };
        res.status(201).json(newMessage);
    } catch (e) {
        next(e);
    }
})

app.put("/conversations/:cid/messages/:mid",authenticate, async (req,res,next) =>{
    try{
        const numericColumns = ['is_read'];
        const processedBody = processBody(req.body, numericColumns);
        const MESSAGE_UPDATABLE_COLUMNS = ['message', 'is_read', 'created_at'];
        const { statement, values } = prepareUpdateStatement(processedBody, 'messages', MESSAGE_UPDATABLE_COLUMNS);
        const finalValues = [...values, req.params.mid];

        await run(statement, finalValues);
        const updated = await get(`SELECT * FROM messages WHERE id = ?`, [req.params.mid]);
        if (!updated) return res.status(404).json({ error: "Message not found after update" });
        res.json(updated);
    } catch (e) {
        next(e);
    }
})

app.get("/my-trusted-request", authenticate, async (req, res, next) => {
    try {
        const userId = req.user.sub;
        const request = await get(`
            SELECT id, status, created_at, pitch
            FROM trusted_requests 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 1
        `, [userId]);
        
        if (!request) {
            return res.status(200).json({});
        }

        res.json(request);
    } catch (e) {
        next(e);
    }
});

app.post("/request-trusted", authenticate, async (req, res, next) => {
  try {
    const { pitch } = req.body;
    const userId = req.user.sub;

    if (req.user.role === 'Trusted' || req.user.role === 'Admin') {
        return res.status(400).json({ error: "You are already a verified seller." });
    }

    const existing = await get(`SELECT 1 FROM trusted_requests WHERE user_id = ? AND status = 'pending'`, [userId]);
    if (existing) {
        return res.status(400).json({ error: "You already have a pending application." });
    }

    const id = uuid();
    await run(
      `INSERT INTO trusted_requests (id, user_id, pitch, status, created_at)
       VALUES (?, ?, ?, 'pending', datetime('now'))`,
      [id, userId, pitch]
    );

    res.status(201).json({ message: "Application submitted successfully" });
  } catch (e) {
    next(e);
  }
});

app.get("/admin/requests", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const requests = await all(`
      SELECT tr.id, tr.pitch, tr.created_at, u.name, u.email, u.id as user_id, u.karma
      FROM trusted_requests tr
      JOIN users u ON tr.user_id = u.id
      WHERE tr.status = 'pending'
      ORDER BY tr.created_at ASC
    `);
    res.json(requests);
  } catch (e) {
    next(e);
  }
});

app.post("/admin/request/:id/:action", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { id, action } = req.params;
    if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: "Invalid action" });
    }

    const request = await get(`SELECT user_id FROM trusted_requests WHERE id = ?`, [id]);
    if (!request) return res.status(404).json({ error: "Request not found" });

    const status = action === 'approve' ? 'approved' : 'rejected';
    
    await run(`UPDATE trusted_requests SET status = ? WHERE id = ?`, [status, id]);

    if (action === 'approve') {
        await run(`UPDATE users SET role = 'Trusted' WHERE id = ?`, [request.user_id]);
    }

    res.json({ message: `Request ${status}` });
  } catch (e) {
    next(e);
  }
});

function prepareUpdateStatement(updatedData, table, allowedColumns) {
    const allowedKeys = Object.keys(updatedData).filter(key => allowedColumns.includes(key));
    const validKeys = allowedKeys.filter(key => {
        const value = updatedData[key];
        return value !== null && value !== undefined && value !== '';
    });
    if (validKeys.length === 0) throw new Error("No valid fields provided for update.");

    const setClause = validKeys.map(key => `\`${key}\` = ?`).join(", ");
    const values = validKeys.map(key => updatedData[key]);
    const statement = `UPDATE \`${table}\` SET ${setClause} WHERE id = ?`;
    return { statement, values };
}

function processBody(body, numericColumns) {
    let processedBody = {...body};
    for (const key of Object.keys(processedBody)) {
        if (numericColumns.includes(key)) {
            const value = processedBody[key];
            if (value !== null && value !== undefined && value !== '') processedBody[key] = parseInt(value, 10);
        }
    }
    return processedBody;
}

app.put("/product/:id", async (req, res, next) => {
    try {
        // here the request body is considered to not contain a product id
        const { id } = req.params;
        const numericColumns = ['price'];
        const processedBody = processBody(req.body, numericColumns);
        const PRODUCT_UPDATABLE_COLUMNS = ['title', 'description', 'price', 'category'];
        const { statement, values } = prepareUpdateStatement(processedBody, 'products', PRODUCT_UPDATABLE_COLUMNS);
        const finalValues = [...values, id];

        const updated = await run(statement, finalValues);
        res.json(updated);
    } catch (e) {
        next(e);
    }
})

app.put("/order/:id", async (req, res, next) => {
    try{
        // here the request body is considered to not contain an order id;
        const { id } = req.params;
        const numericColumns = ['price'];
        const processedBody = processBody(req.body, numericColumns);
        const ORDER_UPDATABLE_COLUMNS = ['buyer', 'price', 'status'];
        const { statement, values } = prepareUpdateStatement(processedBody, `orders`, ORDER_UPDATABLE_COLUMNS);
        const finalValues = [...values, id];

        const updated = await run(statement, finalValues);
        res.json(updated);
    } catch (e) {
        next(e);
    }
})

app.put("/review/:id", async (req, res, next) => {
    try{
        // here the request body is considered to not contain a review id;
        const { id } = req.params;
        const numericColumns = ['rating'];
        const processedBody = processBody(req.body, numericColumns);
        const REVIEW_UPDATABLE_COLUMNS = ['rating', 'comment'];
        const { statement, values } = prepareUpdateStatement(processedBody, `reviews`, REVIEW_UPDATABLE_COLUMNS);
        const finalValues = [...values, id];

        const updated = await run(statement, finalValues);
        res.json(updated);
    } catch (e) {
        next(e);
    }
})

app.post("/crawler", async (req, res, next) => {
  const { text } = req.body;
  try {
    const SYSTEM = `
      You are a link-finding assistant. Given a user's question, return the TOP 5 most relevant, authoritative, and recent URLs.
      Rules:
      - Prefer primary sources (official docs, publishers, maintainers) and reputable outlets.
      - Include only URLs you are confident actually exist (avoid guessing).
      - Each item must include: url, title, and a short reason.
      - Output STRICT JSON only, exactly this schema and nothing else:
      {"links":[{"url":"","title":"","reason":""}, {"url":"","title":"","reason":""}, {"url":"","title":"","reason":""}, {"url":"","title":"","reason":""}, {"url":"","title":"","reason":""}]}
    `.trim();

    const result = await getResponseGPT(SYSTEM, text, true);
    return res.json(result);
  } catch (e) {
    console.error("Error:", e);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/msg", async (req, res, next) => {
  const { text } = req.body;
  try {
    const SYSTEM = `
      You are a helpful assistant for a marketplace website called "EdgeUp".
      Your main goal is to help users find products, understand how the site works, and answer questions related to buying and selling.
      
      Rules:
      - Your name is "Edger Assistant".
      - The marketplace is similar to Vinted or OLX, where users can buy and sell items.
      - The available product categories are: Electronics, Books, Clothes, Home, and Other.
      - Only users with a "Trusted" role are allowed to sell items.
      - Be friendly, concise, and helpful.
      - If the user asks a question unrelated to the marketplace (like "who is the president" or "what is 10+10"), politely decline and guide them back to the marketplace topics.
      - IMPORTANT: You MUST always respond in the same language the user uses (if they ask in Romanian, respond in Romanian).

      Example Conversation:
      User: salut! ce este EdgeUp?
      Bot: Salut! EdgeUp este un site unde poți cumpăra și vinde diverse produse, asemănător cu Vinted sau eMAG.
      
      User: can i sell my laptop?
      Bot: Yes, you can sell items like laptops. You just need to have a "Trusted" seller account to post an ad.
      
      User: cine ești?
      Bot: Sunt asistentul virtual al acestui marketplace. Te pot ajuta cu întrebări despre produse sau despre cum funcționează site-ul.
      
      User: what's the weather?
      Bot: Îmi pare rău, rolul meu este să te ajut cu informații despre marketplace-ul nostru. Nu am acces la date meteo.
    `.trim();

    const result = await getResponseGPT(SYSTEM, text);
    return res.json(result);
  } catch (e) {
    console.error("Error:", e);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.use((err, _req, res, _next) => {
  res.status(err.status || 500).json({ error: err.message || "Internal error" });
});

const PORT = process.env.PORT || 3000;



async function main() {
  await migrate();

  //DB population - uncomment at first run
  await seed();

  app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));

  process.on("SIGINT", () => db.close(() => process.exit(0)));
}

main().catch((e) => {
  console.error("Fatal startup error:", e);
  process.exit(1);
});