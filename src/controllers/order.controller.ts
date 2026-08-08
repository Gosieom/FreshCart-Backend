import { Request, Response } from "express";
import mongoose from "mongoose";

import Order from "../models/order.model";
import Product from "../models/product.model";
import User from "../models/user.model";
import Cart from "../models/cart.model";
import { createUserNotification } from "../utils/notification.util";

const getEffectiveProductPrice = (product: any): number => {
  const regularPrice = Number(product.price ?? 0);
  const offerPrice = Number(product.offerPrice ?? 0);
  const discountPercent = Number(product.discountPercent ?? 0);

  const calculatedOfferPrice =
    offerPrice > 0
      ? offerPrice
      : regularPrice -
        (regularPrice * discountPercent) / 100;

  const now = new Date();

  const startsOk =
    !product.offerStartDate ||
    new Date(product.offerStartDate) <= now;

  const endsOk =
    !product.offerEndDate ||
    new Date(product.offerEndDate) >= now;

  const hasActiveOffer =
    product.status === "active" &&
    Number(product.stock ?? 0) > 0 &&
    Boolean(product.isOffer) &&
    calculatedOfferPrice > 0 &&
    calculatedOfferPrice < regularPrice &&
    startsOk &&
    endsOk;

  return Number(
    (
      hasActiveOffer
        ? calculatedOfferPrice
        : regularPrice
    ).toFixed(2)
  );
};

const generateOrderNumber = () => {
  const datePart = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const randomPart = Math.floor(
    1000 + Math.random() * 9000
  );

  return `FC-${datePart}-${randomPart}`;
};

const formatOrder = (order: any) => {
  return {
    id: order._id.toString(),
    _id: order._id.toString(),
    orderNumber: order.orderNumber,
    user: order.user,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    items: order.items,
    shippingAddress: order.shippingAddress,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    totalAmount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    transactionUuid: order.transactionUuid || "",
    esewaTransactionCode:
      order.esewaTransactionCode || "",
    notes: order.notes,
    hiddenFromCustomer: Boolean(
      order.hiddenFromCustomer
    ),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
};

export const createOrder = async (
  req: Request,
  res: Response
) => {
  try {
    const loggedInUser = (req as any).user;

    if (!loggedInUser?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const {
      items,
      contactInformation,
      shippingAddress,
      paymentMethod,
      notes,
    } = req.body;

    const resolvedPaymentMethod =
      paymentMethod || "cash_on_delivery";

    if (
      ![
        "cash_on_delivery",
        "esewa",
        "online",
      ].includes(resolvedPaymentMethod)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    const isEsewaPayment =
      resolvedPaymentMethod === "esewa";

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Order items are required",
      });
    }

    if (
      !shippingAddress ||
      !shippingAddress.fullName ||
      !shippingAddress.phone ||
      !shippingAddress.address ||
      !shippingAddress.city
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Complete shipping address is required",
      });
    }

    const user = await User.findById(
      loggedInUser.id
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const customerName = String(
      contactInformation?.fullName ||
        shippingAddress.fullName ||
        user.fullName
    ).trim();

    const customerEmail = String(
      contactInformation?.email || user.email
    )
      .trim()
      .toLowerCase();

    const customerPhone = String(
      contactInformation?.phone ||
        shippingAddress.phone ||
        user.phone ||
        ""
    ).trim();

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!customerName) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required",
      });
    }

    if (!emailPattern.test(customerEmail)) {
      return res.status(400).json({
        success: false,
        message: "A valid customer email is required",
      });
    }

    if (customerPhone.length < 7) {
      return res.status(400).json({
        success: false,
        message: "A valid customer phone number is required",
      });
    }

    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const productId =
        item.product || item.productId;

      const quantity = Number(item.quantity);

      if (
        !productId ||
        !mongoose.Types.ObjectId.isValid(productId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product id in order items",
        });
      }

      if (!quantity || quantity < 1) {
        return res.status(400).json({
          success: false,
          message:
            "Quantity must be at least 1",
        });
      }

      const product =
        await Product.findById(productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      if (product.status !== "active") {
        return res.status(400).json({
          success: false,
          message: `${product.name} is not available`,
        });
      }

      if (product.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock} ${product.unit} of ${product.name} is available`,
        });
      }

      const effectivePrice =
        getEffectiveProductPrice(product);

      const itemTotal =
        effectivePrice * quantity;

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.image,
        category: product.category,
        unit: product.unit,
        price: effectivePrice,
        quantity,
        total: itemTotal,
      });

      subtotal += itemTotal;
    }

    subtotal = Number(subtotal.toFixed(2));

    const deliveryFee = subtotal > 0 ? 50 : 0;

    const totalAmount = Number(
      (subtotal + deliveryFee).toFixed(2)
    );

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      user: user._id,
      customerName,
      customerEmail,
      customerPhone,
      items: orderItems,
      shippingAddress: {
        fullName: customerName,
        phone: customerPhone,
        address: String(
          shippingAddress.address
        ).trim(),
        city: String(
          shippingAddress.city
        ).trim(),
        province: shippingAddress.province
          ? String(
              shippingAddress.province
            ).trim()
          : "",
        landmark: shippingAddress.landmark
          ? String(
              shippingAddress.landmark
            ).trim()
          : "",
      },
      subtotal,
      deliveryFee,
      totalAmount,
      paymentMethod: resolvedPaymentMethod,
      paymentStatus: "pending",
      orderStatus: "pending",
      notes: notes
        ? String(notes).trim()
        : "",
      // eSewa orders are payment reservations until the
      // backend verifies a COMPLETE transaction from eSewa.
      hiddenFromCustomer: isEsewaPayment,
    });

    for (const item of orderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        {
          $inc: {
            stock: -item.quantity,
          },
        }
      );
    }

    if (
      resolvedPaymentMethod ===
      "cash_on_delivery"
    ) {
      await Cart.findOneAndUpdate(
        {
          user: user._id,
        },
        {
          $set: {
            items: [],
          },
        }
      );
    }

    /*
     * Do not announce an eSewa order before payment. It is
     * only a hidden payment reservation at this stage.
     * The payment controller sends the confirmation after
     * eSewa returns COMPLETE and the backend verifies it.
     */
    if (!isEsewaPayment) {
      await createUserNotification({
        userId: user._id.toString(),
        title: "Order placed successfully",
        message: `Your order ${order.orderNumber} has been placed successfully. Total amount: Rs. ${order.totalAmount}.`,
        type: "order",
        orderId: order._id.toString(),
        emailSubject: `FreshCart order placed - ${order.orderNumber}`,
        emailHtml: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2 style="color:#16833a;">
              Order placed successfully
            </h2>

            <p>
              Hello ${user.fullName || user.email},
            </p>

            <p>
              Your FreshCart order
              <strong>${order.orderNumber}</strong>
              has been placed successfully.
            </p>

            <p>
              <strong>Total:</strong>
              Rs. ${order.totalAmount}
            </p>

            <p>
              <strong>Payment method:</strong>
              ${order.paymentMethod}
            </p>

            <p>
              Thank you for shopping with FreshCart.
            </p>
          </div>
        `,
        waitForEmail: false,
      });
    }

    return res.status(201).json({
      success: true,
      message: isEsewaPayment
        ? "eSewa payment is awaiting verification"
        : "Order placed successfully",
      order: formatOrder(order),
    });
  } catch (error: any) {
    console.log("CREATE ORDER ERROR:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to place order",
    });
  }
};

export const getMyOrders = async (
  req: Request,
  res: Response
) => {
  try {
    const loggedInUser = (req as any).user;

    if (!loggedInUser?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const orders = await Order.find({
      user: loggedInUser.id,
      hiddenFromCustomer: {
        $ne: true,
      },
    })
      .sort({
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      data: orders.map(formatOrder),
    });
  } catch (error: any) {
    console.log(
      "GET MY ORDERS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch orders",
    });
  }
};

export const getMyOrderById = async (
  req: Request,
  res: Response
) => {
  try {
    const loggedInUser = (req as any).user;
    const { id } = req.params;

    if (!loggedInUser?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const order = await Order.findOne({
      _id: id,
      user: loggedInUser.id,
    }).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      order: formatOrder(order),
    });
  } catch (error: any) {
    console.log(
      "GET MY ORDER BY ID ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch order",
    });
  }
};

export const cancelMyOrder = async (
  req: Request,
  res: Response
) => {
  try {
    const loggedInUser = (req as any).user;
    const { id } = req.params;
    const { reason } = req.body;

    if (!loggedInUser?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const cancellationReason = String(
      reason || ""
    ).trim();

    if (!cancellationReason) {
      return res.status(400).json({
        success: false,
        message:
          "Cancellation reason is required",
      });
    }

    if (cancellationReason.length < 5) {
      return res.status(400).json({
        success: false,
        message:
          "Cancellation reason must be at least 5 characters",
      });
    }

    const order = await Order.findOne({
      _id: id,
      user: loggedInUser.id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (
      order.orderStatus === "cancelled"
    ) {
      return res.status(200).json({
        success: true,
        message:
          "Order is already cancelled",
        order: formatOrder(order),
      });
    }

    const cancelableStatuses = [
      "pending",
      "confirmed",
    ];

    if (order.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message:
          "Paid online orders cannot be cancelled automatically. Please contact support for a verified refund.",
      });
    }

    if (
      !cancelableStatuses.includes(
        order.orderStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This order cannot be cancelled now because it is already being prepared or delivered.",
      });
    }

    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        {
          $inc: {
            stock: item.quantity,
          },
        }
      );
    }

    const cancellationNote =
      `Cancelled by customer on ${new Date().toLocaleString()}. ` +
      `Reason: ${cancellationReason}`;

    order.orderStatus = "cancelled";

    order.notes = order.notes
      ? `${order.notes}\n${cancellationNote}`
      : cancellationNote;

    await order.save();

    await createUserNotification({
      userId: order.user.toString(),
      title: "Order cancelled",
      message: `Your order ${order.orderNumber} has been cancelled successfully.`,
      type: "order",
      orderId: order._id.toString(),
      emailSubject: `FreshCart order cancelled - ${order.orderNumber}`,
      emailHtml: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2 style="color:#dc2626;">Order cancelled</h2>
          <p>Hello ${order.customerName || order.customerEmail},</p>
          <p>Your FreshCart order <strong>${order.orderNumber}</strong> has been cancelled.</p>
          <p><strong>Reason:</strong> ${cancellationReason}</p>
        </div>
      `,
    });

    const admins = await User.find({
      role: "admin",
      status: "active",
    }).select("_id");

    for (const admin of admins) {
      try {
        await createUserNotification({
          userId: admin._id.toString(),
          title:
            "Customer cancelled order",
          message: `${order.customerName} cancelled order ${order.orderNumber}. Reason: ${cancellationReason}`,
          type: "order",
          orderId: order._id.toString(),
          emailSubject: `Customer cancelled order - ${order.orderNumber}`,
          emailHtml: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <h2 style="color:#dc2626;">Customer cancelled order</h2>
              <p><strong>Order:</strong> ${order.orderNumber}</p>
              <p><strong>Customer:</strong> ${order.customerName}</p>
              <p><strong>Email:</strong> ${order.customerEmail}</p>
              <p><strong>Reason:</strong> ${cancellationReason}</p>
            </div>
          `,
        });
      } catch (notificationError) {
        console.log(
          "ADMIN CANCEL NOTIFICATION ERROR:",
          notificationError
        );
      }
    }

    return res.status(200).json({
      success: true,
      message:
        "Order cancelled successfully",
      order: formatOrder(order),
    });
  } catch (error: any) {
    console.log(
      "CANCEL MY ORDER ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to cancel order",
    });
  }
};

export const reorderMyOrder = async (
  req: Request,
  res: Response
) => {
  try {
    const loggedInUser = (req as any).user;
    const { id } = req.params;

    if (!loggedInUser?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const order = await Order.findOne({
      _id: id,
      user: loggedInUser.id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    let cart = await Cart.findOne({
      user: loggedInUser.id,
    });

    if (!cart) {
      cart = await Cart.create({
        user: loggedInUser.id,
        items: [],
      });
    }

    const addedItems: Array<{
      productId: string;
      name: string;
      requestedQuantity: number;
      addedQuantity: number;
      cartQuantity: number;
      currentPrice: number;
    }> = [];

    const unavailableItems: Array<{
      productId: string;
      name: string;
      reason: string;
    }> = [];

    for (const previousItem of order.items) {
      const productId =
        previousItem.product.toString();

      const requestedQuantity = Math.max(
        1,
        Math.floor(
          Number(
            previousItem.quantity || 1
          )
        )
      );

      const product =
        await Product.findById(productId);

      if (!product) {
        unavailableItems.push({
          productId,
          name: previousItem.name,
          reason:
            "This product no longer exists.",
        });

        continue;
      }

      if (product.status !== "active") {
        unavailableItems.push({
          productId,
          name: product.name,
          reason:
            "This product is currently inactive.",
        });

        continue;
      }

      const stock = Math.max(
        0,
        Number(product.stock ?? 0)
      );

      if (stock <= 0) {
        unavailableItems.push({
          productId,
          name: product.name,
          reason:
            "This product is out of stock.",
        });

        continue;
      }

      const existingItem =
        cart.items.find(
          (item: any) =>
            item.product.toString() ===
            productId
        );

      const existingQuantity =
        existingItem
          ? Math.max(
              0,
              Number(
                existingItem.quantity ?? 0
              )
            )
          : 0;

      const remainingStock = Math.max(
        0,
        stock - existingQuantity
      );

      if (remainingStock <= 0) {
        unavailableItems.push({
          productId,
          name: product.name,
          reason:
            "Your cart already contains the maximum available quantity.",
        });

        continue;
      }

      const quantityToAdd = Math.min(
        requestedQuantity,
        remainingStock
      );

      if (existingItem) {
        existingItem.quantity =
          existingQuantity +
          quantityToAdd;
      } else {
        cart.items.push({
          product:
            new mongoose.Types.ObjectId(
              productId
            ),
          quantity: quantityToAdd,
        });
      }

      addedItems.push({
        productId,
        name: product.name,
        requestedQuantity,
        addedQuantity: quantityToAdd,
        cartQuantity:
          existingQuantity +
          quantityToAdd,
        currentPrice:
          getEffectiveProductPrice(
            product
          ),
      });
    }

    await cart.save();

    return res.status(200).json({
      success: true,
      message:
        addedItems.length > 0
          ? "Available products added to cart"
          : "No products were available to reorder",
      data: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        addedItems,
        unavailableItems,
      },
    });
  } catch (error: any) {
    console.log(
      "REORDER MY ORDER ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to reorder products",
    });
  }
};

export const clearMyOrderHistory = async (
  req: Request,
  res: Response
) => {
  try {
    const loggedInUser = (req as any).user;

    if (!loggedInUser?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    await Order.updateMany(
      {
        user: loggedInUser.id,
      },
      {
        $set: {
          hiddenFromCustomer: true,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "Order history cleared successfully",
    });
  } catch (error: any) {
    console.log(
      "CLEAR MY ORDER HISTORY ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to clear order history",
    });
  }
};
