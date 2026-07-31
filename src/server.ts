import "dotenv/config";

import app from "./app";
import { PORT } from "./config";
import { connectDB } from "./database/mongodb";

const HOST = "0.0.0.0";

connectDB().then(() => {
  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
});