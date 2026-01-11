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

const dirs = ["uploads", "uploads/products", "uploads/avatars"];
dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

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

const createStorage = (subfolder) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join("uploads", subfolder));
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(
        null,
        file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
      );
    },
  });
};

export const uploadProduct = multer({ storage: createStorage("products") });
export const uploadAvatar = multer({ storage: createStorage("avatars") });

app.use("/uploads", express.static("uploads"));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-cheie-falsa-doar-ca-sa-mearga-serverul",
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
      avatarUrl: '/uploads/avatars/person1.jpg',
    },
    {
      name: "b",
      email: "b@gmail.com",
      password: "b",
      role: "Untrusted",
      country: "RO",
      city: "Cluj-Napoca",
      karma: 10,
      avatarUrl: '/uploads/avatars/person2.jpg',
    },
    {
      name: "c",
      email: "c@gmail.com",
      password: "c",
      role: "Untrusted",
      country: "RO",
      city: "Cluj-Napoca",
      karma: 60,
      avatarUrl: '/uploads/avatars/person3.jpg',
    },
    {
      name: "d",
      email: "d@gmail.com",
      password: "d",
      role: "Untrusted",
      country: "RO",
      city: "Cluj-Napoca",
      karma: 110,
      avatarUrl: '/uploads/avatars/person4.jpg',
    },
    {
      name: "admin",
      email: "admin@edgeup.com",
      password: "admin",
      role: "Admin",
      country: "RO",
      city: "București",
      karma: 1000,
      avatarUrl: '/uploads/avatars/person5.jpg',
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
        `INSERT INTO users (id, name, email, password, role, country, city, karma, avatarUrl)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, 
          u.name, 
          u.email, 
          hashed, 
          u.role, 
          u.country, 
          u.city, 
          u.karma, 
          u.avatarUrl || null
        ]
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
    imageUrl: "/uploads/products/js-book.jpg",
    stock: 1,
  },
  {
    title: "Mouse Office",
    description: "Mouse optic simplu, USB.",
    price: 60,
    sellerEmail: "a@yahoo.com",
    category: "Electronics",
    imageUrl: "/uploads/products/office-mouse.jpg",
    stock: 0,
  },
  {
    title: "Pernă decorativă",
    description: "Pernă 40x40, umplutură sintetică.",
    price: 45,
    sellerEmail: "a@yahoo.com",
    category: "Home",
    imageUrl: "/uploads/products/decorative-pillow.png",
    stock: 3
  },
  {
    title: "Haina alba",
    description: "Haina alba de iarna",
    price: 300,
    sellerEmail: "a@yahoo.com",
    category: "Clothes",
    imageUrl: "/uploads/products/image-1767526183037-168835722.jpg",
    stock: 0
  },
  {
    title: "Set vase",
    description: "Set vase de bucatarie",
    price: 250,
    sellerEmail: "a@yahoo.com",
    category: "Home",
    imageUrl: "/uploads/products/image-1767526246113-512683878.jpg",
    stock: 1,
  },
  {
    title: "Bormasina",
    description: "Bormasina de dat gauri",
    price: 150,
    sellerEmail: "a@yahoo.com",
    category: "Home",
    imageUrl: "/uploads/products/image-1767526319227-423631283.jpg",
    stock: 3,
  },
  {
    title: "Golf 4",
    description: "Masina golf 4 2003",
    price: 5000,
    sellerEmail: "a@yahoo.com",
    category: "Other",
    imageUrl: "/uploads/products/image-1767526382630-134354687.jpg",
    stock: 1,
  },
  {
    title: "Tractor",
    description: "Tractor de semanat porumb",
    price: 25000,
    sellerEmail: "a@yahoo.com",
    category: "Other",
    imageUrl: "/uploads/products/image-1767526446540-295008304.jpg",
    stock: 1,
  },
  {
    title: "Carte jocuri de craciun",
    description: "Marea carte cu jocuri de craciun",
    price: 40,
    sellerEmail: "a@yahoo.com",
    category: "Books",
    imageUrl: "/uploads/products/image-1767526523036-271840831.png",
    stock: 2,
  },
  {
    title: "Tricou gucci",
    description: "Tricou gucci purtat odata",
    price: 1500,
    sellerEmail: "a@yahoo.com",
    category: "Clothes",
    imageUrl: "/uploads/products/image-1767526607401-48250080.jpg",
    stock: 0
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
      `INSERT INTO products (id, title, description, price, seller, category, imageUrl, stock, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pid,
        p.title,
        p.description ?? "",
        p.price,
        seller.id,
        p.category,
        p.imageUrl ?? null,
        p.stock,
        'ACTIVE'
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

  // Demo negocieri
  const dbUsers = await all(`SELECT id, email FROM users`);
  const usersMap = Object.fromEntries(dbUsers.map(u => [u.email, u.id]));

  const dbProducts = await all(`SELECT id, title, seller FROM products`);
  const productsMap = Object.fromEntries(dbProducts.map(p => [p.title, p]));

  const demoNegotiations = [
    {
      productTitle: "Carte JS pentru Începători",
      buyerEmail: "b@gmail.com",
      offeredPrice: 100,
      quantity: 1,
      status: "PENDING"
    },
    {
      productTitle: "Mouse Office",
      buyerEmail: "c@gmail.com",
      offeredPrice: 30,
      quantity: 2,
      status: "REJECTED"
    },
    {
      productTitle: "Pernă decorativă",
      buyerEmail: "d@gmail.com",
      offeredPrice: 40,
      quantity: 1,
      status: "ACCEPTED"
    },
    {
      productTitle: "Set vase",
      buyerEmail: "b@gmail.com",
      offeredPrice: 200,
      quantity: 1,
      status: "ORDERED"
    },
    {
      productTitle: "Golf 4",
      buyerEmail: "c@gmail.com",
      offeredPrice: 4500,
      quantity: 1, 
      status: "PENDING"
    }
  ];

  for (const neg of demoNegotiations) {
    const product = productsMap[neg.productTitle];
    const buyerId = usersMap[neg.buyerEmail];

    if (!product) {
      console.warn(`[seed-neg] Produsul '${neg.productTitle}' nu a fost găsit.`);
      continue;
    }
    if (!buyerId) {
      console.warn(`[seed-neg] Buyerul '${neg.buyerEmail}' nu a fost găsit.`);
      continue;
    }

    const exists = await get(
      `SELECT 1 as ok FROM negotiations WHERE product_id = ? AND buyer_id = ? AND status = ?`,
      [product.id, buyerId, neg.status]
    );

    if (exists) {
      console.log(`[seed-neg] Negocierea pentru '${neg.productTitle}' deja există.`);
      continue;
    }

    const negId = uuid();
    
    await run(
      `INSERT INTO negotiations (id, product_id, buyer_id, seller_id, offered_price, quantity, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        negId,
        product.id,
        buyerId,
        product.seller,
        neg.offeredPrice,
        neg.quantity,
        neg.status
      ]
    );

    console.log(`[seed-neg] Created '${neg.status}' deal: ${neg.buyerEmail} -> ${neg.productTitle} (x${neg.quantity})`);
  }

  // Demo orders
  const productsList = await all(`SELECT id FROM products`);
  
  if (!productsList || productsList.length === 0) {
    console.warn("[seed] Nu există produse, nu pot crea comenzi demo (lipsește product_id).");
  } else {

    const demoOrders = [
      { buyerEmail: "b@gmail.com", price: 120, quantity: 1, status: "pending" },
      { buyerEmail: "b@gmail.com", price: 60, quantity: 1, status: "paid" },
      { buyerEmail: "a@yahoo.com", price: 90, quantity: 2, status: "shipped" },
    ];

    let prodIndex = 0;

    for (const o of demoOrders) {
      const buyer = byEmail[o.buyerEmail];
      if (!buyer) {
        console.warn(`[seed] Nu pot crea order pentru ${o.buyerEmail} (user inexistent)`);
        continue;
      }

      const product = productsList[prodIndex % productsList.length];
      prodIndex++;

      const demoAddress = "Strada Exemplu nr. 1, București";

      const exists = await get(
        `SELECT 1 AS ok FROM orders 
         WHERE buyer_id = ? AND price = ? AND status = ? AND product_id = ?`,
        [buyer.id, o.price, o.status, product.id]
      );

      if (exists) {
        console.log(
          `[seed] Order deja există pentru ${o.buyerEmail} (${o.status})`
        );
        continue;
      }

      const oid = uuid();
      
      await run(
        `INSERT INTO orders (id, buyer_id, product_id, price, quantity, status, shipping_address) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          oid, 
          buyer.id, 
          product.id, 
          o.price, 
          o.quantity,
          o.status, 
          demoAddress
        ]
      );
      
      console.log(`[seed] Created order for ${o.buyerEmail} -> Product: ${product.id} (x${o.quantity})`);
    }
  }

  // Demo favorite
  const demoFavorites = [
    { userEmail: "b@gmail.com", productTitle: "Mouse Office" },
    { userEmail: "b@gmail.com", productTitle: "Pernă decorativă" },
    { userEmail: "d@gmail.com", productTitle: "Carte JS pentru Începători" },
    { userEmail: "admin@edgeup.com", productTitle: "Mouse Office" }, 
    { userEmail: "a@yahoo.com", productTitle: "Pernă decorativă" }
  ];

  const usersForFav = await all(`SELECT id, email FROM users`);
  const usersMapFav = Object.fromEntries(usersForFav.map(u => [u.email, u.id]));

  const productsForFav = await all(`SELECT id, title FROM products`);
  const productsMapFav = Object.fromEntries(productsForFav.map(p => [p.title, p.id]));

  for (const f of demoFavorites) {
    const userId = usersMapFav[f.userEmail];
    const productId = productsMapFav[f.productTitle];

    if (!userId) {
      console.warn(`[seed] Userul ${f.userEmail} nu a fost găsit pentru favorite.`);
      continue;
    }
    if (!productId) {
      console.warn(`[seed] Produsul '${f.productTitle}' nu a fost găsit pentru favorite.`);
      continue;
    }

    const exists = await get(
      `SELECT 1 as ok FROM favorites WHERE user_id = ? AND product_id = ?`,
      [userId, productId]
    );

    if (exists) {
      console.log(`[seed] Favorite deja existent: ${f.userEmail} -> ${f.productTitle}`);
      continue;
    }

    const fid = uuid();
    await run(
      `INSERT INTO favorites (id, user_id, product_id, created_at) VALUES (?, ?, ?, datetime('now'))`,
      [fid, userId, productId]
    );
    console.log(`[seed] Adăugat la favorite: ${f.userEmail} -> '${f.productTitle}'`);
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

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      country: user.country,
      city: user.city,
      karma: user.karma,
      avatarUrl: user.avatarUrl,
    };

    const userWithImage = attachAvatarToUser(userResponse);

    return res.status(200).json({
      token,
      user: userWithImage,
    });
  } catch (e) {
    next(e);
  }
});

app.post("/register", uploadAvatar.single("avatar"), async (req, res, next) => {
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

    let avatarUrl = null;
    if (req.file) {
      avatarUrl = "/" + req.file.path.replace(/\\/g, "/");
    }

    const id = uuid();
    
    await run(
      `INSERT INTO users (id, name, email, password, role, country, city, karma, avatarUrl)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [id, name, email, hashed, role, country, city, avatarUrl]
    );

    const token = jwt.sign({ sub: id, role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES || "1h",
    });

    return res.status(201).json({
      token,
      user: { id, name, email, role, country, city, avatarUrl },
    });
  } catch (e) {
    next(e);
  }
});

app.put("/user/profile", authenticate, uploadAvatar.single("avatar"), async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.sub;
    const { name, email, country, city } = req.body;

    if (!name || !email || !country || !city) {
      return res.status(400).json({ error: "All fields are required." });
    }

    let avatarPath = null;
    if (req.file) {
      avatarPath = "/" + req.file.path.replace(/\\/g, "/");
    }


    if (avatarPath) {
      await run(
        `UPDATE users 
         SET name = ?, email = ?, country = ?, city = ?, avatarUrl = ? 
         WHERE id = ?`,
        [name, email, country, city, avatarPath, userId]
      );
    } else {
      await run(
        `UPDATE users 
         SET name = ?, email = ?, country = ?, city = ? 
         WHERE id = ?`,
        [name, email, country, city, userId]
      );
    }

    const updatedUser = await get(
      `SELECT id, name, email, role, country, city, karma, avatarUrl FROM users WHERE id = ?`,
      [userId]
    );

    res.json(updatedUser);

  } catch (err) {
    if (err.message && err.message.includes("UNIQUE constraint failed")) {
      return res.status(409).json({ error: "Email is already in use by another account." });
    }
    next(err);
  }
});

const attachAvatarToUser = (user) => {
  if (!user || !user.avatarUrl) return user;

  try {
    const relativePath = user.avatarUrl.startsWith("/") 
      ? user.avatarUrl.slice(1) 
      : user.avatarUrl;

    const absolutePath = path.resolve(relativePath);
    if (fs.existsSync(absolutePath)) {
      const imageBuffer = fs.readFileSync(absolutePath);
      
      const base64Image = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;

      return { ...user, avatarImage: base64Image };
    }
  } catch (err) {
    console.error("Error processing avatar:", err);
  }

  return user;
};

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

    const user = await get(
      `SELECT id, name, email, role, country, city, karma, avatarUrl FROM users WHERE id = ?`, 
      [payload.sub]
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userWithImage = attachAvatarToUser(user);

    return res.status(200).json({ user: userWithImage });
  } catch (e) {
    next(e);
  }
});

app.get("/products", async (req, res, next) => {
  try {
    let { 
      category, 
      search, 
      page = 1, 
      limit = 12, 
      sortBy = 'title', 
      order = 'ASC' 
    } = req.query;

    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.max(1, Math.min(100, parseInt(limit) || 12)); 
    const offset = (safePage - 1) * safeLimit;

    const validSortColumns = ['title', 'price', 'favorites_count'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'title';
    
    const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        userId = payload.sub;
      } catch (err) { }
    }

    const params = [];
    let favoriteColumnSQL = "0 AS isFavorite"; 
    
    if (userId) {
      favoriteColumnSQL = `(EXISTS (SELECT 1 FROM favorites f WHERE f.product_id = p.id AND f.user_id = ?)) AS isFavorite`;
      params.push(userId);
    }

    let sql = `
        SELECT p.id, p.title, p.description, p.price, p.category, p.imageUrl, p.stock,
               u.id AS seller_id, u.name AS seller_name, u.email AS seller_email,
               ${favoriteColumnSQL},
               (SELECT COUNT(*) FROM favorites fav WHERE fav.product_id = p.id) AS favorites_count
        FROM products p
        INNER JOIN users u ON p.seller = u.id
    `;

    const conditions = ["p.status = 'ACTIVE'"]; 

    if (category) {
      conditions.push("LOWER(p.category) = LOWER(?)");
      params.push(category);
    }
    if (search) {
      conditions.push("(LOWER(p.title) LIKE LOWER(?) OR LOWER(p.description) LIKE LOWER(?))");
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) sql += " WHERE " + conditions.join(" AND ");

    sql += ` ORDER BY ${sortColumn} ${sortOrder}, p.id ASC`;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(safeLimit, offset);

    const rows = await all(sql, params);

    res.json({
        products: rows.map(row => ({ ...row, isFavorite: Boolean(row.isFavorite) })),
        currentPage: safePage,
        itemsPerPage: safeLimit
    });
  } catch (e) {
    next(e);
  }
});

app.get("/my-products", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.sub;

    const favoriteColumnSQL = `
        (EXISTS (
           SELECT 1 
           FROM favorites f 
           WHERE f.product_id = p.id AND f.user_id = ?
        )) AS isFavorite
      `;

    const sql = `
            SELECT p.id,
                   p.title,
                   p.description,
                   p.price,
                   p.category,
                   p.imageUrl,
                   p.stock,
                   u.id    AS seller_id,
                   u.name  AS seller_name,
                   u.email AS seller_email,
                   u.role  AS seller_role,
                   u.country  AS seller_country,
                   u.city  AS seller_city,
                   ${favoriteColumnSQL}
            FROM products p
            INNER JOIN users u ON p.seller = u.id
            WHERE p.seller = ? AND p.status = 'ACTIVE'
            ORDER BY p.title
        `;

    const params = [userId, userId];

    const rows = await all(sql, params);

    const formattedRows = rows.map((row) => ({
      ...row,
      isFavorite: Boolean(row.isFavorite),
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
          p.stock,
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

app.delete("/product/:id", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.sub;

    const product = await get(`SELECT seller FROM products WHERE id = ?`, [id]);
    
    if (!product) return res.status(404).json({ error: "Product not found" });
    if (product.seller !== userId) return res.status(403).json({ error: "Not authorized" });

    await run(`UPDATE products SET status = 'ARCHIVED' WHERE id = ?`, [id]);

    res.json({ message: "Product deleted successfully" });
  } catch (e) {
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
       WHERE f.user_id = ? AND p.status = 'ACTIVE' 
       ORDER BY f.created_at DESC`,
      [userId]
    );

    const formattedFavorites = favorites.map(fav => ({
        ...fav,
        isFavorite: true 
    }));

    res.json(formattedFavorites);
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

app.get("/orders/buying", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.sub;

    const orders = await all(`
      SELECT 
        o.id, 
        o.price, 
        o.status, 
        o.created_at, 
        p.title as product_title, 
        p.imageUrl as product_image,
        p.id as product_id
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.buyer_id = ?
      ORDER BY o.created_at DESC
    `, [userId]);

    res.json(orders);
  } catch (e) {
    next(e);
  }
});

app.get("/orders/selling", authenticate, async (req, res, next) => {
  try {
    const sellerId = req.user.sub;

    const orders = await all(`
      SELECT 
        o.id, 
        o.product_id,
        o.price, 
        o.status, 
        o.created_at, 
        o.shipping_address,
        p.title as product_title, 
        p.imageUrl as product_image,
        u.email as buyer_email,
        u.name as buyer_name
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users u ON o.buyer_id = u.id
      WHERE p.seller = ?
      ORDER BY o.created_at DESC
    `, [sellerId]);

    res.json(orders);
  } catch (e) {
    next(e);
  }
});

app.get("/orders/:id", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.sub;

    const order = await get(`
      SELECT 
        o.*, 
        p.title, 
        p.imageUrl, 
        p.seller as seller_id,
        u_buyer.email as buyer_email,
        u_buyer.name as buyer_name
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users u_buyer ON o.buyer_id = u_buyer.id
      WHERE o.id = ?
    `, [id]);

    if (!order) return res.status(404).json({ error: "Comanda nu există" });

    const isBuyer = order.buyer_id === userId;
    const isSeller = order.seller_id === userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ error: "Nu ai acces la această comandă" });
    }

    res.json({ ...order, role: isBuyer ? 'buyer' : 'seller' });
  } catch (e) {
    next(e);
  }
});

app.patch("/orders/:id/status", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.sub;

    const allowedStatuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Status invalid" });
    }

    const orderData = await get(`
      SELECT o.id, o.buyer_id, p.seller, p.title as product_title
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.id = ?
    `, [id]);

    if (!orderData) return res.status(404).json({ error: "Comanda nu există" });

    if (orderData.seller !== userId) {
      return res.status(403).json({ error: "Doar vânzătorul poate actualiza statusul" });
    }

    await run(`UPDATE orders SET status = ? WHERE id = ?`, [status, id]);

    let notificationMessage = `Your order for "${orderData.product_title}" status updated to: ${status}`;
    if (status === 'shipped') notificationMessage = `Your order for "${orderData.product_title}" has been shipped! 🚚`;
    if (status === 'delivered') notificationMessage = `Your order for "${orderData.product_title}" has been delivered! 🎉`;

    await sendNotification(orderData.buyer_id, notificationMessage, "order");

    res.json({ message: "Status actualizat", status });
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
  const { price, status, shipping_address, productId } = order;
  let errors = [];

  if (price === undefined || price === null || isNaN(parseInt(price)) || parseInt(price) < 0) {
    errors.push("Invalid price: must be a positive number");
  }

  const validStatuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
  if (!status || !validStatuses.includes(status)) {
    errors.push(`Invalid status: must be one of ${validStatuses.join(", ")}`);
  }

  if (!shipping_address || typeof shipping_address !== 'string' || shipping_address.trim().length < 5) {
    errors.push("Invalid shipping address: must be at least 5 characters long");
  }

  if (!productId || typeof productId !== 'string') {
    errors.push("Product ID is required to process the order");
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
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
  uploadProduct.single("image"),
  async (req, res, next) => {
    try {
      const product = req.body;
      const imageFile = req.file;
      const sellerId = req.user.sub;
      validateProduct(product);
      const newProductId = uuid();

      let imageUrl = null;
      if (imageFile) {
        imageUrl = `/uploads/products/${imageFile.filename}`;
      }

      const stockValue = parseInt(product.stock) || 1;

      await run(
        `INSERT INTO products (id, title, description, price, seller, category, imageUrl, stock, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newProductId,
          product.title,
          product.description,
          parseInt(product.price),
          sellerId,
          product.category,
          imageUrl,
          stockValue,
          'ACTIVE'     
        ]
      );

      const newProduct = await get(
        `
          SELECT 
            p.id, p.title, p.description, p.price, p.category, p.imageUrl,
            p.stock, p.status,
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

app.get("/negotiations/list", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.sub;

    const negotiations = await all(
      `SELECT 
        n.*,
        p.title as product_title,
        p.imageUrl as product_image,
        u_buyer.email as buyer_email,
        u_seller.email as seller_email
       FROM negotiations n
       JOIN products p ON n.product_id = p.id
       JOIN users u_buyer ON n.buyer_id = u_buyer.id
       JOIN users u_seller ON n.seller_id = u_seller.id
       WHERE n.buyer_id = ? OR n.seller_id = ?
       ORDER BY n.created_at DESC`,
      [userId, userId]
    );

    res.json(negotiations);
  } catch (e) {
    next(e);
  }
});

app.post("/negotiations", authenticate, async (req, res, next) => {
  try {
    const { productId, offeredPrice, quantity = 1 } = req.body;
    const buyerId = req.user.sub;
    const qty = parseInt(quantity);

    if (qty < 1) return res.status(400).json({ error: "Cantitatea minimă este 1" });

    const product = await get(`SELECT seller, stock, status FROM products WHERE id = ?`, [productId]);
    if (!product) return res.status(404).json({ error: "Produsul nu există" });
    if (product.status !== 'ACTIVE') return res.status(400).json({ error: "Produs indisponibil" });
    
    if (product.stock < qty) return res.status(400).json({ error: `Stoc insuficient. Doar ${product.stock} disponibile.` });

    if (product.seller === buyerId) return res.status(400).json({ error: "Nu poți negocia propriul produs" });

    const negId = uuid();
    await run(
      `INSERT INTO negotiations (id, product_id, buyer_id, seller_id, offered_price, quantity, status)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
      [negId, productId, buyerId, product.seller, offeredPrice, qty]
    );

    res.status(201).json({ message: "Offer sent", id: negId });
  } catch (e) {
    next(e);
  }
});

app.get("/negotiation", authenticate, async (req, res, next) => {
  try {
    const { productId, negotiationId } = req.query;
    const buyerId = req.user.sub;

    let negotiation = null;

    if (negotiationId) {
      negotiation = await get(
        `SELECT id, offered_price, quantity, status 
         FROM negotiations 
         WHERE id = ? AND buyer_id = ?`,
        [negotiationId, buyerId]
      );
    } else if (productId) {
      negotiation = await get(
        `SELECT id, offered_price, quantity, status 
         FROM negotiations 
         WHERE product_id = ? AND buyer_id = ? 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [productId, buyerId]
      );
    } else {
      return res.status(400).json({ error: "Lipsesc parametrii (productId sau negotiationId)" });
    }

    if (!negotiation) {
      return res.status(200).json(null);
    }

    res.json({
      negotiationId: negotiation.id,
      price: negotiation.offered_price,
      quantity: negotiation.quantity,
      status: negotiation.status
    });

  } catch (e) {
    next(e);
  }
});

app.patch("/negotiations/:id/accept", authenticate, async (req, res, next) => {
  try {
    const negotiationId = req.params.id;
    const sellerId = req.user.sub;

    const data = await get(`
        SELECT 
            n.id, n.seller_id, n.buyer_id, n.quantity, n.offered_price,
            p.stock, p.status as product_status, p.title
        FROM negotiations n
        JOIN products p ON n.product_id = p.id
        WHERE n.id = ?
    `, [negotiationId]);

    if (!data) return res.status(404).json({ error: "Negociere inexistentă" });
    if (data.seller_id !== sellerId) return res.status(403).json({ error: "Nu ești vânzătorul produsului" });

    if (data.product_status !== 'ACTIVE') {
        return res.status(400).json({ error: "Produsul nu mai este activ (a fost șters sau arhivat)." });
    }

    if (data.stock < data.quantity) {
        return res.status(400).json({ 
            error: `Stoc insuficient! Oferta este pentru ${data.quantity} buc, dar stocul actual este ${data.stock}.` 
        });
    }

    await run(`UPDATE negotiations SET status = 'ACCEPTED' WHERE id = ?`, [negotiationId]);

    await sendNotification(
        data.buyer_id,
        `Great news! Your offer for "${data.title}" was accepted. Go to 'Offers' to complete the order.`,
        'deal'
    );

    res.json({ message: "Ofertă acceptată.", status: 'ACCEPTED' });
  } catch (e) { next(e); }
});

app.patch("/negotiations/:id/decline", authenticate, async (req, res, next) => {
  try {
    const negotiationId = req.params.id;
    const sellerId = req.user.sub;

    const negotiation = await get(`SELECT * FROM negotiations WHERE id = ?`, [negotiationId]);
    if (!negotiation) return res.status(404).json({ error: "Negociere inexistentă" });
    if (negotiation.seller_id !== sellerId) return res.status(403).json({ error: "Nu ești vânzătorul produsului" });

    await run(`UPDATE negotiations SET status = 'REJECTED' WHERE id = ?`, [negotiationId]);

    res.json({ message: "Ofertă respinsă.", status: 'REJECTED' });
  } catch (e) { next(e); }
});

app.post("/order", authenticate, async (req, res, next) => {
  try {
    const { productId, shipping_address, negotiationId, quantity } = req.body; 
    const buyerId = req.user.sub;
    
    let finalUnitPrice = 0;
    let finalQuantity = parseInt(quantity || 1);

    if (negotiationId) {
      const negotiation = await get(`SELECT * FROM negotiations WHERE id = ?`, [negotiationId]);

      if (!negotiation) return res.status(404).json({ error: "Negociere invalidă" });
      if (negotiation.buyer_id !== buyerId) return res.status(403).json({ error: "Nu e negocierea ta" });
      if (negotiation.status !== 'ACCEPTED') return res.status(400).json({ error: "Oferta nu a fost acceptată încă" });
      
      finalUnitPrice = negotiation.offered_price;
      finalQuantity = negotiation.quantity;

      await run(`UPDATE negotiations SET status = 'ORDERED' WHERE id = ?`, [negotiationId]);
    } 
    else {
      const product = await get(`SELECT price FROM products WHERE id = ?`, [productId]);
      if (!product) return res.status(404).json({ error: "Produsul nu există" });
      finalUnitPrice = product.price;
    }

    const productData = await get(`SELECT stock, status, seller, title FROM products WHERE id = ?`, [productId]);
    
    if (productData.stock < finalQuantity) {
        return res.status(400).json({ error: `Stoc insuficient. Negocierea a fost pentru ${finalQuantity}, dar mai sunt doar ${productData.stock}.` });
    }
    if (productData.status !== 'ACTIVE') {
        return res.status(400).json({ error: "Produsul nu mai este activ." });
    }

    const totalPrice = finalUnitPrice * finalQuantity;

    const orderId = uuid();
    await run(
      `INSERT INTO orders (id, buyer_id, product_id, price, quantity, status, shipping_address, negotiation_id) 
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [orderId, buyerId, productId, totalPrice, finalQuantity, shipping_address, negotiationId || null]
    );

    await run(`UPDATE products SET stock = stock - ? WHERE id = ?`, [finalQuantity, productId]);

    await sendNotification(
        productData.seller, 
        `You sold ${finalQuantity} x "${productData.title}" for ${totalPrice} RON!`, 
        'order'
    );

    res.status(201).json({ id: orderId, price: totalPrice, quantity: finalQuantity, status: 'pending' });

  } catch (e) { next(e); }
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

app.put(
  "/product/:id", 
  authenticate, 
  uploadProduct.single('image'),
  async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.sub;
    const currentUserRole = req.user.role;

    const product = await get(`SELECT seller FROM products WHERE id = ?`, [id]);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const isOwner = product.seller === currentUserId;
    const isAdmin = currentUserRole === 'Admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        error: "Forbidden: You are not authorized to edit this product." 
      });
    }

    let dataToUpdate = { ...req.body };

    if (req.file) {
      dataToUpdate.imageUrl = `/uploads/products/${req.file.filename}`;
    }

    const numericColumns = ["price", "stock"]; 
    
    const processedBody = processBody(dataToUpdate, numericColumns); 
    
    const PRODUCT_UPDATABLE_COLUMNS = [
      "title",
      "description",
      "price",
      "category",
      "imageUrl",
      "stock"
    ];

    const { statement, values } = prepareUpdateStatement(
      processedBody,
      "products",
      PRODUCT_UPDATABLE_COLUMNS
    );

    if (values.length === 0) {
       return res.status(400).json({ error: "No valid fields provided for update." });
    }

    const finalValues = [...values, id];

    const updated = await run(statement, finalValues);
    res.json(updated);
  } catch (e) {
    if (e.message === "No valid fields provided for update.") {
        return res.status(400).json({ error: e.message });
    }
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


  if (process.env.NODE_ENV !== 'test') {
       await seed(); 
      httpServer.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
  }
}

main().catch((e) => {
  console.error("Fatal startup error:", e);
  process.exit(1);
});


export { app, httpServer, main };