import { Request, Response } from "express";

export const getCurrentUser = (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  res.status(200).json({
    success: true,
    user: req.user,
  });
};