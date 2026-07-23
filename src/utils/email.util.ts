import nodemailer, {
  Transporter,
} from "nodemailer";

export type EmailSendResult = {
  attempted: boolean;
  sent: boolean;
  skipped: boolean;
  messageId?: string;
  error?: string;
};

type SendEmailPayload = {
  to: string;
  subject: string;
  html: string;
};

let cachedTransporter:
  | Transporter
  | null = null;

const readBoolean = (
  value: string | undefined,
  fallback: boolean
): boolean => {
  if (value === undefined) {
    return fallback;
  }

  return ["true", "1", "yes", "on"].includes(
    value.trim().toLowerCase()
  );
};

const cleanAppPassword = (
  value: string
): string => {
  /*
   * Google displays app passwords in groups.
   * Removing whitespace prevents copy/paste errors.
   */
  return value.replace(/\s+/g, "");
};

const getTransporter = (): Transporter => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const emailUser = String(
    process.env.EMAIL_USER || ""
  ).trim();

  const rawPassword = String(
    process.env.EMAIL_PASS ||
      process.env.EMAIL_PASSWORD ||
      ""
  );

  const emailPass =
    cleanAppPassword(rawPassword);

  if (!emailUser || !emailPass) {
    throw new Error(
      "EMAIL_USER and EMAIL_PASS (or EMAIL_PASSWORD) are required"
    );
  }

  const host = String(
    process.env.EMAIL_HOST || ""
  ).trim();

  if (host) {
    const port = Number(
      process.env.EMAIL_PORT || 587
    );

    const secure = readBoolean(
      process.env.EMAIL_SECURE,
      port === 465
    );

    cachedTransporter =
      nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });
  } else {
    cachedTransporter =
      nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });
  }

  return cachedTransporter;
};

export const isEmailEnabled = () =>
  readBoolean(
    process.env.EMAIL_ENABLED,
    true
  );

export const isEmailConfigured = () => {
  const emailUser = String(
    process.env.EMAIL_USER || ""
  ).trim();

  const emailPass = String(
    process.env.EMAIL_PASS ||
      process.env.EMAIL_PASSWORD ||
      ""
  ).trim();

  return Boolean(emailUser && emailPass);
};

export const getSafeEmailStatus = () => ({
  enabled: isEmailEnabled(),
  configured: isEmailConfigured(),
  user: String(
    process.env.EMAIL_USER || ""
  ).trim(),
  host:
    String(
      process.env.EMAIL_HOST || "gmail"
    ).trim() || "gmail",
});

export const sendEmail = async ({
  to,
  subject,
  html,
}: SendEmailPayload): Promise<EmailSendResult> => {
  if (!isEmailEnabled()) {
    return {
      attempted: false,
      sent: false,
      skipped: true,
      error:
        "Email delivery is disabled by EMAIL_ENABLED",
    };
  }

  if (!isEmailConfigured()) {
    return {
      attempted: false,
      sent: false,
      skipped: true,
      error:
        "EMAIL_USER and EMAIL_PASS (or EMAIL_PASSWORD) are missing",
    };
  }

  try {
    const emailUser = String(
      process.env.EMAIL_USER || ""
    ).trim();

    const from = String(
      process.env.EMAIL_FROM ||
        `FreshCart <${emailUser}>`
    ).trim();

    const info = await getTransporter().sendMail({
      from,
      to,
      subject,
      html,
    });

    console.log(
      `EMAIL SENT: ${info.messageId} -> ${to}`
    );

    return {
      attempted: true,
      sent: true,
      skipped: false,
      messageId: info.messageId,
    };
  } catch (error: any) {
    const message =
      error?.message ||
      "Unknown email delivery error";

    console.error(
      "EMAIL SEND ERROR:",
      message
    );

    return {
      attempted: true,
      sent: false,
      skipped: false,
      error: message,
    };
  }
};
