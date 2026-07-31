import express from "express";
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser";
import wishlistRoutes from "./routes/wishlist.route";
import cartRoutes from "./routes/cart.route";
import adminDashboardRoutes from "./routes/adminDashboard.route";
import userRoutes from "./routes/user.route";
import adminUserRoutes from "./routes/adminUser.route";
import adminProductRoutes from "./routes/adminProduct.route";
import productRoutes from "./routes/product.route";
import adminCategoryRoutes from "./routes/adminCategory.route";
import categoryRoutes from "./routes/category.route";
import orderRoutes from "./routes/order.route";
import adminOrderRoutes from "./routes/adminOrder.route";
import addressRoutes from "./routes/address.route";
import galliMapRoutes from "./routes/galliMap.route";
import paymentRoutes from "./routes/payment.route";
import notificationRoutes from "./routes/notification.route";
import adminBannerRoutes from "./routes/adminBanner.route";
import bannerRoutes from "./routes/banner.route";
import adminOfferRoutes from "./routes/adminOffer.route";
import offerRoutes from "./routes/offer.route";
import aiGroceryRoutes from "./routes/aiGrocery.route";
import {
  errorMiddleware,
  notFoundMiddleware,
} from "./middlewares/error.middleware";
import {
  ALLOWED_ORIGINS,
  IS_PRODUCTION,
} from "./config";
const app = express();

if (IS_PRODUCTION) {
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header, including Postman,
      // server-to-server requests, health checks, and automated tests.
      if (!origin) {
        return callback(null, true);
      }

      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`Origin ${origin} is not allowed by CORS`)
      );
    },
    credentials: true,
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
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

// web auth route
app.use("/api/v1/auth", userRoutes);

// admin routes
app.use("/api/v1/admin/users", adminUserRoutes);
app.use("/api/v1/admin/dashboard", adminDashboardRoutes);
app.use("/api/v1/admin/products", adminProductRoutes);
app.use("/api/v1/admin/categories", adminCategoryRoutes);
app.use("/api/v1/admin/orders", adminOrderRoutes);
app.use("/api/v1/admin/banners", adminBannerRoutes);
app.use("/api/v1/admin/offers", adminOfferRoutes);

// user routes
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/wishlist", wishlistRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/addresses", addressRoutes);
app.use("/api/v1/maps/galli", galliMapRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/banners", bannerRoutes);
app.use("/api/v1/offers", offerRoutes);
app.use("/api/v1/ai/grocery-assistant", aiGroceryRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
