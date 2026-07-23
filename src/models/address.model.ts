import mongoose, { Document, Schema } from "mongoose";

export interface IAddress extends Document {
  user: mongoose.Types.ObjectId;
  label: string;
  fullAddress: string;
  city: string;
  province: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<IAddress>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    label: {
      type: String,
      default: "Home",
      trim: true,
    },

    fullAddress: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      default: "Kathmandu",
      trim: true,
    },

    province: {
      type: String,
      default: "Bagmati",
      trim: true,
    },

    landmark: {
      type: String,
      default: "",
      trim: true,
    },

    latitude: {
      type: Number,
      required: true,
    },

    longitude: {
      type: Number,
      required: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Address =
  mongoose.models.Address || mongoose.model<IAddress>("Address", addressSchema);

export default Address;