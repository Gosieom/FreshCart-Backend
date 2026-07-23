import { Request, Response } from "express";
import mongoose from "mongoose";

import Address from "../models/address.model";

const getLoggedInUserId = (req: Request): string => {
  const loggedInUser = (req as any).user;

  return (
    loggedInUser?.id ||
    loggedInUser?._id?.toString?.() ||
    ""
  );
};

const formatAddress = (address: any) => {
  return {
    id: address._id.toString(),
    _id: address._id.toString(),
    user: address.user,
    label: address.label,
    fullAddress: address.fullAddress,
    city: address.city,
    province: address.province,
    landmark: address.landmark,
    latitude: Number(address.latitude),
    longitude: Number(address.longitude),
    isDefault: Boolean(address.isDefault),
    createdAt: address.createdAt,
    updatedAt: address.updatedAt,
  };
};

const parseBooleanValue = (
  value: any
): boolean | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value)
    .trim()
    .toLowerCase();

  if (
    normalized === "true" ||
    normalized === "1" ||
    normalized === "yes"
  ) {
    return true;
  }

  if (
    normalized === "false" ||
    normalized === "0" ||
    normalized === "no"
  ) {
    return false;
  }

  return undefined;
};

const parseCoordinate = (
  value: any,
  minimum: number,
  maximum: number
): number | null => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  if (
    numberValue < minimum ||
    numberValue > maximum
  ) {
    return null;
  }

  return numberValue;
};

export const getMyAddresses = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = getLoggedInUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const addresses = await Address.find({
      user: userId,
    })
      .sort({
        isDefault: -1,
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      data: addresses.map(formatAddress),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch addresses",
    });
  }
};

export const createAddress = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = getLoggedInUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const {
      label,
      fullAddress,
      city,
      province,
      landmark,
      latitude,
      longitude,
      isDefault,
    } = req.body;

    const cleanFullAddress =
      String(fullAddress || "").trim();

    if (!cleanFullAddress) {
      return res.status(400).json({
        success: false,
        message: "Full address is required",
      });
    }

    const parsedLatitude = parseCoordinate(
      latitude,
      -90,
      90
    );

    const parsedLongitude = parseCoordinate(
      longitude,
      -180,
      180
    );

    if (
      parsedLatitude === null ||
      parsedLongitude === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid latitude and longitude are required",
      });
    }

    const parsedDefault =
      parseBooleanValue(isDefault);

    if (
      isDefault !== undefined &&
      parsedDefault === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "isDefault must be true or false",
      });
    }

    const existingCount =
      await Address.countDocuments({
        user: userId,
      });

    const shouldBeDefault =
      parsedDefault === true ||
      existingCount === 0;

    if (shouldBeDefault) {
      await Address.updateMany(
        { user: userId },
        { $set: { isDefault: false } }
      );
    }

    const address = await Address.create({
      user: userId,
      label:
        String(label || "Home").trim() ||
        "Home",
      fullAddress: cleanFullAddress,
      city:
        String(city || "Kathmandu").trim() ||
        "Kathmandu",
      province:
        String(province || "Bagmati").trim() ||
        "Bagmati",
      landmark:
        String(landmark || "").trim(),
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      isDefault: shouldBeDefault,
    });

    return res.status(201).json({
      success: true,
      message: "Address saved successfully",
      data: formatAddress(address),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to save address",
    });
  }
};

export const updateAddress = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = getLoggedInUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address id",
      });
    }

    const address = await Address.findOne({
      _id: id,
      user: userId,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    const {
      label,
      fullAddress,
      city,
      province,
      landmark,
      latitude,
      longitude,
      isDefault,
    } = req.body;

    if (fullAddress !== undefined) {
      const clean =
        String(fullAddress).trim();

      if (!clean) {
        return res.status(400).json({
          success: false,
          message:
            "Full address cannot be empty",
        });
      }

      address.fullAddress = clean;
    }

    if (label !== undefined) {
      address.label =
        String(label).trim() || "Home";
    }

    if (city !== undefined) {
      address.city =
        String(city).trim() || "Kathmandu";
    }

    if (province !== undefined) {
      address.province =
        String(province).trim() || "Bagmati";
    }

    if (landmark !== undefined) {
      address.landmark =
        String(landmark).trim();
    }

    if (latitude !== undefined) {
      const parsedLatitude =
        parseCoordinate(latitude, -90, 90);

      if (parsedLatitude === null) {
        return res.status(400).json({
          success: false,
          message: "Invalid latitude",
        });
      }

      address.latitude = parsedLatitude;
    }

    if (longitude !== undefined) {
      const parsedLongitude =
        parseCoordinate(longitude, -180, 180);

      if (parsedLongitude === null) {
        return res.status(400).json({
          success: false,
          message: "Invalid longitude",
        });
      }

      address.longitude = parsedLongitude;
    }

    const parsedDefault =
      parseBooleanValue(isDefault);

    if (
      isDefault !== undefined &&
      parsedDefault === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "isDefault must be true or false",
      });
    }

    if (parsedDefault === true) {
      await Address.updateMany(
        {
          user: userId,
          _id: { $ne: address._id },
        },
        { $set: { isDefault: false } }
      );

      address.isDefault = true;
    }

    await address.save();

    return res.status(200).json({
      success: true,
      message:
        "Address updated successfully",
      data: formatAddress(address),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to update address",
    });
  }
};

export const setDefaultAddress = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = getLoggedInUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address id",
      });
    }

    const address = await Address.findOne({
      _id: id,
      user: userId,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    await Address.updateMany(
      { user: userId },
      { $set: { isDefault: false } }
    );

    address.isDefault = true;
    await address.save();

    return res.status(200).json({
      success: true,
      message: "Default address updated",
      data: formatAddress(address),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to set default address",
    });
  }
};

export const deleteAddress = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = getLoggedInUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address id",
      });
    }

    const address = await Address.findOne({
      _id: id,
      user: userId,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    const wasDefaultAddress =
      address.isDefault;

    await Address.deleteOne({
      _id: id,
      user: userId,
    });

    if (wasDefaultAddress) {
      const nextAddress =
        await Address.findOne({
          user: userId,
        }).sort({ createdAt: -1 });

      if (nextAddress) {
        nextAddress.isDefault = true;
        await nextAddress.save();
      }
    }

    return res.status(200).json({
      success: true,
      message:
        "Address deleted successfully",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to delete address",
    });
  }
};
