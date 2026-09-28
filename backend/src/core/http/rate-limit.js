import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { config } from "#config";
import { getRedis } from "#core/cache/redis.js";
import { cacheKeys } from "#core/cache/keys.js";

function store(name) {
  return new RedisStore({
    prefix: `${cacheKeys.rateLimit()}${name}:`,
    sendCommand: (command, ...args) => getRedis().call(command, ...args),
  });
}

function limiter(name, { windowMs, limit, keyGenerator, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests,
    passOnStoreError: true,
    store: store(name),
    keyGenerator,
    handler: (req, res) =>
      res.status(429).json({
        success: false,
        error: { code: "RATE_LIMITED", message: "Too many requests, please try again later", requestId: req.id },
      }),
  });
}

const ipKey = (req) => ipKeyGenerator(req.ip);

const ipAndEmailKey = (req) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  return `${ipKeyGenerator(req.ip)}|${email}`;
};

export const rateLimiters = {
  api: limiter("api", {
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.max,
    keyGenerator: (req) => (req.user ? `u:${req.user.id}` : ipKey(req)),
  }),
  auth: limiter("auth", {
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.authMax,
    keyGenerator: ipKey,
  }),
  login: limiter("login", {
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.sensitiveMax * 2,
    keyGenerator: ipAndEmailKey,
    skipSuccessfulRequests: true,
  }),
  sensitive: limiter("sensitive", {
    windowMs: 60 * 60 * 1000,
    limit: config.rateLimit.sensitiveMax,
    keyGenerator: ipAndEmailKey,
  }),
};
