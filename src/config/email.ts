import {
  EmailSendResult,
  sendEmail as sendBrevoEmail,
} from "../utils/email.util";

type LegacyMailOptions = {
  to: string;
  subject: string;
  html: string;
};

const requireSuccessfulDelivery = (
  result: EmailSendResult
) => {
  if (!result.sent) {
    throw new Error(
      result.error ||
        "Email delivery failed"
    );
  }

  return {
    messageId: result.messageId,
  };
};

/*
 * Compatibility wrapper for older services that import
 * sendEmail(to, subject, html) from src/config/email.ts.
 */
export const sendEmail = async (
  to: string,
  subject: string,
  html: string
) => {
  const result = await sendBrevoEmail({
    to,
    subject,
    html,
  });

  return requireSuccessfulDelivery(result);
};

/*
 * Compatibility object for any older code that calls
 * transporter.sendMail({ to, subject, html }).
 * This now uses Brevo's HTTPS API instead of SMTP.
 */
export const transporter = {
  sendMail: async ({
    to,
    subject,
    html,
  }: LegacyMailOptions) => {
    return sendEmail(
      to,
      subject,
      html
    );
  },
};
