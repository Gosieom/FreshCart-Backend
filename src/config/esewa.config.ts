import { CLIENT_URL } from "./index";

export type EsewaEnvironment = "test" | "production";

const environment = (process.env.ESEWA_ENVIRONMENT ||
  "test") as EsewaEnvironment;

const isProduction = environment === "production";

export const esewaConfig = {
  environment,

  productCode: process.env.ESEWA_PRODUCT_CODE || "EPAYTEST",

  paymentUrl:
    process.env.ESEWA_PAYMENT_URL ||
    (isProduction
      ? "https://epay.esewa.com.np/api/epay/main/v2/form"
      : "https://rc-epay.esewa.com.np/api/epay/main/v2/form"),

  statusUrl:
    process.env.ESEWA_STATUS_URL ||
    (isProduction
      ? "https://esewa.com.np/api/epay/transaction/status/"
      : "https://rc.esewa.com.np/api/epay/transaction/status/"),

  // Flutter intercepts these HTTPS redirects inside its WebView.
  // Fallback used when the initiation request has no trusted Origin.
  // Normal browser checkouts dynamically return to the frontend origin
  // that initiated the payment (localhost or the deployed frontend).
  returnUrl: (
    process.env.ESEWA_RETURN_URL ||
    `${CLIENT_URL}/user/payment/esewa`
  ).replace(/\/$/, ""),
};
