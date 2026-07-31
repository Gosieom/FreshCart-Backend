import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user.model";
import { JWT_SECRET } from "../config";

type JwtPayloadType = {
  id?: string;
  _id?: string;
  userId?: string;
};

export const adminOnly = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    const tokenFromHeader =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

    const tokenFromCookie = req.cookies?.token;

    // Important: prefer Bearer token first
    const token = tokenFromHeader || tokenFromCookie;

    if (!token) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

const decoded = jwt.verify(
  token,
  JWT_SECRET
) as JwtPayloadType;

    const userId = decoded.id || decoded._id || decoded.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Invalid token payload",
      });
    }

    const user = await User.findById(userId).select("-password");


    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        message: "Admin access only",
      });
    }

    (req as any).user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};