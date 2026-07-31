import { Request, Response } from "express";
import { generateAiGroceryPlanService } from "../services/aiGrocery.service";
import {
  AiGroceryError,
  AiGroceryRequest,
} from "../types/aiGrocery.types";

const toOptionalPositiveNumber = (
  value: unknown,
  fieldName: string,
  maximum: number,
): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > maximum) {
    throw new AiGroceryError(
      400,
      `${fieldName} must be greater than 0 and no more than ${maximum}.`,
    );
  }

  return Number(parsed.toFixed(2));
};

const toBoundedInteger = (
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
  fieldName: string,
): number => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new AiGroceryError(400, `${fieldName} must be a number.`);
  }

  const integer = Math.floor(parsed);

  if (integer < minimum || integer > maximum) {
    throw new AiGroceryError(
      400,
      `${fieldName} must be between ${minimum} and ${maximum}.`,
    );
  }

  return integer;
};

const toStringArray = (
  value: unknown,
  fieldName: string,
): string[] => {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new AiGroceryError(400, `${fieldName} must be a list.`);
  }

  return [...new Set(
    value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean)
      .map((item) => item.slice(0, 60)),
  )].slice(0, 10);
};

const parseRequest = (body: unknown): AiGroceryRequest => {
  const data = body && typeof body === "object"
    ? (body as Record<string, unknown>)
    : {};

  const prompt = String(data.prompt ?? "").trim();

  if (prompt.length < 5) {
    throw new AiGroceryError(
      400,
      "Tell FreshCart AI what groceries or meals you need.",
    );
  }

  if (prompt.length > 600) {
    throw new AiGroceryError(
      400,
      "Your request is too long. Keep it under 600 characters.",
    );
  }

  return {
    prompt,
    budget: toOptionalPositiveNumber(data.budget, "Budget", 1_000_000),
    servings: toBoundedInteger(data.servings, 2, 1, 20, "Servings"),
    mealCount: toBoundedInteger(data.mealCount, 3, 1, 7, "Meal count"),
    dietaryPreferences: toStringArray(
      data.dietaryPreferences,
      "Dietary preferences",
    ),
    allergies: toStringArray(data.allergies, "Allergies"),
  };
};

export const generateAiGroceryPlan = async (
  req: Request,
  res: Response,
) => {
  try {
    const request = parseRequest(req.body);
    const data = await generateAiGroceryPlanService(request);

    return res.status(200).json({
      success: true,
      message: "FreshCart AI plan generated",
      data,
    });
  } catch (error) {
    if (error instanceof AiGroceryError) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Generate AI grocery plan error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate the FreshCart AI grocery plan.",
    });
  }
};
