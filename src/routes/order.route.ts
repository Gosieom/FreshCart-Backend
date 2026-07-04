import { Router } from "express";
import {
  createOrder,
  getMyOrderById,
  getMyOrders,
} from "../controllers/order.controller";
import { authMiddleware } from "../middlewares/auth.middlewares";

const router = Router();

router.post("/", authMiddleware, createOrder);
router.get("/my-orders", authMiddleware, getMyOrders);
router.get("/:id", authMiddleware, getMyOrderById);

export default router;