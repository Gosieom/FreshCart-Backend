import { Request, Response } from "express";
import mongoose from "mongoose";
import Product from "../models/product.model";

const escapeRegex = (value: string) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const isOfferCurrentlyActive = (product: any) => {
  const now = new Date();

  const isOffer = Boolean(product.isOffer);
  const stock = Number(product.stock || 0);
  const discountPercent = Number(product.discountPercent || 0);
  const offerPrice = Number(product.offerPrice || 0);

  const hasDiscount = discountPercent > 0 || offerPrice > 0;
  const startsOk =
    !product.offerStartDate || new Date(product.offerStartDate) <= now;
  const endsOk =
    !product.offerEndDate || new Date(product.offerEndDate) >= now;

  return (
    product.status === "active" &&
    isOffer &&
    stock > 0 &&
    hasDiscount &&
    startsOk &&
    endsOk
  );
};

const formatProduct = (product: any) => {
  const regularPrice = Number(product.price || 0);
  const discountPercent = Number(product.discountPercent || 0);

  const calculatedOfferPrice = Number(
    (
      regularPrice -
      (regularPrice * discountPercent) / 100
    ).toFixed(2)
  );

  const offerPrice =
    Number(product.offerPrice || 0) > 0
      ? Number(product.offerPrice)
      : calculatedOfferPrice;

  return {
    id: product._id.toString(),
    _id: product._id.toString(),
    name: product.name,
    description: product.description,
    price: regularPrice,
    category: product.category,
    stock: Number(product.stock || 0),
    unit: product.unit,
    image: product.image,
    status: product.status,

    isOffer: Boolean(product.isOffer),
    isOfferActive: isOfferCurrentlyActive(product),
    discountPercent,
    offerPrice,
    offerLabel:
      product.offerLabel ||
      (discountPercent > 0 ? `${discountPercent}% off` : ""),
    offerStartDate: product.offerStartDate || null,
    offerEndDate: product.offerEndDate || null,

    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
};

export const getProducts = async (req: Request, res: Response) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 12, 1),
      100
    );

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const category =
      typeof req.query.category === "string"
        ? req.query.category.trim()
        : "";

    const skip = (page - 1) * limit;

    const query: any = {
      status: "active",
    };

    if (search) {
      const safeSearch = escapeRegex(search);

      query.$or = [
        {
          name: {
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
          description: {
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
      success: true,
      data: products.map(formatProduct),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get products error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
};

export const getProductById = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const product = await Product.findOne({
      _id: id,
      status: "active",
    }).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatProduct(product),
    });
  } catch (error) {
    console.error("Get product by id error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product",
    });
  }
};
