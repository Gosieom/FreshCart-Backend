import express from "express";
import cors from "cors";
import userRoutes from "./routes/user.route";
import { errorMiddleware } from "./middlewares/error.middleware";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/users", userRoutes);

app.use(errorMiddleware);

export default app;