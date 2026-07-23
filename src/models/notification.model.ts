import mongoose, {
  Document,
  Model,
  Schema,
  Types,
} from "mongoose";

export type NotificationType =
  | "order"
  | "delivery"
  | "payment"
  | "offer"
  | "wishlist"
  | "security";

export interface INotification
  extends Document {
  user: Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  order?: Types.ObjectId | null;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema =
  new Schema<INotification>(
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      title: {
        type: String,
        required: true,
        trim: true,
      },
      message: {
        type: String,
        required: true,
        trim: true,
      },
      type: {
        type: String,
        enum: [
          "order",
          "delivery",
          "payment",
          "offer",
          "wishlist",
          "security",
        ],
        default: "security",
      },
      order: {
        type: Schema.Types.ObjectId,
        ref: "Order",
        default: null,
      },
      isRead: {
        type: Boolean,
        default: false,
        index: true,
      },
    },
    {
      timestamps: true,
    }
  );

notificationSchema.index({
  user: 1,
  createdAt: -1,
});

const Notification: Model<INotification> =
  (mongoose.models.Notification as Model<INotification>) ||
  mongoose.model<INotification>(
    "Notification",
    notificationSchema
  );

export default Notification;
