import {
  Request,
  Response,
} from "express";

import mongoose from "mongoose";

import Banner from "../models/banner.model";

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

const formatBanner = (
  banner: any
) => {
  return {
    id: banner._id.toString(),
    _id: banner._id.toString(),
    title: banner.title,
    subtitle: banner.subtitle,
    image: banner.image,
    position: banner.position,
    buttonText: banner.buttonText,
    link: banner.link,
    backgroundColor:
      banner.backgroundColor,
    textColor: banner.textColor,
    isActive: banner.isActive,
    sortOrder: banner.sortOrder,
    createdAt: banner.createdAt,
    updatedAt: banner.updatedAt,
  };
};

const uploadBannerImage =
  async (req: Request) => {
    if (!req.file) {
      return "";
    }

    return uploadImageBuffer(
      req.file.buffer,
      "banners"
    );
  };

export const getPublicBanners =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const position =
        typeof req.query.position ===
        "string"
          ? req.query.position
          : "";

      const query: any = {
        isActive: true,
      };

      if (position) {
        query.position = position;
      }

      const banners =
        await Banner.find(query)
          .sort({
            sortOrder: 1,
            createdAt: -1,
          })
          .lean();

      return res.status(200).json({
        success: true,
        data: banners.map(
          formatBanner
        ),
      });
    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        message: getErrorMessage(
          error,
          "Failed to fetch banners"
        ),
      });
    }
  };

export const getAdminBanners =
  async (
    _req: Request,
    res: Response
  ) => {
    try {
      const banners =
        await Banner.find({})
          .sort({
            sortOrder: 1,
            createdAt: -1,
          })
          .lean();

      return res.status(200).json({
        success: true,
        data: banners.map(
          formatBanner
        ),
      });
    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        message: getErrorMessage(
          error,
          "Failed to fetch banners"
        ),
      });
    }
  };

export const createAdminBanner =
  async (
    req: Request,
    res: Response
  ) => {
    let uploadedImage = "";

    try {
      const {
        title,
        subtitle = "",
        position = "home_hero",
        buttonText = "Shop now",
        link = "/user/grocery",
        backgroundColor =
          "#0f7f3b",
        textColor = "#ffffff",
        isActive = "true",
        sortOrder = "1",
      } = req.body;

      if (
        !title ||
        !String(title).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Banner title is required",
        });
      }

      if (req.file) {
        uploadedImage =
          await uploadBannerImage(req);
      }

      const banner =
        await Banner.create({
          title:
            String(title).trim(),
          subtitle,
          image: uploadedImage,
          position,
          buttonText,
          link,
          backgroundColor,
          textColor,
          isActive:
            String(isActive) ===
            "true",
          sortOrder:
            Number(sortOrder) || 1,
        });

      return res.status(201).json({
        success: true,
        message:
          "Banner created successfully",
        data: formatBanner(banner),
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
          "Failed to create banner"
        ),
      });
    }
  };

export const updateAdminBanner =
  async (
    req: Request,
    res: Response
  ) => {
    let uploadedImage = "";

    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid banner id",
        });
      }

      const banner =
        await Banner.findById(id);

      if (!banner) {
        return res.status(404).json({
          success: false,
          message:
            "Banner not found",
        });
      }

      const {
        title,
        subtitle,
        position,
        buttonText,
        link,
        backgroundColor,
        textColor,
        isActive,
        sortOrder,
      } = req.body;

      if (title !== undefined) {
        const normalizedTitle =
          String(title).trim();

        if (!normalizedTitle) {
          return res.status(400).json({
            success: false,
            message:
              "Banner title cannot be empty",
          });
        }

        banner.title =
          normalizedTitle;
      }

      if (subtitle !== undefined) {
        banner.subtitle = subtitle;
      }

      if (position !== undefined) {
        banner.position = position;
      }

      if (buttonText !== undefined) {
        banner.buttonText =
          buttonText;
      }

      if (link !== undefined) {
        banner.link = link;
      }

      if (
        backgroundColor !==
        undefined
      ) {
        banner.backgroundColor =
          backgroundColor;
      }

      if (textColor !== undefined) {
        banner.textColor =
          textColor;
      }

      if (isActive !== undefined) {
        banner.isActive =
          String(isActive) ===
          "true";
      }

      if (sortOrder !== undefined) {
        banner.sortOrder =
          Number(sortOrder) || 1;
      }

      const previousImage =
        banner.image || "";

      if (req.file) {
        uploadedImage =
          await uploadBannerImage(req);

        banner.image =
          uploadedImage;
      }

      await banner.save();

      if (
        uploadedImage &&
        previousImage
      ) {
        await deleteStoredImage(
          previousImage
        );
      }

      return res.status(200).json({
        success: true,
        message:
          "Banner updated successfully",
        data: formatBanner(banner),
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
          "Failed to update banner"
        ),
      });
    }
  };

export const deleteAdminBanner =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid banner id",
        });
      }

      const banner =
        await Banner.findByIdAndDelete(
          id
        );

      if (!banner) {
        return res.status(404).json({
          success: false,
          message:
            "Banner not found",
        });
      }

      if (banner.image) {
        await deleteStoredImage(
          banner.image
        );
      }

      return res.status(200).json({
        success: true,
        message:
          "Banner deleted successfully",
      });
    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        message: getErrorMessage(
          error,
          "Failed to delete banner"
        ),
      });
    }
  };
