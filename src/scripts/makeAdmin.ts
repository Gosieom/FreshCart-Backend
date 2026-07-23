import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/user.model";

// Usage: npx ts-node --transpile-only src/scripts/makeAdmin.ts [email]
// Default email: admin@example.com
const emailArg = process.argv[2] || "admin@example.com";

const run = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error("MONGO_URI not defined in .env");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");

  const user = await User.findOne({ email: emailArg });

  if (!user) {
    console.error(`No user found with email: ${emailArg}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Before: ${user.email} role = ${user.role}`);

  user.role = "admin";
  await user.save();

  console.log(`After:  ${user.email} role = ${user.role}`);
  console.log("Done. This user is now an admin.");

  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (err) => {
  console.error("Failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});