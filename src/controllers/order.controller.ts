import { Request, Response } from "express";
import mongoose from "mongoose";
import Order from "../models/order.model";
import Product from "../models/product.model";
import User from "../models/user.model";

const generateOrderNumber = () => {
  const datePart = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const randomPart = Math.floor(1000 + Math.random() * 9000);

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
    notes: order.notes,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const loggedInUser = (req as any).user;

    if (!loggedInUser?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const { items, shippingAddress, paymentMethod, notes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
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
        message: "Complete shipping address is required",
      });
    }

    const user = await User.findById(loggedInUser.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const productId = item.product || item.productId;
      const quantity = Number(item.quantity);

      if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product id in order items",
        });
      }

      if (!quantity || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be at least 1",
        });
      }

      const product = await Product.findById(productId);

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

      const itemTotal = Number(product.price) * quantity;

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.image,
        category: product.category,
        unit: product.unit,
        price: Number(product.price),
        quantity,
        total: itemTotal,
      });

      subtotal += itemTotal;
    }

subtotal = Number(subtotal.toFixed(2));
const deliveryFee = subtotal > 0 ? 50 : 0;
const totalAmount = Number((subtotal + deliveryFee).toFixed(2));

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      user: user._id,
      customerName: user.fullName,
      customerEmail: user.email,
      customerPhone: user.phone || "",
      items: orderItems,
      shippingAddress: {
        fullName: String(shippingAddress.fullName).trim(),
        phone: String(shippingAddress.phone).trim(),
        address: String(shippingAddress.address).trim(),
        city: String(shippingAddress.city).trim(),
        province: shippingAddress.province
          ? String(shippingAddress.province).trim()
          : "",
        landmark: shippingAddress.landmark
          ? String(shippingAddress.landmark).trim()
          : "",
      },
      subtotal,
      deliveryFee,
      totalAmount,
      paymentMethod: paymentMethod || "cash_on_delivery",
      paymentStatus: "pending",
      orderStatus: "pending",
      notes: notes ? String(notes).trim() : "",
    });

    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: {
          stock: -item.quantity,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: formatOrder(order),
    });
  } catch (error: any) {
    console.log("CREATE ORDER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to place order",
    });
  }
};

export const getMyOrders = async (req: Request, res: Response) => {
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
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: orders.map(formatOrder),
    });
  } catch (error: any) {
    console.log("GET MY ORDERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch orders",
    });
  }
};

export const getMyOrderById = async (req: Request, res: Response) => {
  try {
    const loggedInUser = (req as any).user;
    const { id } = req.params;

    if (!loggedInUser?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
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
    console.log("GET MY ORDER BY ID ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch order",
    });
  }
};