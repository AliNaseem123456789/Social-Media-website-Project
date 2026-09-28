import { prisma } from "#core/db/prisma.js";
import { userSummarySelect } from "#shared/user-summary.js";

const select = {
  id: true,
  roomId: true,
  callerId: true,
  calleeId: true,
  video: true,
  status: true,
  startedAt: true,
  answeredAt: true,
  endedAt: true,
  caller: { select: userSummarySelect },
  callee: { select: userSummarySelect },
};

export const callsRepository = {
  async start({ roomId, callerId, calleeId, video }) {
    const existing = await prisma.callLog.findUnique({ where: { roomId }, select: { id: true } });
    if (existing) return prisma.callLog.findUnique({ where: { roomId }, select });
    return prisma.callLog.create({ data: { roomId, callerId, calleeId, video }, select });
  },

  findByRoom(roomId) {
    return prisma.callLog.findUnique({ where: { roomId }, select });
  },

  update(roomId, data) {
    return prisma.callLog.update({ where: { roomId }, data, select });
  },

  list(userId, cursor, limit) {
    const after = cursor && {
      OR: [
        { startedAt: { lt: new Date(cursor.at) } },
        { startedAt: new Date(cursor.at), id: { lt: cursor.id } },
      ],
    };
    return prisma.callLog.findMany({
      where: { OR: [{ callerId: userId }, { calleeId: userId }], ...(after ? { AND: [after] } : {}) },
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select,
    });
  },

  countMissed(userId) {
    return prisma.callLog.count({ where: { calleeId: userId, status: "missed" } });
  },

  /**
   * Calls left ringing (the app was closed before anything ended them) are settled by a periodic sweep
   * so they do not sit in the history as active forever.
   */
  staleRinging(olderThan, limit) {
    return prisma.callLog.findMany({
      where: { status: "ringing", startedAt: { lt: olderThan } },
      orderBy: { startedAt: "asc" },
      take: limit,
      select,
    });
  },
};
