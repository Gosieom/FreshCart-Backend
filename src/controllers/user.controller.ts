import { Request, Response } from "express";
import {
  registerUserService,
  loginUserService,
} from "../services/user.service";
import {
  sendResetPasswordEmailService,
  resetPasswordService,
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

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    await sendResetPasswordEmailService(email);

    return res.status(200).json({
      success: true,
      message: "Password reset link has been sent to your email.",
    });
  } catch (error: any) {
    return res.status(error.status || error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to send reset email",
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    await resetPasswordService(token, newPassword);

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully.",
    });
  } catch (error: any) {
    return res.status(error.status || error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to reset password",
    });
  }
};