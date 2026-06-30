import { Router } from "express";
import { adminOnly } from "../middlewares/admin.middleware";
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUserById,
  getAdminUsers,
  updateAdminUser,
} from "../controllers/adminUser.controller";

const router = Router();

router.use(adminOnly);

router.route("/").get(getAdminUsers).post(createAdminUser);

router
  .route("/:id")
  .get(getAdminUserById)
  .put(updateAdminUser)
  .patch(updateAdminUser)
  .delete(deleteAdminUser);

export default router;