import { storage, buckets } from "#core/storage/index.js";
import { cache } from "#core/cache/cache.service.js";
import { cacheKeys } from "#core/cache/keys.js";
import { postsService } from "#modules/posts/posts.service.js";
import { hiddenUserIds } from "#shared/blocks.js";
import { suggestionsRepository } from "./suggestions.repository.js";

const TTL = 600;

const reason = (row) => {
  if (row.mutualFollows > 0) {
    return `Followed by ${row.mutualFollows} ${row.mutualFollows === 1 ? "person" : "people"} you follow`;
  }
  if (row.sharedHobbies.length) return `Also into ${row.sharedHobbies.slice(0, 2).join(" and ")}`;
  if (row.sameEducation) return "Studied at the same place";
  if (row.sameCountry) return "From your country";
  return "New on the platform";
};

export const suggestionsService = {
  async people(userId, { limit }) {
    const items = await cache.wrap(cacheKeys.suggestedPeople(userId), TTL, async () => {
      const rows = await suggestionsRepository.people(userId, limit, await hiddenUserIds(userId));
      return rows.map((row) => ({
        id: row.id,
        username: row.username,
        avatarUrl: storage.resolveUrl(buckets.avatars, row.profileImage),
        bio: row.bio,
        mutualFollows: row.mutualFollows,
        sharedHobbies: row.sharedHobbies,
        reason: reason(row),
        followedByMe: false,
      }));
    });
    return { items: items.slice(0, limit) };
  },

  async hashtags(userId, { limit }) {
    const items = await cache.wrap(cacheKeys.suggestedTags(userId), TTL, async () => {
      const own = await suggestionsRepository.hashtags(userId, limit);
      if (own.length >= limit) return own;
      const trending = await postsService.trendingHashtags({ days: 7, limit });
      const seen = new Set(own.map((t) => t.tag));
      return [...own, ...trending.filter((t) => !seen.has(t.tag))].slice(0, limit);
    });
    return { items: items.slice(0, limit) };
  },
};
