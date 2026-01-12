import express from "express";
import * as notificationController from "../controllers/notificationController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.get(
  "/my-notifications",
  authenticate,
  notificationController.getMyNotifications
);
router.put(
  "/notification/:id/read",
  authenticate,
  notificationController.markRead
);
router.put(
  "/my-notifications/read-all",
  authenticate,
  notificationController.markAllRead
);
router.post("/notification", notificationController.createNotification);
router.delete(
  "/notification/:id",
  authenticate,
  notificationController.deleteNotification
);

export default router;
