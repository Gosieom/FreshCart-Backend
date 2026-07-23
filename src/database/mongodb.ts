import mongoose from "mongoose";

import { MONGO_URI } from "../config";

export const connectDB = async (): Promise<void> => {
  try {
    const connection = await mongoose.connect(MONGO_URI);

    console.log(
      `MongoDB connected successfully: ${connection.connection.host}`
    );
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};