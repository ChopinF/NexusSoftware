import express from "express";
import * as authController from "../controllers/authController.js";
import { uploadAvatar } from "../middleware/upload.js";

const router = express.Router();

router.post("/login", authController.login);
router.post(
  "/register",
  uploadAvatar.single("avatar"),
  authController.register
);
router.get("/me", authController.getMe);

export default router;
