import { prisma } from "#core/db/prisma.js";

export const notificationsRepository = {
  list(userId, { unread }, cursor, limit, hidden = []) {
    return prisma.notification.findMany({
      where: {
        userId,
        ...(unread ? { read: false } : {}),
        ...(hidden.length ? { NOT: { actorId: { in: hidden } } } : {}),
        ...(cursor ? { id: { lt: cursor.id } } : {}),
      },
      orderBy: { id: "desc" },
      take: limit + 1,
    });
  },

  countUnread(userId, hidden = []) {
    return prisma.notification.count({
      where: { userId, read: false, ...(hidden.length ? { NOT: { actorId: { in: hidden } } } : {}) },
    });
  },

  markRead(userId, id) {
    return prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
  },

  markAllRead(userId) {
    return prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  },

  findDuplicate({ userId, type, actorId, targetId }) {
    return prisma.notification.findFirst({
      where: { userId, type, actorId, targetId: targetId ?? null, read: false },
      select: { id: true },
    });
  },

  create(data) {
    return prisma.notification.create({ data });
  },

  recipient(userId) {
    return prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, username: true } });
  },
};
