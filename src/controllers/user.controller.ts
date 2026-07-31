import {
  Request,
  Response,
} from "express";
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  clearAuthCookieOptions,
} from "../utils/auth-cookie.util";
import {
  changePasswordService,
  completePasswordResetOtpService,
  loginUserService,
  registerUserService,
  requestPasswordResetOtpService,
  resetPasswordService,
  sendResetPasswordEmailService,
  verifyPasswordResetOtpService,
} from "../services/user.service";

export const register = async (
  req: Request,
  res: Response
) => {
  try {
    const user =
      await registerUserService(
        req.body
      );

    return res.status(201).json({
      success: true,
      message:
        "User created successfully",
      user,
    });
  } catch (error: any) {
    return res
      .status(
        error.status ||
          error.statusCode ||
          400
      )
      .json({
        success: false,
        message:
          error.message ||
          "Registration failed",
      });
  }
};

export const login = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      user,
      token,
    } =
      await loginUserService(
        req.body
      );

   res.cookie(
  AUTH_COOKIE_NAME,
  token,
  authCookieOptions
);

    return res.status(200).json({
      success: true,
      message:
        "Login successful",
      data: {
        user,
        token,
      },
    });
  } catch (error: any) {
    return res
      .status(
        error.status ||
          error.statusCode ||
          401
      )
      .json({
        success: false,
        message:
          error.message ||
          "Login failed",
      });
  }
};

export const logout = async (
  _req: Request,
  res: Response
) => {
res.clearCookie(
  AUTH_COOKIE_NAME,
  clearAuthCookieOptions
);
  return res.status(200).json({
    success: true,
    message:
      "Logout successful",
  });
};

/*
 * Existing web reset-link endpoints.
 */
export const requestPasswordReset =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const { email } =
        req.body;

      await sendResetPasswordEmailService(
        email
      );

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Password reset link has been sent to your email.",
        });
    } catch (error: any) {
      return res
        .status(
          error.status ||
            error.statusCode ||
            500
        )
        .json({
          success: false,
          message:
            error.message ||
            "Failed to send reset email",
        });
    }
  };

export const resetPassword =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const { token } =
        req.params;

      const {
        newPassword,
      } = req.body;

      await resetPasswordService(
        token,
        newPassword
      );

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Password has been reset successfully.",
        });
    } catch (error: any) {
      return res
        .status(
          error.status ||
            error.statusCode ||
            500
        )
        .json({
          success: false,
          message:
            error.message ||
            "Failed to reset password",
        });
    }
  };

export const changePassword =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const userId =
        (req as any).user
          ?.id ||
        (req as any).user
          ?._id;

      const {
        currentPassword,
        newPassword,
      } = req.body;

      if (!userId) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Unauthorized",
          });
      }

      await changePasswordService(
        userId,
        currentPassword,
        newPassword
      );

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Password updated successfully",
        });
    } catch (error: any) {
      return res
        .status(
          error.status ||
            error.statusCode ||
            500
        )
        .json({
          success: false,
          message:
            error.message ||
            "Password update failed",
        });
    }
  };

/*
 * Mobile OTP reset endpoints.
 */
export const requestPasswordResetOtp =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      await requestPasswordResetOtpService(
        req.body?.email
      );

      return res
        .status(200)
        .json({
          success: true,
          message:
            "If the email belongs to a FreshCart account, a six-digit reset code has been sent.",
        });
    } catch (error: any) {
      return res
        .status(
          error.status ||
            error.statusCode ||
            500
        )
        .json({
          success: false,
          message:
            error.message ||
            "Could not send the reset code",
        });
    }
  };

export const verifyPasswordResetOtp =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const result =
        await verifyPasswordResetOtpService(
          req.body?.email,
          req.body?.otp
        );

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Verification code accepted",
          data: result,
        });
    } catch (error: any) {
      return res
        .status(
          error.status ||
            error.statusCode ||
            500
        )
        .json({
          success: false,
          message:
            error.message ||
            "Could not verify the reset code",
        });
    }
  };

export const completePasswordResetOtp =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        email,
        resetToken,
        newPassword,
      } = req.body;

      await completePasswordResetOtpService(
        email,
        resetToken,
        newPassword
      );

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Password reset successfully. You can now log in with your new password.",
        });
    } catch (error: any) {
      return res
        .status(
          error.status ||
            error.statusCode ||
            500
        )
        .json({
          success: false,
          message:
            error.message ||
            "Could not reset the password",
        });
    }
  };
