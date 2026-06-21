import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { UserModel } from "../models/user.model";

const getProfileImageFilePath = (profileImage?: string | null) => {
  if (!profileImage) return null;

  let imagePath = profileImage;

  if (imagePath.startsWith("http")) {
    try {
      const url = new URL(imagePath);
      imagePath = url.pathname;
    } catch {
      return null;
    }
  }

  imagePath = imagePath.replace(/^\/+/, "");

  if (!imagePath.startsWith("uploads/profile/")) {
    return null;
  }

  return path.join(process.cwd(), imagePath);
};

const deleteProfileImageFile = (profileImage?: string | null) => {
  const filePath = getProfileImageFilePath(profileImage);

  if (!filePath) return;

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      if (req.file) {
        deleteProfileImageFile(`/uploads/profile/${req.file.filename}`);
      }

      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await UserModel.findById(req.user.id);

    if (!user) {
      if (req.file) {
        deleteProfileImageFile(`/uploads/profile/${req.file.filename}`);
      }

      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const {
      fullName,
      email,
      phone,
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    if (email && email !== user.email) {
      const existingUser = await UserModel.findOne({ email });

      if (existingUser) {
        if (req.file) {
          deleteProfileImageFile(`/uploads/profile/${req.file.filename}`);
        }

        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }

      user.email = email;
    }

    if (fullName) {
      user.fullName = fullName;
    }

    if (phone !== undefined) {
      user.phone = phone;
    }

    if (req.file) {
      if (user.profileImage) {
        deleteProfileImageFile(user.profileImage);
      }

      user.profileImage = `/uploads/profile/${req.file.filename}`;
    }

    const wantsPasswordChange = currentPassword || newPassword || confirmPassword;

    if (wantsPasswordChange) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        if (req.file) {
          deleteProfileImageFile(`/uploads/profile/${req.file.filename}`);
        }

        return res.status(400).json({
          success: false,
          message: "Current password, new password and confirm password are required",
        });
      }

      if (newPassword !== confirmPassword) {
        if (req.file) {
          deleteProfileImageFile(`/uploads/profile/${req.file.filename}`);
        }

        return res.status(400).json({
          success: false,
          message: "New password and confirm password do not match",
        });
      }

      if (newPassword.length < 6) {
        if (req.file) {
          deleteProfileImageFile(`/uploads/profile/${req.file.filename}`);
        }

        return res.status(400).json({
          success: false,
          message: "New password must be at least 6 characters",
        });
      }

      const isPasswordCorrect = await bcrypt.compare(
        currentPassword,
        user.password
      );

      if (!isPasswordCorrect) {
        if (req.file) {
          deleteProfileImageFile(`/uploads/profile/${req.file.filename}`);
        }

        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();

    const updatedUser = await UserModel.findById(req.user.id).select(
      "-password"
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    if (req.file) {
      deleteProfileImageFile(`/uploads/profile/${req.file.filename}`);
    }

    return res.status(500).json({
      success: false,
      message: "Profile update failed",
    });
  }
};

export const uploadProfileImage = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image",
      });
    }

    const user = await UserModel.findById(req.user.id);

    if (!user) {
      deleteProfileImageFile(`/uploads/profile/${req.file.filename}`);

      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.profileImage) {
      deleteProfileImageFile(user.profileImage);
    }

    const imageUrl = `/uploads/profile/${req.file.filename}`;

    user.profileImage = imageUrl;
    await user.save();

    const updatedUser = await UserModel.findById(req.user.id).select(
      "-password"
    );

    return res.status(200).json({
      success: true,
      message: "Profile image uploaded successfully",
      imageUrl,
      user: updatedUser,
    });
  } catch (error) {
    if (req.file) {
      deleteProfileImageFile(`/uploads/profile/${req.file.filename}`);
    }

    return res.status(500).json({
      success: false,
      message: "Profile image upload failed",
    });
  }
};

export const removeProfileImage = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await UserModel.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.profileImage) {
      deleteProfileImageFile(user.profileImage);
    }

    user.profileImage = undefined;
    await user.save();

    const updatedUser = await UserModel.findById(req.user.id).select(
      "-password"
    );

    return res.status(200).json({
      success: true,
      message: "Profile image removed successfully",
      imageUrl: null,
      user: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Profile image remove failed",
    });
  }
};