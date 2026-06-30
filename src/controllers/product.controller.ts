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

export const getProducts = async (req: Request, res: Response) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 100);

    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const category =
      typeof req.query.category === "string" ? req.query.category.trim() : "";

    const skip = (page - 1) * limit;

    const query: any = {
      status: "active",
    };

    if (search) {
      query.$or = [
        {
          name: {
            $regex: escapeRegex(search),
            $options: "i",
          },
        },
        {
          category: {
            $regex: escapeRegex(search),
            $options: "i",
          },
        },
      ];
    }

    if (category) {
      query.category = {
        $regex: `^${escapeRegex(category)}$`,
        $options: "i",
      };
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
    return res.status(500).json({
      message: "Failed to fetch products",
    });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid product id",
      });
    }

    const product = await Product.findOne({
      _id: id,
      status: "active",
    }).lean();

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