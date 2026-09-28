import { prisma } from "#core/db/prisma.js";
import { repostSelect } from "#modules/posts/posts.presenter.js";

const afterCursor = (cursor) =>
  cursor && {
    OR: [
      { createdAt: { lt: new Date(cursor.at) } },
      { createdAt: new Date(cursor.at), id: { lt: cursor.id } },
    ],
  };

export const feedRepository = {
  async friendIds(userId) {
    const rows = await prisma.friendship.findMany({
      where: { status: "accepted", OR: [{ requesterId: userId }, { recipientId: userId }] },
      select: { requesterId: true, recipientId: true },
    });
    return rows.map((r) => (r.requesterId === userId ? r.recipientId : r.requesterId));
  },

  async followingIds(userId) {
    const rows = await prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } });
    return rows.map((r) => r.followingId);
  },

  /**
   * Authors whose posts belong in a personal feed: accepted friends plus everyone the user follows.
   */
  async connectionIds(userId) {
    const [friends, following] = await Promise.all([this.friendIds(userId), this.followingIds(userId)]);
    return [...new Set([...friends, ...following])];
  },

  chronological({ authorIds }, cursor, limit) {
    const where = authorIds ? { userId: { in: authorIds } } : {};
    const after = afterCursor(cursor);
    return prisma.post.findMany({
      where: after ? { AND: [where, after] } : where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: repostSelect,
    });
  },

  byIds(ids) {
    return prisma.post.findMany({ where: { id: { in: ids } }, select: repostSelect });
  },

  rankingCandidates(authorIds, since, take) {
    return prisma.post.findMany({
      where: { userId: { in: authorIds }, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, userId: true, createdAt: true, _count: { select: { likes: true, comments: true } } },
    });
  },
};
