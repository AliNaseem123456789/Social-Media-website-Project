import multer from "multer";
import { Prisma } from "@prisma/client";
import { childLogger } from "#core/logger/index.js";
import { AppError } from "./errors.js";

const log = childLogger("http");

function normalize(err) {
  if (err instanceof AppError) return err;
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "File is too large" : err.message;
    return AppError.badRequest(message);
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return AppError.conflict("A record with these details already exists");
    if (err.code === "P2025") return AppError.notFound();
  }
  if (err?.type === "entity.parse.failed") return AppError.badRequest("Malformed JSON body");
  if (err?.type === "entity.too.large") return new AppError(413, "PAYLOAD_TOO_LARGE", "Request body is too large");
  return null;
}

export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: { code: "ROUTE_NOT_FOUND", message: "Route not found" } });
}

export function errorHandler(err, req, res, _next) {
  const known = normalize(err);
  if (!known) {
    log.error({ err, reqId: req.id, path: req.originalUrl }, "unhandled error");
  }
  const status = known?.status ?? 500;
  res.status(status).json({
    success: false,
    error: {
      code: known?.code ?? "INTERNAL_ERROR",
      message: known?.message ?? "Something went wrong",
      ...(known?.details ? { details: known.details } : {}),
      requestId: req.id,
    },
  });
}
