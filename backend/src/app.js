import express from "express";
import cookieParser from "cookie-parser";
import { config } from "#config";
import { requestLogger } from "#core/http/request-context.js";
import { securityHeaders, corsMiddleware } from "#core/http/security.js";
import { authenticate } from "#core/http/authenticate.js";
import { rateLimiters } from "#core/http/rate-limit.js";
import { errorHandler, notFoundHandler } from "#core/http/error-handler.js";
import { pingDatabase } from "#core/db/prisma.js";
import { pingRedis } from "#core/cache/redis.js";
import { pingRabbit } from "#core/messaging/rabbitmq.js";

async function check(fn) {
  try {
    return (await fn()) ? "up" : "down";
  } catch {
    return "down";
  }
}

export function createApp(modules) {
  const app = express();

  app.set("trust proxy", config.trustProxy);
  app.disable("x-powered-by");

  app.use(requestLogger());
  app.use(securityHeaders());
  app.use(corsMiddleware());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
  app.use(cookieParser());
  app.use(authenticate);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: config.serviceName, modules: modules.map((m) => m.name) });
  });

  app.get("/api/ready", async (req, res) => {
    const checks = {
      database: await check(pingDatabase),
      redis: await check(pingRedis),
      rabbitmq: await check(pingRabbit),
    };
    const ready = Object.values(checks).every((s) => s === "up");
    res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "degraded", checks });
  });

  const api = express.Router();
  api.use(rateLimiters.api);
  for (const module of modules) {
    api.use(module.basePath, module.router);
  }
  app.use(config.apiPrefix, api);

  return app;
}

export function finalizeApp(app) {
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
