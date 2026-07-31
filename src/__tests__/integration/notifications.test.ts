import {
  describe,
  expect,
  it,
} from "@jest/globals";
import request from "supertest";

import app from "../../app";
import Notification from "../../models/notification.model";
import NotificationPreference from "../../models/notificationPreference.model";
import User from "../../models/user.model";
import { generateToken } from "../../utils/generateToken";

const createCustomer = async (
  email = "customer@example.com"
): Promise<{ token: string; userId: string }> => {
  const user = await User.create({
    fullName: "Notification Customer",
    email,
    password: "Password123",
    phone: "9800000000",
    role: "user",
    status: "active",
  });

  return {
    token: generateToken(user.id),
    userId: user.id,
  };
};

describe("Notification settings API", () => {
  it("creates default settings for a customer", async () => {
    const customer = await createCustomer();

    const response = await request(app)
      .get("/api/v1/notifications/settings")
      .set(
        "Authorization",
        `Bearer ${customer.token}`
      )
      .expect(200);

    expect(response.body.success).toBe(true);

    expect(response.body.data).toMatchObject({
      emailNotifications: true,
      appNotifications: true,
      smsNotifications: false,
      orderUpdates: true,
      deliveryUpdates: true,
      paymentUpdates: true,
      offerAlerts: false,
      wishlistAlerts: true,
      securityAlerts: true,
    });

    expect(
      await NotificationPreference.countDocuments({
        user: customer.userId,
      })
    ).toBe(1);
  });

  it("updates notification settings and parses string boolean values", async () => {
    const customer = await createCustomer();

    const response = await request(app)
      .patch("/api/v1/notifications/settings")
      .set(
        "Authorization",
        `Bearer ${customer.token}`
      )
      .send({
        emailNotifications: "false",
        offerAlerts: "true",
        smsNotifications: 1,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message:
        "Notification settings updated successfully",
    });

    expect(response.body.data).toMatchObject({
      emailNotifications: false,
      offerAlerts: true,
      smsNotifications: true,
    });
  });

  it("rejects invalid notification setting values", async () => {
    const customer = await createCustomer();

    const response = await request(app)
      .patch("/api/v1/notifications/settings")
      .set(
        "Authorization",
        `Bearer ${customer.token}`
      )
      .send({
        emailNotifications: "sometimes",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message:
        "emailNotifications must be true or false",
    });
  });
});

describe("Notification inbox API", () => {
  it("lists customer notifications and reports unread count", async () => {
    const customer = await createCustomer();

    await Notification.create([
      {
        user: customer.userId,
        title: "First notification",
        message: "Unread message",
        type: "security",
        isRead: false,
      },
      {
        user: customer.userId,
        title: "Second notification",
        message: "Read message",
        type: "offer",
        isRead: true,
      },
    ]);

    const response = await request(app)
      .get("/api/v1/notifications")
      .set(
        "Authorization",
        `Bearer ${customer.token}`
      )
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.unreadCount).toBe(1);
  });

  it("marks one notification as read", async () => {
    const customer = await createCustomer();

    const notification = await Notification.create({
      user: customer.userId,
      title: "Unread notification",
      message: "Read this notification",
      type: "security",
      isRead: false,
    });

    const response = await request(app)
      .patch(
        `/api/v1/notifications/${notification.id}/read`
      )
      .set(
        "Authorization",
        `Bearer ${customer.token}`
      )
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.isRead).toBe(true);
  });

  it("does not allow a customer to read another customer's notification", async () => {
    const first = await createCustomer(
      "first@example.com"
    );

    const second = await createCustomer(
      "second@example.com"
    );

    const notification = await Notification.create({
      user: first.userId,
      title: "Private notification",
      message: "Only first customer can read",
      type: "security",
      isRead: false,
    });

    await request(app)
      .patch(
        `/api/v1/notifications/${notification.id}/read`
      )
      .set(
        "Authorization",
        `Bearer ${second.token}`
      )
      .expect(404);
  });

  it("marks all notifications as read and clears the inbox", async () => {
    const customer = await createCustomer();

    await Notification.create([
      {
        user: customer.userId,
        title: "Notification one",
        message: "Message one",
        type: "security",
        isRead: false,
      },
      {
        user: customer.userId,
        title: "Notification two",
        message: "Message two",
        type: "offer",
        isRead: false,
      },
    ]);

    const readAllResponse = await request(app)
      .patch("/api/v1/notifications/read-all")
      .set(
        "Authorization",
        `Bearer ${customer.token}`
      )
      .expect(200);

    expect(readAllResponse.body.success).toBe(true);

    expect(
      await Notification.countDocuments({
        user: customer.userId,
        isRead: false,
      })
    ).toBe(0);

    const clearResponse = await request(app)
      .delete("/api/v1/notifications/clear")
      .set(
        "Authorization",
        `Bearer ${customer.token}`
      )
      .expect(200);

    expect(clearResponse.body.success).toBe(true);

    expect(
      await Notification.countDocuments({
        user: customer.userId,
      })
    ).toBe(0);
  });
});
