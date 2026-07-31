import { Request, Response } from "express";
import mongoose from "mongoose";

import Product from "../models/product.model";
import Wishlist from "../models/wishlist.model";

const getLoggedInUserId = (
  req: Request
): string => {
  const authRequest = req as any;

  return (
    authRequest.user?._id?.toString?.() ||
    authRequest.user?.id?.toString?.() ||
    authRequest.userId?.toString?.() ||
    authRequest.id?.toString?.() ||
    ""
  );
};

const formatProduct = (
  product: any
) => {
  return {
    id: product._id?.toString() ?? "",
    _id: product._id?.toString() ?? "",

    name: product.name ?? "",
    description: product.description ?? "",

    price: Number(product.price ?? 0),
    category: product.category ?? "",
    stock: Number(product.stock ?? 0),
    unit: product.unit ?? "piece",
    image: product.image ?? "",

    status: product.status ?? "active",

    isOffer: Boolean(product.isOffer),
    discountPercent: Number(
      product.discountPercent ?? 0
    ),
    offerPrice: Number(
      product.offerPrice ?? 0
    ),
    offerLabel: product.offerLabel ?? "",

    offerStartDate:
      product.offerStartDate ?? null,

    offerEndDate:
      product.offerEndDate ?? null,

    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
};

const getFormattedWishlistProducts =
  async (
    userId: string
  ): Promise<any[]> => {
    if (
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return [];
    }

    const userObjectId =
      new mongoose.Types.ObjectId(userId);

    const wishlist =
      await Wishlist.findOne({
        user: userObjectId,
      })
        .populate("products")
        .lean();

    if (!wishlist) {
      return [];
    }

    const populatedProducts =
      Array.isArray(
        (wishlist as any).products
      )
        ? (wishlist as any).products
        : [];

    return populatedProducts
      .filter(
        (product: any) =>
          product &&
          (product.status ?? "active") ===
            "active"
      )
      .map(formatProduct);
  };

export const getWishlist = async (
  req: Request,
  res: Response
) => {
  try {
    const userId =
      getLoggedInUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid user",
      });
    }

    const products =
      await getFormattedWishlistProducts(
        userId
      );

    return res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error(
      "GET WISHLIST ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch wishlist",
    });
  }
};

export const addToWishlist = async (
  req: Request,
  res: Response
) => {
  try {
    const userId =
      getLoggedInUserId(req);

    const productId =
      req.params.productId?.trim();

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid user",
      });
    }

    if (
      !productId ||
      !mongoose.Types.ObjectId.isValid(
        productId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const userObjectId =
      new mongoose.Types.ObjectId(userId);

    const productObjectId =
      new mongoose.Types.ObjectId(
        productId
      );

    const product =
      await Product.findOne({
        _id: productObjectId,
        status: "active",
      }).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found or inactive",
      });
    }

    await Wishlist.findOneAndUpdate(
      {
        user: userObjectId,
      },
      {
        $setOnInsert: {
          user: userObjectId,
        },

        $addToSet: {
          products: productObjectId,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    const products =
      await getFormattedWishlistProducts(
        userId
      );

    return res.status(200).json({
      success: true,
      message:
        "Product added to wishlist",
      data: products,
    });
  } catch (error) {
    console.error(
      "ADD TO WISHLIST ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to add product to wishlist",
    });
  }
};

export const removeFromWishlist =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const userId =
        getLoggedInUserId(req);

      const productId =
        req.params.productId?.trim();

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          userId
        )
      ) {
        return res.status(401).json({
          success: false,
          message: "Invalid user",
        });
      }

      if (
        !productId ||
        !mongoose.Types.ObjectId.isValid(
          productId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid product id",
        });
      }

      const userObjectId =
        new mongoose.Types.ObjectId(
          userId
        );

      const productObjectId =
        new mongoose.Types.ObjectId(
          productId
        );

      await Wishlist.findOneAndUpdate(
        {
          user: userObjectId,
        },
        {
          $pull: {
            products: productObjectId,
          },
        },
        {
          new: true,
        }
      );

      const products =
        await getFormattedWishlistProducts(
          userId
        );

      return res.status(200).json({
        success: true,
        message:
          "Product removed from wishlist",
        data: products,
      });
    } catch (error) {
      console.error(
        "REMOVE FROM WISHLIST ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to remove product from wishlist",
      });
    }
  };