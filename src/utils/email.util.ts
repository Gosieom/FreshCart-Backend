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

type BrevoSendResponse = {
  messageId?: string;
  message?: string;
  code?: string;
};

const BREVO_EMAIL_URL =
  "https://api.brevo.com/v3/smtp/email";

const EMAIL_REQUEST_TIMEOUT_MS = 15_000;

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

const getBrevoApiKey = (): string => {
  return String(
    process.env.BREVO_API_KEY || ""
  ).trim();
};

const getSenderEmail = (): string => {
  return String(
    process.env.BREVO_SENDER_EMAIL ||
      process.env.EMAIL_USER ||
      ""
  ).trim();
};

const getSenderName = (): string => {
  return String(
    process.env.BREVO_SENDER_NAME ||
      "FreshCart"
  ).trim();
};

const parseResponseBody = async (
  response: Response
): Promise<BrevoSendResponse> => {
  const contentType =
    response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as BrevoSendResponse;
  }

  const text = await response.text();

  return {
    message: text || "Unknown Brevo response",
  };
};

export const isEmailEnabled = (): boolean => {
  return readBoolean(
    process.env.EMAIL_ENABLED,
    true
  );
};

export const isEmailConfigured = (): boolean => {
  return Boolean(
    getBrevoApiKey() &&
      getSenderEmail()
  );
};

export const getSafeEmailStatus = () => ({
  enabled: isEmailEnabled(),
  configured: isEmailConfigured(),
  user: getSenderEmail(),
  host: "api.brevo.com",
  provider: "brevo",
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
        "BREVO_API_KEY and BREVO_SENDER_EMAIL are required",
    };
  }

  const recipient = String(to || "").trim();
  const emailSubject = String(
    subject || ""
  ).trim();

  if (!recipient) {
    return {
      attempted: false,
      sent: false,
      skipped: true,
      error: "Recipient email is required",
    };
  }

  if (!emailSubject) {
    return {
      attempted: false,
      sent: false,
      skipped: true,
      error: "Email subject is required",
    };
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, EMAIL_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      BREVO_EMAIL_URL,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": getBrevoApiKey(),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: {
            email: getSenderEmail(),
            name: getSenderName(),
          },
          to: [
            {
              email: recipient,
            },
          ],
          subject: emailSubject,
          htmlContent: html,
        }),
        signal: controller.signal,
      }
    );

    const responseBody =
      await parseResponseBody(response);

    if (!response.ok) {
      const errorMessage =
        responseBody.message ||
        responseBody.code ||
        `Brevo request failed with status ${response.status}`;

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

    const messageId =
      responseBody.messageId ||
      "brevo-message-accepted";

    console.log(
      `EMAIL SENT VIA BREVO: ${messageId} -> ${recipient}`
    );

    return {
      attempted: true,
      sent: true,
      skipped: false,
      messageId,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.name === "AbortError"
          ? "Brevo email request timed out"
          : error.message
        : "Unknown Brevo email delivery error";

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
  } finally {
    clearTimeout(timeout);
  }
};
