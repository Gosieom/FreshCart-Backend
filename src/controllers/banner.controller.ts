import fs from "fs";
import path from "path";
import { Request, Response } from "express";
import mongoose from "mongoose";
import Banner from "../models/banner.model";

const formatBanner = (banner: any) => {
  return {
    id: banner._id.toString(),
    _id: banner._id.toString(),
    title: banner.title,
    subtitle: banner.subtitle,
    image: banner.image,
    position: banner.position,
    buttonText: banner.buttonText,
    link: banner.link,
    backgroundColor: banner.backgroundColor,
    textColor: banner.textColor,
    isActive: banner.isActive,
    sortOrder: banner.sortOrder,
    createdAt: banner.createdAt,
    updatedAt: banner.updatedAt,
  };
};

const getBannerImagePath = (req: Request) => {
  const file = (req as any).file as Express.Multer.File | undefined;

  if (!file) return "";

  const relativePath = path
    .relative(process.cwd(), file.path)
    .replace(/\\/g, "/");

  return `/${relativePath}`;
};

const deleteBannerImage = (image?: string) => {
  try {
    if (!image || image.startsWith("http")) return;

    const cleanPath = image.replace(/^\/+/, "").replace(/\\/g, "/");
    const absolutePath = path.join(process.cwd(), cleanPath);

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  } catch (error) {
    console.log("DELETE BANNER IMAGE ERROR:", error);
  }
};

export const getPublicBanners = async (req: Request, res: Response) => {
  try {
    const position =
      typeof req.query.position === "string" ? req.query.position : "";

    const query: any = {
      isActive: true,
    };

    if (position) {
      query.position = position;
    }

    const banners = await Banner.find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: banners.map(formatBanner),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch banners",
    });
  }
};

export const getAdminBanners = async (_req: Request, res: Response) => {
  try {
    const banners = await Banner.find({})
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: banners.map(formatBanner),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch banners",
    });
  }
};

export const createAdminBanner = async (req: Request, res: Response) => {
  try {
    const {
      title,
      subtitle = "",
      position = "home_hero",
      buttonText = "Shop now",
      link = "/user/grocery",
      backgroundColor = "#0f7f3b",
      textColor = "#ffffff",
      isActive = "true",
      sortOrder = "1",
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Banner title is required",
      });
    }

    const image = getBannerImagePath(req);

    const banner = await Banner.create({
      title: title.trim(),
      subtitle,
      image,
      position,
      buttonText,
      link,
      backgroundColor,
      textColor,
      isActive: String(isActive) === "true",
      sortOrder: Number(sortOrder) || 1,
    });

    return res.status(201).json({
      success: true,
      message: "Banner created successfully",
      data: formatBanner(banner),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create banner",
    });
  }
};

export const updateAdminBanner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner id",
      });
    }

    const banner = await Banner.findById(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
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

    const newImage = getBannerImagePath(req);

    if (newImage && banner.image) {
      deleteBannerImage(banner.image);
    }

    if (title !== undefined) banner.title = title.trim();
    if (subtitle !== undefined) banner.subtitle = subtitle;
    if (position !== undefined) banner.position = position;
    if (buttonText !== undefined) banner.buttonText = buttonText;
    if (link !== undefined) banner.link = link;
    if (backgroundColor !== undefined) banner.backgroundColor = backgroundColor;
    if (textColor !== undefined) banner.textColor = textColor;
    if (isActive !== undefined) banner.isActive = String(isActive) === "true";
    if (sortOrder !== undefined) banner.sortOrder = Number(sortOrder) || 1;
    if (newImage) banner.image = newImage;

    await banner.save();

    return res.status(200).json({
      success: true,
      message: "Banner updated successfully",
      data: formatBanner(banner),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update banner",
    });
  }
};

export const deleteAdminBanner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner id",
      });
    }

    const banner = await Banner.findByIdAndDelete(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    deleteBannerImage(banner.image);

    return res.status(200).json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete banner",
    });
  }
};