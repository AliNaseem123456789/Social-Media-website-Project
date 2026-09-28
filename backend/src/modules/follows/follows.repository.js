import { prisma } from "#core/db/prisma.js";
import { userSummarySelect } from "#shared/user-summary.js";

const after = (cursor, column) =>
  cursor && {
    OR: [
      { createdAt: { lt: new Date(cursor.at) } },
      { createdAt: new Date(cursor.at), [column]: { lt: cursor.id } },
    ],
  };

export const followsRepository = {
  async follow(followerId, followingId) {
    const key = { followerId_followingId: { followerId, followingId } };
    const existing = await prisma.follow.findUnique({ where: key, select: { followerId: true } });
    if (!existing) await prisma.follow.create({ data: { followerId, followingId } });
    return { created: !existing };
  },

  async unfollow(followerId, followingId) {
    const { count } = await prisma.follow.deleteMany({ where: { followerId, followingId } });
    return { removed: count > 0 };
  },

  async counts(userId) {
    const [followers, following] = await Promise.all([
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
    ]);
    return { followers, following };
  },

  async relation(viewerId, targetId) {
    if (!viewerId || viewerId === targetId) return { following: false, followedBy: false };
    const [following, followedBy] = await Promise.all([
      prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: targetId } },
        select: { followerId: true },
      }),
      prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: targetId, followingId: viewerId } },
        select: { followerId: true },
      }),
    ]);
    return { following: Boolean(following), followedBy: Boolean(followedBy) };
  },

  listFollowers(userId, cursor, limit) {
    const clause = after(cursor, "followerId");
    return prisma.follow.findMany({
      where: { followingId: userId, ...(clause ? { AND: [clause] } : {}) },
      orderBy: [{ createdAt: "desc" }, { followerId: "desc" }],
      take: limit + 1,
      select: { createdAt: true, followerId: true, follower: { select: userSummarySelect } },
    });
  },

  listFollowing(userId, cursor, limit) {
    const clause = after(cursor, "followingId");
    return prisma.follow.findMany({
      where: { followerId: userId, ...(clause ? { AND: [clause] } : {}) },
      orderBy: [{ createdAt: "desc" }, { followingId: "desc" }],
      take: limit + 1,
      select: { createdAt: true, followingId: true, following: { select: userSummarySelect } },
    });
  },

  async followingIdsOf(userId) {
    const rows = await prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } });
    return rows.map((r) => r.followingId);
  },

  /**
   * How many of the viewer's own follows also follow each candidate: the "followed by N people you
   * follow" line and a strong ranking signal for suggestions.
   */
  async mutualCounts(viewerId, candidateIds) {
    if (!viewerId || !candidateIds.length) return new Map();
    const rows = await prisma.$queryRaw`
      SELECT f.following_id AS "userId", count(*)::int AS mutuals
      FROM follows f
      WHERE f.following_id = ANY(${candidateIds}::int[])
        AND f.follower_id IN (SELECT following_id FROM follows WHERE follower_id = ${viewerId}::int)
      GROUP BY f.following_id`;
    return new Map(rows.map((r) => [Number(r.userId), Number(r.mutuals)]));
  },
};
