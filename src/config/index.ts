const getRequiredEnvironmentVariable = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is required. Add it to the backend .env file.`
    );
  }

  return value;
};

const getOptionalEnvironmentVariable = (
  name: string,
  fallbackValue: string
): string => {
  return process.env[name]?.trim() || fallbackValue;
};

export const NODE_ENV = getOptionalEnvironmentVariable(
  "NODE_ENV",
  "development"
);

export const IS_PRODUCTION = NODE_ENV === "production";

export const PORT = Number(
  getOptionalEnvironmentVariable("PORT", "5000")
);

export const MONGO_URI = getRequiredEnvironmentVariable(
  "MONGO_URI"
);

export const JWT_SECRET = getRequiredEnvironmentVariable(
  "JWT_SECRET"
);

export const CLIENT_URL = getOptionalEnvironmentVariable(
  "CLIENT_URL",
  "http://localhost:3000"
).replace(/\/+$/, "");

export const EMAIL_USER =
  process.env.EMAIL_USER?.trim() || "";

export const EMAIL_PASS = String(
  process.env.EMAIL_PASSWORD ||
    process.env.EMAIL_PASS ||
    ""
).replace(/\s+/g, "");

export const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY?.trim() ||
  process.env.GOOGLE_API_KEY?.trim() ||
  "";

export const GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() ||
  "gemini-3-flash-preview";