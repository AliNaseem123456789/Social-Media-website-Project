import helmet from "helmet";
import cors from "cors";
import { config } from "#config";

export const securityHeaders = () =>
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "same-site" },
    hsts: config.isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
  });

export const corsOptions = {
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes("*") || config.corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  exposedHeaders: ["X-Request-Id", "RateLimit", "RateLimit-Policy", "Retry-After"],
  maxAge: 86400,
};

export const corsMiddleware = () => cors(corsOptions);

export function noStore(req, res, next) {
  res.setHeader("Cache-Control", "no-store");
  next();
}
