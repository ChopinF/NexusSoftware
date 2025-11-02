import express from "express";
import { v4 as uuid } from "uuid";
import { db, run, get, all, migrate } from "./db.js";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { log } from "console";
import OpenAI from 'openai';

dotenv.config()
const app = express()
app.use(express.json())
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
    if (!exists) { // daca nu exista deja
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
  const sellers = await all(
    `SELECT id, email, role FROM users WHERE email IN (?, ?)`,
    ["a@yahoo.com", "b@gmail.com"]
  );
  const byEmail = Object.fromEntries(sellers.map(s => [s.email, s]));

  const demoProducts = [
    {
      title: "Carte JS pentru Începători",
      description: "Bazele JavaScript, capitole scurte.",
      price: 120,
      sellerEmail: "a@yahoo.com", // Trusted
      category: "Books",
    },
    {
      title: "Mouse Office",
      description: "Mouse optic simplu, USB.",
      price: 60,
      sellerEmail: "a@yahoo.com", // Trusted
      category: "Electronics",
    },
    {
      title: "Pernă decorativă",
      description: "Pernă 40x40, umplutură sintetică.",
      price: 45,
      sellerEmail: "a@yahoo.com", // Trusted
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

// utils
const assert = (cond, msg, code = 400) => { if (!cond) { const e = new Error(msg); e.status = code; throw e; } };

// valori enums
const Roles = Object.freeze({ Trusted: "Trusted", Untrusted: "Untrusted" });
const Countries = Object.freeze(["RO", "DE", "FR", "UK"]);
const Cities = Object.freeze({
  RO: ["București", "Cluj-Napoca", "Iași", "Timișoara"],
  DE: ["Berlin", "Munich", "Hamburg"],
  FR: ["Paris", "Lyon"],
  UK: ["London", "Manchester"]
});

// mock simplu
app.get('/users', async (req, res, next) => {
  log(`Got into /users`)
  try {
    const rows = await all('SELECT * FROM users ORDER BY name');
    res.json(rows);
  }
  catch (e) {
    next(e)
  }
})

app.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    log(`/login cu ${email}, ${password}`);
    assert(email && password, "email & password missing");
    const user = await get(`SELECT * FROM users WHERE email = ?`, [email]);
    if (!user) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password)
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
        role: user.role
      }
    });
  }
  catch (e) {
    next(e)
  }
})

app.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role = Roles.Untrusted, tara, oras } = req.body;

    log(`/register cu ${name}, ${email}, ${password}, ${role}, ${tara}, ${oras}`);

    assert(name && email && password, "name, email, password sunt obligatorii");
    assert(Object.values(Roles).includes(role), "role invalid");
    assert(Countries.includes(tara), "tara invalida");
    assert(Cities[tara]?.includes(oras), "oras invalid pentru tara");

    // email unic
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
      user: { id, name, email, role, tara, oras }
    });
  } catch (e) {
    next(e);
  }
})

app.get('/products', async (req, res, next) => {
  log(`Got into /products`)
  try {
    //TODO: da improve la logica de filtrare / paginare idk
    const rows = await all('SELECT * FROM products');
    res.json(rows);
  }
  catch (e) {
    next(e)
  }
})

const getResponseGPT = async (system, text, expectJson = false) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      { role: "user", content: text }
    ]
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

app.post('/crawler', async (req, res, next) => {
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
  }
  catch (e) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
})


app.post('/msg', async (req, res, next) => {
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
  }
  catch (e) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
})

// handler erori
app.use((err, _req, res, _next) => {
  res.status(err.status || 500).json({ error: err.message || "Internal error" });
});

const PORT = process.env.PORT || 3000;
await migrate();
await seed();
app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
process.on("SIGINT", () => db.close(() => process.exit(0)));
