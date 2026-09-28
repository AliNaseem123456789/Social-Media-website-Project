import pino from "pino";
import { config } from "#config";

export const logger = pino({
  name: config.serviceName,
  level: config.logLevel,
  base: { service: config.serviceName },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
      "*.password",
      "*.token",
      "*.refreshToken",
    ],
    censor: "[redacted]",
  },
  transport: config.isProduction
    ? undefined
    : { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname,service" } },
});

export const childLogger = (component) => logger.child({ component });
