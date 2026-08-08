import {
  describe,
  expect,
  it,
} from "@jest/globals";
import request from "supertest";

import app from "../../app";
import Banner from "../../models/banner.model";
import Order from "../../models/order.model";
import Product from "../../models/product.model";
import User from "../../models/user.model";
import { generateToken } from "../../utils/generateToken";

const createTokenForRole = async (
  role: "user" | "admin",
  email = `${role}@example.com`
): Promise<{ token: string; userId: string }> => {
  const user = await User.create({
    fullName:
      role === "admin"
        ? "Test Administrator"
        : "Test Customer",
    email,
    password: "Password123",
    phone: "9800000000",
    role,
    status: "active",
  });

  return {
    token: generateToken(user.id),
    userId: user.id,
  };
};

describe("Admin user management API", () => {
  it("rejects unauthenticated access", async () => {
    await request(app)
      .get("/api/v1/admin/users")
      .expect(401);
  });

  it("allows an administrator to create, retrieve, update, search, and delete a user", async () => {
    const admin = await createTokenForRole(
      "admin",
      "admin@example.com"
    );

    const createResponse = await request(app)
      .post("/api/v1/admin/users")
      .set(
        "Authorization",
        `Bearer ${admin.token}`
      )
      .send({
        fullName: "Created Customer",
        email: "created@example.com",
        password: "Password123",
        role: "user",
        status: "active",
        phone: "9811111111",
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      message: "User created successfully",
    });

    expect(createResponse.body.data).toMatchObject({
      fullName: "Created Customer",
      email: "created@example.com",
      role: "user",
      status: "active",
      phone: "9811111111",
    });

    expect(
      createResponse.body.data.password
    ).toBeUndefined();

    const userId = createResponse.body.data.id;

    const getResponse = await request(app)
      .get(`/api/v1/admin/users/${userId}`)
      .set(
        "Authorization",
        `Bearer ${admin.token}`
      )
      .expect(200);

    expect(getResponse.body.data.id).toBe(userId);

    const updateResponse = await request(app)
      .patch(`/api/v1/admin/users/${userId}`)
      .set(
        "Authorization",
        `Bearer ${admin.token}`
      )
      .send({
        fullName: "Updated Customer",
        role: "admin",
        status: "inactive",
      })
      .expect(200);

    expect(updateResponse.body).toMatchObject({
      message: "User updated successfully",
    });

    expect(updateResponse.body.data).toMatchObject({
      id: userId,
      fullName: "Updated Customer",
      role: "admin",
      status: "inactive",
    });

    const searchResponse = await request(app)
      .get(
        "/api/v1/admin/users?search=updated&page=1&limit=5"
      )
      .set(
        "Authorization",
        `Bearer ${admin.token}`
      )
      .expect(200);

    expect(searchResponse.body.data).toHaveLength(1);
    expect(searchResponse.body.meta.total).toBe(1);

    const product = await Product.create({
      name: "Cascade Delete Product",
      description: "Product used to verify user order cleanup",
      price: 100,
      category: "Other",
      stock: 10,
      unit: "piece",
      status: "active",
    });

    await Order.create({
      orderNumber: "FC-DELETE-USER-0001",
      user: userId,
      customerName: "Updated Customer",
      customerEmail: "created@example.com",
      customerPhone: "9811111111",
      items: [
        {
          product: product._id,
          name: product.name,
          image: "",
          category: product.category,
          unit: product.unit,
          price: 100,
          quantity: 1,
          total: 100,
        },
      ],
      shippingAddress: {
        fullName: "Updated Customer",
        phone: "9811111111",
        address: "Kathmandu",
        city: "Kathmandu",
      },
      subtotal: 100,
      deliveryFee: 50,
      totalAmount: 150,
      paymentMethod: "cash_on_delivery",
      paymentStatus: "pending",
      orderStatus: "pending",
    });

    expect(await Order.countDocuments({ user: userId })).toBe(1);

    const deleteResponse = await request(app)
      .delete(`/api/v1/admin/users/${userId}`)
      .set(
        "Authorization",
        `Bearer ${admin.token}`
      )
      .expect(200);

    expect(deleteResponse.body).toMatchObject({
      message: "User deleted successfully",
      deletedOrders: 1,
    });

    expect(await User.findById(userId)).toBeNull();
    expect(await Order.countDocuments({ user: userId })).toBe(0);
  });

  it("rejects duplicate emails and invalid role values", async () => {
    const admin = await createTokenForRole(
      "admin",
      "admin@example.com"
    );

    await User.create({
      fullName: "Existing User",
      email: "existing@example.com",
      password: "Password123",
      role: "user",
      status: "active",
    });

    const duplicateResponse = await request(app)
      .post("/api/v1/admin/users")
      .set(
        "Authorization",
        `Bearer ${admin.token}`
      )
      .send({
        fullName: "Duplicate User",
        email: "existing@example.com",
        password: "Password123",
      })
      .expect(409);

    expect(duplicateResponse.body.message).toBe(
      "Email already exists"
    );

    const invalidRoleResponse = await request(app)
      .post("/api/v1/admin/users")
      .set(
        "Authorization",
        `Bearer ${admin.token}`
      )
      .send({
        fullName: "Invalid Role",
        email: "invalid-role@example.com",
        password: "Password123",
        role: "manager",
      })
      .expect(400);

    expect(invalidRoleResponse.body.message).toBe(
      "Invalid role"
    );
  });
});

describe("Admin dashboard API", () => {
  it("returns aggregated dashboard statistics", async () => {
    const admin = await createTokenForRole(
      "admin",
      "admin@example.com"
    );

    const customer = await User.create({
      fullName: "Dashboard Customer",
      email: "dashboard@example.com",
      password: "Password123",
      role: "user",
      status: "active",
    });

    const product = await Product.create({
      name: "Low Stock Product",
      description: "Dashboard product",
      price: 100,
      category: "Other",
      stock: 3,
      unit: "piece",
      status: "active",
    });

    await Order.create({
      orderNumber: "FC-TEST-0001",
      user: customer._id,
      customerName: customer.fullName,
      customerEmail: customer.email,
      customerPhone: "",
      items: [
        {
          product: product._id,
          name: product.name,
          image: "",
          category: product.category,
          unit: product.unit,
          price: 100,
          quantity: 1,
          total: 100,
        },
      ],
      shippingAddress: {
        fullName: customer.fullName,
        phone: "9800000000",
        address: "Kathmandu",
        city: "Kathmandu",
      },
      subtotal: 100,
      deliveryFee: 50,
      totalAmount: 150,
      paymentMethod: "cash_on_delivery",
      paymentStatus: "pending",
      orderStatus: "pending",
    });

    const response = await request(app)
      .get("/api/v1/admin/dashboard")
      .set(
        "Authorization",
        `Bearer ${admin.token}`
      )
      .expect(200);

    expect(response.body.data).toMatchObject({
      totalUsers: 2,
      adminUsers: 1,
      activeUsers: 2,
      totalProducts: 1,
      activeProducts: 1,
      lowStockProducts: 1,
      totalOrders: 1,
      pendingOrders: 1,
      totalRevenue: 150,
    });

    expect(response.body.data.recentUsers.length).toBeGreaterThan(
      0
    );

    expect(response.body.data.recentOrders).toHaveLength(
      1
    );
  });
});

describe("Offer and banner APIs", () => {
  it("allows an admin to apply and remove an offer and exposes active offers publicly", async () => {
    const admin = await createTokenForRole(
      "admin",
      "admin@example.com"
    );

    const product = await Product.create({
      name: "Offer Product",
      description: "Discounted product",
      price: 200,
      category: "Other",
      stock: 10,
      unit: "piece",
      status: "active",
    });

    const updateResponse = await request(app)
      .patch(
        `/api/v1/admin/offers/${product.id}`
      )
      .set(
        "Authorization",
        `Bearer ${admin.token}`
      )
      .send({
        isOffer: true,
        discountPercent: 25,
        offerLabel: "Quarter off",
        offerStartDate: new Date(
          Date.now() - 60_000
        ).toISOString(),
        offerEndDate: new Date(
          Date.now() + 60_000
        ).toISOString(),
      })
      .expect(200);

    expect(updateResponse.body).toMatchObject({
      success: true,
      message: "Product offer updated successfully",
    });

    expect(updateResponse.body.data).toMatchObject({
      id: product.id,
      isOffer: true,
      discountPercent: 25,
      offerPrice: 150,
      offerLabel: "Quarter off",
    });

    const publicResponse = await request(app)
      .get("/api/v1/offers")
      .expect(200);

    expect(publicResponse.body.data).toHaveLength(1);
    expect(publicResponse.body.data[0].id).toBe(
      product.id
    );

    const removeResponse = await request(app)
      .patch(
        `/api/v1/admin/offers/${product.id}/remove`
      )
      .set(
        "Authorization",
        `Bearer ${admin.token}`
      )
      .expect(200);

    expect(removeResponse.body).toMatchObject({
      success: true,
      message: "Offer removed successfully",
    });

    expect(removeResponse.body.data).toMatchObject({
      isOffer: false,
      discountPercent: 0,
      offerPrice: 0,
    });
  });

  it("returns only active public banners and supports admin banner listing", async () => {
    const admin = await createTokenForRole(
      "admin",
      "admin@example.com"
    );

    await Banner.create([
      {
        title: "Active Home Banner",
        subtitle: "Visible",
        position: "home_hero",
        isActive: true,
        sortOrder: 1,
      },
      {
        title: "Inactive Home Banner",
        subtitle: "Hidden",
        position: "home_hero",
        isActive: false,
        sortOrder: 2,
      },
    ]);

    const publicResponse = await request(app)
      .get(
        "/api/v1/banners?position=home_hero"
      )
      .expect(200);

    expect(publicResponse.body.data).toHaveLength(1);
    expect(publicResponse.body.data[0].title).toBe(
      "Active Home Banner"
    );

    const adminResponse = await request(app)
      .get("/api/v1/admin/banners")
      .set(
        "Authorization",
        `Bearer ${admin.token}`
      )
      .expect(200);

    expect(adminResponse.body.data).toHaveLength(2);
  });
});
