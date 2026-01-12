import express from "express";
import * as negotiationController from "../controllers/negotiationController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.get(
  "/negotiations/list",
  authenticate,
  negotiationController.getNegotiations
);
router.post(
  "/negotiations",
  authenticate,
  negotiationController.createNegotiation
);
router.get(
  "/negotiation",
  authenticate,
  negotiationController.getNegotiationDetails
);
router.patch(
  "/negotiations/:id/accept",
  authenticate,
  negotiationController.acceptNegotiation
);
router.patch(
  "/negotiations/:id/decline",
  authenticate,
  negotiationController.declineNegotiation
);

export default router;
