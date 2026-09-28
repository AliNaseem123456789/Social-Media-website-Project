import { config } from "#config";
import { getRedis } from "#core/cache/redis.js";
import { cacheKeys } from "#core/cache/keys.js";
import { childLogger } from "#core/logger/index.js";
import { feedRepository } from "./feed.repository.js";
import { scorePost } from "./feed.ranking.js";

const log = childLogger("feed-builder");
const LOOKBACK_DAYS = 30;

export const feedBuilder = {
  async rebuild(userId) {
    const authorIds = [userId, ...(await feedRepository.connectionIds(userId))];
    const since = new Date(Date.now() - LOOKBACK_DAYS * 864e5);
    const candidates = await feedRepository.rankingCandidates(authorIds, since, config.feed.size * 2);

    const key = cacheKeys.userFeed(userId);
    const scored = candidates
      .map((p) => ({
        id: p.id,
        score: scorePost({
          createdAt: p.createdAt,
          likes: p._count.likes,
          comments: p._count.comments,
          isOwn: p.userId === userId,
        }),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, config.feed.size);

    const tx = getRedis().multi().del(key);
    if (scored.length) tx.zadd(key, ...scored.flatMap((s) => [s.score, String(s.id)]));
    else tx.zadd(key, 0, "0");
    tx.expire(key, config.feed.ttlSeconds);
    await tx.exec();
    log.debug({ userId, posts: scored.length }, "feed rebuilt");
  },

  async fanOutPost(postId, authorId, createdAt = new Date()) {
    const recipients = [authorId, ...(await feedRepository.connectionIds(authorId))];
    const redis = getRedis();
    await Promise.all(
      recipients.map(async (userId) => {
        const key = cacheKeys.userFeed(userId);
        if (!(await redis.exists(key))) return;
        const score = scorePost({ createdAt, likes: 0, comments: 0, isOwn: userId === authorId });
        await redis.multi().zadd(key, score, String(postId)).zrem(key, "0").exec();
      }),
    );
  },

  async removePost(postId, authorId) {
    const recipients = [authorId, ...(await feedRepository.connectionIds(authorId))];
    const pipeline = getRedis().pipeline();
    recipients.forEach((userId) => pipeline.zrem(cacheKeys.userFeed(userId), String(postId)));
    await pipeline.exec();
  },
};
