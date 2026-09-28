import { prisma } from "#core/db/prisma.js";

export const DEFAULT_SETTINGS = Object.freeze({
  profileVisibility: "public",
  allowMessagesFrom: "everyone",
  emailOnLike: true,
  emailOnComment: true,
  emailOnFriendRequest: true,
  emailOnMessage: true,
  emailOnMention: true,
  theme: "system",
});

const SELECT = {
  profileVisibility: true,
  allowMessagesFrom: true,
  emailOnLike: true,
  emailOnComment: true,
  emailOnFriendRequest: true,
  emailOnMessage: true,
  emailOnMention: true,
  theme: true,
  updatedAt: true,
};

export const settingsRepository = {
  find(userId) {
    return prisma.userSettings.findUnique({ where: { userId }, select: SELECT });
  },

  /**
   * Written without relying on a unique constraint being present on the shared database: an update
   * first, and a row created only when the user has no settings yet.
   */
  async save(userId, data) {
    const { count } = await prisma.userSettings.updateMany({ where: { userId }, data });
    if (count === 0) await prisma.userSettings.create({ data: { userId, ...data } });
    return this.find(userId);
  },
};
