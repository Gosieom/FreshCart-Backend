import {
  describe,
  expect,
  it,
} from "@jest/globals";
import request from "supertest";

import app from "../../app";

const validUser = {
  fullName: "Test Customer",
  email: "customer@example.com",
  password: "Password123",
  phone: "9800000000",
};

describe("Authentication API", () => {
  it("registers a new customer", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(validUser)
      .expect("Content-Type", /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      message: "User created successfully",
    });

    expect(response.body.user).toMatchObject({
      fullName: validUser.fullName,
      email: validUser.email,
      phone: validUser.phone,
      role: "user",
      status: "active",
    });

    expect(response.body.user.password).toBeUndefined();
    expect(response.body.user.id).toBeDefined();
  });

  it("rejects registration with a duplicate email", async () => {
    await request(app)
      .post("/api/v1/auth/register")
      .send(validUser)
      .expect(201);

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        ...validUser,
        fullName: "Another Customer",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: "Email already exists",
    });
  });

  it("logs in a registered customer", async () => {
    await request(app)
      .post("/api/v1/auth/register")
      .send(validUser)
      .expect(201);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: validUser.email,
        password: validUser.password,
      })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Login successful",
    });

    expect(response.body.data.user).toMatchObject({
      fullName: validUser.fullName,
      email: validUser.email,
      role: "user",
      status: "active",
    });

    expect(typeof response.body.data.token).toBe("string");
    expect(response.headers["set-cookie"]).toBeDefined();
  });

  it("rejects login with an incorrect password", async () => {
    await request(app)
      .post("/api/v1/auth/register")
      .send(validUser)
      .expect(201);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: validUser.email,
        password: "WrongPassword123",
      })
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      message: "Invalid credentials",
    });
  });

  it("rejects access to a protected route without authentication", async () => {
    const response = await request(app)
      .get("/api/v1/auth/me")
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      message: "Unauthorized. No token provided.",
    });
  });

  it("allows access using a bearer token", async () => {
    await request(app)
      .post("/api/v1/auth/register")
      .send(validUser)
      .expect(201);

    const loginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: validUser.email,
        password: validUser.password,
      })
      .expect(200);

    const token = loginResponse.body.data.token;

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
    });

    expect(response.body.user).toMatchObject({
      fullName: validUser.fullName,
      email: validUser.email,
      role: "user",
      status: "active",
    });
  });

  it("supports cookie authentication and logout", async () => {
    const agent = request.agent(app);

    await agent
      .post("/api/v1/auth/register")
      .send(validUser)
      .expect(201);

    const loginResponse = await agent
      .post("/api/v1/auth/login")
      .send({
        email: validUser.email,
        password: validUser.password,
      })
      .expect(200);

    expect(loginResponse.headers["set-cookie"]).toBeDefined();

    await agent
      .get("/api/v1/auth/me")
      .expect(200);

    const logoutResponse = await agent
      .post("/api/v1/auth/logout")
      .expect(200);

    expect(logoutResponse.body).toMatchObject({
      success: true,
      message: "Logout successful",
    });

    await agent
      .get("/api/v1/auth/me")
      .expect(401);
  });
});