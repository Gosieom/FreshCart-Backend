import { Router } from "express";
import {
  cancelMyOrder,
  clearMyOrderHistory,
  createOrder,
  getMyOrderById,
  getMyOrders,
  reorderMyOrder,
} from "../controllers/order.controller";
import { authMiddleware } from "../middlewares/auth.middlewares";

const router = Router();

router.post("/", authMiddleware, createOrder);
router.get("/my-orders", authMiddleware, getMyOrders);
router.delete("/clear-history", authMiddleware, clearMyOrderHistory);
router.post("/:id/reorder", authMiddleware, reorderMyOrder);
router.patch("/:id/cancel", authMiddleware, cancelMyOrder);
router.get("/:id", authMiddleware, getMyOrderById);

export default router;