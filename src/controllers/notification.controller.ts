import {
  Request,
  Response,
} from "express";
import mongoose from "mongoose";
import Notification from "../models/notification.model";
import NotificationPreference from "../models/notificationPreference.model";
import {
  createUserNotification,
} from "../utils/notification.util";
import {
  getSafeEmailStatus,
} from "../utils/email.util";

const getLoggedInUserId = (
  req: Request
): string => {
  const authRequest = req as any;

  return (
    authRequest.user?.id?.toString?.() ||
    authRequest.user?._id?.toString?.() ||
    ""
  );
};

const parseBoolean = (
  value: unknown
): boolean | undefined => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized =
      value.trim().toLowerCase();

    if (
      ["true", "1", "yes", "on"].includes(
        normalized
      )
    ) {
      return true;
    }

    if (
      ["false", "0", "no", "off"].includes(
        normalized
      )
    ) {
      return false;
    }
  }

  return undefined;
};

const formatPreference = (
  preference: any
) => ({
  id: preference._id.toString(),
  _id: preference._id.toString(),
  user: preference.user,
  emailNotifications: Boolean(
    preference.emailNotifications
  ),
  appNotifications: Boolean(
    preference.appNotifications
  ),
  smsNotifications: Boolean(
    preference.smsNotifications
  ),
  orderUpdates: Boolean(
    preference.orderUpdates
  ),
  deliveryUpdates: Boolean(
    preference.deliveryUpdates
  ),
  paymentUpdates: Boolean(
    preference.paymentUpdates
  ),
  offerAlerts: Boolean(
    preference.offerAlerts
  ),
  wishlistAlerts: Boolean(
    preference.wishlistAlerts
  ),
  securityAlerts: Boolean(
    preference.securityAlerts
  ),
  createdAt: preference.createdAt,
  updatedAt: preference.updatedAt,
});

const formatNotification = (
  notification: any
) => ({
  id: notification._id.toString(),
  _id: notification._id.toString(),
  user: notification.user,
  title: notification.title,
  message: notification.message,
  type: notification.type,
  order:
    notification.order?.toString?.() ||
    notification.order ||
    "",
  isRead: Boolean(notification.isRead),
  createdAt: notification.createdAt,
  updatedAt: notification.updatedAt,
});

export const getMyNotificationSettings =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const userId =
        getLoggedInUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      let preference =
        await NotificationPreference.findOne({
          user: userId,
        });

      if (!preference) {
        preference =
          await NotificationPreference.create({
            user: userId,
          });
      }

      return res.status(200).json({
        success: true,
        data: formatPreference(preference),
      });
    } catch (error: any) {
      console.error(
        "GET NOTIFICATION SETTINGS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to load notification settings",
      });
    }
  };

export const updateMyNotificationSettings =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const userId =
        getLoggedInUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const allowedFields = [
        "emailNotifications",
        "appNotifications",
        "smsNotifications",
        "orderUpdates",
        "deliveryUpdates",
        "paymentUpdates",
        "offerAlerts",
        "wishlistAlerts",
        "securityAlerts",
      ] as const;

      const updateData: Record<
        string,
        boolean
      > = {};

      for (const field of allowedFields) {
        if (
          req.body[field] !== undefined
        ) {
          const parsed = parseBoolean(
            req.body[field]
          );

          if (parsed === undefined) {
            return res.status(400).json({
              success: false,
              message:
                `${field} must be true or false`,
            });
          }

          updateData[field] = parsed;
        }
      }

      if (
        Object.keys(updateData).length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "No valid notification setting was provided",
        });
      }

      const preference =
        await NotificationPreference.findOneAndUpdate(
          {
            user: userId,
          },
          {
            $set: updateData,
            $setOnInsert: {
              user: userId,
            },
          },
          {
            new: true,
            upsert: true,
            runValidators: true,
          }
        );

      return res.status(200).json({
        success: true,
        message:
          "Notification settings updated successfully",
        data: formatPreference(preference),
      });
    } catch (error: any) {
      console.error(
        "UPDATE NOTIFICATION SETTINGS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to update notification settings",
      });
    }
  };

export const getMyNotifications =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const userId =
        getLoggedInUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const notifications =
        await Notification.find({
          user: userId,
        })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();

      const unreadCount =
        await Notification.countDocuments({
          user: userId,
          isRead: false,
        });

      return res.status(200).json({
        success: true,
        data: notifications.map(
          formatNotification
        ),
        unreadCount,
      });
    } catch (error: any) {
      console.error(
        "GET NOTIFICATIONS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to load notifications",
      });
    }
  };

export const markNotificationAsRead =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const userId =
        getLoggedInUserId(req);
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid notification id",
        });
      }

      const notification =
        await Notification.findOneAndUpdate(
          {
            _id: id,
            user: userId,
          },
          {
            $set: {
              isRead: true,
            },
          },
          {
            new: true,
          }
        );

      if (!notification) {
        return res.status(404).json({
          success: false,
          message:
            "Notification not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Notification marked as read",
        data:
          formatNotification(notification),
      });
    } catch (error: any) {
      console.error(
        "MARK NOTIFICATION READ ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to mark notification as read",
      });
    }
  };

export const markAllNotificationsAsRead =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const userId =
        getLoggedInUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      await Notification.updateMany(
        {
          user: userId,
          isRead: false,
        },
        {
          $set: {
            isRead: true,
          },
        }
      );

      return res.status(200).json({
        success: true,
        message:
          "All notifications marked as read",
      });
    } catch (error: any) {
      console.error(
        "MARK ALL NOTIFICATIONS READ ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to mark notifications as read",
      });
    }
  };

export const clearMyNotifications =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const userId =
        getLoggedInUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      await Notification.deleteMany({
        user: userId,
      });

      return res.status(200).json({
        success: true,
        message:
          "Notifications cleared successfully",
      });
    } catch (error: any) {
      console.error(
        "CLEAR NOTIFICATIONS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to clear notifications",
      });
    }
  };

export const getEmailNotificationStatus =
  async (
    req: Request,
    res: Response
  ) => {
    const userId =
      getLoggedInUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    return res.status(200).json({
      success: true,
      data: getSafeEmailStatus(),
    });
  };

export const sendTestNotification =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const userId =
        getLoggedInUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const result =
        await createUserNotification({
          userId,
          title:
            "FreshCart test notification",
          message:
            "Your FreshCart email and in-app notification channels were tested.",
          type: "security",
          emailSubject:
            "FreshCart test notification",
          ignoreCategoryPreference: true,
        });

      const requestedChannelFailed =
        (result.appRequested &&
          !result.appCreated) ||
        (result.emailRequested &&
          !result.email.sent);

      if (requestedChannelFailed) {
        return res.status(503).json({
          success: false,
          message:
            result.email.error ||
            "One or more notification channels failed",
          data: result,
        });
      }

      if (
        !result.appRequested &&
        !result.emailRequested
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Enable app or email notifications before sending a test",
          data: result,
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Test notification completed successfully",
        data: result,
      });
    } catch (error: any) {
      console.error(
        "SEND TEST NOTIFICATION ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to send test notification",
      });
    }
  };
