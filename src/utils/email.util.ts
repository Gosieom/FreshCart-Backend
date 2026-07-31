export type EmailSendResult = {
  attempted: boolean;
  sent: boolean;
  skipped: boolean;
  messageId?: string;
  error?: string;
};

export type SendEmailPayload = {
  to: string;
  subject: string;
  html: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GmailSendResponse = {
  id?: string;
  error?: {
    message?: string;
  };
};

const GOOGLE_TOKEN_URL =
  "https://oauth2.googleapis.com/token";

const GMAIL_SEND_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

const REQUEST_TIMEOUT_MS = 15_000;

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

const getClientId = () =>
  String(process.env.GMAIL_CLIENT_ID || "").trim();

const getClientSecret = () =>
  String(process.env.GMAIL_CLIENT_SECRET || "").trim();

const getRefreshToken = () =>
  String(process.env.GMAIL_REFRESH_TOKEN || "").trim();

const getSenderEmail = () =>
  String(
    process.env.GMAIL_SENDER_EMAIL ||
      process.env.EMAIL_USER ||
      ""
  ).trim();

const getSenderName = () =>
  String(
    process.env.GMAIL_SENDER_NAME ||
      "FreshCart"
  ).trim();

const encodeHeader = (value: string): string =>
  `=?UTF-8?B?${Buffer.from(
    value,
    "utf8"
  ).toString("base64")}?=`;

const toBase64Url = (value: string): string =>
  Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const createMimeMessage = ({
  to,
  subject,
  html,
}: SendEmailPayload): string => {
  const htmlBase64 = Buffer.from(
    html,
    "utf8"
  ).toString("base64");

  const message = [
    `From: ${encodeHeader(
      getSenderName()
    )} <${getSenderEmail()}>`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    htmlBase64,
  ].join("\r\n");

  return toBase64Url(message);
};

const getAccessToken = async (): Promise<string> => {
  const response = await fetch(
    GOOGLE_TOKEN_URL,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: getClientId(),
        client_secret: getClientSecret(),
        refresh_token: getRefreshToken(),
        grant_type: "refresh_token",
      }),
    }
  );

  const body =
    (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !body.access_token) {
    throw new Error(
      body.error_description ||
        body.error ||
        "Failed to obtain Gmail access token"
    );
  }

  return body.access_token;
};

export const isEmailEnabled = (): boolean =>
  readBoolean(process.env.EMAIL_ENABLED, true);

export const isEmailConfigured = (): boolean =>
  Boolean(
    getClientId() &&
      getClientSecret() &&
      getRefreshToken() &&
      getSenderEmail()
  );

export const getSafeEmailStatus = () => ({
  enabled: isEmailEnabled(),
  configured: isEmailConfigured(),
  user: getSenderEmail(),
  host: "gmail.googleapis.com",
  provider: "gmail-api",
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
        "GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN and GMAIL_SENDER_EMAIL are required",
    };
  }

  const recipient = String(to || "").trim();
  const emailSubject = String(subject || "").trim();

  if (!recipient || !emailSubject) {
    return {
      attempted: false,
      sent: false,
      skipped: true,
      error: "Recipient and subject are required",
    };
  }

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const accessToken = await getAccessToken();

    const response = await fetch(
      GMAIL_SEND_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          raw: createMimeMessage({
            to: recipient,
            subject: emailSubject,
            html,
          }),
        }),
        signal: controller.signal,
      }
    );

    const body =
      (await response.json()) as GmailSendResponse;

    if (!response.ok || !body.id) {
      const errorMessage =
        body.error?.message ||
        `Gmail API request failed with status ${response.status}`;

      console.error(
        "EMAIL SEND ERROR:",
        errorMessage
      );

      return {
        attempted: true,
        sent: false,
        skipped: false,
        error: errorMessage,
      };
    }

    console.log(
      `EMAIL SENT VIA GMAIL API: ${body.id} -> ${recipient}`
    );

    return {
      attempted: true,
      sent: true,
      skipped: false,
      messageId: body.id,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.name === "AbortError"
          ? "Gmail API request timed out"
          : error.message
        : "Unknown Gmail API delivery error";

    console.error("EMAIL SEND ERROR:", message);

    return {
      attempted: true,
      sent: false,
      skipped: false,
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
};
