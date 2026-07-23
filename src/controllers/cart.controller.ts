import { Request, Response } from "express";
import mongoose from "mongoose";

import Cart from "../models/cart.model";
import Product from "../models/product.model";

const DELIVERY_FEE = 50;

const getLoggedInUserId = (
  req: Request
): string => {
  const authReq = req as any;

  return (
    authReq.user?._id?.toString?.() ||
    authReq.user?.id?.toString?.() ||
    ""
  );
};

const toPositiveInteger = (
  value: unknown,
  fallback = 1
): number => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(1, Math.floor(parsed));
};

const isOfferActive = (
  product: any
): boolean => {
  if (
    !product?.isOffer ||
    product?.status !== "active" ||
    Number(product?.stock ?? 0) <= 0
  ) {
    return false;
  }

  const now = new Date();

  if (
    product.offerStartDate &&
    new Date(product.offerStartDate) > now
  ) {
    return false;
  }

  if (
    product.offerEndDate &&
    new Date(product.offerEndDate) < now
  ) {
    return false;
  }

  const regularPrice = Number(
    product.price ?? 0
  );

  const explicitOfferPrice = Number(
    product.offerPrice ?? 0
  );

  const discountPercent = Number(
    product.discountPercent ?? 0
  );

  const calculatedOfferPrice =
    explicitOfferPrice > 0
      ? explicitOfferPrice
      : regularPrice -
        (regularPrice * discountPercent) / 100;

  return (
    calculatedOfferPrice > 0 &&
    calculatedOfferPrice < regularPrice
  );
};

const getEffectivePrice = (
  product: any
): number => {
  const regularPrice = Number(
    product.price ?? 0
  );

  if (!isOfferActive(product)) {
    return regularPrice;
  }

  const explicitOfferPrice = Number(
    product.offerPrice ?? 0
  );

  if (
    explicitOfferPrice > 0 &&
    explicitOfferPrice < regularPrice
  ) {
    return Number(
      explicitOfferPrice.toFixed(2)
    );
  }

  const discountPercent = Number(
    product.discountPercent ?? 0
  );

  return Number(
    (
      regularPrice -
      (regularPrice * discountPercent) / 100
    ).toFixed(2)
  );
};

const formatProduct = (
  product: any
) => {
  const activeOffer =
    isOfferActive(product);

  const effectivePrice =
    getEffectivePrice(product);

  const regularPrice = Number(
    product.price ?? 0
  );

  return {
    id: product._id.toString(),
    _id: product._id.toString(),
    name: product.name ?? "",
    description: product.description ?? "",
    category: product.category ?? "",
    image: product.image ?? "",
    unit: product.unit ?? "piece",
    stock: Number(product.stock ?? 0),
    status: product.status ?? "active",

    // price is always the current payable price.
    price: effectivePrice,
    oldPrice: activeOffer
      ? regularPrice
      : 0,

    isOffer: activeOffer,
    discountPercent: activeOffer
      ? Number(product.discountPercent ?? 0)
      : 0,
    offerPrice: activeOffer
      ? effectivePrice
      : 0,
    offerLabel: activeOffer
      ? product.offerLabel ?? ""
      : "",
    offerStartDate:
      product.offerStartDate ?? null,
    offerEndDate:
      product.offerEndDate ?? null,
  };
};

const buildCartResponse = async (
  userId: string
) => {
  const cart = await Cart.findOne({
    user: userId,
  })
    .populate("items.product")
    .lean();

  const items = (
    (cart?.items ?? []) as any[]
  )
    .filter((item) => {
      const product = item?.product;

      return (
        product &&
        product.status === "active" &&
        Number(product.stock ?? 0) > 0
      );
    })
    .map((item) => {
      const product = item.product;
      const stock = Number(
        product.stock ?? 0
      );

      const quantity = Math.max(
        1,
        Math.min(
          Number(item.quantity ?? 1),
          stock
        )
      );

      const formattedProduct =
        formatProduct(product);

      const lineTotal = Number(
        (
          formattedProduct.price *
          quantity
        ).toFixed(2)
      );

      return {
        product: formattedProduct,
        quantity,
        lineTotal,
      };
    });

  const totalItems = items.reduce(
    (sum, item) =>
      sum + item.quantity,
    0
  );

  const subtotal = Number(
    items
      .reduce(
        (sum, item) =>
          sum + item.lineTotal,
        0
      )
      .toFixed(2)
  );

  const deliveryFee =
    items.length > 0
      ? DELIVERY_FEE
      : 0;

  const totalAmount = Number(
    (subtotal + deliveryFee).toFixed(2)
  );

  return {
    items,
    totalItems,
    subtotal,
    deliveryFee,
    totalAmount,
  };
};

export const getCart = async (
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

    const data =
      await buildCartResponse(userId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Get cart error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch cart",
    });
  }
};

export const addCartItem = async (
  req: Request,
  res: Response
) => {
  try {
    const userId =
      getLoggedInUserId(req);

    const productId = String(
      req.body?.productId ?? ""
    );

    const requestedQuantity =
      toPositiveInteger(
        req.body?.quantity,
        1
      );

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        productId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const product =
      await Product.findOne({
        _id: productId,
        status: "active",
      }).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const stock = Number(
      product.stock ?? 0
    );

    if (stock <= 0) {
      return res.status(400).json({
        success: false,
        message: "Product is out of stock",
      });
    }

    let cart = await Cart.findOne({
      user: userId,
    });

    if (!cart) {
      cart = await Cart.create({
        user: userId,
        items: [],
      });
    }

    const existingItem =
      cart.items.find(
        (item: any) =>
          item.product.toString() ===
          productId
      );

    if (existingItem) {
      existingItem.quantity = Math.min(
        existingItem.quantity +
          requestedQuantity,
        stock
      );
    } else {
      cart.items.push({
        product:
          new mongoose.Types.ObjectId(
            productId
          ),
        quantity: Math.min(
          requestedQuantity,
          stock
        ),
      });
    }

    await cart.save();

    const data =
      await buildCartResponse(userId);

    return res.status(200).json({
      success: true,
      message: "Cart updated",
      data,
    });
  } catch (error) {
    console.error(
      "Add cart item error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to add product to cart",
    });
  }
};

export const updateCartItem = async (
  req: Request,
  res: Response
) => {
  try {
    const userId =
      getLoggedInUserId(req);

    const { productId } = req.params;

    const requestedQuantity =
      Number(req.body?.quantity);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        productId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    if (
      !Number.isFinite(
        requestedQuantity
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Quantity must be a number",
      });
    }

    const cart = await Cart.findOne({
      user: userId,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    if (requestedQuantity <= 0) {
      cart.items = cart.items.filter(
        (item: any) =>
          item.product.toString() !==
          productId
      );

      await cart.save();

      const data =
        await buildCartResponse(userId);

      return res.status(200).json({
        success: true,
        message:
          "Product removed from cart",
        data,
      });
    }

    const product =
      await Product.findOne({
        _id: productId,
        status: "active",
      }).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const stock = Number(
      product.stock ?? 0
    );

    if (stock <= 0) {
      return res.status(400).json({
        success: false,
        message: "Product is out of stock",
      });
    }

    const item = cart.items.find(
      (cartItem: any) =>
        cartItem.product.toString() ===
        productId
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message:
          "Product is not in the cart",
      });
    }

    item.quantity = Math.min(
      Math.max(
        1,
        Math.floor(requestedQuantity)
      ),
      stock
    );

    await cart.save();

    const data =
      await buildCartResponse(userId);

    return res.status(200).json({
      success: true,
      message: "Cart updated",
      data,
    });
  } catch (error) {
    console.error(
      "Update cart item error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update cart item",
    });
  }
};

export const removeCartItem = async (
  req: Request,
  res: Response
) => {
  try {
    const userId =
      getLoggedInUserId(req);

    const { productId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        productId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    await Cart.findOneAndUpdate(
      {
        user: userId,
      },
      {
        $pull: {
          items: {
            product: productId,
          },
        },
      }
    );

    const data =
      await buildCartResponse(userId);

    return res.status(200).json({
      success: true,
      message:
        "Product removed from cart",
      data,
    });
  } catch (error) {
    console.error(
      "Remove cart item error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to remove cart item",
    });
  }
};

export const clearCart = async (
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

    await Cart.findOneAndUpdate(
      {
        user: userId,
      },
      {
        $set: {
          items: [],
        },
      },
      {
        upsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Cart cleared",
      data: {
        items: [],
        totalItems: 0,
        subtotal: 0,
        deliveryFee: 0,
        totalAmount: 0,
      },
    });
  } catch (error) {
    console.error(
      "Clear cart error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to clear cart",
    });
  }
};
