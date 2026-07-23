import mongoose, {
  Document,
  Model,
  Schema,
} from "mongoose";
export type ProductStatus = "active" | "inactive";

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  unit: string;
  image: string;
  status: ProductStatus;
  isOffer: boolean;
  discountPercent: number;
  offerPrice: number;
  offerLabel: string;
  offerStartDate?: Date | null;
  offerEndDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },

    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },

    stock: {
      type: Number,
      required: [true, "Stock is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },

    unit: {
      type: String,
      default: "piece",
      trim: true,
    },

    image: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    isOffer: {
      type: Boolean,
      default: false,
    },

    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 99,
    },

    offerPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    offerLabel: {
      type: String,
      default: "",
      trim: true,
    },

    offerStartDate: {
      type: Date,
      default: null,
    },

    offerEndDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Product: Model<IProduct> =
  (mongoose.models.Product as Model<IProduct>) ||
  mongoose.model<IProduct>(
    "Product",
    productSchema,
  );

export default Product;