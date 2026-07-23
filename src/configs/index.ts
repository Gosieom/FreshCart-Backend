export const CLIENT_URL: string =
  process.env.CLIENT_URL || "http://localhost:3000";

export const EMAIL_USER: string = process.env.EMAIL_USER || "";

export const EMAIL_PASS: string = process.env.EMAIL_PASS || "";

export const JWT_SECRET: string =
  process.env.JWT_SECRET || "freshcart_secret_key";

// Free Google Gemini API key created in Google AI Studio.
export const GEMINI_API_KEY: string =
  process.env.GEMINI_API_KEY?.trim() ||
  process.env.GOOGLE_API_KEY?.trim() ||
  "";

// Gemini 3 Flash Preview currently supports the Gemini API free tier.
export const GEMINI_MODEL: string =
  process.env.GEMINI_MODEL?.trim() || "gemini-3-flash-preview";
