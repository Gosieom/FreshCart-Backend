import { Schema, model, Document } from "mongoose";

export interface UserDocument extends Document {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  profileImage?: string;
}

const userSchema = new Schema<UserDocument>(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    profileImage: { type: String },
  },
  {
    timestamps: true,
  }
);

export const UserModel = model<UserDocument>("User", userSchema);