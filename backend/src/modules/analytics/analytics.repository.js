import { prisma } from "#core/db/prisma.js";
import { repostSelect } from "#modules/posts/posts.presenter.js";

export const analyticsRepository = {
  async computeUserStats(userId) {
    const [totalPosts, likes, comments, totalFriends] = await Promise.all([
      prisma.post.count({ where: { userId } }),
      prisma.like.count({ where: { post: { userId } } }),
      prisma.comment.count({ where: { post: { userId } } }),
      prisma.friendship.count({
        where: { status: "accepted", OR: [{ requesterId: userId }, { recipientId: userId }] },
      }),
    ]);
    return { totalPosts, totalLikesReceived: likes, totalCommentsReceived: comments, totalFriends };
  },

  async saveUserStats(userId, stats) {
    const data = { ...stats, updatedAt: new Date() };
    const { count } = await prisma.userStats.updateMany({ where: { userId }, data });
    if (count === 0) await prisma.userStats.create({ data: { userId, ...data } });
  },

  trendingPosts(since, limit) {
    return prisma.post.findMany({
      where: { createdAt: { gte: since } },
      orderBy: [{ totalLikes: "desc" }, { totalComments: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: repostSelect,
    });
  },

  recordEvent({ userId, eventType, eventData, createdAt }) {
    return prisma.analyticsEvent.create({ data: { userId, eventType, eventData, createdAt } });
  },
};
