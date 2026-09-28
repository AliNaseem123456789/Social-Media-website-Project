import { verifyAccessToken, isSessionRevoked } from "#core/auth/jwt.js";
import { AppError } from "./errors.js";

function extractBearer(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

/**
 * Resolves the caller from the Authorization header when present. Never rejects on its own;
 * use requireAuth on routes that need a user.
 */
export async function authenticate(req, res, next) {
  const token = extractBearer(req);
  if (!token) return next();
  try {
    const user = verifyAccessToken(token);
    if (await isSessionRevoked(user.sessionId)) {
      req.authError = AppError.unauthorized("Session has been revoked", "SESSION_REVOKED");
      return next();
    }
    req.user = user;
  } catch (err) {
    req.authError =
      err.name === "TokenExpiredError"
        ? AppError.unauthorized("Access token expired", "TOKEN_EXPIRED")
        : AppError.unauthorized("Invalid access token", "INVALID_TOKEN");
  }
  next();
}

export function requireAuth(req, res, next) {
  if (req.user) return next();
  next(req.authError || AppError.unauthorized());
}

export function requireVerifiedEmail(req, res, next) {
  if (!req.user) return next(req.authError || AppError.unauthorized());
  if (!req.user.emailVerified) {
    return next(new AppError(403, "EMAIL_NOT_VERIFIED", "Please verify your email address first"));
  }
  next();
}
