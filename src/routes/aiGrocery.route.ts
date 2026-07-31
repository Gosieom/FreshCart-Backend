import { Router } from "express";
import { generateAiGroceryPlan } from "../controllers/aiGrocery.controller";
import { authMiddleware } from "../middlewares/auth.middlewares";

const router = Router();

router.post("/", authMiddleware, generateAiGroceryPlan);

export default router;
