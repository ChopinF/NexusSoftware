import { v4 as uuid } from "uuid";
import jwt from "jsonwebtoken";
import { run, all, get } from "../utils/db.js";
import {
  validateProduct,
  processBody,
  prepareUpdateStatement,
  validateReview,
} from "../utils/helpers.js";
import { scrapePrices } from "../utils/scraper.js";
import { sendNotificationController } from "./notificationController.js";

// GET /products
export const getProducts = async (req, res, next) => {
  try {
    let {
      category,
      search,
      page = 1,
      limit = 12,
      sortBy = "title",
      order = "ASC",
    } = req.query;

    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.max(1, Math.min(100, parseInt(limit) || 12));
    const offset = (safePage - 1) * safeLimit;

    const validSortColumns = ["title", "price", "favorites_count"];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : "title";

    const sortOrder = order.toUpperCase() === "DESC" ? "DESC" : "ASC";

    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        userId = payload.sub;
      } catch (err) {}
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
      conditions.push(
        "(LOWER(p.title) LIKE LOWER(?) OR LOWER(p.description) LIKE LOWER(?))"
      );
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) sql += " WHERE " + conditions.join(" AND ");

    sql += ` ORDER BY ${sortColumn} ${sortOrder}, p.id ASC`;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(safeLimit, offset);

    const rows = await all(sql, params);

    res.json({
      products: rows.map((row) => ({
        ...row,
        isFavorite: Boolean(row.isFavorite),
      })),
      currentPage: safePage,
      itemsPerPage: safeLimit,
    });
  } catch (e) {
    next(e);
  }
};

// GET /my-products
export const getMyProducts = async (req, res, next) => {
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
};

// GET /categories
export const getCategories = async (_req, res, next) => {
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
};

// GET /product/:id
export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let userId = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        userId = payload.sub;
      } catch (err) {}
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
      isFavorite: isFavorite,
    });
  } catch (e) {
    console.error("Error fetching product:", e);
    next(e);
  }
};

// DELETE /product/:id
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.sub;

    const product = await get(`SELECT seller FROM products WHERE id = ?`, [id]);

    if (!product) return res.status(404).json({ error: "Product not found" });
    if (product.seller !== userId)
      return res.status(403).json({ error: "Not authorized" });

    await run(`UPDATE products SET status = 'ARCHIVED' WHERE id = ?`, [id]);

    res.json({ message: "Product deleted successfully" });
  } catch (e) {
    next(e);
  }
};

// GET /reviews
export const getAllReviews = async (_req, res, next) => {
  try {
    const rows = await all("SELECT * FROM reviews");
    res.json(rows);
  } catch (e) {
    next(e);
  }
};

// GET /product/:id/reviews
export const getProductReviews = async (req, res, next) => {
  try {
    const { id } = req.params;

    // First verify the product exists
    const product = await get(`SELECT id, title FROM products WHERE id = ?`, [
      id,
    ]);
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
};

// POST /review
export const createReview = async (req, res, next) => {
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

    const updatedUser = await get(`SELECT karma FROM users WHERE id = ?`, [
      review.user,
    ]);

    const product = await get(
      `SELECT seller, title FROM products WHERE id = ?`,
      [review.productTitle]
    );

    const reviewerIdentity = await get(`SELECT name FROM users WHERE id = ?`, [
      review.user,
    ]);
    const reviewerName = reviewerIdentity ? reviewerIdentity.name : "A user";

    if (product && product.seller) {
      await sendNotificationController(
        product.seller,
        `${reviewerName} left a ${review.rating}-star review on your product "${product.title}"`,
        "review"
      );
    }

    res.json({ ...added, newKarma: updatedUser?.karma });
  } catch (e) {
    next(e);
  }
};

// PUT /review/:id
export const updateReview = async (req, res, next) => {
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
};

// POST /product/:id/favorite
export const addFavorite = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const productId = req.params.id;

    const product = await get(`SELECT id FROM products WHERE id = ?`, [
      productId,
    ]);
    if (!product) {
      return res.status(404).json({ error: "Produsul nu a fost găsit." });
    }

    const existing = await get(
      `SELECT id FROM favorites WHERE user_id = ? AND product_id = ?`,
      [userId, productId]
    );

    if (existing) {
      return res
        .status(409)
        .json({ message: "Produsul este deja la favorite." });
    }

    const favoriteId = uuid();
    const createdAt = new Date().toISOString();

    await run(
      `INSERT INTO favorites (id, user_id, product_id, created_at) VALUES (?, ?, ?, ?)`,
      [favoriteId, userId, productId, createdAt]
    );

    res
      .status(201)
      .json({ message: "Produs adăugat la favorite.", favoriteId });
  } catch (e) {
    console.error("Eroare la adăugare favorite:", e);
    next(e);
  }
};

// DELETE /product/:id/favorite
export const removeFavorite = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const productId = req.params.id;

    const result = await run(
      `DELETE FROM favorites WHERE user_id = ? AND product_id = ?`,
      [userId, productId]
    );

    if (result.changes === 0) {
      return res
        .status(404)
        .json({ message: "Produsul nu era la favorite sau nu a fost găsit." });
    }

    res.json({ message: "Produs șters de la favorite." });
  } catch (e) {
    next(e);
  }
};

// GET /my-favorites
export const getMyFavorites = async (req, res, next) => {
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

    const formattedFavorites = favorites.map((fav) => ({
      ...fav,
      isFavorite: true,
    }));

    res.json(formattedFavorites);
  } catch (e) {
    next(e);
  }
};

// GET /my-favorites/ids
export const getMyFavoritesIds = async (req, res, next) => {
  try {
    const userId = req.user.sub;

    const rows = await all(
      `SELECT product_id FROM favorites WHERE user_id = ?`,
      [userId]
    );

    const ids = rows.map((row) => row.product_id);

    res.json(ids);
  } catch (e) {
    next(e);
  }
};

// GET /product/:id/price-comparison
export const comparePrice = async (req, res, next) => {
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
};

// POST /product
export const createProduct = async (req, res, next) => {
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
        "ACTIVE",
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
};

// PUT /product/:id
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.sub;
    const currentUserRole = req.user.role;

    const product = await get(`SELECT seller FROM products WHERE id = ?`, [id]);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const isOwner = product.seller === currentUserId;
    const isAdmin = currentUserRole === "Admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: "Forbidden: You are not authorized to edit this product.",
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
      "stock",
    ];

    const { statement, values } = prepareUpdateStatement(
      processedBody,
      "products",
      PRODUCT_UPDATABLE_COLUMNS
    );

    if (values.length === 0) {
      return res
        .status(400)
        .json({ error: "No valid fields provided for update." });
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
};
