import { prisma } from "#core/db/prisma.js";
import { userSummarySelect } from "#shared/user-summary.js";

const between = (a, b) => ({
  OR: [
    { requesterId: a, recipientId: b },
    { requesterId: b, recipientId: a },
  ],
});

export const friendsRepository = {
  findBetween(a, b) {
    return prisma.friendship.findFirst({ where: between(a, b) });
  },

  findById(id) {
    return prisma.friendship.findUnique({ where: { id } });
  },

  userExists(id) {
    return prisma.user.findUnique({ where: { id }, select: { id: true, username: true } });
  },

  create(requesterId, recipientId) {
    return prisma.friendship.create({ data: { requesterId, recipientId, status: "pending" } });
  },

  async recreate(existingId, requesterId, recipientId) {
    return prisma.$transaction(async (tx) => {
      await tx.friendship.delete({ where: { id: existingId } });
      return tx.friendship.create({ data: { requesterId, recipientId, status: "pending" } });
    });
  },

  setStatus(id, status) {
    return prisma.friendship.update({ where: { id }, data: { status } });
  },

  delete(id) {
    return prisma.friendship.delete({ where: { id } });
  },

  async listFriends(userId) {
    const rows = await prisma.friendship.findMany({
      where: { status: "accepted", OR: [{ requesterId: userId }, { recipientId: userId }] },
      select: {
        id: true,
        requesterId: true,
        requester: { select: userSummarySelect },
        recipient: { select: userSummarySelect },
      },
    });
    return rows.map((r) => ({ friendshipId: r.id, user: r.requesterId === userId ? r.recipient : r.requester }));
  },

  async friendIds(userId) {
    const rows = await prisma.friendship.findMany({
      where: { status: "accepted", OR: [{ requesterId: userId }, { recipientId: userId }] },
      select: { requesterId: true, recipientId: true },
    });
    return rows.map((r) => (r.requesterId === userId ? r.recipientId : r.requesterId));
  },

  listRequests(userId, direction) {
    const incoming = direction === "incoming";
    return prisma.friendship.findMany({
      where: { status: "pending", ...(incoming ? { recipientId: userId } : { requesterId: userId }) },
      orderBy: { id: "desc" },
      select: {
        id: true,
        requester: { select: userSummarySelect },
        recipient: { select: userSummarySelect },
      },
    });
  },

  async suggestions(userId, limit) {
    const related = await prisma.friendship.findMany({
      where: { OR: [{ requesterId: userId }, { recipientId: userId }], status: { in: ["pending", "accepted"] } },
      select: { requesterId: true, recipientId: true },
    });
    const exclude = new Set([userId, ...related.flatMap((r) => [r.requesterId, r.recipientId])]);
    return prisma.user.findMany({
      where: { id: { notIn: [...exclude] } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: userSummarySelect,
    });
  },
};
