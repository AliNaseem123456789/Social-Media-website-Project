import { createServer } from "node:http";
import { config } from "#config";
import { logger } from "#core/logger/index.js";
import { connectDatabase, disconnectDatabase } from "#core/db/prisma.js";
import { connectRedis, disconnectRedis } from "#core/cache/redis.js";
import { rabbitmq } from "#core/messaging/rabbitmq.js";
import { createSocketServer } from "#core/realtime/socket-server.js";
import { loadModules } from "./modules/registry.js";
import { registerWorkers, resolveWorkers } from "./workers/registry.js";
import { createApp, finalizeApp } from "./app.js";

async function start() {
  const modules = await loadModules(config.enabledModules);

  await connectDatabase();
  await connectRedis("main", "socket-pub");
  if (config.embeddedWorkers.length) {
    const workers = resolveWorkers(config.embeddedWorkers);
    await registerWorkers(workers);
    logger.info({ workers }, "running workers inside the api process");
  }
  await rabbitmq.connect().catch((err) => {
    logger.error({ err: err.message }, "rabbitmq unavailable at startup, retrying in background");
  });

  const app = createApp(modules);
  const httpServer = createServer(app);

  if (config.legacyGraphql) {
    const { mountLegacyGraphql } = await import("./modules/feed/legacy-graphql/index.js");
    await mountLegacyGraphql(app, httpServer);
    logger.warn("legacy GraphQL endpoint enabled at /api/graphql (deprecated)");
  }
  finalizeApp(app);

  const socketRegistrars = modules.map((m) => m.socket).filter(Boolean);
  const io = await createSocketServer(httpServer, socketRegistrars);

  await new Promise((resolve) => httpServer.listen(config.port, resolve));
  logger.info(
    { port: config.port, prefix: config.apiPrefix, modules: modules.map((m) => m.name) },
    "api server listening",
  );

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "shutting down");
    const timer = setTimeout(() => process.exit(1), 10000).unref();
    io.close();
    await new Promise((resolve) => httpServer.close(resolve));
    await rabbitmq.close();
    await disconnectRedis();
    await disconnectDatabase();
    clearTimeout(timer);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

process.on("unhandledRejection", (err) => logger.error({ err }, "unhandled rejection"));

start().catch((err) => {
  logger.fatal({ err }, "failed to start api server");
  process.exit(1);
});
