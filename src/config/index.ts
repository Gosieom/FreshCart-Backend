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
const configuredOrigins = (
  process.env.CLIENT_URLS ||
  process.env.CLIENT_URL ||
  ""
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const developmentOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
];

export const ALLOWED_ORIGINS = Array.from(
  new Set([
    ...configuredOrigins,
    ...(IS_PRODUCTION ? [] : developmentOrigins),
  ])
);

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
export const CLOUDINARY_CLOUD_NAME =
  process.env.CLOUDINARY_CLOUD_NAME?.trim() || "";

export const CLOUDINARY_API_KEY =
  process.env.CLOUDINARY_API_KEY?.trim() || "";

export const CLOUDINARY_API_SECRET =
  process.env.CLOUDINARY_API_SECRET?.trim() || "";

export const CLOUDINARY_FOLDER =
  process.env.CLOUDINARY_FOLDER?.trim() || "freshcart";
