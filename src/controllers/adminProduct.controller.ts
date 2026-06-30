import { Request, Response } from "express";
import mongoose from "mongoose";
import Product from "../models/product.model";

const escapeRegex = (value: string) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const formatProduct = (product: any) => {
  return {
    id: product._id.toString(),
    _id: product._id.toString(),
    name: product.name,
    description: product.description,
    price: product.price,
    category: product.category,
    stock: product.stock,
    unit: product.unit,
    image: product.image,
    status: product.status,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
};

export const getAdminProducts = async (req: Request, res: Response) => {
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
          category: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          unit: {
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

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    return res.status(200).json({
      data: products.map(formatProduct),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.log("GET ADMIN PRODUCTS ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch products",
    });
  }
};

export const getAdminProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid product id",
      });
    }

    const product = await Product.findById(id).lean();

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.status(200).json({
      data: formatProduct(product),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch product",
    });
  }
};

export const createAdminProduct = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description = "",
      price,
      category,
      stock,
      unit = "piece",
      status = "active",
    } = req.body;

    if (!name || !price || !category || stock === undefined) {
      return res.status(400).json({
        message: "Name, price, category, and stock are required",
      });
    }

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }

    const numericPrice = Number(price);
    const numericStock = Number(stock);

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({
        message: "Price must be a valid positive number",
      });
    }

    if (Number.isNaN(numericStock) || numericStock < 0) {
      return res.status(400).json({
        message: "Stock must be a valid positive number",
      });
    }

    const image = req.file ? `/uploads/products/${req.file.filename}` : "";

    const product = await Product.create({
      name: name.trim(),
      description,
      price: numericPrice,
      category: category.trim(),
      stock: numericStock,
      unit,
      image,
      status,
    });

    return res.status(201).json({
      message: "Product created successfully",
      data: formatProduct(product),
    });
  } catch (error: any) {
    return res.status(500).json({
      message: error.message || "Failed to create product",
    });
  }
};

export const updateAdminProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid product id",
      });
    }

    const {
      name,
      description,
      price,
      category,
      stock,
      unit,
      status,
    } = req.body;

    const updateData: any = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          message: "Product name cannot be empty",
        });
      }

      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (price !== undefined) {
      const numericPrice = Number(price);

      if (Number.isNaN(numericPrice) || numericPrice < 0) {
        return res.status(400).json({
          message: "Price must be a valid positive number",
        });
      }

      updateData.price = numericPrice;
    }

    if (category !== undefined) {
      if (!category.trim()) {
        return res.status(400).json({
          message: "Category cannot be empty",
        });
      }

      updateData.category = category.trim();
    }

    if (stock !== undefined) {
      const numericStock = Number(stock);

      if (Number.isNaN(numericStock) || numericStock < 0) {
        return res.status(400).json({
          message: "Stock must be a valid positive number",
        });
      }

      updateData.stock = numericStock;
    }

    if (unit !== undefined) {
      updateData.unit = unit;
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
      updateData.image = `/uploads/products/${req.file.filename}`;
    }

    const product = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.status(200).json({
      message: "Product updated successfully",
      data: formatProduct(product),
    });
  } catch (error: any) {
    return res.status(500).json({
      message: error.message || "Failed to update product",
    });
  }
};

export const deleteAdminProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid product id",
      });
    }

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.status(200).json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete product",
    });
  }
};