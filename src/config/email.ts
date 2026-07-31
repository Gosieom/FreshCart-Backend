import {
  EmailSendResult,
  sendEmail as sendGmailEmail,
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

export const sendEmail = async (
  to: string,
  subject: string,
  html: string
) => {
  const result = await sendGmailEmail({
    to,
    subject,
    html,
  });

  return requireSuccessfulDelivery(result);
};

export const transporter = {
  sendMail: async ({
    to,
    subject,
    html,
  }: LegacyMailOptions) => {
    return sendEmail(to, subject, html);
  },
};
