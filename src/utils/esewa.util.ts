import crypto from "crypto";

export const createEsewaSignature = (
  totalAmount: string,
  transactionUuid: string,
  productCode: string
) => {
  const secretKey = process.env.ESEWA_SECRET_KEY;

  if (!secretKey) {
    throw new Error("ESEWA_SECRET_KEY is missing in .env");
  }

  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;

  return crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("base64");
};

export const generateEsewaSignature = createEsewaSignature;

export const generateTransactionUuid = (orderId: string) => {
  return `FC-${orderId}-${Date.now()}`;
};

export const createTransactionUuid = generateTransactionUuid;