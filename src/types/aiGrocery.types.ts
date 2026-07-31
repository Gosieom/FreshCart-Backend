export type AiGroceryRequest = {
  prompt: string;
  budget?: number;
  servings: number;
  mealCount: number;
  dietaryPreferences: string[];
  allergies: string[];
};

export type AiCatalogProduct = {
  id: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  price: number;
  oldPrice: number;
  stock: number;
  isOffer: boolean;
};

export type AiModelMeal = {
  name: string;
  description: string;
  productIds: string[];
};

export type AiModelRecommendation = {
  productId: string;
  quantity: number;
  reason: string;
};

export type AiModelPlan = {
  title: string;
  message: string;
  meals: AiModelMeal[];
  recommendations: AiModelRecommendation[];
  tips: string[];
};

export type AiValidatedRecommendation = {
  product: Record<string, unknown>;
  quantity: number;
  reason: string;
  lineTotal: number;
};

export type AiGroceryPlan = {
  title: string;
  message: string;
  meals: AiModelMeal[];
  recommendations: AiValidatedRecommendation[];
  estimatedTotal: number;
  withinBudget: boolean;
  warnings: string[];
  tips: string[];
};

export class AiGroceryError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AiGroceryError";
    this.status = status;
  }
}
