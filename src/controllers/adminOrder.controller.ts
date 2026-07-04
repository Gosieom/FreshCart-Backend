import { Request, Response } from "express";
import mongoose from "mongoose";
import Order, { OrderStatus, PaymentStatus } from "../models/order.model";

const escapeRegex = (value: string) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const allowedOrderStatuses: OrderStatus[] = [
  "pending",
  "confirmed",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

const allowedPaymentStatuses: PaymentStatus[] = [
  "pending",
  "paid",
  "failed",
  "refunded",
];

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
    notes: order.notes,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
};

export const getAdminOrders = async (req: Request, res: Response) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const status =
      typeof req.query.status === "string" ? req.query.status.trim() : "";

    const skip = (page - 1) * limit;

    const query: any = {};

    if (status && status !== "all") {
      query.orderStatus = status;
    }

    if (search) {
      const safeSearch = escapeRegex(search);

      query.$or = [
        {
          orderNumber: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          customerName: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          customerEmail: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          customerPhone: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          orderStatus: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          paymentStatus: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: "$_id" },
              regex: safeSearch,
              options: "i",
            },
          },
        },
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: orders.map(formatOrder),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error: any) {
    console.log("GET ADMIN ORDERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch orders",
    });
  }
};

export const getAdminOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const order = await Order.findById(id).lean();

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
    console.log("GET ADMIN ORDER BY ID ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch order",
    });
  }
};

export const updateAdminOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { orderStatus, paymentStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const updateData: any = {};

    if (orderStatus !== undefined) {
      if (!allowedOrderStatuses.includes(orderStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order status",
        });
      }

      updateData.orderStatus = orderStatus;
    }

    if (paymentStatus !== undefined) {
      if (!allowedPaymentStatuses.includes(paymentStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment status",
        });
      }

      updateData.paymentStatus = paymentStatus;
    }

    const order = await Order.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order updated successfully",
      order: formatOrder(order),
    });
  } catch (error: any) {
    console.log("UPDATE ADMIN ORDER STATUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update order",
    });
  }
};

export const deleteAdminOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const order = await Order.findByIdAndDelete(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error: any) {
    console.log("DELETE ADMIN ORDER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete order",
    });
  }
};