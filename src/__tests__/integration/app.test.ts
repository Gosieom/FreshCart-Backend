import {
  describe,
  expect,
  it,
} from "@jest/globals";
import request from "supertest";

import app from "../../app";

describe("FreshCart API application", () => {
  it("returns a successful health response", async () => {
    const response = await request(app)
      .get("/api/health")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      message: "FreshCart API is running",
    });
  });

  it("returns a JSON 404 response for an unknown route", async () => {
    const response = await request(app)
      .get("/api/route-that-does-not-exist")
      .expect("Content-Type", /json/)
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      message:
        "Route GET /api/route-that-does-not-exist was not found",
    });
  });

  it("allows the configured frontend origin through CORS", async () => {
    const response = await request(app)
      .get("/api/health")
      .set("Origin", "http://localhost:3000")
      .expect(200);

    expect(
      response.headers["access-control-allow-origin"]
    ).toBe("http://localhost:3000");

    expect(
      response.headers["access-control-allow-credentials"]
    ).toBe("true");
  });
});