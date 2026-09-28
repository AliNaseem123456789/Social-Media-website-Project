import express from "express";
import { config } from "./config/index.js";
import { logger } from "./logger.js";
import { rabbitmq } from "./messaging/rabbitmq.js";
import { startConsumer } from "./messaging/consumer.js";
import { handleEmailJob, SUPPORTED_TYPES } from "./handlers/index.js";
import { verifyTransport, closeTransport } from "./mail/transport.js";

async function start() {
  await verifyTransport().catch((err) => {
    logger.warn({ err: err.message }, "smtp verification failed, emails will be retried");
  });

  startConsumer(handleEmailJob);
  await rabbitmq.connect().catch((err) => {
    logger.error({ err: err.message }, "rabbitmq unavailable at startup, retrying in background");
  });

  const app = express();
  app.disable("x-powered-by");

  app.get("/health", (req, res) => {
    res.json({ status: "ok", service: config.serviceName, types: SUPPORTED_TYPES });
  });

  app.get("/ready", (req, res) => {
    const ready = rabbitmq.isConnected;
    res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "degraded", rabbitmq: ready ? "up" : "down" });
  });

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, queue: config.rabbitmq.queue }, "email service listening");
  });

  const shutdown = async (signal) => {
    logger.info({ signal }, "shutting down");
    server.close();
    await rabbitmq.close();
    closeTransport();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((err) => {
  logger.fatal({ err }, "failed to start email service");
  process.exit(1);
});
