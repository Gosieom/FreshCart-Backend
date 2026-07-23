import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";

import {
  RegisterUserDto,
  LoginUserDto,
} from "../dtos/user.dto";
import { CLIENT_URL, JWT_SECRET } from "../configs";
import { sendEmail } from "../configs/email";
import { HttpException } from "../exceptions/httpException";
import PasswordResetOtp from "../models/passwordResetOtp.model";
import User from "../models/user.model";
import { generateToken } from "../utils/generateToken";

const OTP_LIFETIME_MINUTES = 10;
const RESET_TOKEN_LIFETIME_MINUTES = 15;
const MAX_OTP_ATTEMPTS = 5;

const normalizeEmail = (
  value?: string
): string => {
  return String(value || "")
    .trim()
    .toLowerCase();
};

const hashSensitiveValue = (
  value: string
): string => {
  return crypto
    .createHmac(
      "sha256",
      JWT_SECRET
    )
    .update(value)
    .digest("hex");
};

const safeEqual = (
  first: string,
  second: string
): boolean => {
  const firstBuffer =
    Buffer.from(first);

  const secondBuffer =
    Buffer.from(second);

  if (
    firstBuffer.length !==
    secondBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    firstBuffer,
    secondBuffer
  );
};

export const registerUserService =
  async (
    data: RegisterUserDto
  ) => {
    const normalizedEmail =
      normalizeEmail(data.email);

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      });

    if (existingUser) {
      throw new HttpException(
        400,
        "Email already exists"
      );
    }

    const hashedPassword =
      await bcrypt.hash(
        data.password,
        10
      );

    const user =
      await User.create({
        ...data,
        email: normalizedEmail,
        password: hashedPassword,
      });

    return {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      profileImage:
        user.profileImage,
      role: user.role,
      status: user.status,
    };
  };

export const loginUserService =
  async (
    data: LoginUserDto
  ) => {
    const user =
      await User.findOne({
        email:
          normalizeEmail(
            data.email
          ),
      });

    if (!user) {
      throw new HttpException(
        401,
        "Invalid credentials"
      );
    }

    const isMatch =
      await bcrypt.compare(
        data.password,
        user.password
      );

    if (!isMatch) {
      throw new HttpException(
        401,
        "Invalid credentials"
      );
    }

    const token =
      generateToken(
        user._id.toString()
      );

    return {
      user: {
        id: user._id,
        fullName:
          user.fullName,
        email: user.email,
        phone: user.phone,
        profileImage:
          user.profileImage,
        role: user.role,
        status: user.status,
      },
      token,
    };
  };

/*
 * Existing web reset-link flow.
 * It remains unchanged so the web project
 * continues to work.
 */
export const sendResetPasswordEmailService =
  async (
    email?: string
  ) => {
    const normalizedEmail =
      normalizeEmail(email);

    if (!normalizedEmail) {
      throw new HttpException(
        400,
        "Email is required"
      );
    }

    const user =
      await User.findOne({
        email: normalizedEmail,
      });

    if (!user) {
      throw new HttpException(
        404,
        "User not found"
      );
    }

    const token = jwt.sign(
      {
        id:
          user._id.toString(),
      },
      JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    const resetLink =
      `${CLIENT_URL}/user/reset-password?token=${token}`;

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

    await sendEmail(
      user.email,
      "FreshCart Password Reset",
      html
    );

    return {
      email: user.email,
    };
  };

export const resetPasswordService =
  async (
    token?: string,
    newPassword?: string
  ) => {
    try {
      if (
        !token ||
        !newPassword
      ) {
        throw new HttpException(
          400,
          "Token and new password are required"
        );
      }

      if (
        newPassword.length < 6
      ) {
        throw new HttpException(
          400,
          "Password must be at least 6 characters"
        );
      }

      const decoded =
        jwt.verify(
          token,
          JWT_SECRET
        ) as {
          id: string;
        };

      const user =
        await User.findById(
          decoded.id
        );

      if (!user) {
        throw new HttpException(
          404,
          "User not found"
        );
      }

      user.password =
        await bcrypt.hash(
          newPassword,
          10
        );

      await user.save();

      return {
        id: user._id,
        email: user.email,
      };
    } catch (error: any) {
      if (
        error instanceof
        HttpException
      ) {
        throw error;
      }

      throw new HttpException(
        400,
        "Invalid or expired reset link"
      );
    }
  };

export const changePasswordService =
  async (
    userId: string,
    currentPassword?: string,
    newPassword?: string
  ) => {
    if (
      !currentPassword ||
      !newPassword
    ) {
      throw new HttpException(
        400,
        "Current password and new password are required"
      );
    }

    if (
      newPassword.length < 6
    ) {
      throw new HttpException(
        400,
        "New password must be at least 6 characters"
      );
    }

    if (
      currentPassword ===
      newPassword
    ) {
      throw new HttpException(
        400,
        "New password must be different from the current password"
      );
    }

    const user =
      await User.findById(
        userId
      );

    if (!user) {
      throw new HttpException(
        404,
        "User not found"
      );
    }

    const isCurrentPasswordValid =
      await bcrypt.compare(
        currentPassword,
        user.password
      );

    if (
      !isCurrentPasswordValid
    ) {
      throw new HttpException(
        400,
        "Current password is incorrect"
      );
    }

    user.password =
      await bcrypt.hash(
        newPassword,
        10
      );

    await user.save();

    return {
      id: user._id,
      email: user.email,
    };
  };

/*
 * Mobile OTP reset flow.
 */

export const requestPasswordResetOtpService =
  async (
    email?: string
  ) => {
    const normalizedEmail =
      normalizeEmail(email);

    if (!normalizedEmail) {
      throw new HttpException(
        400,
        "Email is required"
      );
    }

    const user =
      await User.findOne({
        email: normalizedEmail,
      });

    /*
     * Return the same response even when
     * the account does not exist.
     */
    if (!user) {
      return;
    }

    const otp = crypto
      .randomInt(
        100000,
        1000000
      )
      .toString();

    const otpHash =
      hashSensitiveValue(otp);

    const expiresAt =
      new Date(
        Date.now() +
          OTP_LIFETIME_MINUTES *
            60 *
            1000
      );

    await PasswordResetOtp.deleteMany({
      email: normalizedEmail,
    });

    await PasswordResetOtp.create({
      user: user._id,
      email: normalizedEmail,
      otpHash,
      attempts: 0,
      verified: false,
      resetTokenHash: "",
      expiresAt,
    });

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color:#0AAD0A;">FreshCart password reset</h2>
        <p>Hello ${user.fullName || "FreshCart user"},</p>
        <p>Use this verification code to reset your password:</p>
        <div style="
          display:inline-block;
          padding:14px 22px;
          margin:10px 0;
          background:#eef9ee;
          border-radius:12px;
          font-size:30px;
          font-weight:800;
          letter-spacing:8px;
          color:#087a08;
        ">
          ${otp}
        </div>
        <p>This code expires in ${OTP_LIFETIME_MINUTES} minutes.</p>
        <p>If you did not request this reset, you can ignore this email.</p>
      </div>
    `;

    await sendEmail(
      user.email,
      "FreshCart password reset code",
      html
    );
  };

export const verifyPasswordResetOtpService =
  async (
    email?: string,
    otp?: string
  ) => {
    const normalizedEmail =
      normalizeEmail(email);

    const cleanOtp =
      String(otp || "").trim();

    if (
      !normalizedEmail ||
      !/^\d{6}$/.test(
        cleanOtp
      )
    ) {
      throw new HttpException(
        400,
        "Enter the valid six-digit verification code"
      );
    }

    const record =
      await PasswordResetOtp.findOne({
        email: normalizedEmail,
        usedAt: {
          $exists: false,
        },
      }).sort({
        createdAt: -1,
      });

    if (
      !record ||
      record.expiresAt.getTime() <
        Date.now()
    ) {
      throw new HttpException(
        400,
        "Verification code is invalid or expired"
      );
    }

    if (
      record.attempts >=
      MAX_OTP_ATTEMPTS
    ) {
      throw new HttpException(
        429,
        "Too many incorrect attempts. Request a new code."
      );
    }

    const suppliedHash =
      hashSensitiveValue(
        cleanOtp
      );

    const valid = safeEqual(
      record.otpHash,
      suppliedHash
    );

    if (!valid) {
      record.attempts += 1;
      await record.save();

      throw new HttpException(
        400,
        "Verification code is incorrect"
      );
    }

    const resetToken =
      crypto
        .randomBytes(32)
        .toString("hex");

    const resetTokenExpiresAt =
      new Date(
        Date.now() +
          RESET_TOKEN_LIFETIME_MINUTES *
            60 *
            1000
      );

    record.verified = true;
    record.resetTokenHash =
      hashSensitiveValue(
        resetToken
      );
    record.resetTokenExpiresAt =
      resetTokenExpiresAt;

    /*
     * Move the TTL expiry forward so the
     * verified reset token remains usable.
     */
    record.expiresAt =
      resetTokenExpiresAt;

    await record.save();

    return {
      resetToken,
      expiresInMinutes:
        RESET_TOKEN_LIFETIME_MINUTES,
    };
  };

export const completePasswordResetOtpService =
  async (
    email?: string,
    resetToken?: string,
    newPassword?: string
  ) => {
    const normalizedEmail =
      normalizeEmail(email);

    const cleanToken =
      String(
        resetToken || ""
      ).trim();

    if (
      !normalizedEmail ||
      !cleanToken ||
      !newPassword
    ) {
      throw new HttpException(
        400,
        "Email, reset token, and new password are required"
      );
    }

    if (
      newPassword.length < 6
    ) {
      throw new HttpException(
        400,
        "Password must be at least 6 characters"
      );
    }

    const resetTokenHash =
      hashSensitiveValue(
        cleanToken
      );

    const record =
      await PasswordResetOtp.findOne({
        email: normalizedEmail,
        verified: true,
        resetTokenHash,
        usedAt: {
          $exists: false,
        },
        resetTokenExpiresAt: {
          $gt: new Date(),
        },
      });

    if (!record) {
      throw new HttpException(
        400,
        "Reset session is invalid or expired"
      );
    }

    const user =
      await User.findById(
        record.user
      );

    if (!user) {
      throw new HttpException(
        404,
        "User not found"
      );
    }

    user.password =
      await bcrypt.hash(
        newPassword,
        10
      );

    await user.save();

    record.usedAt =
      new Date();

    await record.save();

    await PasswordResetOtp.deleteMany({
      email: normalizedEmail,
      _id: {
        $ne: record._id,
      },
    });

    return {
      id: user._id,
      email: user.email,
    };
  };
