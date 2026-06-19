import { Router } from "express";

import { register, login } from "../controllers/user.controller";
import { getCurrentUser } from "../controllers/getCurrentUser";
import { authMiddleware } from "../middlewares/auth.middlewares";
import { profileUpload } from "../middlewares/upload.middleware";
import {
  uploadProfileImage,
  removeProfileImage,
} from "../controllers/profile.controller";

const router = Router();

router.post("/register", register);
router.post("/login", login);

router.get("/me", authMiddleware, getCurrentUser);

router.patch(
  "/profile-image",
  authMiddleware,
  profileUpload.single("profileImage"),
  uploadProfileImage
);

router.delete("/profile-image", authMiddleware, removeProfileImage);

export default router;