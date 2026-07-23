import { Router } from "express";
import { getPublicBanners } from "../controllers/banner.controller";

const router = Router();

router.get("/", getPublicBanners);

export default router;