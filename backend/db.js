// db.js
import sqlite3 from 'sqlite3'

sqlite3.verbose()

export const db = new sqlite3.Database('./app.db')

export const run = (sql, params = []) =>
  new Promise((res, rej) => {
    db.run(sql, params, function (err) {
      if (err) rej(err);
      else res({ lastID: this.lastID, changes: this.changes });
    })
  })

export const get = (sql, params = []) =>
  new Promise((res, rej) => {
    db.get(sql, params, (err, rows) => (err ? rej(err) : res(rows)))
  })

export const all = (sql, params = []) =>
  new Promise((res, rej) => {
    db.all(sql, params, (err, rows) => (err ? rej(err) : res(rows)));
  });

export async function migrate() {
  await run(`
    PRAGMA foreign_keys = ON;
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Trusted','Untrusted')),
      tara TEXT NOT NULL,
      oras TEXT NOT NULL
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL CHECK(price >= 0),
      seller TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('Electronics','Books','Clothes','Home','Other')),
      imageUrl TEXT,
      FOREIGN KEY(seller) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      buyer TEXT NOT NULL,
      price INTEGER NOT NULL CHECK(price >= 0),
      status TEXT NOT NULL CHECK(status IN ('pending','paid','shipped','delivered')),
      FOREIGN KEY(buyer) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      produs TEXT NOT NULL,
      user TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      FOREIGN KEY(produs) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY(user) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      id_user TEXT NOT NULL,
      message TEXT NOT NULL,
      notifcation_type TEXT NOT NULL CHECK(notifcation_type IN ('order','payment','review','system')),
      is_read INTEGER NOT NULL DEFAULT 0, -- 0=false, 1=true
      created_at TEXT NOT NULL,
      FOREIGN KEY(id_user) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // indexuri
  await run(`CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_users_tara_oras ON users(tara, oras);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(id_user, is_read);`);
}

