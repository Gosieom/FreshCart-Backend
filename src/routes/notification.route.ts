import {
  Router,
} from "express";
import {
  clearMyNotifications,
  getEmailNotificationStatus,
  getMyNotificationSettings,
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  sendTestNotification,
  updateMyNotificationSettings,
} from "../controllers/notification.controller";
import {
  authMiddleware,
} from "../middlewares/auth.middlewares";

const router = Router();

router.get(
  "/",
  authMiddleware,
  getMyNotifications
);

router.get(
  "/settings",
  authMiddleware,
  getMyNotificationSettings
);

router.patch(
  "/settings",
  authMiddleware,
  updateMyNotificationSettings
);

router.get(
  "/email-status",
  authMiddleware,
  getEmailNotificationStatus
);

router.post(
  "/test",
  authMiddleware,
  sendTestNotification
);

router.patch(
  "/read-all",
  authMiddleware,
  markAllNotificationsAsRead
);

router.patch(
  "/:id/read",
  authMiddleware,
  markNotificationAsRead
);

router.delete(
  "/clear",
  authMiddleware,
  clearMyNotifications
);

export default router;
