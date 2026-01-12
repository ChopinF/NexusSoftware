import express from "express";
import * as userController from "../controllers/userController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { uploadAvatar } from "../middleware/upload.js";

const router = express.Router();

router.get("/users", userController.getUsers);
router.put(
  "/user/profile",
  authenticate,
  uploadAvatar.single("avatar"),
  userController.updateProfile
);

router.get(
  "/my-trusted-request",
  authenticate,
  userController.getMyTrustedRequest
);
router.post("/request-trusted", authenticate, userController.requestTrusted);

// Admin Routes
router.get(
  "/admin/requests",
  authenticate,
  requireAdmin,
  userController.getAdminRequests
);
router.post(
  "/admin/request/:id/:action",
  authenticate,
  requireAdmin,
  userController.handleAdminRequest
);

export default router;
