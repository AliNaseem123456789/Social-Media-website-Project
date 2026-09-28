import { randomUUID } from "node:crypto";
import { pinoHttp } from "pino-http";
import { logger } from "#core/logger/index.js";

export const requestLogger = () =>
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const incoming = req.headers["x-request-id"];
      const id = typeof incoming === "string" && incoming.length <= 64 ? incoming : randomUUID();
      res.setHeader("X-Request-Id", id);
      return id;
    },
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    autoLogging: { ignore: (req) => req.url === "/api/health" },
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  });

export function clientInfo(req) {
  return {
    ipAddress: req.ip,
    userAgent: (req.headers["user-agent"] || "").slice(0, 400) || null,
  };
}
