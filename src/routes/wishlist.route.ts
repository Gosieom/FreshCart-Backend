import { Router } from "express";
import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} from "../controllers/wishlist.controller";
import { authMiddleware } from "../middlewares/auth.middlewares";

const router = Router();

router.get("/", authMiddleware, getWishlist);
router.post("/:productId", authMiddleware, addToWishlist);
router.delete("/:productId", authMiddleware, removeFromWishlist);

export default router;
