import { z } from "zod";
import { prisma } from "#core/db/prisma.js";
import { AppError } from "#core/http/errors.js";
import { decodeCursor, page } from "#core/http/pagination.js";
import { cache } from "#core/cache/cache.service.js";
import { cacheKeys } from "#core/cache/keys.js";
import { eventBus } from "#core/messaging/event-bus.js";
import { EVENTS } from "#core/messaging/topology.js";
import { toUserSummary } from "#shared/user-summary.js";
import { assertCanViewUser } from "#shared/visibility.js";
import { assertNotBlocked, hiddenUserIds } from "#shared/blocks.js";
import { followsRepository } from "./follows.repository.js";

const COUNTS_TTL = 120;
const cursorShape = z.object({ at: z.string(), id: z.number().int() });

async function requireUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true } });
  if (!user) throw AppError.notFound("User");
  return user;
}

async function resetCounts(...userIds) {
  await cache.del(...userIds.map((id) => cacheKeys.followCounts(id)));
}

export const followsService = {
  counts(userId) {
    return cache.wrap(cacheKeys.followCounts(userId), COUNTS_TTL, () => followsRepository.counts(userId));
  },

  relation(viewerId, targetId) {
    return followsRepository.relation(viewerId, targetId);
  },

  async follow(user, targetId) {
    if (user.id === targetId) throw AppError.badRequest("You cannot follow yourself");
    const target = await requireUser(targetId);
    await assertNotBlocked(user.id, targetId);
    await assertCanViewUser(user.id, targetId);

    const { created } = await followsRepository.follow(user.id, targetId);
    await resetCounts(user.id, targetId);
    if (created) {
      await eventBus.publish(EVENTS.USER_FOLLOWED, {
        targetUserId: targetId,
        actorId: user.id,
        actorName: user.username,
      });
    }
    const counts = await this.counts(targetId);
    return {
      following: true,
      username: target.username,
      followerCount: counts.followers,
      followingCount: counts.following,
    };
  },

  async unfollow(user, targetId) {
    const { removed } = await followsRepository.unfollow(user.id, targetId);
    await resetCounts(user.id, targetId);
    if (removed) {
      await eventBus.publish(EVENTS.USER_UNFOLLOWED, { targetUserId: targetId, actorId: user.id });
    }
    const counts = await this.counts(targetId);
    return { following: false, followerCount: counts.followers, followingCount: counts.following };
  },

  async listFollowers(viewerId, userId, query) {
    await assertCanViewUser(viewerId, userId);
    const cursor = decodeCursor(query.cursor, cursorShape);
    const rows = await followsRepository.listFollowers(userId, cursor, query.limit);
    const result = page(rows, query.limit, (r) => ({ at: r.createdAt.toISOString(), id: r.followerId }));
    return this.decorate(viewerId, result, (r) => r.follower, (r) => r.createdAt);
  },

  async listFollowing(viewerId, userId, query) {
    await assertCanViewUser(viewerId, userId);
    const cursor = decodeCursor(query.cursor, cursorShape);
    const rows = await followsRepository.listFollowing(userId, cursor, query.limit);
    const result = page(rows, query.limit, (r) => ({ at: r.createdAt.toISOString(), id: r.followingId }));
    return this.decorate(viewerId, result, (r) => r.following, (r) => r.createdAt);
  },

  async decorate(viewerId, result, pick, at) {
    const hidden = new Set(await hiddenUserIds(viewerId));
    const rows = hidden.size ? result.items.filter((row) => !hidden.has(pick(row)?.id)) : result.items;
    result = { ...result, items: rows };
    const users = result.items.map(pick);
    const ids = users.map((u) => u.id);
    const [followingIds, mutuals] = await Promise.all([
      viewerId ? followsRepository.followingIdsOf(viewerId) : [],
      followsRepository.mutualCounts(viewerId, ids),
    ]);
    const followingSet = new Set(followingIds);
    return {
      items: users.map((user, index) => ({
        ...toUserSummary(user),
        followedAt: at(result.items[index]),
        followedByMe: followingSet.has(user.id),
        mutualFollowers: mutuals.get(user.id) ?? 0,
      })),
      pageInfo: result.pageInfo,
    };
  },
};
