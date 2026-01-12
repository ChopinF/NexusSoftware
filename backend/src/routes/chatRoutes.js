import express from "express";
import * as chatController from "../controllers/chatController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.get(
  "/conversations/user/:userId",
  authenticate,
  chatController.getUserConversations
);
router.get(
  "/conversations/:id/user/:userId",
  authenticate,
  chatController.getConversationMessages
);
router.get(
  "/conversations/:cid/messages/:mid",
  authenticate,
  chatController.getMessageById
);
router.post("/conversations", authenticate, chatController.createConversation);
router.post(
  "/conversations/:id/messages",
  authenticate,
  chatController.createMessage
);
router.put(
  "/conversations/:cid/messages/:mid",
  authenticate,
  chatController.updateMessage
);

// AI / Bot Routes
router.post("/crawler", chatController.crawler);
router.post("/msg", chatController.chatBot);

export default router;
