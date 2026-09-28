import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}
