import { Request, Response } from "express";
import mongoose from "mongoose";

import { ALLOWED_ORIGINS } from "../config";
import { esewaConfig } from "../config/esewa.config";
import Cart from "../models/cart.model";
import Order from "../models/order.model";
import Product from "../models/product.model";
import { checkEsewaTransactionStatus } from "../services/esewa.service";
import {
  generateEsewaSignature,
  generateTransactionUuid,
} from "../utils/esewa.util";
import { createUserNotification } from "../utils/notification.util";

const formatOrder = (order: any) => ({
  id: order._id.toString(),
  _id: order._id.toString(),
  orderNumber: order.orderNumber,
  user: order.user,
  customerName: order.customerName,
  customerEmail: order.customerEmail,
  customerPhone: order.customerPhone,
  items: order.items,
  shippingAddress: order.shippingAddress,
  subtotal: order.subtotal,
  deliveryFee: order.deliveryFee,
  totalAmount: order.totalAmount,
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  orderStatus: order.orderStatus,
  transactionUuid: order.transactionUuid || "",
  esewaTransactionCode: order.esewaTransactionCode || "",
  notes: order.notes || "",
  hiddenFromCustomer: Boolean(order.hiddenFromCustomer),
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const getLoggedInUserId = (req: Request): string => {
  const authRequest = req as any;

  return (
    authRequest.user?.id?.toString?.() ||
    authRequest.user?._id?.toString?.() ||
    ""
  );
};

const amountsMatch = (first: number, second: number): boolean => {
  return Number.isFinite(first) && Math.abs(first - second) < 0.01;
};

const normalizeOrigin = (value: string): string => {
  return value.trim().replace(/\/+$/, "");
};

const resolveEsewaReturnBaseUrl = (req: Request): string => {
  const requestOrigin = normalizeOrigin(String(req.get("origin") || ""));

  // Browser checkout requests include an Origin header. Use it only when
  // the same origin is already trusted by the API CORS configuration.
  // This keeps localhost payments on localhost and production payments
  // on the production frontend without introducing an open redirect.
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    return `${requestOrigin}/user/payment/esewa`;
  }

  // Server-to-server clients and requests without Origin keep using the
  // configured fallback URL.
  return esewaConfig.returnUrl;
};

const statusMatchesOrder = (
  order: any,
  statusResult: {
    productCode: string;
    transactionUuid: string;
    totalAmount: number;
  }
): boolean => {
  return (
    statusResult.productCode === esewaConfig.productCode &&
    statusResult.transactionUuid === order.transactionUuid &&
    amountsMatch(statusResult.totalAmount, Number(order.totalAmount))
  );
};

const finalizeVerifiedEsewaOrder = async (
  order: any,
  referenceId: string
) => {
  order.paymentStatus = "paid";
  order.orderStatus = "confirmed";
  order.hiddenFromCustomer = false;
  order.esewaTransactionCode = referenceId;
  await order.save();

  await Cart.findOneAndUpdate(
    { user: order.user },
    { $set: { items: [] } },
    { upsert: true }
  );

  try {
    await createUserNotification({
      userId: order.user.toString(),
      title: "Order confirmed and eSewa payment verified",
      message: `Your eSewa payment for order ${order.orderNumber} was verified and the order is now confirmed.`,
      type: "payment",
      orderId: order._id.toString(),
      emailSubject: `FreshCart order confirmed - ${order.orderNumber}`,
      emailHtml: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2 style="color:#16833a;">Order confirmed</h2>
          <p>Your eSewa payment for order <strong>${order.orderNumber}</strong> was verified by FreshCart.</p>
          <p><strong>Total:</strong> Rs. ${order.totalAmount}</p>
          <p><strong>eSewa reference:</strong> ${order.esewaTransactionCode}</p>
        </div>
      `,
    });
  } catch (notificationError) {
    console.error("ESEWA SUCCESS NOTIFICATION ERROR:", notificationError);
  }

  return order;
};

export const initiateEsewaPayment = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = getLoggedInUserId(req);
    const orderId = String(req.body?.orderId ?? "");

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Valid order id is required",
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      user: userId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.paymentStatus === "paid") {
      return res.status(409).json({
        success: false,
        message: "This order is already paid",
      });
    }

    if (
      order.orderStatus === "cancelled" ||
      order.orderStatus === "delivered"
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment cannot be started for this order",
      });
    }

    const totalAmount = Number(order.totalAmount).toFixed(2);
    const transactionUuid = generateTransactionUuid(order._id.toString());

    const signature = generateEsewaSignature(
      totalAmount,
      transactionUuid,
      esewaConfig.productCode
    );

    const returnBaseUrl = resolveEsewaReturnBaseUrl(req);
    const successUrl = `${returnBaseUrl}/success?orderId=${order._id}`;
    const failureUrl = `${returnBaseUrl}/failure?orderId=${order._id}`;

    order.paymentMethod = "esewa";
    order.paymentStatus = "pending";
    order.orderStatus = "pending";
    order.hiddenFromCustomer = true;
    order.transactionUuid = transactionUuid;
    order.esewaTransactionCode = "";
    await order.save();

    return res.status(200).json({
      success: true,
      message: "eSewa payment initiated",
      paymentUrl: esewaConfig.paymentUrl,
      successUrl,
      failureUrl,
      formData: {
        amount: totalAmount,
        tax_amount: "0",
        total_amount: totalAmount,
        transaction_uuid: transactionUuid,
        product_code: esewaConfig.productCode,
        product_service_charge: "0",
        product_delivery_charge: "0",
        success_url: successUrl,
        failure_url: failureUrl,
        signed_field_names: "total_amount,transaction_uuid,product_code",
        signature,
      },
    });
  } catch (error: any) {
    console.error("INITIATE ESEWA ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to initiate eSewa payment",
    });
  }
};

export const verifyEsewaPayment = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = getLoggedInUserId(req);
    const orderId = String(req.body?.orderId ?? "");

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Valid order id is required",
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      user: userId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Safe retry: a verified order can be returned more than once.
    if (order.paymentStatus === "paid") {
      return res.status(200).json({
        success: true,
        message: "eSewa payment is already verified",
        order: formatOrder(order),
      });
    }

    if (order.paymentMethod !== "esewa") {
      return res.status(400).json({
        success: false,
        message: "This is not an eSewa order",
      });
    }

    if (!order.transactionUuid) {
      return res.status(400).json({
        success: false,
        message: "The eSewa transaction has not been initiated",
      });
    }

    const statusResult = await checkEsewaTransactionStatus({
      transactionUuid: order.transactionUuid,
      totalAmount: Number(order.totalAmount),
    });

    const detailsMatch = statusMatchesOrder(order, statusResult);

    if (!detailsMatch) {
      return res.status(400).json({
        success: false,
        message: "eSewa verification details do not match this order",
        status: statusResult.status,
      });
    }

    if (statusResult.status !== "COMPLETE") {
      return res.status(409).json({
        success: false,
        message: `Payment is not complete. Current eSewa status: ${statusResult.status}`,
        status: statusResult.status,
      });
    }

    await finalizeVerifiedEsewaOrder(
      order,
      statusResult.referenceId
    );

    return res.status(200).json({
      success: true,
      message: "eSewa payment verified",
      order: formatOrder(order),
    });
  } catch (error: any) {
    console.error("VERIFY ESEWA ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to verify eSewa payment",
    });
  }
};

export const markEsewaPaymentFailed = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = getLoggedInUserId(req);
    const orderId = String(req.body?.orderId ?? "");
    const reason = String(
      req.body?.reason ?? "eSewa payment was not completed"
    ).trim();

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Valid order id is required",
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      user: userId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.paymentStatus === "paid") {
      return res.status(409).json({
        success: false,
        message: "A verified payment cannot be marked as failed",
        order: formatOrder(order),
      });
    }

    /*
     * Re-check eSewa immediately before cancelling. This prevents
     * a completed payment from being marked failed when the user
     * closes the WebView during the success redirect.
     */
    if (order.paymentMethod === "esewa" && order.transactionUuid) {
      try {
        const statusResult = await checkEsewaTransactionStatus({
          transactionUuid: order.transactionUuid,
          totalAmount: Number(order.totalAmount),
        });

        if (!statusMatchesOrder(order, statusResult)) {
          return res.status(400).json({
            success: false,
            message: "eSewa verification details do not match this order",
            status: statusResult.status,
          });
        }

        if (statusResult.status === "COMPLETE") {
          await finalizeVerifiedEsewaOrder(
            order,
            statusResult.referenceId
          );

          return res.status(200).json({
            success: true,
            message:
              "The payment completed before cancellation and was verified",
            order: formatOrder(order),
          });
        }
      } catch (statusError: any) {
        console.error(
          "ESEWA STATUS CHECK BEFORE CANCELLATION ERROR:",
          statusError
        );

        return res.status(503).json({
          success: false,
          message:
            "FreshCart could not confirm the latest eSewa status. Please try again before cancelling.",
        });
      }
    }

    // Restore stock only on the first transition to failed/cancelled.
    const shouldRestoreStock =
      order.paymentStatus !== "failed" &&
      order.orderStatus !== "cancelled";

    if (shouldRestoreStock) {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }
    }

    order.paymentStatus = "failed";
    order.orderStatus = "cancelled";
    order.hiddenFromCustomer = true;

    if (shouldRestoreStock) {
      const failureNote = `eSewa payment failed/cancelled on ${new Date().toLocaleString()}. Reason: ${reason}`;

      order.notes = order.notes
        ? `${order.notes}\n${failureNote}`
        : failureNote;
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: "eSewa payment marked as failed and reserved stock restored",
      order: formatOrder(order),
    });
  } catch (error: any) {
    console.error("ESEWA FAILURE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to mark eSewa payment as failed",
    });
  }
};
