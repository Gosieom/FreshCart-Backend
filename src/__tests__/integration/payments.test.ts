import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import request from "supertest";

jest.mock("../../services/esewa.service", () => ({
  checkEsewaTransactionStatus: jest.fn(),
}));

import app from "../../app";
import Cart from "../../models/cart.model";
import Order from "../../models/order.model";
import Product from "../../models/product.model";
import User from "../../models/user.model";
import {
  checkEsewaTransactionStatus,
} from "../../services/esewa.service";
import { generateToken } from "../../utils/generateToken";

const mockedStatusCheck =
  checkEsewaTransactionStatus as jest.MockedFunction<
    typeof checkEsewaTransactionStatus
  >;

const createCustomer = async () => {
  const user = await User.create({
    fullName: "Payment Customer",
    email: "payment@example.com",
    password: "Password123",
    phone: "9800000000",
    role: "user",
    status: "active",
  });

  return {
    user,
    token: generateToken(user.id),
  };
};

const createOrder = async ({
  userId,
  productId,
  paymentMethod = "cash_on_delivery",
  paymentStatus = "pending",
  orderStatus = "pending",
  transactionUuid = "",
}: {
  userId: string;
  productId: string;
  paymentMethod?: "cash_on_delivery" | "esewa" | "online";
  paymentStatus?: "pending" | "paid" | "failed" | "refunded";
  orderStatus?: "pending" | "confirmed" | "packed" | "out_for_delivery" | "delivered" | "cancelled";
  transactionUuid?: string;
}) => {
  return Order.create({
    orderNumber: `FC-PAY-${Date.now()}-${Math.floor(
      Math.random() * 10000
    )}`,
    user: userId,
    customerName: "Payment Customer",
    customerEmail: "payment@example.com",
    customerPhone: "9800000000",
    items: [
      {
        product: productId,
        name: "Payment Product",
        image: "",
        category: "Other",
        unit: "piece",
        price: 100,
        quantity: 2,
        total: 200,
      },
    ],
    shippingAddress: {
      fullName: "Payment Customer",
      phone: "9800000000",
      address: "Kathmandu",
      city: "Kathmandu",
    },
    subtotal: 200,
    deliveryFee: 50,
    totalAmount: 250,
    paymentMethod,
    paymentStatus,
    orderStatus,
    transactionUuid,
  });
};

describe("eSewa payment API", () => {
  beforeEach(() => {
    mockedStatusCheck.mockReset();
  });

  it("initiates an eSewa payment for an eligible customer order", async () => {
    const customer = await createCustomer();

    const product = await Product.create({
      name: "Payment Product",
      description: "",
      price: 100,
      category: "Other",
      stock: 10,
      unit: "piece",
      status: "active",
    });

    const order = await createOrder({
      userId: customer.user.id,
      productId: product.id,
    });

    const response = await request(app)
      .post("/api/v1/payments/esewa/initiate")
      .set(
        "Authorization",
        `Bearer ${customer.token}`
      )
      .send({
        orderId: order.id,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "eSewa payment initiated",
    });

    expect(response.body.formData).toMatchObject({
      amount: "250.00",
      total_amount: "250.00",
      product_code: "EPAYTEST",
      signed_field_names:
        "total_amount,transaction_uuid,product_code",
    });

    expect(
      typeof response.body.formData.signature
    ).toBe("string");

    const savedOrder = await Order.findById(order.id);
    expect(savedOrder?.paymentMethod).toBe("esewa");
    expect(savedOrder?.transactionUuid).toBeTruthy();
  });

  it("rejects payment initiation for another customer's order", async () => {
    const owner = await createCustomer();

    const other = await User.create({
      fullName: "Other Customer",
      email: "other-payment@example.com",
      password: "Password123",
      role: "user",
      status: "active",
    });

    const product = await Product.create({
      name: "Payment Product",
      price: 100,
      category: "Other",
      stock: 10,
      unit: "piece",
      status: "active",
    });

    const order = await createOrder({
      userId: other.id,
      productId: product.id,
    });

    await request(app)
      .post("/api/v1/payments/esewa/initiate")
      .set(
        "Authorization",
        `Bearer ${owner.token}`
      )
      .send({
        orderId: order.id,
      })
      .expect(404);
  });

  it("verifies a complete eSewa transaction and clears the cart", async () => {
    const customer = await createCustomer();

    const product = await Product.create({
      name: "Payment Product",
      price: 100,
      category: "Other",
      stock: 10,
      unit: "piece",
      status: "active",
    });

    const transactionUuid = "TXN-TEST-123";

    const order = await createOrder({
      userId: customer.user.id,
      productId: product.id,
      paymentMethod: "esewa",
      transactionUuid,
    });

    await Cart.create({
      user: customer.user.id,
      items: [
        {
          product: product._id,
          quantity: 1,
        },
      ],
    });

    mockedStatusCheck.mockResolvedValue({
      productCode: "EPAYTEST",
      transactionUuid,
      totalAmount: 250,
      status: "COMPLETE",
      referenceId: "REF-123",
      raw: {},
    });

    const response = await request(app)
      .post("/api/v1/payments/esewa/verify")
      .set(
        "Authorization",
        `Bearer ${customer.token}`
      )
      .send({
        orderId: order.id,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "eSewa payment verified",
    });

    expect(response.body.order).toMatchObject({
      paymentStatus: "paid",
      orderStatus: "confirmed",
      esewaTransactionCode: "REF-123",
    });

    const cart = await Cart.findOne({
      user: customer.user.id,
    });

    expect(cart?.items).toHaveLength(0);
  });

  it("rejects mismatched verification details", async () => {
    const customer = await createCustomer();

    const product = await Product.create({
      name: "Payment Product",
      price: 100,
      category: "Other",
      stock: 10,
      unit: "piece",
      status: "active",
    });

    const order = await createOrder({
      userId: customer.user.id,
      productId: product.id,
      paymentMethod: "esewa",
      transactionUuid: "TXN-EXPECTED",
    });

    mockedStatusCheck.mockResolvedValue({
      productCode: "EPAYTEST",
      transactionUuid: "TXN-WRONG",
      totalAmount: 250,
      status: "COMPLETE",
      referenceId: "REF-123",
      raw: {},
    });

    const response = await request(app)
      .post("/api/v1/payments/esewa/verify")
      .set(
        "Authorization",
        `Bearer ${customer.token}`
      )
      .send({
        orderId: order.id,
      })
      .expect(400);

    expect(response.body.message).toBe(
      "eSewa verification details do not match this order"
    );
  });

  it("marks a failed eSewa payment as cancelled and restores stock only once", async () => {
    const customer = await createCustomer();

    const product = await Product.create({
      name: "Payment Product",
      price: 100,
      category: "Other",
      stock: 3,
      unit: "piece",
      status: "active",
    });

    const order = await createOrder({
      userId: customer.user.id,
      productId: product.id,
      paymentMethod: "esewa",
      transactionUuid: "TXN-FAIL",
    });

    const firstResponse = await request(app)
      .post("/api/v1/payments/esewa/failure")
      .set(
        "Authorization",
        `Bearer ${customer.token}`
      )
      .send({
        orderId: order.id,
        reason: "Customer cancelled payment",
      })
      .expect(200);

    expect(firstResponse.body.order).toMatchObject({
      paymentStatus: "failed",
      orderStatus: "cancelled",
    });

    expect(
      (await Product.findById(product.id))?.stock
    ).toBe(5);

    await request(app)
      .post("/api/v1/payments/esewa/failure")
      .set(
        "Authorization",
        `Bearer ${customer.token}`
      )
      .send({
        orderId: order.id,
        reason: "Retry",
      })
      .expect(200);

    expect(
      (await Product.findById(product.id))?.stock
    ).toBe(5);
  });
});
