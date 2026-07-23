import { Router } from "express";

import {
  addCartItem,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from "../controllers/cart.controller";

import { authMiddleware } from "../middlewares/auth.middlewares";

const router = Router();

router.get(
  "/",
  authMiddleware,
  getCart
);

router.post(
  "/items",
  authMiddleware,
  addCartItem
);

router.patch(
  "/items/:productId",
  authMiddleware,
  updateCartItem
);

router.delete(
  "/items/:productId",
  authMiddleware,
  removeCartItem
);

router.delete(
  "/",
  authMiddleware,
  clearCart
);

export default router;
