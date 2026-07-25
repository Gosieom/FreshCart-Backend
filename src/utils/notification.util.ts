import Notification, {
  NotificationType,
} from "../models/notification.model";
import NotificationPreference from "../models/notificationPreference.model";
import User from "../models/user.model";
import {
  EmailSendResult,
  sendEmail,
} from "./email.util";

export type CreateUserNotificationPayload = {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  orderId?: string;
  emailSubject?: string;
  emailHtml?: string;

  /*
   * Used by the test-notification endpoint so the user can
   * test email/app delivery even when a category preference
   * such as securityAlerts is disabled.
   */
  ignoreCategoryPreference?: boolean;

  /*
   * Normal notifications wait for email delivery by default.
   * Checkout sets this to false so Gmail does not delay the
   * order response.
   */
  waitForEmail?: boolean;
};

export type CreateUserNotificationResult = {
  appRequested: boolean;
  appCreated: boolean;
  emailRequested: boolean;
  email: EmailSendResult;
  error?: string;
};

const createSkippedEmailResult = (
  error: string
): EmailSendResult => ({
  attempted: false,
  sent: false,
  skipped: true,
  error,
});

const createInitialResult =
  (): CreateUserNotificationResult => ({
    appRequested: false,
    appCreated: false,
    emailRequested: false,
    email: createSkippedEmailResult(
      "Email notification was not requested"
    ),
  });

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

const createDefaultEmailHtml = (
  title: string,
  message: string
) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2 style="color:#16833a;">
      ${title}
    </h2>

    <p>
      ${message}
    </p>

    <p style="color:#6b7280;">
      Thank you for using FreshCart.
    </p>
  </div>
`;

export const createUserNotification = async ({
  userId,
  title,
  message,
  type,
  orderId,
  emailSubject,
  emailHtml,
  ignoreCategoryPreference = false,
  waitForEmail = true,
}: CreateUserNotificationPayload): Promise<CreateUserNotificationResult> => {
  const result = createInitialResult();

  try {
    const user = await User.findById(userId).select(
      "-password"
    );

    if (!user) {
      result.error =
        "Notification skipped because the user was not found";

      return result;
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

    const categoryEnabled = Boolean(
      (preference as any)[preferenceKey]
    );

    if (
      !ignoreCategoryPreference &&
      !categoryEnabled
    ) {
      result.error =
        `Notification category ${preferenceKey} is disabled`;

      return result;
    }

    result.appRequested = Boolean(
      preference.appNotifications
    );

    result.emailRequested = Boolean(
      preference.emailNotifications &&
        user.email
    );

    /*
     * Always wait for the database notification to be saved.
     * This guarantees that the notification exists before an
     * order response or integration test continues.
     */
    if (result.appRequested) {
      try {
        await Notification.create({
          user: userId,
          title,
          message,
          type,
          order: orderId || null,
          isRead: false,
        });

        result.appCreated = true;
      } catch (appError: unknown) {
        result.appCreated = false;

        result.error =
          appError instanceof Error
            ? appError.message
            : "Failed to create app notification";

        console.error(
          "APP NOTIFICATION ERROR:",
          appError
        );
      }
    }

    if (!result.emailRequested) {
      result.email = createSkippedEmailResult(
        user.email
          ? "Email notifications are disabled"
          : "The user does not have an email address"
      );

      return result;
    }

    const emailPayload = {
      to: user.email,
      subject: emailSubject || title,
      html:
        emailHtml ||
        createDefaultEmailHtml(
          title,
          message
        ),
    };

    /*
     * Test notifications and other normal workflows can wait
     * and receive the true Gmail result.
     */
    if (waitForEmail) {
      result.email =
        await sendEmail(emailPayload);

      return result;
    }

    /*
     * Checkout uses background delivery. The in-app
     * notification is already stored, so the API response
     * does not wait for Gmail.
     */
    result.email =
      createSkippedEmailResult(
        "Email delivery queued in background"
      );

    void sendEmail(emailPayload)
      .then((emailResult) => {
        if (
          !emailResult.sent &&
          !emailResult.skipped
        ) {
          console.error(
            "BACKGROUND EMAIL ERROR:",
            emailResult.error
          );
        }
      })
      .catch((emailError: unknown) => {
        console.error(
          "BACKGROUND EMAIL ERROR:",
          emailError
        );
      });

    return result;
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create notification";

    result.error = message;

    console.error(
      "CREATE USER NOTIFICATION ERROR:",
      error
    );

    return result;
  }
};