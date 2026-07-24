import { Request, Response } from "express";
import mongoose from "mongoose";
import Product from "../models/product.model";

import {
  deleteStoredImage,
  uploadImageBuffer,
} from "../services/imageStorage.service";

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

const buildProductSearchQuery = (search: string) => {
  if (!search) return {};

  const safeSearch = escapeRegex(search);

  return {
    $or: [
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
    ],
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

const uploadProductImage = async (
  req: Request
) => {
  if (!req.file) {
    return "";
  }

  return uploadImageBuffer(
    req.file.buffer,
    "products"
  );
};

export const getAdminProducts = async (req: Request, res: Response) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const skip = (page - 1) * limit;

    const query: any = buildProductSearchQuery(search);

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

export const createAdminProduct = async (
  req: Request,
  res: Response
) => {
  let uploadedImage = "";

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

    if (
      !name ||
      !price ||
      !category ||
      stock === undefined
    ) {
      return res.status(400).json({
        message:
          "Name, price, category, and stock are required",
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

    const numericPrice = Number(price);
    const numericStock = Number(stock);

    if (
      Number.isNaN(numericPrice) ||
      numericPrice < 0
    ) {
      return res.status(400).json({
        message:
          "Price must be a valid positive number",
      });
    }

    if (
      Number.isNaN(numericStock) ||
      numericStock < 0
    ) {
      return res.status(400).json({
        message:
          "Stock must be a valid positive number",
      });
    }

    if (req.file) {
      uploadedImage =
        await uploadProductImage(req);
    }

    const product =
      await Product.create({
        name: String(name).trim(),
        description,
        price: numericPrice,
        category:
          String(category).trim(),
        stock: numericStock,
        unit,
        image: uploadedImage,
        status,
      });

    return res.status(201).json({
      message:
        "Product created successfully",
      data: formatProduct(product),
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
        "Failed to create product"
      ),
    });
  }
};

export const updateAdminProduct = async (
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
        message: "Invalid product id",
      });
    }

    const product =
      await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
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

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({
          message:
            "Product name cannot be empty",
        });
      }

      product.name =
        String(name).trim();
    }

    if (description !== undefined) {
      product.description =
        description;
    }

    if (price !== undefined) {
      const numericPrice =
        Number(price);

      if (
        Number.isNaN(
          numericPrice
        ) ||
        numericPrice < 0
      ) {
        return res.status(400).json({
          message:
            "Price must be a valid positive number",
        });
      }

      product.price =
        numericPrice;
    }

    if (category !== undefined) {
      if (!String(category).trim()) {
        return res.status(400).json({
          message:
            "Category cannot be empty",
        });
      }

      product.category =
        String(category).trim();
    }

    if (stock !== undefined) {
      const numericStock =
        Number(stock);

      if (
        Number.isNaN(
          numericStock
        ) ||
        numericStock < 0
      ) {
        return res.status(400).json({
          message:
            "Stock must be a valid positive number",
        });
      }

      product.stock =
        numericStock;
    }

    if (unit !== undefined) {
      product.unit = unit;
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

      product.status = status;
    }

    const previousImage =
      product.image || "";

    if (req.file) {
      uploadedImage =
        await uploadProductImage(req);

      product.image =
        uploadedImage;
    }

    await product.save();

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
        "Product updated successfully",
      data: formatProduct(product),
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
        "Failed to update product"
      ),
    });
  }
};

export const deleteAdminProduct = async (
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
        message: "Invalid product id",
      });
    }

    const product =
      await Product.findByIdAndDelete(
        id
      );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (product.image) {
      await deleteStoredImage(
        product.image
      );
    }

    return res.status(200).json({
      message:
        "Product deleted successfully",
    });
  } catch (error: unknown) {
    return res.status(500).json({
      message: getErrorMessage(
        error,
        "Failed to delete product"
      ),
    });
  }
};

export const getAdminInventory = async (req: Request, res: Response) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);

    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const status =
      typeof req.query.status === "string" ? req.query.status.trim() : "all";
    const stockStatus =
      typeof req.query.stockStatus === "string"
        ? req.query.stockStatus.trim()
        : "all";
    const category =
      typeof req.query.category === "string" ? req.query.category.trim() : "all";

    const lowStockThreshold = Math.max(
      Number(req.query.lowStockThreshold) || 10,
      1
    );

    const skip = (page - 1) * limit;

    const query: any = {
      ...buildProductSearchQuery(search),
    };

    if (status !== "all") {
      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({
          message: "Invalid status filter",
        });
      }

      query.status = status;
    }

    if (category !== "all") {
      query.category = category;
    }

    if (stockStatus === "out") {
      query.stock = { $lte: 0 };
    } else if (stockStatus === "low") {
      query.stock = {
        $gt: 0,
        $lte: lowStockThreshold,
      };
    } else if (stockStatus === "good") {
      query.stock = {
        $gt: lowStockThreshold,
      };
    } else if (stockStatus !== "all") {
      return res.status(400).json({
        message: "Invalid stock status filter",
      });
    }

    const [products, total, allProducts] = await Promise.all([
      Product.find(query)
        .sort({ stock: 1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
      Product.find({}).lean(),
    ]);

    const totalProducts = allProducts.length;
    const activeProducts = allProducts.filter(
      (product) => product.status === "active"
    ).length;
    const inactiveProducts = allProducts.filter(
      (product) => product.status === "inactive"
    ).length;
    const outOfStockProducts = allProducts.filter(
      (product) => Number(product.stock || 0) <= 0
    ).length;
    const lowStockProducts = allProducts.filter(
      (product) =>
        Number(product.stock || 0) > 0 &&
        Number(product.stock || 0) <= lowStockThreshold
    ).length;
    const goodStockProducts = allProducts.filter(
      (product) => Number(product.stock || 0) > lowStockThreshold
    ).length;

    const totalStock = allProducts.reduce(
      (sum, product) => sum + Number(product.stock || 0),
      0
    );

    const totalInventoryValue = allProducts.reduce(
      (sum, product) =>
        sum + Number(product.stock || 0) * Number(product.price || 0),
      0
    );

    const categoryMap = new Map<string, number>();

    allProducts.forEach((product) => {
      const productCategory = product.category || "Uncategorized";
      categoryMap.set(
        productCategory,
        (categoryMap.get(productCategory) || 0) + 1
      );
    });

    const categories = Array.from(categoryMap.entries())
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json({
      success: true,
      data: products.map(formatProduct),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      stats: {
        totalProducts,
        activeProducts,
        inactiveProducts,
        totalStock,
        totalInventoryValue,
        lowStockProducts,
        outOfStockProducts,
        goodStockProducts,
        lowStockThreshold,
        categories,
      },
    });
  } catch (error: any) {
    console.log("GET ADMIN INVENTORY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch inventory",
    });
  }
};

export const updateAdminProductStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { stock, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    if (stock === undefined || stock === "") {
      return res.status(400).json({
        success: false,
        message: "Stock is required",
      });
    }

    const numericStock = Number(stock);

    if (Number.isNaN(numericStock) || numericStock < 0) {
      return res.status(400).json({
        success: false,
        message: "Stock must be a valid number and cannot be negative",
      });
    }

    const updateData: any = {
      stock: numericStock,
    };

    if (status !== undefined) {
      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product status",
        });
      }

      updateData.status = status;
    }

    const product = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Inventory stock updated successfully",
      data: formatProduct(product),
    });
  } catch (error: any) {
    console.log("UPDATE ADMIN PRODUCT STOCK ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update stock",
    });
  }
};