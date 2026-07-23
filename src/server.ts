import "dotenv/config";

import app from "./app";
import { connectDB } from "./database/mongodb";
const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

connectDB().then(() => {
  app.listen(Number(PORT), HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
});