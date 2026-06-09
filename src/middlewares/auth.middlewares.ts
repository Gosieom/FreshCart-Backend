import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = {
      id: decoded.id,
      fullName: decoded.fullName,
      email: decoded.email,
      phone: decoded.phone,
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};