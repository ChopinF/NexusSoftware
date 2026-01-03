import sqlite3 from 'sqlite3'
import path from 'path';

sqlite3.verbose()

const dbPath = process.env.DB_PATH || path.resolve('./data/app.db');
export const db = new sqlite3.Database(dbPath)

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
      role TEXT NOT NULL CHECK(role IN ('Trusted','Untrusted', 'Admin')),
      country TEXT NOT NULL,
      city TEXT NOT NULL,
      karma INTEGER DEFAULT 0
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
      notification_type TEXT NOT NULL CHECK(notification_type IN ('order','payment','review','system')),
      is_read INTEGER NOT NULL DEFAULT 0, -- 0=false, 1=true
      created_at TEXT NOT NULL,
      FOREIGN KEY(id_user) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        seller_id TEXT NOT NULL,
        buyer_id TEXT NOT NULL,
        FOREIGN KEY(seller_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(buyer_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  await run(`
    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0, -- 0=false, 1=true
        from_user TEXT NOT NULL,
        to_user TEXT NOT NULL,
        FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY(from_user) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(to_user) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  await run(`
    CREATE TABLE IF NOT EXISTS trusted_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      pitch TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(user_id, product_id)
    );
  `);

  await run(`CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_users_country_city ON users(country, city);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(id_user, is_read);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_conversations_seller ON conversations(seller_id);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON conversations(buyer_id);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_trusted_requests_status ON trusted_requests(status);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);`);
}

