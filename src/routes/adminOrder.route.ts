import { Router } from "express";
import {
  deleteAdminOrder,
  getAdminOrderById,
  getAdminOrders,
  updateAdminOrderStatus,
} from "../controllers/adminOrder.controller";
import { adminOnly } from "../middlewares/admin.middleware";

const router = Router();

router.get("/", adminOnly, getAdminOrders);
router.get("/:id", adminOnly, getAdminOrderById);
router.patch("/:id/status", adminOnly, updateAdminOrderStatus);
router.delete("/:id", adminOnly, deleteAdminOrder);

export default router;