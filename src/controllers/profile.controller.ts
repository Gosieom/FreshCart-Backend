import { Request, Response } from "express";
import User from "../models/user.model";

const formatUser = (user: any) => {
  return {
    id: user._id.toString(),
    _id: user._id.toString(),
    fullName: user.fullName,
    name: user.name,
    email: user.email,
    phone: user.phone,
    profileImage: user.profileImage,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const loggedInUser = (req as any).user;

    if (!loggedInUser?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const { fullName, email, phone } = req.body;
    const file = (req as any).file;

    const updateData: any = {};

    if (fullName !== undefined) {
      if (!String(fullName).trim()) {
        return res.status(400).json({
          success: false,
          message: "Full name is required",
        });
      }

      updateData.fullName = String(fullName).trim();
    }

    if (email !== undefined) {
      if (!String(email).trim()) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const cleanEmail = String(email).toLowerCase().trim();

      const existingUser = await User.findOne({
        email: cleanEmail,
        _id: { $ne: loggedInUser.id },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email already exists",
        });
      }

      updateData.email = cleanEmail;
    }

    if (phone !== undefined) {
      updateData.phone = String(phone).trim();
    }

    if (file) {
      updateData.profileImage = `/uploads/profile/${file.filename}`;
    }

    const user = await User.findByIdAndUpdate(loggedInUser.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: formatUser(user),
    });
  } catch (error: any) {
    console.log("PROFILE UPDATE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Profile update failed",
    });
  }
};

export const removeProfileImage = async (req: Request, res: Response) => {
  try {
    const loggedInUser = (req as any).user;

    if (!loggedInUser?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const user = await User.findByIdAndUpdate(
      loggedInUser.id,
      { profileImage: "" },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile image removed",
      user: formatUser(user),
    });
  } catch (error: any) {
    console.log("REMOVE PROFILE IMAGE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to remove profile image",
    });
  }
};