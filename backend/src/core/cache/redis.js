import Redis from "ioredis";
import { config } from "#config";
import { childLogger } from "#core/logger/index.js";

const log = childLogger("redis");
const clients = new Map();

function createClient(name) {
  const client = new Redis(config.redis.url, {
    connectionName: `${config.serviceName}:${name}`,
    maxRetriesPerRequest: name === "subscriber" ? null : 3,
    enableAutoPipelining: name === "main",
    lazyConnect: true,
    retryStrategy: (attempt) => Math.min(attempt * 200, 5000),
  });
  client.on("ready", () => log.info({ client: name }, "redis ready"));
  client.on("error", (err) => log.error({ client: name, err: err.message }, "redis error"));
  client.on("reconnecting", () => log.warn({ client: name }, "redis reconnecting"));
  return client;
}

export function getRedis(name = "main") {
  if (!clients.has(name)) clients.set(name, createClient(name));
  return clients.get(name);
}

export async function connectRedis(...names) {
  const targets = names.length ? names : ["main"];
  await Promise.all(
    targets.map(async (name) => {
      const client = getRedis(name);
      if (client.status === "wait" || client.status === "end") await client.connect();
    }),
  );
}

export async function disconnectRedis() {
  await Promise.allSettled([...clients.values()].map((c) => c.quit()));
  clients.clear();
}

export async function pingRedis() {
  return (await getRedis().ping()) === "PONG";
}
