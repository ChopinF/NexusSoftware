import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";
import { run, get, all } from "./db.js";

export async function seed() {
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
      avatarUrl: "/uploads/avatars/person1.jpg",
    },
    {
      name: "b",
      email: "b@gmail.com",
      password: "b",
      role: "Untrusted",
      country: "RO",
      city: "Cluj-Napoca",
      karma: 10,
      avatarUrl: "/uploads/avatars/person2.jpg",
    },
    {
      name: "c",
      email: "c@gmail.com",
      password: "c",
      role: "Untrusted",
      country: "RO",
      city: "Cluj-Napoca",
      karma: 60,
      avatarUrl: "/uploads/avatars/person3.jpg",
    },
    {
      name: "d",
      email: "d@gmail.com",
      password: "d",
      role: "Untrusted",
      country: "RO",
      city: "Cluj-Napoca",
      karma: 110,
      avatarUrl: "/uploads/avatars/person4.jpg",
    },
    {
      name: "admin",
      email: "admin@edgeup.com",
      password: "admin",
      role: "Admin",
      country: "RO",
      city: "București",
      karma: 1000,
      avatarUrl: "/uploads/avatars/person5.jpg",
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
          u.avatarUrl || null,
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
      stock: 3,
    },
    {
      title: "Haina alba",
      description: "Haina alba de iarna",
      price: 300,
      sellerEmail: "a@yahoo.com",
      category: "Clothes",
      imageUrl: "/uploads/products/image-1767526183037-168835722.jpg",
      stock: 0,
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
      stock: 0,
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
        "ACTIVE",
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
  const usersMap = Object.fromEntries(dbUsers.map((u) => [u.email, u.id]));

  const dbProducts = await all(`SELECT id, title, seller FROM products`);
  const productsMap = Object.fromEntries(dbProducts.map((p) => [p.title, p]));

  const demoNegotiations = [
    {
      productTitle: "Carte JS pentru Începători",
      buyerEmail: "b@gmail.com",
      offeredPrice: 100,
      quantity: 1,
      status: "PENDING",
    },
    {
      productTitle: "Mouse Office",
      buyerEmail: "c@gmail.com",
      offeredPrice: 30,
      quantity: 2,
      status: "REJECTED",
    },
    {
      productTitle: "Pernă decorativă",
      buyerEmail: "d@gmail.com",
      offeredPrice: 40,
      quantity: 1,
      status: "ACCEPTED",
    },
    {
      productTitle: "Set vase",
      buyerEmail: "b@gmail.com",
      offeredPrice: 200,
      quantity: 1,
      status: "ORDERED",
    },
    {
      productTitle: "Golf 4",
      buyerEmail: "c@gmail.com",
      offeredPrice: 4500,
      quantity: 1,
      status: "PENDING",
    },
  ];

  for (const neg of demoNegotiations) {
    const product = productsMap[neg.productTitle];
    const buyerId = usersMap[neg.buyerEmail];

    if (!product) {
      console.warn(
        `[seed-neg] Produsul '${neg.productTitle}' nu a fost găsit.`
      );
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
      console.log(
        `[seed-neg] Negocierea pentru '${neg.productTitle}' deja există.`
      );
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
        neg.status,
      ]
    );

    console.log(
      `[seed-neg] Created '${neg.status}' deal: ${neg.buyerEmail} -> ${neg.productTitle} (x${neg.quantity})`
    );
  }

  // Demo orders
  const productsList = await all(`SELECT id FROM products`);

  if (!productsList || productsList.length === 0) {
    console.warn(
      "[seed] Nu există produse, nu pot crea comenzi demo (lipsește product_id)."
    );
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
        console.warn(
          `[seed] Nu pot crea order pentru ${o.buyerEmail} (user inexistent)`
        );
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
        [oid, buyer.id, product.id, o.price, o.quantity, o.status, demoAddress]
      );

      console.log(
        `[seed] Created order for ${o.buyerEmail} -> Product: ${product.id} (x${o.quantity})`
      );
    }
  }

  // Demo favorite
  const demoFavorites = [
    { userEmail: "b@gmail.com", productTitle: "Mouse Office" },
    { userEmail: "b@gmail.com", productTitle: "Pernă decorativă" },
    { userEmail: "d@gmail.com", productTitle: "Carte JS pentru Începători" },
    { userEmail: "admin@edgeup.com", productTitle: "Mouse Office" },
    { userEmail: "a@yahoo.com", productTitle: "Pernă decorativă" },
  ];

  const usersForFav = await all(`SELECT id, email FROM users`);
  const usersMapFav = Object.fromEntries(
    usersForFav.map((u) => [u.email, u.id])
  );

  const productsForFav = await all(`SELECT id, title FROM products`);
  const productsMapFav = Object.fromEntries(
    productsForFav.map((p) => [p.title, p.id])
  );

  for (const f of demoFavorites) {
    const userId = usersMapFav[f.userEmail];
    const productId = productsMapFav[f.productTitle];

    if (!userId) {
      console.warn(
        `[seed] Userul ${f.userEmail} nu a fost găsit pentru favorite.`
      );
      continue;
    }
    if (!productId) {
      console.warn(
        `[seed] Produsul '${f.productTitle}' nu a fost găsit pentru favorite.`
      );
      continue;
    }

    const exists = await get(
      `SELECT 1 as ok FROM favorites WHERE user_id = ? AND product_id = ?`,
      [userId, productId]
    );

    if (exists) {
      console.log(
        `[seed] Favorite deja existent: ${f.userEmail} -> ${f.productTitle}`
      );
      continue;
    }

    const fid = uuid();
    await run(
      `INSERT INTO favorites (id, user_id, product_id, created_at) VALUES (?, ?, ?, datetime('now'))`,
      [fid, userId, productId]
    );
    console.log(
      `[seed] Adăugat la favorite: ${f.userEmail} -> '${f.productTitle}'`
    );
  }
}
