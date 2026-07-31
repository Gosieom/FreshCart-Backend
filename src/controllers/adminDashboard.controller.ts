import { Request, Response } from "express";
import User from "../models/user.model";
import Product from "../models/product.model";
import Order from "../models/order.model";

export const getAdminDashboardStats = async (_req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      adminUsers,
      activeUsers,
      inactiveUsers,
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      totalOrders,
      pendingOrders,
      paidOrders,
      failedPayments,
      recentUsers,
      recentOrders,
      revenueAgg,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ status: "active" }),
      User.countDocuments({ status: "inactive" }),

      Product.countDocuments(),
      Product.countDocuments({ status: "active" }),
      Product.countDocuments({ stock: { $lte: 10, $gt: 0 } }),
      Product.countDocuments({ stock: 0 }),

      Order.countDocuments(),
      Order.countDocuments({ orderStatus: "pending" }),
      Order.countDocuments({ paymentStatus: "paid" }),
      Order.countDocuments({ paymentStatus: "failed" }),

      User.find()
        .select("-password")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select(
          "orderNumber customerName totalAmount paymentMethod paymentStatus orderStatus createdAt"
        )
        .lean(),

      Order.aggregate([
        {
          $match: {
            $or: [{ paymentStatus: "paid" }, { paymentMethod: "cash_on_delivery" }],
            orderStatus: { $ne: "cancelled" },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
          },
        },
      ]),
    ]);

    const totalRevenue = Number(revenueAgg?.[0]?.totalRevenue || 0);

    return res.status(200).json({
      data: {
        totalUsers,
        adminUsers,
        activeUsers,
        inactiveUsers,

        totalProducts,
        activeProducts,
        lowStockProducts,
        outOfStockProducts,

        totalOrders,
        pendingOrders,
        paidOrders,
        failedPayments,
        totalRevenue,

        recentUsers: recentUsers.map((user: any) => ({
          id: user._id.toString(),
          fullName: user.fullName || user.name || "",
          email: user.email,
          role: user.role || "user",
          status: user.status || "active",
          createdAt: user.createdAt,
        })),

        recentOrders: recentOrders.map((order: any) => ({
          id: order._id.toString(),
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
          createdAt: order.createdAt,
        })),
      },
    });
  } catch (error) {
    console.log("GET ADMIN DASHBOARD STATS ERROR:", error);

    return res.status(500).json({
      message: "Failed to load admin dashboard stats",
    });
  }
};
