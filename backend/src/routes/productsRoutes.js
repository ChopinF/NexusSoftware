import express from "express";
import * as productController from "../controllers/productsController.js";
import { authenticate, requireTrusted } from "../middleware/auth.js";
import { uploadProduct } from "../middleware/upload.js";

const router = express.Router();

// Public routes
router.get("/products", productController.getProducts);
router.get("/categories", productController.getCategories);
router.get("/product/:id", productController.getProductById);
router.get("/product/:id/reviews", productController.getProductReviews);
router.get("/reviews", productController.getAllReviews); // Adăugat din server.js
router.get("/product/:id/price-comparison", productController.comparePrice);

// Protected routes
router.get("/my-products", authenticate, productController.getMyProducts);

router.post(
  "/product",
  authenticate,
  requireTrusted,
  uploadProduct.single("image"),
  productController.createProduct
);

router.put(
  "/product/:id",
  authenticate,
  uploadProduct.single("image"),
  productController.updateProduct
);

router.delete("/product/:id", authenticate, productController.deleteProduct);

// Review routes (create / update)
router.post("/review", productController.createReview);
router.put("/review/:id", productController.updateReview);

// Favorites logic
router.post(
  "/product/:id/favorite",
  authenticate,
  productController.addFavorite
);
router.delete(
  "/product/:id/favorite",
  authenticate,
  productController.removeFavorite
);
router.get("/my-favorites", authenticate, productController.getMyFavorites);
router.get(
  "/my-favorites/ids",
  authenticate,
  productController.getMyFavoritesIds
);

export default router;
