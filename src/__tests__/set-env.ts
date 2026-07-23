process.env.NODE_ENV = "test";
process.env.PORT = "5001";

process.env.MONGO_URI =
  "mongodb://127.0.0.1:27017/freshcart_test";

process.env.JWT_SECRET =
  "freshcart_test_jwt_secret_with_at_least_32_characters";

process.env.CLIENT_URL =
  "http://localhost:3000";

process.env.CLIENT_URLS =
  "http://localhost:3000";

process.env.EMAIL_ENABLED = "false";

process.env.ESEWA_ENVIRONMENT = "test";
process.env.ESEWA_SECRET_KEY =
  "freshcart_test_esewa_secret";
process.env.ESEWA_PRODUCT_CODE = "EPAYTEST";