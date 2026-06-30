import { Router } from "express";
import { adminOnly } from "../middlewares/admin.middleware";
import { productUpload } from "../middlewares/productUpload.middleware";
import {
  createAdminProduct,
  deleteAdminProduct,
  getAdminProductById,
  getAdminProducts,
  updateAdminProduct,
} from "../controllers/adminProduct.controller";

const router = Router();

router.use(adminOnly);

router
  .route("/")
  .get(getAdminProducts)
  .post(productUpload.single("image"), createAdminProduct);

router
  .route("/:id")
  .get(getAdminProductById)
  .patch(productUpload.single("image"), updateAdminProduct)
  .put(productUpload.single("image"), updateAdminProduct)
  .delete(deleteAdminProduct);

export default router;