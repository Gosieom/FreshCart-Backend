import express from "express";
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/user.route";
import { errorMiddleware } from "./middlewares/error.middleware";

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

app.use(errorMiddleware);

export default app;