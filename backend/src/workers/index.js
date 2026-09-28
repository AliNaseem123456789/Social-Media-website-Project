import { config } from "#config";
import { logger } from "#core/logger/index.js";
import { connectDatabase, disconnectDatabase } from "#core/db/prisma.js";
import { connectRedis, disconnectRedis } from "#core/cache/redis.js";
import { rabbitmq } from "#core/messaging/rabbitmq.js";
import { registerWorkers, resolveWorkers } from "./registry.js";

async function start() {
  const names = resolveWorkers(config.workers);

  await connectDatabase();
  await connectRedis("main", "socket-pub");
  const stopWorkers = await registerWorkers(names);
  await rabbitmq.connect().catch((err) => {
    logger.error({ err: err.message }, "rabbitmq unavailable at startup, retrying in background");
  });
  logger.info({ workers: names }, "workers running");

  const shutdown = async (signal) => {
    logger.info({ signal }, "stopping workers");
    stopWorkers();
    await rabbitmq.close();
    await disconnectRedis();
    await disconnectDatabase();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((err) => {
  logger.fatal({ err }, "failed to start workers");
  process.exit(1);
});
