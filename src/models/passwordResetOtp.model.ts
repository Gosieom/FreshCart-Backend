import mongoose, {
  Document,
  Model,
  Schema,
  Types,
} from "mongoose";

export interface IPasswordResetOtp
  extends Document {
  user: Types.ObjectId;
  email: string;
  otpHash: string;
  attempts: number;
  verified: boolean;
  resetTokenHash: string;
  resetTokenExpiresAt?: Date;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const passwordResetOtpSchema =
  new Schema<IPasswordResetOtp>(
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true,
      },

      otpHash: {
        type: String,
        required: true,
      },

      attempts: {
        type: Number,
        default: 0,
        min: 0,
      },

      verified: {
        type: Boolean,
        default: false,
      },

      resetTokenHash: {
        type: String,
        default: "",
      },

      resetTokenExpiresAt: {
        type: Date,
      },

      expiresAt: {
        type: Date,
        required: true,
        index: {
          expireAfterSeconds: 0,
        },
      },

      usedAt: {
        type: Date,
      },
    },
    {
      timestamps: true,
    }
  );

const PasswordResetOtp:
  Model<IPasswordResetOtp> =
    (mongoose.models
      .PasswordResetOtp as Model<IPasswordResetOtp>) ||
    mongoose.model<IPasswordResetOtp>(
      "PasswordResetOtp",
      passwordResetOtpSchema
    );

export default PasswordResetOtp;
