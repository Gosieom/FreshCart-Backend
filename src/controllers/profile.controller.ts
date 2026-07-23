import fs from "fs";
import path from "path";
import {
  Request,
  Response,
} from "express";

import User from "../models/user.model";

const getUploadedProfilePath = (
  req: Request
) => {
  const file = (
    req as any
  ).file as
    | Express.Multer.File
    | undefined;

  if (!file) {
    return "";
  }

  const relativePath =
    path
      .relative(
        process.cwd(),
        file.path
      )
      .replace(
        /\\/g,
        "/"
      );

  return `/${relativePath}`;
};

const deleteProfileImageFile = (
  profileImage?: string
) => {
  try {
    if (!profileImage) {
      return;
    }

    if (
      profileImage.startsWith(
        "http"
      ) ||
      profileImage.startsWith(
        "data:"
      )
    ) {
      return;
    }

    const cleanPath =
      profileImage
        .replace(
          /^\/+/,
          ""
        )
        .replace(
          /\\/g,
          "/"
        );

    const absolutePath =
      path.join(
        process.cwd(),
        cleanPath
      );

    if (
      fs.existsSync(
        absolutePath
      )
    ) {
      fs.unlinkSync(
        absolutePath
      );
    }
  } catch (error) {
    console.log(
      "PROFILE IMAGE DELETE ERROR:",
      error
    );
  }
};

const safeUserResponse = (
  user: any
) => ({
  id: user._id,
  _id: user._id,
  fullName:
    user.fullName,
  email: user.email,
  phone:
    user.phone || "",
  profileImage:
    user.profileImage || "",
  role: user.role,
  status: user.status,
});

const getUserId = (
  req: Request
) => {
  return (
    (req as any).user
      ?.id ||
    (req as any).user
      ?._id
  );
};

export const updateProfile =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Unauthorized",
          });
      }

      const {
        fullName,
        email,
        phone,
      } = req.body;

      if (
        !String(
          fullName || ""
        ).trim()
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Full name is required",
          });
      }

      const user =
        await User.findById(
          userId
        );

      if (!user) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "User not found",
          });
      }

      /*
       * Email remains compatible with the web
       * profile page, but Flutter sends the
       * existing read-only address unchanged.
       */
      const normalizedEmail =
        String(
          email ||
            user.email
        )
          .trim()
          .toLowerCase();

      const emailExists =
        await User.findOne({
          email:
            normalizedEmail,
          _id: {
            $ne: userId,
          },
        });

      if (emailExists) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Email already exists",
          });
      }

      const newProfileImage =
        getUploadedProfilePath(
          req
        );

      if (
        newProfileImage &&
        user.profileImage
      ) {
        deleteProfileImageFile(
          user.profileImage
        );
      }

      user.fullName =
        String(fullName)
          .trim();

      user.email =
        normalizedEmail;

      user.phone =
        String(
          phone || ""
        ).trim();

      if (
        newProfileImage
      ) {
        user.profileImage =
          newProfileImage;
      }

      await user.save();

      const safeUser =
        safeUserResponse(
          user
        );

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Profile updated successfully",
          user: safeUser,
          data: {
            user:
              safeUser,
          },
        });
    } catch (error: any) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            error.message ||
            "Profile update failed",
        });
    }
  };

export const uploadProfileImage =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Unauthorized",
          });
      }

      const imagePath =
        getUploadedProfilePath(
          req
        );

      if (!imagePath) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Profile image is required",
          });
      }

      const user =
        await User.findById(
          userId
        );

      if (!user) {
        deleteProfileImageFile(
          imagePath
        );

        return res
          .status(404)
          .json({
            success: false,
            message:
              "User not found",
          });
      }

      if (
        user.profileImage
      ) {
        deleteProfileImageFile(
          user.profileImage
        );
      }

      user.profileImage =
        imagePath;

      await user.save();

      const safeUser =
        safeUserResponse(
          user
        );

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Profile image uploaded successfully",
          imageUrl:
            imagePath,
          user: safeUser,
          data: {
            user:
              safeUser,
          },
        });
    } catch (error: any) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            error.message ||
            "Profile image upload failed",
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
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Unauthorized",
          });
      }

      const user =
        await User.findById(
          userId
        );

      if (!user) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "User not found",
          });
      }

      if (
        user.profileImage
      ) {
        deleteProfileImageFile(
          user.profileImage
        );
      }

      user.profileImage = "";
      await user.save();

      const safeUser =
        safeUserResponse(
          user
        );

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Profile image removed successfully",
          user: safeUser,
          data: {
            user:
              safeUser,
          },
        });
    } catch (error: any) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            error.message ||
            "Profile image remove failed",
        });
    }
  };
