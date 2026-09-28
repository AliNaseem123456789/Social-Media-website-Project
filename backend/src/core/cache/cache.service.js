import { getRedis } from "./redis.js";
import { childLogger } from "#core/logger/index.js";

const log = childLogger("cache");

async function safely(operation, fallback) {
  try {
    return await operation();
  } catch (err) {
    log.warn({ err: err.message }, "cache operation failed");
    return fallback;
  }
}

export const cache = {
  async get(key) {
    return safely(async () => {
      const raw = await getRedis().get(key);
      return raw === null ? null : JSON.parse(raw);
    }, null);
  },

  async set(key, value, ttlSeconds) {
    return safely(async () => {
      const payload = JSON.stringify(value);
      if (ttlSeconds) await getRedis().set(key, payload, "EX", ttlSeconds);
      else await getRedis().set(key, payload);
      return true;
    }, false);
  },

  async wrap(key, ttlSeconds, producer) {
    const cached = await this.get(key);
    if (cached !== null) return cached;
    const fresh = await producer();
    if (fresh !== undefined && fresh !== null) await this.set(key, fresh, ttlSeconds);
    return fresh;
  },

  async del(...keys) {
    const valid = keys.filter(Boolean);
    if (!valid.length) return 0;
    return safely(() => getRedis().del(...valid), 0);
  },

  async delPattern(pattern) {
    return safely(async () => {
      const redis = getRedis();
      let cursor = "0";
      let removed = 0;
      do {
        const [next, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 200);
        cursor = next;
        if (keys.length) removed += await redis.unlink(...keys);
      } while (cursor !== "0");
      return removed;
    }, 0);
  },

  async incr(key, ttlSeconds) {
    return safely(async () => {
      const value = await getRedis().incr(key);
      if (ttlSeconds) await getRedis().expire(key, ttlSeconds);
      return value;
    }, null);
  },
};
