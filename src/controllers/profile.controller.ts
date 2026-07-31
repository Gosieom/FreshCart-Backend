import {
  Request,
  Response,
} from "express";

import User, {
  type IUser,
} from "../models/user.model";

import {
  deleteStoredImage,
  uploadImageBuffer,
} from "../services/imageStorage.service";

const getErrorMessage = (
  error: unknown,
  fallback: string
) => {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
};

const safeUserResponse = (
  user: IUser
) => ({
  id: user._id,
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone || "",
  profileImage:
    user.profileImage || "",
  role: user.role,
  status: user.status,
  createdAt: user.createdAt,
});

const getUserId = (
  req: Request
) => {
  return req.user?.id;
};

const uploadProfileFile = async (
  req: Request
) => {
  if (!req.file) {
    return "";
  }

  return uploadImageBuffer(
    req.file.buffer,
    "profiles"
  );
};

export const updateProfile = async (
  req: Request,
  res: Response
) => {
  let uploadedImage = "";

  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const {
      fullName,
      email,
      phone,
    } = req.body;

    if (!String(fullName || "").trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Full name is required",
      });
    }

    const user =
      await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const normalizedEmail = String(
      email || user.email
    )
      .trim()
      .toLowerCase();

    const emailExists =
      await User.findOne({
        email: normalizedEmail,
        _id: { $ne: userId },
      });

    if (emailExists) {
      return res.status(400).json({
        success: false,
        message:
          "Email already exists",
      });
    }

    if (req.file) {
      uploadedImage =
        await uploadProfileFile(req);
    }

    const previousImage =
      user.profileImage || "";

    user.fullName = String(
      fullName
    ).trim();

    user.email = normalizedEmail;
    user.phone = String(
      phone || ""
    ).trim();

    if (uploadedImage) {
      user.profileImage =
        uploadedImage;
    }

    await user.save();

    if (
      uploadedImage &&
      previousImage
    ) {
      await deleteStoredImage(
        previousImage
      );
    }

    const safeUser =
      safeUserResponse(user);

    return res.status(200).json({
      success: true,
      message:
        "Profile updated successfully",
      user: safeUser,
      data: {
        user: safeUser,
      },
    });
  } catch (error: unknown) {
    if (uploadedImage) {
      await deleteStoredImage(
        uploadedImage
      );
    }

    return res.status(500).json({
      success: false,
      message: getErrorMessage(
        error,
        "Profile update failed"
      ),
    });
  }
};

export const uploadProfileImage =
  async (
    req: Request,
    res: Response
  ) => {
    let uploadedImage = "";

    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "Profile image is required",
        });
      }

      const user =
        await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      uploadedImage =
        await uploadProfileFile(req);

      const previousImage =
        user.profileImage || "";

      user.profileImage =
        uploadedImage;

      await user.save();

      if (previousImage) {
        await deleteStoredImage(
          previousImage
        );
      }

      const safeUser =
        safeUserResponse(user);

      return res.status(200).json({
        success: true,
        message:
          "Profile image uploaded successfully",
        imageUrl: uploadedImage,
        user: safeUser,
        data: {
          user: safeUser,
        },
      });
    } catch (error: unknown) {
      if (uploadedImage) {
        await deleteStoredImage(
          uploadedImage
        );
      }

      return res.status(500).json({
        success: false,
        message: getErrorMessage(
          error,
          "Profile image upload failed"
        ),
      });
    }
  };

export const removeProfileImage =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const user =
        await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const previousImage =
        user.profileImage || "";

      user.profileImage = "";
      await user.save();

      if (previousImage) {
        await deleteStoredImage(
          previousImage
        );
      }

      const safeUser =
        safeUserResponse(user);

      return res.status(200).json({
        success: true,
        message:
          "Profile image removed successfully",
        user: safeUser,
        data: {
          user: safeUser,
        },
      });
    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        message: getErrorMessage(
          error,
          "Profile image remove failed"
        ),
      });
    }
  };
