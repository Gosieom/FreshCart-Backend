import { Request, Response } from "express";
import mongoose from "mongoose";
import Category from "../models/category.model";

const escapeRegex = (value: string) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

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

export const getAdminCategories = async (req: Request, res: Response) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const skip = (page - 1) * limit;

    const query: any = {};

    if (search) {
      const safeSearch = escapeRegex(search);

      query.$or = [
        {
          $expr: {
            $regexMatch: {
              input: { $toString: "$_id" },
              regex: safeSearch,
              options: "i",
            },
          },
        },
        {
          name: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          description: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          status: {
            $regex: safeSearch,
            $options: "i",
          },
        },
      ];
    }

    const [categories, total] = await Promise.all([
      Category.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Category.countDocuments(query),
    ]);

    return res.status(200).json({
      data: categories.map(formatCategory),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.log("GET ADMIN CATEGORIES ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch categories",
    });
  }
};

export const getAdminCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid category id",
      });
    }

    const category = await Category.findById(id).lean();

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    return res.status(200).json({
      data: formatCategory(category),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch category",
    });
  }
};

export const createAdminCategory = async (req: Request, res: Response) => {
  try {
    const { name, description = "", status = "active" } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Category name is required",
      });
    }

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }

    const existingCategory = await Category.findOne({
      name: name.trim(),
    });

    if (existingCategory) {
      return res.status(409).json({
        message: "Category already exists",
      });
    }

    const image = req.file ? `/uploads/categories/${req.file.filename}` : "";

    const category = await Category.create({
      name: name.trim(),
      description,
      image,
      status,
    });

    return res.status(201).json({
      message: "Category created successfully",
      data: formatCategory(category),
    });
  } catch (error: any) {
    return res.status(500).json({
      message: error.message || "Failed to create category",
    });
  }
};

export const updateAdminCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid category id",
      });
    }

    const updateData: any = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          message: "Category name cannot be empty",
        });
      }

      const existingCategory = await Category.findOne({
        name: name.trim(),
        _id: { $ne: id },
      });

      if (existingCategory) {
        return res.status(409).json({
          message: "Category already exists",
        });
      }

      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (status !== undefined) {
      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({
          message: "Invalid status",
        });
      }

      updateData.status = status;
    }

    if (req.file) {
      updateData.image = `/uploads/categories/${req.file.filename}`;
    }

    const category = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    return res.status(200).json({
      message: "Category updated successfully",
      data: formatCategory(category),
    });
  } catch (error: any) {
    return res.status(500).json({
      message: error.message || "Failed to update category",
    });
  }
};

export const deleteAdminCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid category id",
      });
    }

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    return res.status(200).json({
      message: "Category deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete category",
    });
  }
};