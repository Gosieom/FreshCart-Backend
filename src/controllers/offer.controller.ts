import { Request, Response } from "express";
import mongoose from "mongoose";
import Product from "../models/product.model";

const formatOfferProduct = (product: any) => {
  const originalPrice = Number(product.price || 0);
  const discountPercent = Number(
    product.discountPercent || 0
  );
  const isOffer = Boolean(product.isOffer);

  const calculatedOfferPrice =
    isOffer && discountPercent > 0
      ? Number(
          (
            originalPrice -
            (originalPrice * discountPercent) / 100
          ).toFixed(2)
        )
      : 0;

  const storedOfferPrice = Number(
    product.offerPrice || 0
  );

  const offerPrice = isOffer
    ? storedOfferPrice > 0
      ? storedOfferPrice
      : calculatedOfferPrice
    : 0;

  return {
    id: product._id.toString(),
    _id: product._id.toString(),
    name: product.name,
    description: product.description,
    price: originalPrice,
    category: product.category,
    stock: Number(product.stock || 0),
    unit: product.unit,
    image: product.image,
    status: product.status,
    isOffer,
    discountPercent: isOffer
      ? discountPercent
      : 0,
    offerPrice,
    offerLabel: isOffer
      ? product.offerLabel ||
        `${discountPercent}% off`
      : "",
    offerStartDate: isOffer
      ? product.offerStartDate || null
      : null,
    offerEndDate: isOffer
      ? product.offerEndDate || null
      : null,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
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

export const getPublicOffers = async (_req: Request, res: Response) => {
  try {
    const products = await Product.find({
      status: "active",
      isOffer: true,
    })
      .sort({ discountPercent: -1, updatedAt: -1 })
      .lean();

    const activeOffers = products.filter(isOfferCurrentlyActive);

    return res.status(200).json({
      success: true,
      data: activeOffers.map(formatOfferProduct),
    });
  } catch (error: any) {
    console.log("GET PUBLIC OFFERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch offers",
    });
  }
};

export const getAdminOfferProducts = async (req: Request, res: Response) => {
  try {
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const filter =
      typeof req.query.filter === "string" ? req.query.filter.trim() : "all";

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const skip = (page - 1) * limit;

    const andFilters: any[] = [];

    if (search) {
      andFilters.push({
        $or: [
          {
            name: {
              $regex: search,
              $options: "i",
            },
          },
          {
            category: {
              $regex: search,
              $options: "i",
            },
          },
          {
            description: {
              $regex: search,
              $options: "i",
            },
          },
          {
            unit: {
              $regex: search,
              $options: "i",
            },
          },
          {
            status: {
              $regex: search,
              $options: "i",
            },
          },
        ],
      });
    }

    if (filter === "offers") {
      andFilters.push({
        isOffer: true,
      });
    }

    if (filter === "no_offer") {
      andFilters.push({
        $or: [
          {
            isOffer: false,
          },
          {
            isOffer: {
              $exists: false,
            },
          },
        ],
      });
    }

    const query = andFilters.length > 0 ? { $and: andFilters } : {};

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Product.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: products.map(formatOfferProduct),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error: any) {
    console.log("GET ADMIN OFFER PRODUCTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch offer products",
    });
  }
};

export const updateProductOffer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const {
      isOffer = true,
      discountPercent,
      offerLabel = "",
      offerStartDate = "",
      offerEndDate = "",
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const numericDiscount = Number(discountPercent);

    if (String(isOffer) === "true") {
      if (
        Number.isNaN(numericDiscount) ||
        numericDiscount <= 0 ||
        numericDiscount > 99
      ) {
        return res.status(400).json({
          success: false,
          message: "Discount percent must be between 1 and 99",
        });
      }

      product.isOffer = true;
      product.discountPercent = numericDiscount;
      product.offerPrice = Number(
        (
          Number(product.price || 0) -
          (Number(product.price || 0) * numericDiscount) / 100
        ).toFixed(2)
      );
      product.offerLabel = offerLabel || `${numericDiscount}% off`;
      product.offerStartDate = offerStartDate ? new Date(offerStartDate) : null;
      product.offerEndDate = offerEndDate ? new Date(offerEndDate) : null;
    } else {
      product.isOffer = false;
      product.discountPercent = 0;
      product.offerPrice = 0;
      product.offerLabel = "";
      product.offerStartDate = null;
      product.offerEndDate = null;
    }

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product offer updated successfully",
      data: formatOfferProduct(product),
    });
  } catch (error: any) {
    console.log("UPDATE PRODUCT OFFER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update product offer",
    });
  }
};

export const removeProductOffer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      {
        isOffer: false,
        discountPercent: 0,
        offerPrice: 0,
        offerLabel: "",
        offerStartDate: null,
        offerEndDate: null,
      },
      {
        new: true,
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Offer removed successfully",
      data: formatOfferProduct(product),
    });
  } catch (error: any) {
    console.log("REMOVE PRODUCT OFFER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to remove offer",
    });
  }
};