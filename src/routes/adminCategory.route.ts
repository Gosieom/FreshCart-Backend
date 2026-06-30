import { Router } from "express";
import { adminOnly } from "../middlewares/admin.middleware";
import { categoryUpload } from "../middlewares/categoryUpload.middleware";
import {
  createAdminCategory,
  deleteAdminCategory,
  getAdminCategories,
  getAdminCategoryById,
  updateAdminCategory,
} from "../controllers/adminCategory.controller";

const router = Router();

router.use(adminOnly);

router
  .route("/")
  .get(getAdminCategories)
  .post(categoryUpload.single("image"), createAdminCategory);

router
  .route("/:id")
  .get(getAdminCategoryById)
  .patch(categoryUpload.single("image"), updateAdminCategory)
  .put(categoryUpload.single("image"), updateAdminCategory)
  .delete(deleteAdminCategory);

export default router;