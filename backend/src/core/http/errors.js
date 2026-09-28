export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = "Bad request", details) {
    return new AppError(400, "BAD_REQUEST", message, details);
  }

  static validation(details) {
    return new AppError(422, "VALIDATION_FAILED", "Request validation failed", details);
  }

  static unauthorized(message = "Authentication required", code = "UNAUTHORIZED") {
    return new AppError(401, code, message);
  }

  static forbidden(message = "You do not have permission to perform this action") {
    return new AppError(403, "FORBIDDEN", message);
  }

  static notFound(resource = "Resource") {
    return new AppError(404, "NOT_FOUND", `${resource} not found`);
  }

  static conflict(message, code = "CONFLICT") {
    return new AppError(409, code, message);
  }

  static tooMany(message = "Too many requests, please try again later") {
    return new AppError(429, "RATE_LIMITED", message);
  }
}
