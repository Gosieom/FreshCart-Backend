import { Router } from "express";
import { register, login } from "../controllers/user.controller";
import { getCurrentUser } from "../controllers/getCurrentUser";
import { authMiddleware } from "../middlewares/auth.middlewares";


const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, getCurrentUser);

export default router;