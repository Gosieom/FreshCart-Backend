import Notification, {
  NotificationType,
} from "../models/notification.model";
import NotificationPreference from "../models/notificationPreference.model";
import User from "../models/user.model";
import {
  EmailSendResult,
  sendEmail,
} from "./email.util";

type CreateUserNotificationPayload = {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  orderId?: string;
  emailSubject?: string;
  emailHtml?: string;
  ignoreCategoryPreference?: boolean;
};

export type NotificationDeliveryResult = {
  userFound: boolean;
  categoryEnabled: boolean;
  appRequested: boolean;
  appCreated: boolean;
  emailRequested: boolean;
  email: EmailSendResult;
};

const getPreferenceKey = (
  type: NotificationType
) => {
  if (type === "order") {
    return "orderUpdates";
  }

  if (type === "delivery") {
    return "deliveryUpdates";
  }

  if (type === "payment") {
    return "paymentUpdates";
  }

  if (type === "offer") {
    return "offerAlerts";
  }

  if (type === "wishlist") {
    return "wishlistAlerts";
  }

  return "securityAlerts";
};

const skippedEmailResult = (
  reason: string
): EmailSendResult => ({
  attempted: false,
  sent: false,
  skipped: true,
  error: reason,
});

export const createUserNotification =
  async ({
    userId,
    title,
    message,
    type,
    orderId,
    emailSubject,
    emailHtml,
    ignoreCategoryPreference = false,
  }: CreateUserNotificationPayload): Promise<NotificationDeliveryResult> => {
    const user = await User.findById(
      userId
    ).select("-password");

    if (!user) {
      return {
        userFound: false,
        categoryEnabled: false,
        appRequested: false,
        appCreated: false,
        emailRequested: false,
        email: skippedEmailResult(
          "User not found"
        ),
      };
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

    const preferenceKey =
      getPreferenceKey(type);

    const categoryEnabled =
      ignoreCategoryPreference ||
      Boolean(
        (preference as any)[preferenceKey]
      );

    if (!categoryEnabled) {
      return {
        userFound: true,
        categoryEnabled: false,
        appRequested: Boolean(
          preference.appNotifications
        ),
        appCreated: false,
        emailRequested: Boolean(
          preference.emailNotifications
        ),
        email: skippedEmailResult(
          `${preferenceKey} is disabled`
        ),
      };
    }

    let appCreated = false;

    if (preference.appNotifications) {
      try {
        await Notification.create({
          user: userId,
          title,
          message,
          type,
          order: orderId || null,
          isRead: false,
        });

        appCreated = true;
      } catch (error) {
        console.error(
          "APP NOTIFICATION CREATE ERROR:",
          error
        );
      }
    }

    let emailResult =
      skippedEmailResult(
        "Email notifications are disabled"
      );

    if (
      preference.emailNotifications &&
      user.email
    ) {
      emailResult = await sendEmail({
        to: user.email,
        subject:
          emailSubject || title,
        html:
          emailHtml ||
          `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <h2 style="color:#16833a;">${title}</h2>
              <p>${message}</p>
              <p style="color:#6b7280;">Thank you for using FreshCart.</p>
            </div>
          `,
      });
    }

    return {
      userFound: true,
      categoryEnabled: true,
      appRequested: Boolean(
        preference.appNotifications
      ),
      appCreated,
      emailRequested: Boolean(
        preference.emailNotifications &&
          user.email
      ),
      email: emailResult,
    };
  };
