import request from "supertest";
import fs from "fs";
import path from "path";
import { app, httpServer } from "./server.js";
import { db, run, migrate } from "./db.js";

// Folosim o bază de date separată pentru teste ca să nu stricăm datele reale
const TEST_DB_PATH = path.resolve("./test_app.db");

beforeAll(async () => {
  process.env.JWT_SECRET = "test-secret-key";
  process.env.DB_PATH = TEST_DB_PATH;
  
  // Asigurăm structura bazei de date
  await migrate();
  // Curățăm datele vechi înainte de teste
  await run("DELETE FROM users");
  await run("DELETE FROM products");
  await run("DELETE FROM orders");
});

// Dupa teste, inchidem tot
afterAll((done) => {
  // 1. Încercăm să închidem conexiunea la baza de date
  db.close((err) => {
    // Indiferent dacă dă eroare sau nu la închidere...

    // 2. Încercăm să ștergem fișierul
    if (fs.existsSync(TEST_DB_PATH)) {
      try { 
        fs.unlinkSync(TEST_DB_PATH); 
      } catch (e) {
        // Dacă Windows ține fișierul ocupat, ignorăm eroarea. 
        // Nu e critic pentru că e doar un fișier temporar.
      }
    }

    // 3. Anunțăm Jest că am terminat
    done();
  });
});

describe("EdgeUp API Tests", () => {
  let buyerToken;
  let sellerToken;
  let productId;

  // 1. Testăm înregistrarea unui cumpărător
  it("should register a buyer", async () => {
    const res = await request(app).post("/register").send({
      name: "Test Buyer",
      email: "buyer@test.com",
      password: "password123",
      role: "Untrusted",
      country: "RO",
      city: "București",
    });
    expect(res.statusCode).toBe(201);
    buyerToken = res.body.token;
  });

  // 2. Testăm înregistrarea unui vânzător
  it("should register a seller", async () => {
    const res = await request(app).post("/register").send({
      name: "Test Seller",
      email: "seller@test.com",
      password: "password123",
      role: "Trusted", 
      country: "RO",
      city: "Cluj-Napoca",
    });
    expect(res.statusCode).toBe(201);
    sellerToken = res.body.token;
  });

  // 3. Testăm Login-ul
  it("should login successfully", async () => {
    const res = await request(app).post("/login").send({
      email: "buyer@test.com",
      password: "password123",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  // 4. Testăm adăugarea unui produs (doar vânzătorii pot)
  it("should allow Trusted seller to create a product", async () => {
    const res = await request(app)
      .post("/product")
      .set("Authorization", `Bearer ${sellerToken}`) // Trimitem token-ul de vânzător
      .field("title", "Test Laptop")
      .field("description", "A gaming laptop")
      .field("price", 5000)
      .field("category", "Electronics")
      .field("stock", 5);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("id");
    productId = res.body.id;
  });

  // 5. Testăm cumpărarea unui produs
  it("should allow buyer to create an order", async () => {
    const res = await request(app)
      .post("/order")
      .set("Authorization", `Bearer ${buyerToken}`) // Trimitem token-ul de cumpărător
      .send({
        productId: productId,
        shipping_address: "Strada Libertatii 10, Bucuresti",
        quantity: 1,
        price: 5000
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe("pending");
  });
});