import { Request, Response } from "express";
import mongoose from "mongoose";
import Category from "../models/category.model";

import {
  deleteStoredImage,
  uploadImageBuffer,
} from "../services/imageStorage.service";

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

const getErrorMessage = (
  error: unknown,
  fallback: string
) => {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
};

const uploadCategoryImage =
  async (req: Request) => {
    if (!req.file) {
      return "";
    }

    return uploadImageBuffer(
      req.file.buffer,
      "categories"
    );
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

export const createAdminCategory = async (
  req: Request,
  res: Response
) => {
  let uploadedImage = "";

  try {
    const {
      name,
      description = "",
      status = "active",
    } = req.body;

    if (
      !name ||
      !String(name).trim()
    ) {
      return res.status(400).json({
        message:
          "Category name is required",
      });
    }

    if (
      !["active", "inactive"].includes(
        status
      )
    ) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }

    const normalizedName =
      String(name).trim();

    const existingCategory =
      await Category.findOne({
        name: normalizedName,
      });

    if (existingCategory) {
      return res.status(409).json({
        message:
          "Category already exists",
      });
    }

    if (req.file) {
      uploadedImage =
        await uploadCategoryImage(req);
    }

    const category =
      await Category.create({
        name: normalizedName,
        description,
        image: uploadedImage,
        status,
      });

    return res.status(201).json({
      message:
        "Category created successfully",
      data: formatCategory(category),
    });
  } catch (error: unknown) {
    if (uploadedImage) {
      await deleteStoredImage(
        uploadedImage
      );
    }

    return res.status(500).json({
      message: getErrorMessage(
        error,
        "Failed to create category"
      ),
    });
  }
};

export const updateAdminCategory = async (
  req: Request,
  res: Response
) => {
  let uploadedImage = "";

  try {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        message: "Invalid category id",
      });
    }

    const category =
      await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    const {
      name,
      description,
      status,
    } = req.body;

    if (name !== undefined) {
      const normalizedName =
        String(name).trim();

      if (!normalizedName) {
        return res.status(400).json({
          message:
            "Category name cannot be empty",
        });
      }

      const existingCategory =
        await Category.findOne({
          name: normalizedName,
          _id: { $ne: id },
        });

      if (existingCategory) {
        return res.status(409).json({
          message:
            "Category already exists",
        });
      }

      category.name =
        normalizedName;
    }

    if (description !== undefined) {
      category.description =
        description;
    }

    if (status !== undefined) {
      if (
        !["active", "inactive"].includes(
          status
        )
      ) {
        return res.status(400).json({
          message: "Invalid status",
        });
      }

      category.status = status;
    }

    const previousImage =
      category.image || "";

    if (req.file) {
      uploadedImage =
        await uploadCategoryImage(req);

      category.image =
        uploadedImage;
    }

    await category.save();

    if (
      uploadedImage &&
      previousImage
    ) {
      await deleteStoredImage(
        previousImage
      );
    }

    return res.status(200).json({
      message:
        "Category updated successfully",
      data: formatCategory(category),
    });
  } catch (error: unknown) {
    if (uploadedImage) {
      await deleteStoredImage(
        uploadedImage
      );
    }

    return res.status(500).json({
      message: getErrorMessage(
        error,
        "Failed to update category"
      ),
    });
  }
};

export const deleteAdminCategory = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        message: "Invalid category id",
      });
    }

    const category =
      await Category.findByIdAndDelete(
        id
      );

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    if (category.image) {
      await deleteStoredImage(
        category.image
      );
    }

    return res.status(200).json({
      message:
        "Category deleted successfully",
    });
  } catch (error: unknown) {
    return res.status(500).json({
      message: getErrorMessage(
        error,
        "Failed to delete category"
      ),
    });
  }
};
