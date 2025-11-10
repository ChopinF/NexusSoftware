// server.js
import express from "express";
import { v4 as uuid } from "uuid";
import { db, run, get, all, migrate } from "./db.js";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import OpenAI from "openai";
import cors from "cors";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- utils ---
const assert = (cond, msg, code = 400) => {
  if (!cond) {
    const e = new Error(msg);
    e.status = code;
    throw e;
  }
};

// valori enums
const Roles = Object.freeze({ Trusted: "Trusted", Untrusted: "Untrusted" });
const Countries = Object.freeze(["RO", "DE", "FR", "UK"]);
const Cities = Object.freeze({
  RO: ["București", "Cluj-Napoca", "Iași", "Timișoara"],
  DE: ["Berlin", "Munich", "Hamburg"],
  FR: ["Paris", "Lyon"],
  UK: ["London", "Manchester"],
});

async function seed() {
  // utilizatori demo
  const demoUsers = [
    {
      name: "a",
      email: "a@yahoo.com",
      password: "a",
      role: "Trusted",
      tara: "RO",
      oras: "București",
    },
    {
      name: "b",
      email: "b@gmail.com",
      password: "b",
      role: "Untrusted",
      tara: "RO",
      oras: "Cluj-Napoca",
    },
  ];

  for (const u of demoUsers) {
    const exists = await get(`SELECT 1 as ok FROM users WHERE email = ?`, [u.email]);
    if (!exists) {
      const id = uuid();
      const hashed = await bcrypt.hash(u.password, 10);
      await run(
        `INSERT INTO users (id, name, email, password, role, tara, oras)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, u.name, u.email, hashed, u.role, u.tara, u.oras]
      );
      console.log(`[seed] created user ${u.email} (${u.role})`);
    } else {
      console.log(`[seed] user ${u.email} already exists`);
    }
  }

  // produse demo 
  const sellers = await all(
    `SELECT id, email, role FROM users WHERE email IN (?, ?)`,
    ["a@yahoo.com", "b@gmail.com"]
  );
  const byEmail = Object.fromEntries(sellers.map((s) => [s.email, s]));

  const demoProducts = [
    {
      title: "Carte JS pentru Începători",
      description: "Bazele JavaScript, capitole scurte.",
      price: 120,
      sellerEmail: "a@yahoo.com",
      category: "Books",
    },
    {
      title: "Mouse Office",
      description: "Mouse optic simplu, USB.",
      price: 60,
      sellerEmail: "a@yahoo.com",
      category: "Electronics",
    },
    {
      title: "Pernă decorativă",
      description: "Pernă 40x40, umplutură sintetică.",
      price: 45,
      sellerEmail: "a@yahoo.com",
      category: "Home",
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
      `INSERT INTO products (id, title, description, price, seller, category)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [pid, p.title, p.description ?? "", p.price, seller.id, p.category]
    );
    console.log(`[seed] created product '${p.title}' pentru seller ${p.sellerEmail}`);
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
      return { links: [] }; // fallback
    }
  }
  return { message: raw }; // text simplu
};

app.get("/users", async (_req, res, next) => {
  try {
    const rows = await all("SELECT id, name, email, role, tara, oras FROM users ORDER BY name");
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
        tara: user.tara,
        oras: user.oras,
      },
    });
  } catch (e) {
    next(e);
  }
});

app.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, role = Roles.Untrusted, tara, oras } = req.body;

    assert(name && email && password, "name, email, password sunt obligatorii");
    assert(Object.values(Roles).includes(role), "role invalid");
    assert(Countries.includes(tara), "tara invalida");
    assert(Cities[tara]?.includes(oras), "oras invalid pentru tara");

    const exists = await get(`SELECT 1 AS ok FROM users WHERE email = ?`, [email]);
    assert(!exists, "email deja folosit", 409);

    const hashed = await bcrypt.hash(password, 10);

    const id = uuid();
    await run(
      `INSERT INTO users (id, name, email, password, role, tara, oras)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name, email, hashed, role, tara, oras]
    );

    const token = jwt.sign(
      { sub: id, role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "1h" }
    );

    return res.status(201).json({
      token,
      user: { id, name, email, role, tara, oras },
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

    const user = await get(`SELECT id, name, email, role, tara, oras FROM users WHERE id = ?`, [
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

app.get("/products", async (_req, res, next) => {
  try {
    const rows = await all("SELECT * FROM products");
    res.json(rows);
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
          u.id AS seller_id,
          u.name AS seller_name,
          u.email AS seller_email,
          u.role AS seller_role,
          u.tara AS seller_country,
          u.oras AS seller_city
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

function validateInteger(price){
    return !isNaN(parseInt(price)) && parseInt(price) > 0;
}

function validateEmail(email) {
    //TODO: proper email validation
    return email && email.length > 0;
}

function validateProduct(product) {
    const {title, description, price, sellerEmail, category} = product;
    let errors = [];
    if(!title) errors.push("Invalid title");
    if(!description) errors.push("Invalid description");
    if(!validateInteger(price)) errors.push("Invalid price");
    if(!validateEmail(sellerEmail)) errors.push("Invalid seller");
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

app.post("/product", async (req, res, next) => {
    try{
        const product = req.body;
        validateProduct(product);
        const added = await run(
            `INSERT INTO products (id, title, description, price, seller, category) VALUES (?, ?, ?, ?, ?, ?)`,
            [uuid(), product.title, product.description, parseInt(product.price), product.sellerEmail, product.category],
        );
        res.json(added);
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
        res.json(added);
    } catch (e) {
        next(e);
    }
})

app.post("/notification", async (req, res, next) => {
    try{
        const notification = req.body;
        notification.is_read = false; //TODO: to be determined where this is_read comes from
        validateNotification(notification);
        const added = await run(
            `INSERT INTO notifications (id, id_user, message, notifcation_type, is_read, created_at) VALUES (?,?,?,?,?,?)`,
            [uuid(), notification.user, notification.message, notification.type, notification.is_read, notification.created_at],
        );
        res.json(added);
    } catch (e) {
        next(e);
    }
})

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
        const { updateStatement, updatedValues } = prepareUpdateStatement(processedBody, 'products', PRODUCT_UPDATABLE_COLUMNS);
        const values = [...updatedValues, id];

        const updated = await run(updateStatement, values);
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
        const { updateStatement , updatedValues } = prepareUpdateStatement(processedBody, `orders`, ORDER_UPDATABLE_COLUMNS);
        const values = [...updatedValues, id];

        const updated = await run(updateStatement, values);
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
        const { updateStatement , updatedValues } = prepareUpdateStatement(processedBody, `reviews`, REVIEW_UPDATABLE_COLUMNS);
        const values = [...updatedValues, id];

        const updated = await run(updateStatement, values);
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
      You are a concise and factual assistant.
      Answer briefly and directly to the user's question, focusing only on the requested details.
      If the question is about specifications (e.g. cars, devices, products), list the key specs clearly and succinctly.
      Avoid long explanations or opinions.
      Use plain one sentence.
    `.trim();

    const result = await getResponseGPT(SYSTEM, text);
    return res.json(result);
  } catch (e) {
    console.error("Error:", e);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// handler erori
app.use((err, _req, res, _next) => {
  res.status(err.status || 500).json({ error: err.message || "Internal error" });
});

// --- startup ordonat ---
const PORT = process.env.PORT || 3000;

async function main() {
  await migrate();

  await seed();

  const products = await all(`SELECT id, title FROM products`);
  const users = await all(`SELECT id, email FROM users`);

  const byTitle = Object.fromEntries(products.map((p) => [p.title, p.id]));
  const byUserEmail = Object.fromEntries(users.map((u) => [u.email, u.id]));

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
    const userId = byUserEmail[r.userEmail];
    if (!produsId || !userId) {
      console.warn(`[seed] nu pot crea review pt '${r.productTitle}' / ${r.userEmail}`);
      continue;
    }

    const exists = await get(
      `SELECT 1 AS ok FROM reviews WHERE produs = ? AND user = ?`,
      [produsId, userId]
    );
    if (exists) {
      console.log(`[seed] review deja există pentru ${r.userEmail} -> ${r.productTitle}`);
      continue;
    }

    const rid = uuid();
    await run(
      `INSERT INTO reviews (id, produs, user, rating, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [rid, produsId, userId, r.rating, r.comment]
    );
    console.log(
      `[seed] created review '${r.comment.slice(0, 30)}...' pentru ${r.productTitle}`
    );
  }

  const demoOrders = [
    { buyerEmail: "b@gmail.com", price: 120, status: "pending" },
    { buyerEmail: "b@gmail.com", price: 60, status: "paid" },
    { buyerEmail: "a@yahoo.com", price: 45, status: "shipped" },
  ];

  const byUser = Object.fromEntries(users.map((u) => [u.email, u.id]));

  for (const o of demoOrders) {
    const buyerId = byUser[o.buyerEmail];
    if (!buyerId) {
      console.warn(`[seed] nu pot crea order pentru ${o.buyerEmail}`);
      continue;
    }

    const exists = await get(
      `SELECT 1 AS ok FROM orders WHERE buyer = ? AND price = ? AND status = ?`,
      [buyerId, o.price, o.status]
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
      [oid, buyerId, o.price, o.status]
    );
    console.log(`[seed] created order for ${o.buyerEmail} (${o.status})`);
  }

  // start 
  app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));

  process.on("SIGINT", () => db.close(() => process.exit(0)));
}

main().catch((e) => {
  console.error("Fatal startup error:", e);
  process.exit(1);
});