import mongoose, {
  Document,
  Model,
  Schema,
  Types,
} from "mongoose";

export type CartItemDocument = {
  product: Types.ObjectId;
  quantity: number;
};

export interface ICart extends Document {
  user: Types.ObjectId;
  items: CartItemDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema =
  new Schema<CartItemDocument>(
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },

      quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1,
      },
    },
    {
      _id: false,
    },
  );

const cartSchema = new Schema<ICart>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

/*
 * Explicit Model<ICart> typing prevents TypeScript
 * from treating mongoose.models.Cart as Model<any>.
 */
const Cart: Model<ICart> =
  (mongoose.models.Cart as Model<ICart>) ||
  mongoose.model<ICart>(
    "Cart",
    cartSchema,
  );

export default Cart;