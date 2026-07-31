import { Router } from "express";
import {
  initiateEsewaPayment,
  markEsewaPaymentFailed,
  verifyEsewaPayment,
} from "../controllers/payment.controller";
import { authMiddleware } from "../middlewares/auth.middlewares";

const router = Router();

router.post("/esewa/initiate", authMiddleware, initiateEsewaPayment);
router.post("/esewa/verify", authMiddleware, verifyEsewaPayment);
router.post("/esewa/failure", authMiddleware, markEsewaPaymentFailed);

export default router;
