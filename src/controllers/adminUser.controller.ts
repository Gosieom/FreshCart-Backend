import { Request, Response } from "express";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import User from "../models/user.model";

const escapeRegex = (value: string) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const formatUser = (user: any) => {
  return {
    id: user._id.toString(),
    _id: user._id.toString(),
    name: user.fullName || user.name || "",
    fullName: user.fullName || user.name || "",
    email: user.email,
    role: user.role || "user",
    status: user.status || "active",
    phone: user.phone || "",
    profileImage: user.profileImage || "",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

export const getAdminUsers = async (req: Request, res: Response) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const skip = (page - 1) * limit;

    const query: any = {};

    if (search) {
      const safeSearch = escapeRegex(search);

      query.$or = [
        {
          $expr: {
            $regexMatch: {
              input: { $toString: "$_id" },
              regex: safeSearch,
              options: "i",
            },
          },
        },
        {
          fullName: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          name: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          email: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          phone: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          role: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          status: {
            $regex: safeSearch,
            $options: "i",
          },
        },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      data: users.map(formatUser),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.log("GET ADMIN USERS ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch users",
    });
  }
};

export const getAdminUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid user id",
      });
    }

    const user = await User.findById(id).select("-password").lean();

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      data: formatUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch user",
    });
  }
};

export const createAdminUser = async (req: Request, res: Response) => {
  try {
    const {
      name,
      fullName,
      email,
      password,
      role = "user",
      status = "active",
      phone = "",
    } = req.body;

    const finalName = fullName || name;

    if (!finalName || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required",
      });
    }

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName: finalName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone,
      role,
      status,
    });

    return res.status(201).json({
      message: "User created successfully",
      data: formatUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create user",
    });
  }
};

export const updateAdminUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, fullName, email, password, role, status, phone } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid user id",
      });
    }

    const updateData: any = {};

    const finalName = fullName || name;

    if (finalName !== undefined) {
      if (!finalName.trim()) {
        return res.status(400).json({
          message: "Name cannot be empty",
        });
      }

      updateData.fullName = finalName.trim();
    }

    if (email !== undefined) {
      if (!email.trim()) {
        return res.status(400).json({
          message: "Email cannot be empty",
        });
      }

      const existingUser = await User.findOne({
        email: email.toLowerCase().trim(),
        _id: { $ne: id },
      });

      if (existingUser) {
        return res.status(409).json({
          message: "Email already exists",
        });
      }

      updateData.email = email.toLowerCase().trim();
    }

    if (phone !== undefined) {
      updateData.phone = phone;
    }

    if (role !== undefined) {
      if (!["user", "admin"].includes(role)) {
        return res.status(400).json({
          message: "Invalid role",
        });
      }

      updateData.role = role;
    }

    if (status !== undefined) {
      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({
          message: "Invalid status",
        });
      }

      updateData.status = status;
    }

    if (password !== undefined && password !== "") {
      if (password.length < 6) {
        return res.status(400).json({
          message: "Password must be at least 6 characters",
        });
      }

      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "User updated successfully",
      data: formatUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update user",
    });
  }
};

export const deleteAdminUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid user id",
      });
    }

    const loggedInUser = (req as any).user;

    if (loggedInUser?._id?.toString() === id) {
      return res.status(400).json({
        message: "You cannot delete your own admin account",
      });
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete user",
    });
  }
};