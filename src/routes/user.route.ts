import { Router } from "express";

import { register, login, logout } from "../controllers/user.controller";
import { getCurrentUser } from "../controllers/getCurrentUser";
import { authMiddleware } from "../middlewares/auth.middlewares";
import { profileUpload } from "../middlewares/upload.middleware";
import {
  uploadProfileImage,
  removeProfileImage,
  updateProfile,
} from "../controllers/profile.controller";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

// old route
router.get("/me", authMiddleware, getCurrentUser);

// Sprint 3 required route
router.get("/whoami", authMiddleware, getCurrentUser);

// Sprint 3 required update route
router.patch(
  "/update",
  authMiddleware,
  profileUpload.single("profileImage"),
  updateProfile
);

// keep old image-only routes so Flutter does not break
router.patch(
  "/profile-image",
  authMiddleware,
  profileUpload.single("profileImage"),
  uploadProfileImage
);

router.delete("/profile-image", authMiddleware, removeProfileImage);

export default router;