import { Router } from "express";

import {
  createAddress,
  deleteAddress,
  getMyAddresses,
  setDefaultAddress,
  updateAddress,
} from "../controllers/address.controller";

import { authMiddleware } from "../middlewares/auth.middlewares";

const router = Router();

router.get("/", authMiddleware, getMyAddresses);
router.post("/", authMiddleware, createAddress);
router.patch(
  "/:id/default",
  authMiddleware,
  setDefaultAddress
);
router.patch(
  "/:id",
  authMiddleware,
  updateAddress
);
router.delete(
  "/:id",
  authMiddleware,
  deleteAddress
);

export default router;
