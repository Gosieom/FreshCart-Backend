import express from "express";
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser";
import adminDashboardRoutes from "./routes/adminDashboard.route";
import userRoutes from "./routes/user.route";
import adminUserRoutes from "./routes/adminUser.route";
import adminProductRoutes from "./routes/adminProduct.route";
import { errorMiddleware } from "./middlewares/error.middleware";
import productRoutes from "./routes/product.route";
import adminCategoryRoutes from "./routes/adminCategory.route";
import categoryRoutes from "./routes/category.route";
import orderRoutes from "./routes/order.route";
import adminOrderRoutes from "./routes/adminOrder.route";


const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "FreshCart API is running",
  });
});

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// old route for mobile / old frontend
app.use("/api/users", userRoutes);

// new Sprint 3 route for web
app.use("/api/v1/auth", userRoutes);

// Sprint 4 admin user management route
app.use("/api/v1/admin/users", adminUserRoutes);
app.use("/api/v1/admin/dashboard", adminDashboardRoutes);
app.use("/api/v1/admin/products", adminProductRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/admin/categories", adminCategoryRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/admin/orders", adminOrderRoutes);

app.use(errorMiddleware);

export default app;