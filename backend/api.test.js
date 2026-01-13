import request from "supertest";
import fs from "fs";
import path from "path";
import { app, httpServer } from "./server.js";
import { db, run, migrate } from "./db.js";

const TEST_DB_PATH = path.resolve("./test_app.db");

beforeAll(async () => {
  process.env.JWT_SECRET = "test-secret-key";
  process.env.DB_PATH = TEST_DB_PATH;

  await migrate();

  await run("DELETE FROM users");
  await run("DELETE FROM products");
  await run("DELETE FROM orders");
});


afterAll((done) => {
  
  db.close((err) => {
  

    if (fs.existsSync(TEST_DB_PATH)) {
      try { 
        fs.unlinkSync(TEST_DB_PATH); 
      } catch (e) {

      }
    }


    done();
  });
});

describe("EdgeUp API Tests", () => {
  let buyerToken;
  let sellerToken;
  let productId;

  // 1. Testam inregistrarea unui cumparator
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

  // 2. Testam inregistrarea unui vanzator
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

  // 3. Testam Login-ul
  it("should login successfully", async () => {
    const res = await request(app).post("/login").send({
      email: "buyer@test.com",
      password: "password123",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  // 4. Testam adaugarea unui produs 
  it("should allow Trusted seller to create a product", async () => {
    const res = await request(app)
      .post("/product")
      .set("Authorization", `Bearer ${sellerToken}`) 
      .field("title", "Test Laptop")
      .field("description", "A gaming laptop")
      .field("price", 5000)
      .field("category", "Electronics")
      .field("stock", 5);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("id");
    productId = res.body.id;
  });

  // 5. Testam cumpararea unui produs
  it("should allow buyer to create an order", async () => {
    const res = await request(app)
      .post("/order")
      .set("Authorization", `Bearer ${buyerToken}`) 
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
