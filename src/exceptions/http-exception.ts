export class HttpException extends Error {
  public readonly status: number;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    details?: unknown
  ) {
    super(message);

    this.name = "HttpException";
    this.status = statusCode;
    this.statusCode = statusCode;
    this.details = details;

    Object.setPrototypeOf(this, new.target.prototype);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpException);
    }
  }
}