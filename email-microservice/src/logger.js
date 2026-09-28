import pino from "pino";
import { config } from "./config/index.js";

export const logger = pino({
  name: config.serviceName,
  level: config.logLevel,
  redact: { paths: ["*.to", "data.to"], censor: "[redacted]" },
  transport: config.isProduction
    ? undefined
    : { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" } },
});
