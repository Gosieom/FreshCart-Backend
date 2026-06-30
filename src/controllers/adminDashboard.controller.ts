import { Request, Response } from "express";
import User from "../models/user.model";
import Product from "../models/product.model";

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
      recentUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ status: "active" }),
      User.countDocuments({ status: "inactive" }),

      Product.countDocuments(),
      Product.countDocuments({ status: "active" }),
      Product.countDocuments({ stock: { $lte: 10, $gt: 0 } }),
      Product.countDocuments({ stock: 0 }),

      User.find()
        .select("-password")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

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

        // These will become real after order management.
        totalOrders: 0,
        pendingOrders: 0,
        totalRevenue: 0,

        recentUsers: recentUsers.map((user: any) => ({
          id: user._id.toString(),
          fullName: user.fullName || user.name || "",
          email: user.email,
          role: user.role || "user",
          status: user.status || "active",
          createdAt: user.createdAt,
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load admin dashboard stats",
    });
  }
};