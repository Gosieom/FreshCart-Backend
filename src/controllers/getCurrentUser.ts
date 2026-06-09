import { Request, Response } from "express";

export const getCurrentUser = (req: Request, res: Response) => {
  // authMiddleware should attach user object to req.user
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  res.status(200).json({ success: true, user: req.user });
};