import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";

import Address from "../../models/address.model";
import Banner from "../../models/banner.model";
import Cart from "../../models/cart.model";
import Category from "../../models/category.model";
import Notification from "../../models/notification.model";
import NotificationPreference from "../../models/notificationPreference.model";
import Order from "../../models/order.model";
import PasswordResetOtp from "../../models/passwordResetOtp.model";
import Product from "../../models/product.model";
import User from "../../models/user.model";
import Wishlist from "../../models/wishlist.model";
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  clearAuthCookieOptions,
} from "../../utils/auth-cookie.util";
import {
  createEsewaSignature,
  createTransactionUuid,
  generateEsewaSignature,
  generateTransactionUuid,
} from "../../utils/esewa.util";
import { generateToken } from "../../utils/generateToken";
import {
  getSafeEmailStatus,
  isEmailConfigured,
  isEmailEnabled,
  sendEmail,
} from "../../utils/email.util";

const objectId = () => new Types.ObjectId();

const validUserPayload = () => ({
  fullName: "Fresh Cart User",
  email: "USER@EXAMPLE.COM",
  password: "secret123",
});

const validProductPayload = () => ({
  name: "Red Apple",
  description: "Fresh apples",
  price: 250,
  category: "Fruits",
  stock: 40,
  unit: "kg",
});

const validOrderPayload = () => ({
  orderNumber: "FC-UNIT-0001",
  user: objectId(),
  customerName: "Fresh Cart User",
  customerEmail: "CUSTOMER@EXAMPLE.COM",
  items: [
    {
      product: objectId(),
      name: "Red Apple",
      image: "",
      category: "Fruits",
      unit: "kg",
      price: 250,
      quantity: 2,
      total: 500,
    },
  ],
  shippingAddress: {
    fullName: "Fresh Cart User",
    phone: "9800000000",
    address: "Basundhara",
    city: "Kathmandu",
  },
  subtotal: 500,
  deliveryFee: 50,
  totalAmount: 550,
});

describe("Authentication cookie utility", () => {
  it("uses the token cookie name", () => {
    expect(AUTH_COOKIE_NAME).toBe("token");
  });

  it("sets authentication cookies as HTTP-only", () => {
    expect(authCookieOptions.httpOnly).toBe(true);
  });

  it("uses lax same-site cookies in the test environment", () => {
    expect(authCookieOptions.sameSite).toBe("lax");
  });

  it("stores authentication cookies for seven days", () => {
    expect(authCookieOptions.maxAge).toBe(1000 * 60 * 60 * 24 * 7);
  });

  it("sets authentication cookies for the whole application path", () => {
    expect(authCookieOptions.path).toBe("/");
  });

  it("clears authentication cookies without setting maxAge", () => {
    expect(clearAuthCookieOptions.maxAge).toBeUndefined();
    expect(clearAuthCookieOptions.path).toBe("/");
  });
});

describe("eSewa utility", () => {
  const originalSecret = process.env.ESEWA_SECRET_KEY;

  afterEach(() => {
    process.env.ESEWA_SECRET_KEY = originalSecret;
    jest.restoreAllMocks();
  });

  it("creates the expected HMAC SHA256 signature", () => {
    process.env.ESEWA_SECRET_KEY = "unit_secret";

    const expected = crypto
      .createHmac("sha256", "unit_secret")
      .update(
        "total_amount=500,transaction_uuid=FC-ORDER-1,product_code=EPAYTEST"
      )
      .digest("base64");

    expect(createEsewaSignature("500", "FC-ORDER-1", "EPAYTEST")).toBe(
      expected
    );
  });

  it("keeps generateEsewaSignature as an alias of createEsewaSignature", () => {
    process.env.ESEWA_SECRET_KEY = "alias_secret";

    expect(generateEsewaSignature("900", "FC-ORDER-2", "EPAYTEST")).toBe(
      createEsewaSignature("900", "FC-ORDER-2", "EPAYTEST")
    );
  });

  it("throws a clear error when the eSewa secret key is missing", () => {
    delete process.env.ESEWA_SECRET_KEY;

    expect(() => createEsewaSignature("100", "FC-1", "EPAYTEST")).toThrow(
      "ESEWA_SECRET_KEY is missing in .env"
    );
  });

  it("generates transaction UUID values with the FreshCart prefix", () => {
    jest.spyOn(Date, "now").mockReturnValue(1783131892658);

    expect(generateTransactionUuid("ORDER123")).toBe(
      "FC-ORDER123-1783131892658"
    );
  });

  it("keeps createTransactionUuid as an alias of generateTransactionUuid", () => {
    jest.spyOn(Date, "now").mockReturnValue(1783131900000);

    expect(createTransactionUuid("ORDER456")).toBe(
      generateTransactionUuid("ORDER456")
    );
  });
});

describe("JWT token utility", () => {
  it("generates a signed JWT string", () => {
    expect(generateToken("user123").split(".")).toHaveLength(3);
  });

  it("stores the user id in the JWT payload", () => {
    const decoded = jwt.verify(
      generateToken("user123"),
      process.env.JWT_SECRET as string
    ) as jwt.JwtPayload;

    expect(decoded.id).toBe("user123");
  });

  it("sets an expiry value on generated tokens", () => {
    const decoded = jwt.verify(
      generateToken("user123"),
      process.env.JWT_SECRET as string
    ) as jwt.JwtPayload;

    expect(decoded.exp).toBeGreaterThan(decoded.iat as number);
  });

  it("creates different payloads for different user ids", () => {
    const first = jwt.verify(
      generateToken("firstUser"),
      process.env.JWT_SECRET as string
    ) as jwt.JwtPayload;

    const second = jwt.verify(
      generateToken("secondUser"),
      process.env.JWT_SECRET as string
    ) as jwt.JwtPayload;

    expect(first.id).not.toBe(second.id);
  });
});

describe("Email utility", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("treats email delivery as enabled when EMAIL_ENABLED is true", () => {
    process.env.EMAIL_ENABLED = "true";

    expect(isEmailEnabled()).toBe(true);
  });

  it("treats email delivery as disabled when EMAIL_ENABLED is false", () => {
    process.env.EMAIL_ENABLED = "false";

    expect(isEmailEnabled()).toBe(false);
  });

  it.each(["1", "yes", "on", "TRUE"])(
    "accepts %s as an enabled email flag",
    (value) => {
      process.env.EMAIL_ENABLED = value;

      expect(isEmailEnabled()).toBe(true);
    }
  );

  it("detects when email credentials are not configured", () => {
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    delete process.env.EMAIL_PASSWORD;
    delete process.env.GMAIL_CLIENT_ID;
    delete process.env.GMAIL_CLIENT_SECRET;
    delete process.env.GMAIL_REFRESH_TOKEN;
    delete process.env.GMAIL_ACCESS_TOKEN;

    expect(isEmailConfigured()).toBe(false);
  });

  it("returns a safe email status object with public status fields", () => {
    process.env.EMAIL_ENABLED = "false";
    process.env.EMAIL_USER = "freshcart@example.com";

    const status = getSafeEmailStatus();

    expect(status).toMatchObject({
      enabled: false,
      configured: false,
      user: "freshcart@example.com",
    });
  });

  it("includes a mail host in the safe email status", () => {
    const status = getSafeEmailStatus();

    expect(status).toHaveProperty("host");
    expect(typeof status.host).toBe("string");
  });

  it("does not expose email secrets in the safe status object", () => {
    process.env.EMAIL_PASS = "app-password";
    process.env.EMAIL_PASSWORD = "fallback-password";
    process.env.GMAIL_CLIENT_ID = "client-id";
    process.env.GMAIL_CLIENT_SECRET = "client-secret";
    process.env.GMAIL_REFRESH_TOKEN = "refresh-token";
    process.env.GMAIL_ACCESS_TOKEN = "access-token";

    const status = getSafeEmailStatus() as Record<string, unknown>;

    expect(status).not.toHaveProperty("password");
    expect(status).not.toHaveProperty("pass");
    expect(status).not.toHaveProperty("clientId");
    expect(status).not.toHaveProperty("clientSecret");
    expect(status).not.toHaveProperty("refreshToken");
    expect(status).not.toHaveProperty("accessToken");
  });

  it("returns boolean status values for email delivery", () => {
    const status = getSafeEmailStatus();

    expect(typeof status.enabled).toBe("boolean");
    expect(typeof status.configured).toBe("boolean");
  });

  it("skips sending email when delivery is disabled", async () => {
    process.env.EMAIL_ENABLED = "false";

    await expect(
      sendEmail({
        to: "customer@example.com",
        subject: "FreshCart",
        html: "<p>Hello</p>",
      })
    ).resolves.toMatchObject({
      attempted: false,
      sent: false,
      skipped: true,
    });
  });

  it("skips sending email when credentials are missing", async () => {
    process.env.EMAIL_ENABLED = "true";
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    delete process.env.EMAIL_PASSWORD;
    delete process.env.GMAIL_CLIENT_ID;
    delete process.env.GMAIL_CLIENT_SECRET;
    delete process.env.GMAIL_REFRESH_TOKEN;
    delete process.env.GMAIL_ACCESS_TOKEN;

    await expect(
      sendEmail({
        to: "customer@example.com",
        subject: "FreshCart",
        html: "<p>Hello</p>",
      })
    ).resolves.toMatchObject({
      attempted: false,
      sent: false,
      skipped: true,
    });
  });
});

describe("User model", () => {
  it("lowercases and trims email addresses", () => {
    const user = new User(validUserPayload());
    const error = user.validateSync();

    expect(error).toBeUndefined();
    expect(user.email).toBe("user@example.com");
  });

  it("defaults customers to the user role", () => {
    const user = new User(validUserPayload());

    expect(user.role).toBe("user");
  });

  it("defaults users to active status", () => {
    const user = new User(validUserPayload());

    expect(user.status).toBe("active");
  });

  it("requires a full name", () => {
    const user = new User({ ...validUserPayload(), fullName: undefined });

    expect(user.validateSync()?.errors.fullName).toBeDefined();
  });

  it("rejects passwords shorter than six characters", () => {
    const user = new User({ ...validUserPayload(), password: "12345" });

    expect(user.validateSync()?.errors.password).toBeDefined();
  });

  it("rejects unsupported roles", () => {
    const user = new User({ ...validUserPayload(), role: "manager" });

    expect(user.validateSync()?.errors.role).toBeDefined();
  });
});

describe("Product model", () => {
  it("validates a complete product", () => {
    const product = new Product(validProductPayload());

    expect(product.validateSync()).toBeUndefined();
  });

  it("defaults product status to active", () => {
    const product = new Product(validProductPayload());

    expect(product.status).toBe("active");
  });

  it("defaults offer fields to inactive values", () => {
    const product = new Product(validProductPayload());

    expect(product.isOffer).toBe(false);
    expect(product.discountPercent).toBe(0);
    expect(product.offerPrice).toBe(0);
  });

  it("rejects a negative product price", () => {
    const product = new Product({ ...validProductPayload(), price: -1 });

    expect(product.validateSync()?.errors.price).toBeDefined();
  });

  it("rejects negative stock", () => {
    const product = new Product({ ...validProductPayload(), stock: -1 });

    expect(product.validateSync()?.errors.stock).toBeDefined();
  });

  it("rejects discount percentages above 99", () => {
    const product = new Product({
      ...validProductPayload(),
      discountPercent: 100,
    });

    expect(product.validateSync()?.errors.discountPercent).toBeDefined();
  });

  it("rejects unsupported product statuses", () => {
    const product = new Product({ ...validProductPayload(), status: "draft" });

    expect(product.validateSync()?.errors.status).toBeDefined();
  });
});

describe("Category model", () => {
  it("trims category names", () => {
    const category = new Category({ name: "  Fruits  " });

    expect(category.validateSync()).toBeUndefined();
    expect(category.name).toBe("Fruits");
  });

  it("defaults category status to active", () => {
    const category = new Category({ name: "Vegetables" });

    expect(category.status).toBe("active");
  });

  it("requires a category name", () => {
    const category = new Category({ description: "Fresh items" });

    expect(category.validateSync()?.errors.name).toBeDefined();
  });

  it("rejects unsupported category statuses", () => {
    const category = new Category({ name: "Fruits", status: "archived" });

    expect(category.validateSync()?.errors.status).toBeDefined();
  });
});

describe("Address model", () => {
  it("validates a complete address", () => {
    const address = new Address({
      user: objectId(),
      fullAddress: "Basundhara, Kathmandu",
      latitude: 27.735,
      longitude: 85.324,
    });

    expect(address.validateSync()).toBeUndefined();
  });

  it("defaults address label to Home", () => {
    const address = new Address({
      user: objectId(),
      fullAddress: "Basundhara, Kathmandu",
      latitude: 27.735,
      longitude: 85.324,
    });

    expect(address.label).toBe("Home");
  });

  it("defaults city and province for local delivery", () => {
    const address = new Address({
      user: objectId(),
      fullAddress: "Basundhara, Kathmandu",
      latitude: 27.735,
      longitude: 85.324,
    });

    expect(address.city).toBe("Kathmandu");
    expect(address.province).toBe("Bagmati");
  });

  it("defaults new addresses as non-default", () => {
    const address = new Address({
      user: objectId(),
      fullAddress: "Basundhara, Kathmandu",
      latitude: 27.735,
      longitude: 85.324,
    });

    expect(address.isDefault).toBe(false);
  });

  it("requires a full address", () => {
    const address = new Address({
      user: objectId(),
      latitude: 27.735,
      longitude: 85.324,
    });

    expect(address.validateSync()?.errors.fullAddress).toBeDefined();
  });

  it("requires latitude and longitude", () => {
    const address = new Address({
      user: objectId(),
      fullAddress: "Basundhara, Kathmandu",
    });

    expect(address.validateSync()?.errors.latitude).toBeDefined();
    expect(address.validateSync()?.errors.longitude).toBeDefined();
  });
});

describe("Banner model", () => {
  it("validates a banner with a title", () => {
    const banner = new Banner({ title: "Fresh offers" });

    expect(banner.validateSync()).toBeUndefined();
  });

  it("defaults banner position to home hero", () => {
    const banner = new Banner({ title: "Fresh offers" });

    expect(banner.position).toBe("home_hero");
  });

  it("defaults banner text and link values", () => {
    const banner = new Banner({ title: "Fresh offers" });

    expect(banner.buttonText).toBe("Shop now");
    expect(banner.link).toBe("/user/grocery");
  });

  it("defaults banners as active", () => {
    const banner = new Banner({ title: "Fresh offers" });

    expect(banner.isActive).toBe(true);
  });

  it("rejects unsupported banner positions", () => {
    const banner = new Banner({ title: "Fresh offers", position: "footer" });

    expect(banner.validateSync()?.errors.position).toBeDefined();
  });
});

describe("Cart model", () => {
  it("defaults cart items to an empty array", () => {
    const cart = new Cart({ user: objectId() });

    expect(cart.items).toEqual([]);
  });

  it("validates a cart item with quantity", () => {
    const cart = new Cart({
      user: objectId(),
      items: [{ product: objectId(), quantity: 2 }],
    });

    expect(cart.validateSync()).toBeUndefined();
  });

  it("requires a cart user", () => {
    const cart = new Cart({ items: [] });

    expect(cart.validateSync()?.errors.user).toBeDefined();
  });

  it("rejects cart quantities below one", () => {
    const cart = new Cart({
      user: objectId(),
      items: [{ product: objectId(), quantity: 0 }],
    });

    expect(cart.validateSync()?.errors["items.0.quantity"]).toBeDefined();
  });
});

describe("Notification model", () => {
  it("defaults notification type to security", () => {
    const notification = new Notification({
      user: objectId(),
      title: "Security alert",
      message: "Password changed",
    });

    expect(notification.type).toBe("security");
  });

  it("defaults notifications as unread", () => {
    const notification = new Notification({
      user: objectId(),
      title: "Order update",
      message: "Order placed",
      type: "order",
    });

    expect(notification.isRead).toBe(false);
  });

  it.each(["order", "delivery", "payment", "offer", "wishlist", "security"])(
    "accepts %s notification type",
    (type) => {
      const notification = new Notification({
        user: objectId(),
        title: "FreshCart",
        message: "Notification message",
        type,
      });

      expect(notification.validateSync()).toBeUndefined();
    }
  );

  it("requires a notification title", () => {
    const notification = new Notification({
      user: objectId(),
      message: "Notification message",
    });

    expect(notification.validateSync()?.errors.title).toBeDefined();
  });

  it("rejects unsupported notification types", () => {
    const notification = new Notification({
      user: objectId(),
      title: "FreshCart",
      message: "Notification message",
      type: "marketing",
    });

    expect(notification.validateSync()?.errors.type).toBeDefined();
  });
});

describe("Notification preference model", () => {
  it("defaults email and app notifications to enabled", () => {
    const preference = new NotificationPreference({ user: objectId() });

    expect(preference.emailNotifications).toBe(true);
    expect(preference.appNotifications).toBe(true);
  });

  it("defaults SMS notifications to disabled", () => {
    const preference = new NotificationPreference({ user: objectId() });

    expect(preference.smsNotifications).toBe(false);
  });

  it("defaults order, delivery, and payment updates to enabled", () => {
    const preference = new NotificationPreference({ user: objectId() });

    expect(preference.orderUpdates).toBe(true);
    expect(preference.deliveryUpdates).toBe(true);
    expect(preference.paymentUpdates).toBe(true);
  });

  it("defaults offer alerts to disabled", () => {
    const preference = new NotificationPreference({ user: objectId() });

    expect(preference.offerAlerts).toBe(false);
  });

  it("defaults wishlist and security alerts to enabled", () => {
    const preference = new NotificationPreference({ user: objectId() });

    expect(preference.wishlistAlerts).toBe(true);
    expect(preference.securityAlerts).toBe(true);
  });

  it("requires a preference user", () => {
    const preference = new NotificationPreference({});

    expect(preference.validateSync()?.errors.user).toBeDefined();
  });
});

describe("Order model", () => {
  it("validates a complete order", () => {
    const order = new Order(validOrderPayload());

    expect(order.validateSync()).toBeUndefined();
  });

  it("lowercases customer emails", () => {
    const order = new Order(validOrderPayload());

    expect(order.customerEmail).toBe("customer@example.com");
  });

  it("defaults payment method to cash on delivery", () => {
    const order = new Order(validOrderPayload());

    expect(order.paymentMethod).toBe("cash_on_delivery");
  });

  it("defaults payment status to pending", () => {
    const order = new Order(validOrderPayload());

    expect(order.paymentStatus).toBe("pending");
  });

  it("defaults order status to pending", () => {
    const order = new Order(validOrderPayload());

    expect(order.orderStatus).toBe("pending");
  });

  it("does not hide new orders from customers by default", () => {
    const order = new Order(validOrderPayload());

    expect(order.hiddenFromCustomer).toBe(false);
  });

  it("rejects orders without items", () => {
    const order = new Order({ ...validOrderPayload(), items: [] });

    expect(order.validateSync()?.errors.items).toBeDefined();
  });

  it("rejects invalid payment methods", () => {
    const order = new Order({ ...validOrderPayload(), paymentMethod: "khalti" });

    expect(order.validateSync()?.errors.paymentMethod).toBeDefined();
  });

  it("rejects invalid order statuses", () => {
    const order = new Order({ ...validOrderPayload(), orderStatus: "returned" });

    expect(order.validateSync()?.errors.orderStatus).toBeDefined();
  });
});

describe("Password reset OTP model", () => {
  it("lowercases OTP emails", () => {
    const otp = new PasswordResetOtp({
      user: objectId(),
      email: "RESET@EXAMPLE.COM",
      otpHash: "hashed-otp",
      expiresAt: new Date(Date.now() + 60000),
    });

    expect(otp.email).toBe("reset@example.com");
  });

  it("defaults OTP attempts to zero", () => {
    const otp = new PasswordResetOtp({
      user: objectId(),
      email: "reset@example.com",
      otpHash: "hashed-otp",
      expiresAt: new Date(Date.now() + 60000),
    });

    expect(otp.attempts).toBe(0);
  });

  it("defaults OTP verification to false", () => {
    const otp = new PasswordResetOtp({
      user: objectId(),
      email: "reset@example.com",
      otpHash: "hashed-otp",
      expiresAt: new Date(Date.now() + 60000),
    });

    expect(otp.verified).toBe(false);
  });

  it("rejects negative OTP attempts", () => {
    const otp = new PasswordResetOtp({
      user: objectId(),
      email: "reset@example.com",
      otpHash: "hashed-otp",
      attempts: -1,
      expiresAt: new Date(Date.now() + 60000),
    });

    expect(otp.validateSync()?.errors.attempts).toBeDefined();
  });

  it("requires an expiry date", () => {
    const otp = new PasswordResetOtp({
      user: objectId(),
      email: "reset@example.com",
      otpHash: "hashed-otp",
    });

    expect(otp.validateSync()?.errors.expiresAt).toBeDefined();
  });
});

describe("Wishlist model", () => {
  it("validates a wishlist with product ids", () => {
    const wishlist = new Wishlist({
      user: objectId(),
      products: [objectId(), objectId()],
    });

    expect(wishlist.validateSync()).toBeUndefined();
  });

  it("defaults wishlist products to an empty array", () => {
    const wishlist = new Wishlist({ user: objectId() });

    expect(wishlist.products).toEqual([]);
  });

  it("requires a wishlist user", () => {
    const wishlist = new Wishlist({ products: [objectId()] });

    expect(wishlist.validateSync()?.errors.user).toBeDefined();
  });
});
