import {
  describe,
  expect,
  it,
} from "@jest/globals";
import request from "supertest";

import app from "../../app";
import Product from "../../models/product.model";
import User from "../../models/user.model";
import { generateToken } from "../../utils/generateToken";

const createCustomer = async (
  email = "customer@example.com"
): Promise<string> => {
  const user = await User.create({
    fullName: "Test Customer",
    email,
    password: "Password123",
    phone: "9800000000",
    role: "user",
    status: "active",
  });

  return generateToken(user.id);
};

const createActiveProduct = async (
  overrides: Record<string, unknown> = {}
) => {
  return Product.create({
    name: "Fresh Apple",
    description: "Fresh red apples",
    price: 100,
    category: "Fruits",
    stock: 5,
    unit: "kg",
    status: "active",
    ...overrides,
  });
};

describe("Protected customer feature APIs", () => {
  it("rejects cart, wishlist, and address requests without authentication", async () => {
    const cartResponse = await request(app)
      .get("/api/v1/cart")
      .expect(401);

    expect(cartResponse.body).toMatchObject({
      success: false,
      message: "Unauthorized. No token provided.",
    });

    const wishlistResponse = await request(app)
      .get("/api/v1/wishlist")
      .expect(401);

    expect(wishlistResponse.body).toMatchObject({
      success: false,
      message: "Unauthorized. No token provided.",
    });

    const addressResponse = await request(app)
      .get("/api/v1/addresses")
      .expect(401);

    expect(addressResponse.body).toMatchObject({
      success: false,
      message: "Unauthorized. No token provided.",
    });
  });
});

describe("Cart API", () => {
  it("adds a product and returns calculated cart totals", async () => {
    const token = await createCustomer();
    const product = await createActiveProduct();

    const response = await request(app)
      .post("/api/v1/cart/items")
      .set("Authorization", `Bearer ${token}`)
      .send({
        productId: product.id,
        quantity: 2,
      })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Cart updated",
    });

    expect(response.body.data).toMatchObject({
      totalItems: 2,
      subtotal: 200,
      deliveryFee: 50,
      totalAmount: 250,
    });

    expect(response.body.data.items).toHaveLength(1);

    expect(
      response.body.data.items[0]
    ).toMatchObject({
      quantity: 2,
      lineTotal: 200,
    });

    expect(
      response.body.data.items[0].product
    ).toMatchObject({
      id: product.id,
      name: "Fresh Apple",
      price: 100,
      stock: 5,
    });

    const getResponse = await request(app)
      .get("/api/v1/cart")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(getResponse.body.data).toMatchObject({
      totalItems: 2,
      subtotal: 200,
      deliveryFee: 50,
      totalAmount: 250,
    });
  });

  it("limits quantity to available stock and supports updating and clearing the cart", async () => {
    const token = await createCustomer();
    const product = await createActiveProduct({
      stock: 4,
    });

    const addResponse = await request(app)
      .post("/api/v1/cart/items")
      .set("Authorization", `Bearer ${token}`)
      .send({
        productId: product.id,
        quantity: 20,
      })
      .expect(200);

    expect(
      addResponse.body.data.items[0].quantity
    ).toBe(4);

    const updateResponse = await request(app)
      .patch(`/api/v1/cart/items/${product.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        quantity: 3,
      })
      .expect(200);

    expect(updateResponse.body).toMatchObject({
      success: true,
      message: "Cart updated",
    });

    expect(
      updateResponse.body.data.items[0].quantity
    ).toBe(3);

    expect(
      updateResponse.body.data.totalItems
    ).toBe(3);

    const clearResponse = await request(app)
      .delete("/api/v1/cart")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(clearResponse.body).toMatchObject({
      success: true,
      message: "Cart cleared",
      data: {
        items: [],
        totalItems: 0,
        subtotal: 0,
        deliveryFee: 0,
        totalAmount: 0,
      },
    });
  });

  it("removes a cart item when its quantity is changed to zero", async () => {
    const token = await createCustomer();
    const product = await createActiveProduct();

    await request(app)
      .post("/api/v1/cart/items")
      .set("Authorization", `Bearer ${token}`)
      .send({
        productId: product.id,
        quantity: 2,
      })
      .expect(200);

    const response = await request(app)
      .patch(`/api/v1/cart/items/${product.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        quantity: 0,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Product removed from cart",
    });

    expect(response.body.data.items).toEqual([]);
    expect(response.body.data.totalItems).toBe(0);
  });

  it("rejects an invalid cart product id", async () => {
    const token = await createCustomer();

    const response = await request(app)
      .post("/api/v1/cart/items")
      .set("Authorization", `Bearer ${token}`)
      .send({
        productId: "invalid-product-id",
        quantity: 1,
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: "Invalid product id",
    });
  });
});

describe("Wishlist API", () => {
  it("adds, retrieves, prevents duplicates, and removes a wishlist product", async () => {
    const token = await createCustomer();
    const product = await createActiveProduct();

    const firstAddResponse = await request(app)
      .post(`/api/v1/wishlist/${product.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(firstAddResponse.body).toMatchObject({
      success: true,
      message: "Product added to wishlist",
    });

    expect(firstAddResponse.body.data).toHaveLength(1);

    await request(app)
      .post(`/api/v1/wishlist/${product.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const getResponse = await request(app)
      .get("/api/v1/wishlist")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(getResponse.body.data).toHaveLength(1);

    expect(getResponse.body.data[0]).toMatchObject({
      id: product.id,
      name: "Fresh Apple",
      price: 100,
      status: "active",
    });

    const removeResponse = await request(app)
      .delete(`/api/v1/wishlist/${product.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(removeResponse.body).toMatchObject({
      success: true,
      message: "Product removed from wishlist",
      data: [],
    });
  });

  it("rejects an inactive wishlist product", async () => {
    const token = await createCustomer();

    const product = await createActiveProduct({
      name: "Inactive Product",
      status: "inactive",
    });

    const response = await request(app)
      .post(`/api/v1/wishlist/${product.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      message: "Product not found or inactive",
    });
  });
});

describe("Address API", () => {
  it("validates required address coordinates", async () => {
    const token = await createCustomer();

    const response = await request(app)
      .post("/api/v1/addresses")
      .set("Authorization", `Bearer ${token}`)
      .send({
        label: "Home",
        fullAddress: "Kathmandu, Nepal",
        latitude: "invalid",
        longitude: 85.324,
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message:
        "Valid latitude and longitude are required",
    });
  });

  it("creates, updates, selects, lists, and deletes customer addresses", async () => {
    const token = await createCustomer();

    const firstAddressResponse = await request(app)
      .post("/api/v1/addresses")
      .set("Authorization", `Bearer ${token}`)
      .send({
        label: "Home",
        fullAddress: "Baneshwor, Kathmandu",
        city: "Kathmandu",
        province: "Bagmati",
        landmark: "Near the main road",
        latitude: 27.6915,
        longitude: 85.342,
        isDefault: false,
      })
      .expect(201);

    expect(firstAddressResponse.body).toMatchObject({
      success: true,
      message: "Address saved successfully",
    });

    expect(firstAddressResponse.body.data).toMatchObject({
      label: "Home",
      fullAddress: "Baneshwor, Kathmandu",
      isDefault: true,
    });

    const firstAddressId =
      firstAddressResponse.body.data.id;

    const secondAddressResponse = await request(app)
      .post("/api/v1/addresses")
      .set("Authorization", `Bearer ${token}`)
      .send({
        label: "Work",
        fullAddress: "Thamel, Kathmandu",
        city: "Kathmandu",
        province: "Bagmati",
        latitude: 27.7172,
        longitude: 85.324,
        isDefault: false,
      })
      .expect(201);

    expect(
      secondAddressResponse.body.data.isDefault
    ).toBe(false);

    const secondAddressId =
      secondAddressResponse.body.data.id;

    const updateResponse = await request(app)
      .patch(
        `/api/v1/addresses/${secondAddressId}`
      )
      .set("Authorization", `Bearer ${token}`)
      .send({
        label: "Office",
        landmark: "Near the city centre",
      })
      .expect(200);

    expect(updateResponse.body).toMatchObject({
      success: true,
      message: "Address updated successfully",
    });

    expect(updateResponse.body.data).toMatchObject({
      id: secondAddressId,
      label: "Office",
      landmark: "Near the city centre",
    });

    const defaultResponse = await request(app)
      .patch(
        `/api/v1/addresses/${secondAddressId}/default`
      )
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(defaultResponse.body).toMatchObject({
      success: true,
      message: "Default address updated",
    });

    expect(defaultResponse.body.data.isDefault).toBe(
      true
    );

    const listResponse = await request(app)
      .get("/api/v1/addresses")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(listResponse.body.data).toHaveLength(2);

    expect(listResponse.body.data[0]).toMatchObject({
      id: secondAddressId,
      isDefault: true,
    });

    const deleteResponse = await request(app)
      .delete(
        `/api/v1/addresses/${secondAddressId}`
      )
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(deleteResponse.body).toMatchObject({
      success: true,
      message: "Address deleted successfully",
    });

    const finalListResponse = await request(app)
      .get("/api/v1/addresses")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(finalListResponse.body.data).toHaveLength(
      1
    );

    expect(finalListResponse.body.data[0]).toMatchObject({
      id: firstAddressId,
      isDefault: true,
    });
  });

  it("prevents one customer from modifying another customer's address", async () => {
    const firstToken = await createCustomer(
      "first@example.com"
    );

    const secondToken = await createCustomer(
      "second@example.com"
    );

    const createResponse = await request(app)
      .post("/api/v1/addresses")
      .set(
        "Authorization",
        `Bearer ${firstToken}`
      )
      .send({
        label: "Home",
        fullAddress: "Pokhara, Nepal",
        latitude: 28.2096,
        longitude: 83.9856,
      })
      .expect(201);

    const addressId =
      createResponse.body.data.id;

    const response = await request(app)
      .patch(`/api/v1/addresses/${addressId}`)
      .set(
        "Authorization",
        `Bearer ${secondToken}`
      )
      .send({
        label: "Changed by another user",
      })
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      message: "Address not found",
    });
  });
});