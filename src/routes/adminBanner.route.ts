import { Router } from "express";
import { adminOnly } from "../middlewares/admin.middleware";
import { bannerUpload } from "../middlewares/bannerUpload.middleware";
import {
  createAdminBanner,
  deleteAdminBanner,
  getAdminBanners,
  updateAdminBanner,
} from "../controllers/banner.controller";

const router = Router();

router.use(adminOnly);

router.get("/", getAdminBanners);
router.post("/", bannerUpload.single("image"), createAdminBanner);
router.patch("/:id", bannerUpload.single("image"), updateAdminBanner);
router.delete("/:id", deleteAdminBanner);

export default router;