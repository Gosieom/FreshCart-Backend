import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { RegisterUserDto, LoginUserDto } from "../dtos/user.dto";
import User from "../models/user.model";
import { generateToken } from "../utils/generateToken";
import { HttpException } from "../exceptions/httpException";
import { CLIENT_URL, JWT_SECRET } from "../configs";
import { sendEmail } from "../configs/email";

export const registerUserService = async (data: RegisterUserDto) => {
  const existingUser = await User.findOne({ email: data.email });

  if (existingUser) {
    throw new HttpException(400, "Email already exists");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await User.create({
    ...data,
    password: hashedPassword,
  });

  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    profileImage: user.profileImage,
    role: user.role,
    status: user.status,
  };
};

export const loginUserService = async (data: LoginUserDto) => {
  const user = await User.findOne({ email: data.email });

  if (!user) {
    throw new HttpException(401, "Invalid credentials");
  }

  const isMatch = await bcrypt.compare(data.password, user.password);

  if (!isMatch) {
    throw new HttpException(401, "Invalid credentials");
  }

  const token = generateToken(user._id.toString());

  return {
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      profileImage: user.profileImage,
      role: user.role,
      status: user.status,
    },
    token,
  };
};

export const sendResetPasswordEmailService = async (email?: string) => {
  if (!email) {
    throw new HttpException(400, "Email is required");
  }

  const user = await User.findOne({
    email: email.toLowerCase().trim(),
  });

  if (!user) {
    throw new HttpException(404, "User not found");
  }

  const token = jwt.sign(
    {
      id: user._id.toString(),
    },
    JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );

  const resetLink = `${CLIENT_URL}/user/reset-password?token=${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Reset your FreshCart password</h2>
      <p>Hello ${user.fullName || "FreshCart user"},</p>
      <p>You requested to reset your password.</p>
      <p>
        <a 
          href="${resetLink}" 
          style="
            display: inline-block;
            background: #078c34;
            color: white;
            padding: 12px 18px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: bold;
          "
        >
          Reset Password
        </a>
      </p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request this, you can ignore this email.</p>
    </div>
  `;

  await sendEmail(user.email, "FreshCart Password Reset", html);

  return {
    email: user.email,
  };
};

export const resetPasswordService = async (
  token?: string,
  newPassword?: string
) => {
  try {
    if (!token || !newPassword) {
      throw new HttpException(400, "Token and new password are required");
    }

    if (newPassword.length < 6) {
      throw new HttpException(400, "Password must be at least 6 characters");
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
    };

    const user = await User.findById(decoded.id);

    if (!user) {
      throw new HttpException(404, "User not found");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    return {
      id: user._id,
      email: user.email,
    };
  } catch (error: any) {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new HttpException(400, "Invalid or expired reset link");
  }
};