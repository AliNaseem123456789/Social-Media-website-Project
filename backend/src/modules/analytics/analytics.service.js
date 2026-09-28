import { cache } from "#core/cache/cache.service.js";
import { cacheKeys } from "#core/cache/keys.js";
import { toPost } from "#modules/posts/posts.presenter.js";
import { analyticsRepository } from "./analytics.repository.js";

const STATS_TTL = 3600;
const TRENDING_TTL = 300;

export const analyticsService = {
  async userStats(userId) {
    return cache.wrap(cacheKeys.userStats(userId), STATS_TTL, () => this.refreshUserStats(userId, false));
  },

  async refreshUserStats(userId, writeCache = true) {
    const stats = await analyticsRepository.computeUserStats(userId);
    await analyticsRepository.saveUserStats(userId, stats);
    if (writeCache) await cache.set(cacheKeys.userStats(userId), stats, STATS_TTL);
    return stats;
  },

  async invalidateUserStats(...userIds) {
    await cache.del(...userIds.filter(Boolean).map((id) => cacheKeys.userStats(id)));
  },

  async trending(limit = 5) {
    return cache.wrap(`${cacheKeys.trending()}:${limit}`, TRENDING_TTL, async () => {
      const since = new Date(Date.now() - 7 * 864e5);
      return (await analyticsRepository.trendingPosts(since, limit)).map(toPost);
    });
  },
};
