import { getRedis } from "#core/cache/redis.js";
import { config } from "#config";

const key = (userId) => `${config.redis.keyPrefix}presence:${userId}`;
const TTL = 60 * 60 * 24;

export const presence = {
  async connect(userId, socketId) {
    await getRedis().multi().sadd(key(userId), socketId).expire(key(userId), TTL).exec();
  },

  async disconnect(userId, socketId) {
    await getRedis().srem(key(userId), socketId);
  },

  async isOnline(userId) {
    return (await getRedis().scard(key(userId))) > 0;
  },

  async onlineSet(userIds) {
    if (!userIds.length) return new Set();
    const pipeline = getRedis().pipeline();
    userIds.forEach((id) => pipeline.scard(key(id)));
    const results = await pipeline.exec();
    return new Set(userIds.filter((_, i) => results[i]?.[1] > 0));
  },
};
