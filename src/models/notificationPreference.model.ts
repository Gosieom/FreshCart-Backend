import mongoose, { Document, Schema, Types } from "mongoose";

export interface INotificationPreference extends Document {
  user: Types.ObjectId;
  emailNotifications: boolean;
  appNotifications: boolean;
  smsNotifications: boolean;
  orderUpdates: boolean;
  deliveryUpdates: boolean;
  paymentUpdates: boolean;
  offerAlerts: boolean;
  wishlistAlerts: boolean;
  securityAlerts: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationPreferenceSchema = new Schema<INotificationPreference>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    emailNotifications: {
      type: Boolean,
      default: true,
    },

    appNotifications: {
      type: Boolean,
      default: true,
    },

    smsNotifications: {
      type: Boolean,
      default: false,
    },

    orderUpdates: {
      type: Boolean,
      default: true,
    },

    deliveryUpdates: {
      type: Boolean,
      default: true,
    },

    paymentUpdates: {
      type: Boolean,
      default: true,
    },

    offerAlerts: {
      type: Boolean,
      default: false,
    },

    wishlistAlerts: {
      type: Boolean,
      default: true,
    },

    securityAlerts: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const NotificationPreference =
  mongoose.models.NotificationPreference ||
  mongoose.model<INotificationPreference>(
    "NotificationPreference",
    notificationPreferenceSchema
  );

export default NotificationPreference;