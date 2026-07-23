import {
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import User from "../../../models/user.model";
import {
  createUser,
  findUserByEmail,
} from "../../../repositories/user.repository";

describe("User repository", () => {
  it("finds a user by email", async () => {
    const expectedUser = {
      id: "user-id",
      email: "repository@example.com",
    };

    const findOneSpy = jest
      .spyOn(User, "findOne")
      .mockResolvedValue(expectedUser as never);

    const result = await findUserByEmail(
      "repository@example.com"
    );

    expect(findOneSpy).toHaveBeenCalledWith({
      email: "repository@example.com",
    });

    expect(result).toBe(expectedUser);
  });

  it("creates a user through the model", async () => {
    const input = {
      fullName: "Repository User",
      email: "repository@example.com",
      password: "Password123",
    };

    const expectedUser = {
      id: "created-user-id",
      ...input,
    };

    const createSpy = jest
      .spyOn(User, "create")
      .mockResolvedValue(expectedUser as never);

    const result = await createUser(input);

    expect(createSpy).toHaveBeenCalledWith(input);
    expect(result).toBe(expectedUser);
  });
});
