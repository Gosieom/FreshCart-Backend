import { Request, Response } from "express";
import Category from "../models/category.model";

const formatCategory = (category: any) => {
  return {
    id: category._id.toString(),
    _id: category._id.toString(),
    name: category.name,
    description: category.description,
    image: category.image,
    status: category.status,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
};

export const getCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await Category.find({ status: "active" })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      data: categories.map(formatCategory),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch categories",
    });
  }
};