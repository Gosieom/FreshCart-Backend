import mongoose, { Document, Schema } from "mongoose";

export type BannerPosition = "home_hero" | "offers_hero" | "category_top";

export interface IBanner extends Document {
  title: string;
  subtitle: string;
  image: string;
  position: BannerPosition;
  buttonText: string;
  link: string;
  backgroundColor: string;
  textColor: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<IBanner>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    subtitle: {
      type: String,
      default: "",
      trim: true,
    },

    image: {
      type: String,
      default: "",
    },

    position: {
      type: String,
      enum: ["home_hero", "offers_hero", "category_top"],
      default: "home_hero",
    },

    buttonText: {
      type: String,
      default: "Shop now",
      trim: true,
    },

    link: {
      type: String,
      default: "/user/grocery",
      trim: true,
    },

    backgroundColor: {
      type: String,
      default: "#0f7f3b",
      trim: true,
    },

    textColor: {
      type: String,
      default: "#ffffff",
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

const Banner =
  mongoose.models.Banner || mongoose.model<IBanner>("Banner", bannerSchema);

export default Banner;