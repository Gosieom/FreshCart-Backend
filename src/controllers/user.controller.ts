import { Request, Response } from "express";
import {
  registerUserService,
  loginUserService,
} from "../services/user.service";

export const register = async (req: Request, res: Response) => {
  try {
    const user = await registerUserService(req.body);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user,
    });
  } catch (err: any) {
    res.status(err.status || 400).json({
      success: false,
      message: err.message || "Registration failed",
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { user, token } = await loginUserService(req.body);

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user,
        token,
      },
    });
  } catch (err: any) {
    res.status(err.status || 401).json({
      success: false,
      message: err.message || "Login failed",
    });
  }
};

export const logout = async (_req: Request, res: Response) => {
  res.clearCookie("token");

  res.status(200).json({
    success: true,
    message: "Logout successful",
  });
};