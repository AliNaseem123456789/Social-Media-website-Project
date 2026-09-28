import { z } from "zod";
import { AppError } from "./errors.js";

export const cursorQuery = {
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
};

export function encodeCursor(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeCursor(cursor, shape) {
  if (!cursor) return null;
  try {
    const parsed = shape.parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")));
    return parsed;
  } catch {
    throw AppError.badRequest("Invalid pagination cursor");
  }
}

export function page(items, limit, toCursor) {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  return {
    items: data,
    pageInfo: { hasMore, nextCursor: hasMore ? encodeCursor(toCursor(data[data.length - 1])) : null },
  };
}
