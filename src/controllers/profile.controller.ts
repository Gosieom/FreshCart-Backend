import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { UserModel } from "../models/user.model";

const getProfileImageFilePath = (profileImage?: string | null) => {
  if (!profileImage) return null;

  let imagePath = profileImage;

  // If old image was saved as full URL, extract only pathname.
  // Example: http://localhost:5000/uploads/profile/abc.jpg
  if (imagePath.startsWith("http")) {
    try {
      const url = new URL(imagePath);
      imagePath = url.pathname;
    } catch {
      return null;
    }
  }

  // Remove first slash
  imagePath = imagePath.replace(/^\/+/, "");

  // Safety: only delete files inside uploads/profile
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

    // Delete previous profile image before saving new one
    if (user.profileImage) {
      deleteProfileImageFile(user.profileImage);
    }

    // Save relative path only
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