import {
  describe,
  expect,
  it,
} from "@jest/globals";
import request from "supertest";

import app from "../../app";
import Category from "../../models/category.model";
import Product from "../../models/product.model";
import User from "../../models/user.model";
import { generateToken } from "../../utils/generateToken";

const createTokenForRole = async (
  role: "user" | "admin"
): Promise<string> => {
  const user = await User.create({
    fullName:
      role === "admin"
        ? "Test Administrator"
        : "Test Customer",
    email:
      role === "admin"
        ? "admin@example.com"
        : "user@example.com",
    password: "Password123",
    phone: "9800000000",
    role,
    status: "active",
  });

  return generateToken(user.id);
};

describe("Public category and product APIs", () => {
  it("returns only active categories", async () => {
    await Category.create([
      {
        name: "Fruits",
        description: "Fresh fruits",
        status: "active",
      },
      {
        name: "Hidden Category",
        description: "Inactive category",
        status: "inactive",
      },
    ]);

    const response = await request(app)
      .get("/api/v1/categories")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body.data).toHaveLength(1);

    expect(response.body.data[0]).toMatchObject({
      name: "Fruits",
      description: "Fresh fruits",
      status: "active",
    });
  });

  it("returns filtered and paginated active products", async () => {
    await Product.create([
      {
        name: "Red Apple",
        description: "Fresh red apple",
        price: 120,
        category: "Fruits",
        stock: 20,
        unit: "kg",
        status: "active",
      },
      {
        name: "Green Apple",
        description: "Inactive product",
        price: 110,
        category: "Fruits",
        stock: 15,
        unit: "kg",
        status: "inactive",
      },
      {
        name: "Fresh Milk",
        description: "Dairy milk",
        price: 90,
        category: "Dairy",
        stock: 30,
        unit: "litre",
        status: "active",
      },
    ]);

    const response = await request(app)
      .get(
        "/api/v1/products?search=apple&category=Fruits&page=1&limit=5"
      )
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);

    expect(response.body.data[0]).toMatchObject({
      name: "Red Apple",
      category: "Fruits",
      status: "active",
    });

    expect(response.body.meta).toMatchObject({
      page: 1,
      limit: 5,
      total: 1,
      totalPages: 1,
    });
  });

  it("returns an active product by id", async () => {
    const product = await Product.create({
      name: "Banana",
      description: "Fresh banana",
      price: 100,
      category: "Fruits",
      stock: 12,
      unit: "dozen",
      status: "active",
    });

    const response = await request(app)
      .get(`/api/v1/products/${product.id}`)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
    });

    expect(response.body.data).toMatchObject({
      id: product.id,
      name: "Banana",
      category: "Fruits",
      price: 100,
    });
  });

  it("rejects an invalid product id", async () => {
    const response = await request(app)
      .get("/api/v1/products/not-a-valid-id")
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: "Invalid product id",
    });
  });
});

describe("Admin category and product APIs", () => {
  it("rejects an unauthenticated admin request", async () => {
    const response = await request(app)
      .get("/api/v1/admin/products")
      .expect(401);

    expect(response.body).toMatchObject({
      message: "Authentication required",
    });
  });

  it("rejects a regular customer from admin routes", async () => {
    const token = await createTokenForRole("user");

    const response = await request(app)
      .get("/api/v1/admin/products")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);

    expect(response.body).toMatchObject({
      message: "Admin access only",
    });
  });

  it("allows an admin to create, update, retrieve, and delete a category", async () => {
    const token = await createTokenForRole("admin");

    const createResponse = await request(app)
      .post("/api/v1/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Vegetables",
        description: "Fresh vegetables",
        status: "active",
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      message: "Category created successfully",
    });

    expect(createResponse.body.data).toMatchObject({
      name: "Vegetables",
      description: "Fresh vegetables",
      status: "active",
    });

    const categoryId = createResponse.body.data.id;

    const updateResponse = await request(app)
      .patch(
        `/api/v1/admin/categories/${categoryId}`
      )
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Organic Vegetables",
        description: "Fresh organic vegetables",
        status: "active",
      })
      .expect(200);

    expect(updateResponse.body).toMatchObject({
      message: "Category updated successfully",
    });

    expect(updateResponse.body.data).toMatchObject({
      id: categoryId,
      name: "Organic Vegetables",
    });

    const getResponse = await request(app)
      .get(
        `/api/v1/admin/categories/${categoryId}`
      )
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(getResponse.body.data).toMatchObject({
      id: categoryId,
      name: "Organic Vegetables",
    });

    const deleteResponse = await request(app)
      .delete(
        `/api/v1/admin/categories/${categoryId}`
      )
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(deleteResponse.body).toMatchObject({
      message: "Category deleted successfully",
    });

    await request(app)
      .get(
        `/api/v1/admin/categories/${categoryId}`
      )
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("rejects duplicate category names", async () => {
    const token = await createTokenForRole("admin");

    await request(app)
      .post("/api/v1/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Bakery",
        description: "Bakery products",
      })
      .expect(201);

    const response = await request(app)
      .post("/api/v1/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Bakery",
        description: "Duplicate category",
      })
      .expect(409);

    expect(response.body).toMatchObject({
      message: "Category already exists",
    });
  });

  it("allows an admin to create, update, retrieve, and delete a product", async () => {
    const token = await createTokenForRole("admin");

    const createResponse = await request(app)
      .post("/api/v1/admin/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Fresh Orange",
        description: "Sweet fresh oranges",
        price: 150,
        category: "Fruits",
        stock: 25,
        unit: "kg",
        status: "active",
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      message: "Product created successfully",
    });

    expect(createResponse.body.data).toMatchObject({
      name: "Fresh Orange",
      price: 150,
      category: "Fruits",
      stock: 25,
      unit: "kg",
      status: "active",
    });

    const productId = createResponse.body.data.id;

    const updateResponse = await request(app)
      .patch(
        `/api/v1/admin/products/${productId}`
      )
      .set("Authorization", `Bearer ${token}`)
      .send({
        price: 140,
        stock: 40,
        status: "active",
      })
      .expect(200);

    expect(updateResponse.body).toMatchObject({
      message: "Product updated successfully",
    });

    expect(updateResponse.body.data).toMatchObject({
      id: productId,
      price: 140,
      stock: 40,
    });

    const getResponse = await request(app)
      .get(
        `/api/v1/admin/products/${productId}`
      )
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(getResponse.body.data).toMatchObject({
      id: productId,
      name: "Fresh Orange",
      price: 140,
      stock: 40,
    });

    const deleteResponse = await request(app)
      .delete(
        `/api/v1/admin/products/${productId}`
      )
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(deleteResponse.body).toMatchObject({
      message: "Product deleted successfully",
    });

    await request(app)
      .get(
        `/api/v1/admin/products/${productId}`
      )
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("rejects an invalid product creation request", async () => {
    const token = await createTokenForRole("admin");

    const response = await request(app)
      .post("/api/v1/admin/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Incomplete Product",
        category: "Other",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      message:
        "Name, price, category, and stock are required",
    });
  });
});