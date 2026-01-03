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
import axios from "axios";
import * as cheerio from "cheerio";
import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const httpServer = createServer(app);
const io = new Server(httpServer,{
  cors:{
    origin: "http://localhost:5173",
    methods: ["GET","POST"]
  }
})

io.use((socket,next) =>{
  const token = socket.handshake.auth.token;
  if(!token) return next(new Error("Authentication error"));

  try{
    const decoded = jwt.verify(token,process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  }
  catch(err){
    next(new Error("Authentication Error"));
  }
});

io.on("connection",(socket) => {
  console.log(`User connected via WebSocket: ${socket.user.sub}`);
  socket.join(socket.user.sub);
  socket.on("disconnect", () =>{
    console.log("User disconnected");
  })
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

app.use("/uploads", express.static("uploads"));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    return res
      .status(403)
      .json({ error: "Forbidden: Only Trusted sellers can post products." });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== "Admin") {
    return res.status(403).json({ error: "Forbidden: Admin access required." });
  }
  next();
};

const Roles = Object.freeze({ Trusted: "Trusted", Untrusted: "Untrusted" });
const Countries = Object.freeze(["RO", "DE", "FR", "UK"]);
const Cities = Object.freeze({
  RO: ["București", "Cluj-Napoca", "Iași", "Timișoara"],
  DE: ["Berlin", "Munich", "Hamburg"],
  FR: ["Paris", "Lyon"],
  UK: ["London", "Manchester"],
});

async function seed() {
  // Demo Users
  const demoUsers = [
    {
      name: "a",
      email: "a@yahoo.com",
      password: "a",
      role: "Trusted",
      country: "RO",
      city: "București",
      karma: 50,
    },
    {
      name: "b",
      email: "b@gmail.com",
      password: "b",
      role: "Untrusted",
      country: "RO",
      city: "Cluj-Napoca",
      karma: 10,
    },
    {
      name: "c",
      email: "c@gmail.com",
      password: "c",
      role: "Untrusted",
      country: "RO",
      city: "Cluj-Napoca",
      karma: 60,
    },
    {
      name: "d",
      email: "d@gmail.com",
      password: "d",
      role: "Untrusted",
      country: "RO",
      city: "Cluj-Napoca",
      karma: 110,
    },
    {
      name: "admin",
      email: "admin@edgeup.com",
      password: "admin",
      role: "Admin",
      country: "RO",
      city: "București",
      karma: 1000,
    },
  ];

  for (const u of demoUsers) {
    const exists = await get(`SELECT 1 as ok FROM users WHERE email = ?`, [
      u.email,
    ]);
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

  // Demo Products
  const demoProducts = [
    {
      title: "Carte JS pentru Începători",
      description: "Bazele JavaScript, capitole scurte.",
      price: 120,
      sellerEmail: "a@yahoo.com",
      category: "Books",
      imageUrl: "/uploads/js-book.jpg",
    },
    {
      title: "Mouse Office",
      description: "Mouse optic simplu, USB.",
      price: 60,
      sellerEmail: "a@yahoo.com",
      category: "Electronics",
      imageUrl: "/uploads/office-mouse.jpg",
    },
    {
      title: "Pernă decorativă",
      description: "Pernă 40x40, umplutură sintetică.",
      price: 45,
      sellerEmail: "a@yahoo.com",
      category: "Home",
      imageUrl: "/uploads/decorative-pillow.png",
    },
  ];

  for (const p of demoProducts) {
    const seller = byEmail[p.sellerEmail];
    if (!seller) {
      console.warn(
        `[seed] nu găsesc seller pentru ${p.title} (${p.sellerEmail})`
      );
      continue;
    }
    if (seller.role !== "Trusted") {
      console.warn(
        `[seed] seller ${p.sellerEmail} nu este Trusted, sar produsul ${p.title}`
      );
      continue;
    }

    const exists = await get(
      `SELECT 1 as ok FROM products WHERE title = ? AND seller = ?`,
      [p.title, seller.id]
    );
    if (exists) {
      console.log(
        `[seed] product '${p.title}' deja există pentru seller ${p.sellerEmail}`
      );
      continue;
    }

    const pid = uuid();
    await run(
      `INSERT INTO products (id, title, description, price, seller, category, imageUrl)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        pid,
        p.title,
        p.description ?? "",
        p.price,
        seller.id,
        p.category,
        p.imageUrl ?? null,
      ]
    );
    console.log(
      `[seed] created product '${p.title}' pentru seller ${p.sellerEmail}`
    );
  }

  // Demo Notifications
  const demoNotifications = [
    {
      userEmail: "a@yahoo.com",
      message: "Ai primit un review nou de 4 stele pentru 'Mouse Office'!",
      type: "review",
      is_read: 0,
    },
    {
      userEmail: "b@gmail.com",
      message:
        "Comanda ta (#1002) pentru 'Carte JS pentru Începători' a fost expediată.",
      type: "order",
      is_read: 0,
    },
    {
      userEmail: "c@yahoo.com",
      message:
        "Comanda nouă (#1001) plasată de a@gmail.com pentru 'Pernă decorativă'.",
      type: "order",
      is_read: 1,
    },
  ];

  for (const n of demoNotifications) {
    const user = byEmail[n.userEmail];
    if (!user || !user.id) {
      console.warn(`[seed] nu găsesc user pentru notificare: ${n.userEmail}`);
      continue;
    }

    const exists = await get(
      `SELECT 1 AS ok FROM notifications WHERE id_user = ? AND message = ?`,
      [user.id, n.message]
    );
    if (exists) {
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

  // Demo Reviews
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
      userEmail: "d@gmail.com",
      rating: 4,
      comment: "Funcționează bine, raport calitate-preț corect.",
    },
    {
      productTitle: "Pernă decorativă",
      userEmail: "d@gmail.com",
      rating: 5,
      comment: "Foarte moale și arată exact ca în poze.",
    },
  ];

  for (const r of demoReviews) {
    const produsId = byTitle[r.productTitle];
    const user = byEmail[r.userEmail];
    if (!produsId || !user) {
      console.warn(
        `[seed] nu pot crea review pt '${r.productTitle}' / ${r.userEmail}`
      );
      continue;
    }

    const exists = await get(
      `SELECT 1 AS ok FROM reviews WHERE produs = ? AND user = ?`,
      [produsId, user.id]
    );
    if (exists) {
      console.log(
        `[seed] review deja există pentru ${r.userEmail} -> ${r.productTitle}`
      );
      continue;
    }

    const rid = uuid();
    await run(
      `INSERT INTO reviews (id, produs, user, rating, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [rid, produsId, user.id, r.rating, r.comment]
    );
    console.log(
      `[seed] created review '${r.comment.slice(0, 30)}...' pentru ${
        r.productTitle
      }`
    );
  }

  // Demo Orders
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

  const allUsersList = await all(`SELECT id, email FROM users`);
  const usersMap = Object.fromEntries(allUsersList.map((u) => [u.email, u]));

  const demoFavorites = [
    { userEmail: "b@gmail.com", productTitle: "Mouse Office" },
    { userEmail: "b@gmail.com", productTitle: "Pernă decorativă" },
    { userEmail: "d@gmail.com", productTitle: "Carte JS pentru Începători" },
    { userEmail: "admin@edgeup.com", productTitle: "Mouse Office" }, 
    { userEmail: "a@yahoo.com", productTitle: "Pernă decorativă" }
  ];

  for (const f of demoFavorites) {
    const user = usersMap[f.userEmail];
    const productId = byTitle[f.productTitle];

    if (!user) {
      console.warn(`[seed] Userul ${f.userEmail} nu a fost găsit pentru favorite.`);
      continue;
    }
    if (!productId) {
      console.warn(`[seed] Produsul '${f.productTitle}' nu a fost găsit pentru favorite.`);
      continue;
    }
    const exists = await get(
      `SELECT 1 as ok FROM favorites WHERE user_id = ? AND product_id = ?`,
      [user.id, productId]
    );

    if (exists) {
      console.log(`[seed] Favorite deja existent: ${f.userEmail} -> ${f.productTitle}`);
      continue;
    }

    const fid = uuid();
    await run(
      `INSERT INTO favorites (id, user_id, product_id, created_at) VALUES (?, ?, ?, datetime('now'))`,
      [fid, user.id, productId]
    );
    console.log(`[seed] Adăugat la favorite: ${f.userEmail} a dat like la '${f.productTitle}'`);
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
    const rows = await all(
      "SELECT id, name, email, role, country, city FROM users ORDER BY name"
    );
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
        karma: user.karma,
      },
    });
  } catch (e) {
    next(e);
  }
});

app.post("/register", async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role = Roles.Untrusted,
      country,
      city,
    } = req.body;

    assert(name && email && password, "name, email, password sunt obligatorii");
    assert(Object.values(Roles).includes(role), "invalid role");
    assert(Countries.includes(country), "invalid country");
    assert(Cities[country]?.includes(city), "invalid city for country");

    const exists = await get(`SELECT 1 AS ok FROM users WHERE email = ?`, [
      email,
    ]);
    assert(!exists, "email deja folosit", 409);

    const hashed = await bcrypt.hash(password, 10);

    const id = uuid();
    await run(
      `INSERT INTO users (id, name, email, password, role, country, city)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name, email, hashed, role, country, city]
    );

    const token = jwt.sign({ sub: id, role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES || "1h",
    });

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

    const user = await get(`SELECT id, name, email, role, country, city, karma FROM users WHERE id = ?`, [
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

    let userId = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        userId = payload.sub;
      } catch (err) {
      }
    }

    const params = [];
    
    let favoriteColumnSQL = "0 AS isFavorite"; 
    
    if (userId) {
      favoriteColumnSQL = `
        (EXISTS (
           SELECT 1 
           FROM favorites f 
           WHERE f.product_id = p.id AND f.user_id = ?
        )) AS isFavorite
      `;
      params.push(userId);
    }

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
                   u.city  AS seller_city,
                   ${favoriteColumnSQL}
            FROM products p
            INNER JOIN users u ON p.seller = u.id
        `;

    const conditions = [];

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

    const formattedRows = rows.map(row => ({
        ...row,
        isFavorite: Boolean(row.isFavorite) 
    }));

    res.json(formattedRows);
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

app.get("/product/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    let userId = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        userId = payload.sub; 
      } catch (err) {

      }
    }

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

    let isFavorite = false;

    if (userId) {
      const favRecord = await get(
        `SELECT 1 FROM favorites WHERE user_id = ? AND product_id = ?`,
        [userId, id]
      );
      isFavorite = !!favRecord;
    }

    res.json({
      ...product,
      isFavorite: isFavorite
    });

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

app.get("/product/:id/reviews", async (req, res, next) => {
  try {
    const { id } = req.params;

    // First verify the product exists
    const product = await get(`SELECT id, title FROM products WHERE id = ?`, [id]);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

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

app.post("/product/:id/favorite", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const productId = req.params.id;

    const product = await get(`SELECT id FROM products WHERE id = ?`, [productId]);
    if (!product) {
      return res.status(404).json({ error: "Produsul nu a fost găsit." });
    }

    const existing = await get(
      `SELECT id FROM favorites WHERE user_id = ? AND product_id = ?`,
      [userId, productId]
    );

    if (existing) {
      return res.status(409).json({ message: "Produsul este deja la favorite." });
    }

    const favoriteId = uuid();
    const createdAt = new Date().toISOString();

    await run(
      `INSERT INTO favorites (id, user_id, product_id, created_at) VALUES (?, ?, ?, ?)`,
      [favoriteId, userId, productId, createdAt]
    );

    res.status(201).json({ message: "Produs adăugat la favorite.", favoriteId });
  } catch (e) {
    console.error("Eroare la adăugare favorite:", e);
    next(e);
  }
});

app.delete("/product/:id/favorite", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const productId = req.params.id;

    const result = await run(
      `DELETE FROM favorites WHERE user_id = ? AND product_id = ?`,
      [userId, productId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: "Produsul nu era la favorite sau nu a fost găsit." });
    }

    res.json({ message: "Produs șters de la favorite." });
  } catch (e) {
    next(e);
  }
});

app.get("/my-favorites", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.sub;

    const favorites = await all(
      `SELECT p.*, f.created_at as favorited_at
       FROM products p
       JOIN favorites f ON p.id = f.product_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json(favorites);
  } catch (e) {
    next(e);
  }
});

app.get("/my-favorites/ids", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.sub;

    const rows = await all(
      `SELECT product_id FROM favorites WHERE user_id = ?`,
      [userId]
    );

    const ids = rows.map(row => row.product_id);
    
    res.json(ids);
  } catch (e) {
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

app.get("/conversations/user/:userId", authenticate, async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const conversations = await all(
      `SELECT c.id as conversation_id, c.seller_id, c.buyer_id, 
                    m.id as id, m.created_at, m.message, m.is_read, m.from_user, m.to_user,
                    seller.name as seller_name, buyer.name as buyer_name
                    FROM conversations c 
                    INNER JOIN messages m ON m.conversation_id = c.id
                    LEFT JOIN users seller ON c.seller_id = seller.id
                    LEFT JOIN users buyer ON c.buyer_id = buyer.id
                    WHERE c.seller_id = ? OR c.buyer_id = ? ORDER BY m.created_at DESC`,
      [userId, userId]
    );
    res.json(conversations);
  } catch (e) {
    next(e);
  }
});

app.get(
  "/conversations/:id/user/:userId",
  authenticate,
  async (req, res, next) => {
    try {
      const userId = req.params.userId;
      const conversationId = req.params.id;
      const conversationMessages = await all(
        `SELECT c.id as conversation_id, c.seller_id, c.buyer_id, m.id as id, m.created_at, m.message, m.is_read, m.from_user, m.to_user
                    FROM conversations c INNER JOIN messages m ON m.conversation_id = c.id
                    WHERE (c.seller_id = ? OR c.buyer_id = ?) AND c.id = ? ORDER BY m.created_at ASC`,
        [userId, userId, conversationId]
      );
      if (!conversationMessages || conversationMessages.length === 0)
        return res.json([]);

      res.json(conversationMessages);
    } catch (e) {
      next(e);
    }
  }
);

app.get(
  "/conversations/:cid/messages/:mid",
  authenticate,
  async (req, res, next) => {
    try {
      const conversationId = req.params.cid;
      const messageId = req.params.mid;
      const message = await get(
        `SELECT m.id, m.created_at, m.message, m.is_read, m.from_user, m.to_user
                    FROM messages m WHERE m.conversation_id = ? AND m.id = ?`,
        [conversationId, messageId]
      );
      if (!message) return res.status(404).json({ error: "Message not found" });
      res.json(message);
    } catch (e) {
      next(e);
    }
  }
);

function validateInteger(price) {
  return !isNaN(parseInt(price)) && parseInt(price) > 0;
}

function validateEmail(email) {
  if (!email || typeof email !== "string") {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

function validateProduct(product) {
  const { title, description, price, category } = product;
  let errors = [];
  if (!title) errors.push("Invalid title");
  if (!description) errors.push("Invalid description");
  if (!validateInteger(price)) errors.push("Invalid price");
  if (!category) errors.push("Invalid category");
  if (errors.length > 0) throw new Error(errors.join("; "));
}

function validateOrder(order) {
  const { buyerEmail, price, status } = order;
  let errors = [];
  if (!buyerEmail) errors.push("Invalid buyer");
  if (!validateInteger(price)) errors.push("Invalid price");
  if (!status) errors.push("Invalid status");
  if (errors.length > 0) throw new Error(errors.join("; "));
}

function validateReview(review) {
  const { productTitle, user, rating, comment } = review;
  let errors = [];
  if (!productTitle) errors.push("Invalid product title");
  if (!user) errors.push("Invalid user");
  if (!validateInteger(rating)) errors.push("Invalid rating");
  if (!comment) errors.push("Invalid comment");
  if (errors.length > 0) throw new Error(errors.join("; "));
}

function validateNotification(notification) {
  const { user, message, type, is_read, created_at } = notification;
  let errors = [];
  if (!user) errors.push("Invalid user id");
  if (!message) errors.push("Invalid message");
  if (!type) errors.push("Invalid type");
  if (!created_at) errors.push("Invalid creation date");
  if (errors.length > 0) throw new Error(errors.join("; "));
}

app.post(
  "/product",
  authenticate,
  requireTrusted,
  upload.single("image"),
  async (req, res, next) => {
    try {
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
        [
          newProductId,
          product.title,
          product.description,
          parseInt(product.price),
          sellerId,
          product.category,
          imageUrl,
        ]
      );

      const newProduct = await get(
        `
          SELECT 
            p.id, p.title, p.description, p.price, p.category, p.imageUrl,
            u.id AS seller_id, u.name AS seller_name, u.email AS seller_email,
            u.role AS seller_role, u.country AS seller_country, u.city AS seller_city
          FROM products p
          INNER JOIN users u ON p.seller = u.id
          WHERE p.id = ?
        `,
        [newProductId]
      );
      res.status(201).json(newProduct);
    } catch (e) {
      next(e);
    }
  }
);

app.post("/order", async (req, res, next) => {
  try {
    const order = req.body;
    validateOrder(order);

    const added = await run(
      `INSERT INTO orders (id, buyer, price, status) VALUES (?,?,?,?)`,
      [uuid(), order.buyerEmail, parseInt(order.price), order.status]
    );

    if (order.productId) {
      const product = await get(`SELECT seller, title FROM products WHERE id = ?`, [
        order.productId
      ]);

      if (product && product.seller) {
        await sendNotification(
          product.seller,
          `Great news! Someone just ordered your product "${product.title}"`,
          "order"
        );
      }
    } else {
      console.warn("Cannot notify seller: productId missing in order request");
    }

    res.json(added);
  } catch (e) {
    next(e);
  }
});

app.post("/review", async (req, res, next) => {
  try {
    const review = req.body;
    validateReview(review);

    const added = await run(
      `INSERT INTO reviews (id, produs, user, rating, comment) VALUES (?, ?, ?, ?, ?)`,
      [
        uuid(),
        review.productTitle,
        review.user,
        parseInt(review.rating),
        review.comment,
      ]
    );

    await run(`UPDATE users SET karma = karma + 10 WHERE id = ?`, [
      review.user,
    ]);

    const updatedUser = await get(`SELECT karma FROM users WHERE id = ?`, [review.user]);

    const product = await get(`SELECT seller, title FROM products WHERE id = ?`, [
      review.productTitle
    ]);

    const reviewerIdentity = await get(`SELECT name FROM users WHERE id = ?`, [
      review.user
    ]);
    const reviewerName = reviewerIdentity ? reviewerIdentity.name : "A user";

    if (product && product.seller) {
      await sendNotification(
        product.seller,
        `${reviewerName} left a ${review.rating}-star review on your product "${product.title}"`,
        "review"
      );
    }

    res.json({ ...added, newKarma: updatedUser?.karma });
  } catch (e) {
    next(e);
  }
});

async function scrapePrices(searchTerm) {
  const results = [];
  const searchUrl = `https://www.emag.ro/search/${encodeURIComponent(
    searchTerm
  )}`;

  try {
    const { data } = await axios.get(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const $ = cheerio.load(data);

    const PRODUCT_CARD_SELECTOR = ".card-item";

    $(PRODUCT_CARD_SELECTOR)
      .slice(0, 15)
      .each((index, element) => {
        const title = $(element).attr("data-name");
        const link = $(element).attr("data-url");

        const priceText = $(element).find(".product-new-price").text().trim();

        const cleanedPriceText = priceText
          .replace("Lei", "")
          .replace(/\./g, "")
          .replace(/,/g, ".")
          .trim();

        const price = parseFloat(cleanedPriceText);

        if (
          title &&
          price &&
          link &&
          !isNaN(price) &&
          link.startsWith("http")
        ) {
          results.push({
            source: "eMAG",
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
      return res
        .status(404)
        .json({ error: "Produsul nu a fost gasit pentru comparatie." });
    }

    const searchTerm = product.title;

    const comparisonData = await scrapePrices(searchTerm);

    const validPrices = comparisonData
      .filter((item) => typeof item.price === "number" && item.price > 0)
      .map((item) => item.price);

    const averagePrice =
      validPrices.length > 0
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


async function sendNotification(userId,message,type){
  const notificationId = uuid();
  const createdAt = new Date().toISOString();

  try{
    await run(
    `INSERT INTO notifications (id,id_user,message,notification_type,is_read,created_at) values (?,?,?,?,?,?)`,
    [notificationId,userId,message,type,false,createdAt]
    );

    try{
        io.to(userId).emit("new_notification",{
        id: notificationId,
        id_user: userId,
        message,
        notification_type: type,
        is_read: false,
        created_at: createdAt
      });
    }
    catch(socketError){
      console.log("Could not send notication",socketErorr);
    }

    return notificationId;
  }
  catch(error){
    throw error;
  }
}

app.get("/my-notifications", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.sub;

    const notifications = await all(
      `SELECT id, id_user, message, notification_type, is_read, created_at
      FROM notifications
      WHERE id_user = ?
      ORDER BY created_at DESC`,
      [userId]
    );
    res.json(notifications);
  } catch (e) {
    next(e);
  }
});

app.put("/notification/:id/read", authenticate, async (req, res, next) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.sub;

    const updated = await run(
      `UPDATE notifications
      SET is_read = 1
      WHERE id = ? AND id_user = ?`,
      [notificationId, userId]
    );

    if (updated.changes === 0) {
      return res
        .status(404)
        .json({
          error:
            "Notification not found or you do not have permission to update it.",
        });
    }

    res.status(200).json({ message: "Notification marked as read" });
  } catch (e) {
    next(e);
  }
});

app.put("/my-notifications/read-all", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.sub;

    const updated = await run(
      `UPDATE notifications
      SET is_read = 1
      WHERE id_user = ? AND is_read = 0`,
      [userId]
    );

    res.status(200).json({
      message: "All unread notifications marked as read.",
      count: updated.changes,
    });
  } catch (e) {
    next(e);
  }
});

app.post("/notification", async (req, res, next) => {
  try {
    const notification = req.body;
    notification.is_read = false;
    validateNotification(notification);
    const added = await run(
      `INSERT INTO notifications (id, id_user, message, notification_type, is_read, created_at) VALUES (?,?,?,?,?,?)`,
      [
        uuid(),
        notification.user,
        notification.message,
        notification.type,
        notification.is_read,
        notification.created_at,
      ]
    );
    res.json(added);
  } catch (e) {
    next(e);
  }
});

app.delete("/notification/:id", authenticate, async (req, res, next) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.sub;

    const deleted = await run(
      `DELETE FROM notifications
      WHERE id=? and id_user= ?`,
      [notificationId, userId]
    );

    if (deleted.changes === 0) {
      return res
        .status(404)
        .json({
          error:
            "Notification not found or you do not have permission to delete it.",
        });
    }

    return res
      .status(200)
      .json({ message: "Notification deleted successfully" });
  } catch (e) {
    next(e);
  }
});

app.post("/conversations", authenticate, async (req, res, next) => {
  try {
    const { buyer_id, seller_id } = req.body;
    const conversationId = uuid();
    await run(
      `INSERT INTO conversations (id, seller_id, buyer_id) VALUES (?,?,?)`,
      [conversationId, seller_id, buyer_id]
    );
    const newConversation = {
      id: conversationId,
      seller_id,
      buyer_id,
    };
    res.status(201).json(newConversation);
  } catch (e) {
    next(e);
  }
});

app.post(
  "/conversations/:id/messages",
  authenticate,
  async (req, res, next) => {
    try {
      const { message, from_user, created_at, is_read, to_user } = req.body;
      const conversation_id = req.params.id;
      const messageId = uuid();
      await run(
        `INSERT INTO messages (id, conversation_id, message, created_at, is_read, from_user, to_user) VALUES (?,?,?,?,?,?,?)`,
        [
          messageId,
          conversation_id,
          message,
          created_at,
          parseInt(is_read),
          from_user,
          to_user,
        ]
      );
      const newMessage = {
        id: messageId,
        conversation_id,
        message,
        created_at,
        is_read: parseInt(is_read),
        from_user,
        to_user,
      };
      res.status(201).json(newMessage);
    } catch (e) {
      next(e);
    }
  }
);

app.put(
  "/conversations/:cid/messages/:mid",
  authenticate,
  async (req, res, next) => {
    try {
      const numericColumns = ["is_read"];
      const processedBody = processBody(req.body, numericColumns);
      const MESSAGE_UPDATABLE_COLUMNS = ["message", "is_read", "created_at"];
      const { statement, values } = prepareUpdateStatement(
        processedBody,
        "messages",
        MESSAGE_UPDATABLE_COLUMNS
      );
      const finalValues = [...values, req.params.mid];

      await run(statement, finalValues);
      const updated = await get(`SELECT * FROM messages WHERE id = ?`, [
        req.params.mid,
      ]);
      if (!updated)
        return res
          .status(404)
          .json({ error: "Message not found after update" });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  }
);

app.get("/my-trusted-request", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const request = await get(
      `
            SELECT id, status, created_at, pitch
            FROM trusted_requests 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 1
        `,
      [userId]
    );

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

    if (req.user.role === "Trusted" || req.user.role === "Admin") {
      return res
        .status(400)
        .json({ error: "You are already a verified seller." });
    }

    const existing = await get(
      `SELECT 1 FROM trusted_requests WHERE user_id = ? AND status = 'pending'`,
      [userId]
    );
    if (existing) {
      return res
        .status(400)
        .json({ error: "You already have a pending application." });
    }

    const requestId = uuid();
    await run(
      `INSERT INTO trusted_requests (id, user_id, pitch, status, created_at)
       VALUES (?, ?, ?, 'pending', datetime('now'))`,
      [requestId, userId, pitch]
    );

    const admins = await all(`SELECT id FROM users WHERE role = 'Admin'`);

    const user = await get(`SELECT name FROM users WHERE id = ?`, [userId]);
    const userName = user ? user.name : "A user";

    if (admins.length > 0) {
      const notificationPromises = admins.map((admin) => 
        sendNotification(
          admin.id, 
          `${userName} has requested to become a Trusted Seller.`, 
          "system"
        )
      );
      await Promise.all(notificationPromises);
    }

    res.status(201).json({ message: "Application submitted successfully" });
  } catch (e) {
    next(e);
  }
});

app.get(
  "/admin/requests",
  authenticate,
  requireAdmin,
  async (req, res, next) => {
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
  }
);

app.post(
  "/admin/request/:id/:action",
  authenticate,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { id, action } = req.params;
      if (!["approve", "reject"].includes(action)) {
        return res.status(400).json({ error: "Invalid action" });
      }

      const request = await get(
        `SELECT user_id FROM trusted_requests WHERE id = ?`,
        [id]
      );
      if (!request) return res.status(404).json({ error: "Request not found" });

      const status = action === "approve" ? "approved" : "rejected";

      await run(`UPDATE trusted_requests SET status = ? WHERE id = ?`, [
        status,
        id,
      ]);

      if (action === "approve") {
        await run(`UPDATE users SET role = 'Trusted' WHERE id = ?`, [
          request.user_id,
        ]);

        await sendNotification(
          request.user_id,
          "Congratulations! Your request for Trusted status has been approved.",
          "system"
        );
      } else {
        await sendNotification(
          request.user_id,
          "Your request for Trusted status has been rejected.",
          "system"
        );
      }

      res.json({ message: `Request ${status}` });
    } catch (e) {
      next(e);
    }
  }
);

function prepareUpdateStatement(updatedData, table, allowedColumns) {
  const allowedKeys = Object.keys(updatedData).filter((key) =>
    allowedColumns.includes(key)
  );
  const validKeys = allowedKeys.filter((key) => {
    const value = updatedData[key];
    return value !== null && value !== undefined && value !== "";
  });
  if (validKeys.length === 0)
    throw new Error("No valid fields provided for update.");

  const setClause = validKeys.map((key) => `\`${key}\` = ?`).join(", ");
  const values = validKeys.map((key) => updatedData[key]);
  const statement = `UPDATE \`${table}\` SET ${setClause} WHERE id = ?`;
  return { statement, values };
}

function processBody(body, numericColumns) {
  let processedBody = { ...body };
  for (const key of Object.keys(processedBody)) {
    if (numericColumns.includes(key)) {
      const value = processedBody[key];
      if (value !== null && value !== undefined && value !== "")
        processedBody[key] = parseInt(value, 10);
    }
  }
  return processedBody;
}

app.put("/product/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const numericColumns = ["price"];
    const processedBody = processBody(req.body, numericColumns);
    const PRODUCT_UPDATABLE_COLUMNS = [
      "title",
      "description",
      "price",
      "category",
    ];
    const { statement, values } = prepareUpdateStatement(
      processedBody,
      "products",
      PRODUCT_UPDATABLE_COLUMNS
    );
    const finalValues = [...values, id];

    const updated = await run(statement, finalValues);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

app.put("/order/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const numericColumns = ["price"];
    const processedBody = processBody(req.body, numericColumns);
    const ORDER_UPDATABLE_COLUMNS = ["buyer", "price", "status"];
    const { statement, values } = prepareUpdateStatement(
      processedBody,
      `orders`,
      ORDER_UPDATABLE_COLUMNS
    );
    const finalValues = [...values, id];

    const updated = await run(statement, finalValues);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

app.put("/review/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const numericColumns = ["rating"];
    const processedBody = processBody(req.body, numericColumns);
    const REVIEW_UPDATABLE_COLUMNS = ["rating", "comment"];
    const { statement, values } = prepareUpdateStatement(
      processedBody,
      `reviews`,
      REVIEW_UPDATABLE_COLUMNS
    );
    const finalValues = [...values, id];

    const updated = await run(statement, finalValues);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

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
  res
    .status(err.status || 500)
    .json({ error: err.message || "Internal error" });
});

const PORT = process.env.PORT || 3000;

async function main() {
  await migrate();

  //DB population - uncomment at first run
  await seed();

  httpServer.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));

  process.on("SIGINT", () => db.close(() => process.exit(0)));
}

main().catch((e) => {
  console.error("Fatal startup error:", e);
  process.exit(1);
});
