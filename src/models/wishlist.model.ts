import mongoose, { Schema, Document, Types } from "mongoose";

type WishlistDocument = Document & {
  user: Types.ObjectId;
  products: Types.ObjectId[];
};

const wishlistSchema = new Schema<WishlistDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    products: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<WishlistDocument>("Wishlist", wishlistSchema);
