import { Router } from "express";
import { adminOnly } from "../middlewares/admin.middleware";
import { getAdminDashboardStats } from "../controllers/adminDashboard.controller";

const router = Router();

router.use(adminOnly);

router.get("/", getAdminDashboardStats);

export default router;