import {
  afterAll,
  afterEach,
  beforeAll,
} from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer: MongoMemoryServer | undefined;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();

  await mongoose.connect(
    mongoServer.getUri()
  );
});

afterEach(async () => {
  const collections =
    mongoose.connection.collections;

  await Promise.all(
    Object.values(collections).map(
      async (collection) => {
        await collection.deleteMany({});
      }
    )
  );
});

afterAll(async () => {
  await mongoose.disconnect();

  if (mongoServer) {
    await mongoServer.stop();
  }
});