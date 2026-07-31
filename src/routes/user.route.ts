import { Router } from "express";

import {
  changePassword,
  completePasswordResetOtp,
  login,
  logout,
  register,
  requestPasswordReset,
  requestPasswordResetOtp,
  resetPassword,
  verifyPasswordResetOtp,
} from "../controllers/user.controller";
import {
  getCurrentUser,
} from "../controllers/getCurrentUser";
import {
  removeProfileImage,
  updateProfile,
  uploadProfileImage,
} from "../controllers/profile.controller";
import {
  authMiddleware,
} from "../middlewares/auth.middlewares";
import {
  profileUpload,
} from "../middlewares/upload.middleware";

const router = Router();

router.post(
  "/register",
  register
);

router.post(
  "/login",
  login
);

router.post(
  "/logout",
  logout
);

/*
 * Existing web reset-link flow.
 */
router.post(
  "/request-password-reset",
  requestPasswordReset
);

router.post(
  "/reset-password/:token",
  resetPassword
);

/*
 * Mobile OTP reset flow.
 */
router.post(
  "/password-reset/request-otp",
  requestPasswordResetOtp
);

router.post(
  "/password-reset/verify-otp",
  verifyPasswordResetOtp
);

router.post(
  "/password-reset/complete",
  completePasswordResetOtp
);

router.get(
  "/me",
  authMiddleware,
  getCurrentUser
);

router.get(
  "/whoami",
  authMiddleware,
  getCurrentUser
);

router.patch(
  "/update",
  authMiddleware,
  profileUpload.single(
    "profileImage"
  ),
  updateProfile
);

router.patch(
  "/profile-image",
  authMiddleware,
  profileUpload.single(
    "profileImage"
  ),
  uploadProfileImage
);

router.delete(
  "/profile-image",
  authMiddleware,
  removeProfileImage
);

router.patch(
  "/change-password",
  authMiddleware,
  changePassword
);

export default router;
