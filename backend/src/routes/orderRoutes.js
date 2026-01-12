import express from "express";
import * as orderController from "../controllers/orderController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.post("/order", authenticate, orderController.createOrder);
router.get("/orders/buying", authenticate, orderController.getBuyingOrders);
router.get("/orders/selling", authenticate, orderController.getSellingOrders);
router.get("/orders/:id", authenticate, orderController.getOrderById);
router.patch(
  "/orders/:id/status",
  authenticate,
  orderController.updateOrderStatus
);

export default router;
