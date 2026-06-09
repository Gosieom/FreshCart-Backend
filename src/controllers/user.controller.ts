import { Request, Response } from "express";
import { registerUserService, loginUserService } from "../services/user.service";

export const register = async (req: Request, res: Response) => {
  try {
    const user = await registerUserService(req.body);
    res.status(201).json({ message: "User created successfully", user });
  } catch (err: any) {
    res.status(err.status || 400).json({ message: err.message || "Registration failed" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { user, token } = await loginUserService(req.body);

    // Set cookie if needed
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24, 
    });

    // Send back user info AND token in response body
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
        },
        token, // <-- include token here
      },
    });
  } catch (err: any) {
    res.status(err.status || 401).json({ success: false, message: err.message || "Login failed" });
  }
};