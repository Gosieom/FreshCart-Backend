import {
  ErrorRequestHandler,
  NextFunction,
  Request,
  Response,
} from "express";
import mongoose from "mongoose";
import multer from "multer";

import { IS_PRODUCTION } from "../config";
import { HttpException } from "../exceptions/http-exception";

type MongoServerError = Error & {
  code?: number;
  keyValue?: Record<string, unknown>;
};

export const notFoundMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(
    new HttpException(
      404,
      `Route ${req.method} ${req.originalUrl} was not found`
    )
  );
};

export const errorMiddleware: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next
) => {
  let statusCode = 500;
  let message = "Internal server error";
  let details: unknown;

  if (error instanceof HttpException) {
    statusCode = error.statusCode;
    message = error.message;
    details = error.details;
  } else if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = "Validation failed";
    details = Object.values(error.errors).map(
      (validationError) => validationError.message
    );
  } else if (error instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid value provided for ${error.path}`;
  } else if (error instanceof multer.MulterError) {
    statusCode = 400;

    message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Uploaded file is too large"
        : error.message;
  } else {
    const mongoError = error as MongoServerError;

    if (mongoError.code === 11000) {
      const duplicateField = mongoError.keyValue
        ? Object.keys(mongoError.keyValue)[0]
        : "value";

      statusCode = 409;
      message = `${duplicateField} already exists`;
    } else if (error instanceof Error) {
      message = error.message || message;
    }
  }

  const response: Record<string, unknown> = {
    success: false,
    message,
  };

  if (details !== undefined) {
    response.details = details;
  }

  if (!IS_PRODUCTION && error instanceof Error) {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
};