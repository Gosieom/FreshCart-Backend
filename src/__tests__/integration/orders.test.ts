import {
  describe,
  expect,
  it,
} from "@jest/globals";
import request from "supertest";

import app from "../../app";
import Cart from "../../models/cart.model";
import Notification from "../../models/notification.model";
import Order from "../../models/order.model";
import Product from "../../models/product.model";
import User from "../../models/user.model";
import { generateToken } from "../../utils/generateToken";

const shippingAddress = {
  fullName: "Test Customer",
  phone: "9800000000",
  address: "Baneshwor",
  city: "Kathmandu",
  province: "Bagmati",
  landmark: "Near main road",
};

const createUserToken = async (
  role: "user" | "admin" = "user",
  email = `${role}@example.com`
): Promise<{
  token: string;
  userId: string;
}> => {
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

const createProduct = async (
  overrides: Record<string, unknown> = {}
) => {
  return Product.create({
    name: "Fresh Apple",
    description: "Fresh red apple",
    price: 100,
    category: "Fruits",
    stock: 10,
    unit: "kg",
    status: "active",
    ...overrides,
  });
};

/*
 * Do not add "async" to this helper.
 *
 * It must return the Supertest request object so tests can
 * continue chaining .expect(201), .expect(400), and so on.
 */
const placeOrder = ({
  token,
  productId,
  quantity = 2,
  paymentMethod = "cash_on_delivery",
}: {
  token: string;
  productId: string;
  quantity?: number;
  paymentMethod?: string;
}) =>
  request(app)
    .post("/api/v1/orders")
    .set(
      "Authorization",
      `Bearer ${token}`
    )
    .send({
      items: [
        {
          productId,
          quantity,
        },
      ],
      shippingAddress,
      paymentMethod,
      notes: "Leave at reception",
    });

describe("Customer order API", () => {
  it("rejects order creation without authentication", async () => {
    const response = await request(app)
      .post("/api/v1/orders")
      .send({
        items: [],
        shippingAddress,
      })
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      message:
        "Unauthorized. No token provided.",
    });
  });

  it("creates a cash-on-delivery order, reduces stock, clears the cart, and creates a notification", async () => {
    const { token, userId } =
      await createUserToken();

    const product = await createProduct();

    await Cart.create({
      user: userId,
      items: [
        {
          product: product._id,
          quantity: 2,
        },
      ],
    });

    const response = await placeOrder({
      token,
      productId: product.id,
      quantity: 2,
    }).expect(201);

    expect(response.body).toMatchObject({
      success: true,
      message: "Order placed successfully",
    });

    expect(response.body.order).toMatchObject({
      customerEmail: "user@example.com",
      subtotal: 200,
      deliveryFee: 50,
      totalAmount: 250,
      paymentMethod: "cash_on_delivery",
      paymentStatus: "pending",
      orderStatus: "pending",
    });

    expect(
      response.body.order.items
    ).toHaveLength(1);

    expect(
      response.body.order.items[0]
    ).toMatchObject({
      name: "Fresh Apple",
      quantity: 2,
      price: 100,
      total: 200,
    });

    const refreshedProduct =
      await Product.findById(product.id);

    expect(refreshedProduct?.stock).toBe(8);

    const cart = await Cart.findOne({
      user: userId,
    });

    expect(cart?.items).toHaveLength(0);

    const notifications =
      await Notification.find({
        user: userId,
        type: "order",
      });

    expect(notifications).toHaveLength(1);

    expect(notifications[0].title).toBe(
      "Order placed successfully"
    );
  });

  it("uses an active offer price when creating an order", async () => {
    const { token } =
      await createUserToken();

    const product = await createProduct({
      price: 200,
      isOffer: true,
      discountPercent: 25,
      offerPrice: 150,
      offerStartDate: new Date(
        Date.now() - 60_000
      ),
      offerEndDate: new Date(
        Date.now() + 60_000
      ),
    });

    const response = await placeOrder({
      token,
      productId: product.id,
      quantity: 2,
    }).expect(201);

    expect(response.body.order).toMatchObject({
      subtotal: 300,
      deliveryFee: 50,
      totalAmount: 350,
    });

    expect(
      response.body.order.items[0]
    ).toMatchObject({
      price: 150,
      quantity: 2,
      total: 300,
    });
  });

  it("rejects an order when stock is insufficient", async () => {
    const { token } =
      await createUserToken();

    const product = await createProduct({
      stock: 1,
    });

    const response = await placeOrder({
      token,
      productId: product.id,
      quantity: 2,
    }).expect(400);

    expect(response.body.success).toBe(false);

    expect(response.body.message).toContain(
      "Only 1 kg of Fresh Apple is available"
    );

    const refreshedProduct =
      await Product.findById(product.id);

    expect(refreshedProduct?.stock).toBe(1);
  });

  it("returns only the authenticated customer's orders", async () => {
    const firstUser =
      await createUserToken(
        "user",
        "first@example.com"
      );

    const secondUser =
      await createUserToken(
        "user",
        "second@example.com"
      );

    const firstProduct =
      await createProduct({
        name: "First Product",
      });

    const secondProduct =
      await createProduct({
        name: "Second Product",
      });

    await placeOrder({
      token: firstUser.token,
      productId: firstProduct.id,
      quantity: 1,
    }).expect(201);

    await placeOrder({
      token: secondUser.token,
      productId: secondProduct.id,
      quantity: 1,
    }).expect(201);

    const response = await request(app)
      .get("/api/v1/orders/my-orders")
      .set(
        "Authorization",
        `Bearer ${firstUser.token}`
      )
      .expect(200);

    expect(response.body.success).toBe(true);

    expect(
      response.body.data
    ).toHaveLength(1);

    expect(
      response.body.data[0].customerEmail
    ).toBe("first@example.com");
  });

  it("prevents one customer from opening another customer's order", async () => {
    const firstUser =
      await createUserToken(
        "user",
        "owner@example.com"
      );

    const secondUser =
      await createUserToken(
        "user",
        "other@example.com"
      );

    const product = await createProduct();

    const createResponse =
      await placeOrder({
        token: firstUser.token,
        productId: product.id,
        quantity: 1,
      }).expect(201);

    const orderId =
      createResponse.body.order.id;

    const response = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set(
        "Authorization",
        `Bearer ${secondUser.token}`
      )
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      message: "Order not found",
    });
  });

  it("cancels an eligible order and restores product stock", async () => {
    const { token } =
      await createUserToken();

    const product = await createProduct({
      stock: 5,
    });

    const createResponse =
      await placeOrder({
        token,
        productId: product.id,
        quantity: 2,
      }).expect(201);

    const stockAfterOrder =
      await Product.findById(product.id);

    expect(stockAfterOrder?.stock).toBe(3);

    const response = await request(app)
      .patch(
        `/api/v1/orders/${createResponse.body.order.id}/cancel`
      )
      .set(
        "Authorization",
        `Bearer ${token}`
      )
      .send({
        reason: "Ordered by mistake",
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message:
        "Order cancelled successfully",
    });

    expect(
      response.body.order.orderStatus
    ).toBe("cancelled");

    const stockAfterCancellation =
      await Product.findById(product.id);

    expect(
      stockAfterCancellation?.stock
    ).toBe(5);
  });

  it("requires a meaningful cancellation reason", async () => {
    const { token } =
      await createUserToken();

    const product = await createProduct();

    const createResponse =
      await placeOrder({
        token,
        productId: product.id,
        quantity: 1,
      }).expect(201);

    const response = await request(app)
      .patch(
        `/api/v1/orders/${createResponse.body.order.id}/cancel`
      )
      .set(
        "Authorization",
        `Bearer ${token}`
      )
      .send({
        reason: "bad",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message:
        "Cancellation reason must be at least 5 characters",
    });
  });

  it("adds available items from an earlier order back into the cart", async () => {
    const { token, userId } =
      await createUserToken();

    const product = await createProduct({
      stock: 10,
    });

    const createResponse =
      await placeOrder({
        token,
        productId: product.id,
        quantity: 2,
      }).expect(201);

    const response = await request(app)
      .post(
        `/api/v1/orders/${createResponse.body.order.id}/reorder`
      )
      .set(
        "Authorization",
        `Bearer ${token}`
      )
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message:
        "Available products added to cart",
    });

    expect(
      response.body.data.addedItems
    ).toHaveLength(1);

    const cart = await Cart.findOne({
      user: userId,
    });

    expect(cart?.items).toHaveLength(1);

    expect(
      cart?.items[0].quantity
    ).toBe(2);
  });

  it("clears order history without deleting the stored order", async () => {
    const { token, userId } =
      await createUserToken();

    const product = await createProduct();

    await placeOrder({
      token,
      productId: product.id,
      quantity: 1,
    }).expect(201);

    const clearResponse =
      await request(app)
        .delete(
          "/api/v1/orders/clear-history"
        )
        .set(
          "Authorization",
          `Bearer ${token}`
        )
        .expect(200);

    expect(clearResponse.body).toMatchObject({
      success: true,
      message:
        "Order history cleared successfully",
    });

    const visibleResponse =
      await request(app)
        .get("/api/v1/orders/my-orders")
        .set(
          "Authorization",
          `Bearer ${token}`
        )
        .expect(200);

    expect(
      visibleResponse.body.data
    ).toEqual([]);

    const storedOrder =
      await Order.findOne({
        user: userId,
      });

    expect(storedOrder).not.toBeNull();

    expect(
      storedOrder?.hiddenFromCustomer
    ).toBe(true);
  });
});

describe("Admin order API", () => {
  it("rejects a regular customer from admin order routes", async () => {
    const { token } =
      await createUserToken();

    const response = await request(app)
      .get("/api/v1/admin/orders")
      .set(
        "Authorization",
        `Bearer ${token}`
      )
      .expect(403);

    expect(response.body).toMatchObject({
      message: "Admin access only",
    });
  });

  it("allows an administrator to list, update, and delete orders", async () => {
    const customer =
      await createUserToken(
        "user",
        "customer@example.com"
      );

    const admin =
      await createUserToken(
        "admin",
        "admin@example.com"
      );

    const product = await createProduct();

    const createResponse =
      await placeOrder({
        token: customer.token,
        productId: product.id,
        quantity: 1,
      }).expect(201);

    const orderId =
      createResponse.body.order.id;

    const listResponse =
      await request(app)
        .get(
          "/api/v1/admin/orders?status=pending&page=1&limit=5"
        )
        .set(
          "Authorization",
          `Bearer ${admin.token}`
        )
        .expect(200);

    expect(
      listResponse.body.data
    ).toHaveLength(1);

    expect(
      listResponse.body.meta
    ).toMatchObject({
      page: 1,
      limit: 5,
      total: 1,
      totalPages: 1,
    });

    const updateResponse =
      await request(app)
        .patch(
          `/api/v1/admin/orders/${orderId}/status`
        )
        .set(
          "Authorization",
          `Bearer ${admin.token}`
        )
        .send({
          orderStatus: "confirmed",
          paymentStatus: "paid",
        })
        .expect(200);

    expect(
      updateResponse.body
    ).toMatchObject({
      success: true,
      message:
        "Order updated successfully",
    });

    expect(
      updateResponse.body.order
    ).toMatchObject({
      orderStatus: "confirmed",
      paymentStatus: "paid",
    });

    const customerNotifications =
      await Notification.find({
        user: customer.userId,
      });

    expect(
      customerNotifications.length
    ).toBeGreaterThanOrEqual(2);

    const deleteResponse =
      await request(app)
        .delete(
          `/api/v1/admin/orders/${orderId}`
        )
        .set(
          "Authorization",
          `Bearer ${admin.token}`
        )
        .expect(200);

    expect(
      deleteResponse.body
    ).toMatchObject({
      success: true,
      message:
        "Order deleted successfully",
    });

    expect(
      await Order.findById(orderId)
    ).toBeNull();
  });

  it("validates admin order filters and status updates", async () => {
    const admin =
      await createUserToken(
        "admin",
        "admin@example.com"
      );

    const invalidFilterResponse =
      await request(app)
        .get(
          "/api/v1/admin/orders?status=not-valid"
        )
        .set(
          "Authorization",
          `Bearer ${admin.token}`
        )
        .expect(400);

    expect(
      invalidFilterResponse.body
    ).toMatchObject({
      success: false,
      message:
        "Invalid order status filter",
    });

    const invalidIdResponse =
      await request(app)
        .patch(
          "/api/v1/admin/orders/not-an-id/status"
        )
        .set(
          "Authorization",
          `Bearer ${admin.token}`
        )
        .send({
          orderStatus: "delivered",
        })
        .expect(400);

    expect(
      invalidIdResponse.body
    ).toMatchObject({
      success: false,
      message: "Invalid order id",
    });
  });
});