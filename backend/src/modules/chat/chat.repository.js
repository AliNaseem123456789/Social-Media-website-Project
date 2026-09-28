import { prisma } from "#core/db/prisma.js";
import { userSummarySelect } from "#shared/user-summary.js";

export const directKey = (a, b) => `${Math.min(a, b)}:${Math.max(a, b)}`;

const messageSelect = {
  id: true,
  conversationId: true,
  senderId: true,
  body: true,
  imageUrl: true,
  createdAt: true,
  editedAt: true,
  deletedAt: true,
  sender: { select: userSummarySelect },
};

const conversationSelect = {
  id: true,
  type: true,
  title: true,
  imageUrl: true,
  createdBy: true,
  createdAt: true,
  lastMessageAt: true,
  members: {
    select: {
      userId: true,
      role: true,
      muted: true,
      lastReadMessageId: true,
      joinedAt: true,
      user: { select: userSummarySelect },
    },
  },
};

export const chatRepository = {
  userById(id) {
    return prisma.user.findUnique({ where: { id }, select: userSummarySelect });
  },

  usersByIds(ids) {
    return prisma.user.findMany({ where: { id: { in: ids } }, select: userSummarySelect });
  },

  findConversation(id) {
    return prisma.conversation.findUnique({ where: { id }, select: conversationSelect });
  },

  findDirect(a, b) {
    return prisma.conversation.findUnique({ where: { directKey: directKey(a, b) }, select: conversationSelect });
  },

  async createDirect(a, b) {
    return prisma.conversation.create({
      data: {
        type: "direct",
        directKey: directKey(a, b),
        createdBy: a,
        members: { create: [{ userId: a }, { userId: b }] },
      },
      select: conversationSelect,
    });
  },

  createGroup({ title, createdBy, memberIds, imageUrl = null }) {
    return prisma.conversation.create({
      data: {
        type: "group",
        title,
        imageUrl,
        createdBy,
        members: {
          create: [
            { userId: createdBy, role: "admin" },
            ...memberIds.filter((id) => id !== createdBy).map((userId) => ({ userId })),
          ],
        },
      },
      select: conversationSelect,
    });
  },

  updateConversation(id, data) {
    return prisma.conversation.update({ where: { id }, data, select: conversationSelect });
  },

  membership(conversationId, userId) {
    return prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      select: { conversationId: true, userId: true, role: true, muted: true, lastReadMessageId: true },
    });
  },

  async addMembers(conversationId, userIds) {
    await prisma.conversationMember.createMany({
      data: userIds.map((userId) => ({ conversationId, userId })),
      skipDuplicates: true,
    });
    return this.findConversation(conversationId);
  },

  async removeMember(conversationId, userId) {
    await prisma.conversationMember.deleteMany({ where: { conversationId, userId } });
    return prisma.conversationMember.count({ where: { conversationId } });
  },

  deleteConversation(id) {
    return prisma.conversation.delete({ where: { id } });
  },

  memberIds(conversationId) {
    return prisma.conversationMember
      .findMany({ where: { conversationId }, select: { userId: true } })
      .then((rows) => rows.map((r) => r.userId));
  },

  /**
   * Conversations the user belongs to, newest activity first, with the last visible message attached.
   */
  async listForUser(userId, limit) {
    const rows = await prisma.conversation.findMany({
      where: { members: { some: { userId } } },
      orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
      take: limit,
      select: {
        ...conversationSelect,
        messages: {
          where: { deletedAt: null },
          orderBy: { id: "desc" },
          take: 1,
          select: messageSelect,
        },
      },
    });
    return rows;
  },

  listMessages(conversationId, cursor, limit, hidden = []) {
    const after = cursor && { id: { lt: BigInt(cursor.id) } };
    return prisma.conversationMessage.findMany({
      where: {
        conversationId,
        ...(hidden.length ? { NOT: { senderId: { in: hidden } } } : {}),
        ...(after ?? {}),
      },
      orderBy: { id: "desc" },
      take: limit + 1,
      select: messageSelect,
    });
  },

  findMessage(id) {
    return prisma.conversationMessage.findUnique({
      where: { id: BigInt(id) },
      select: { ...messageSelect, legacyMessageId: true },
    });
  },

  async createMessage({ conversationId, senderId, body, imageUrl = null, legacyMessageId = null }) {
    return prisma.$transaction(async (tx) => {
      const message = await tx.conversationMessage.create({
        data: { conversationId, senderId, body, imageUrl, legacyMessageId },
        select: messageSelect,
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: message.createdAt },
      });
      await tx.conversationMember.updateMany({
        where: { conversationId, userId: senderId },
        data: { lastReadMessageId: message.id },
      });
      return message;
    });
  },

  updateMessage(id, data) {
    return prisma.conversationMessage.update({
      where: { id: BigInt(id) },
      data,
      select: messageSelect,
    });
  },

  /**
   * Mirrors a direct message into the legacy messages table so the older deployment that still reads
   * it keeps working. Failures are the caller's to swallow: the conversation row is the source of truth.
   */
  createLegacyMessage({ fromUser, toUser, username, message }) {
    return prisma.message.create({ data: { fromUser, toUser, username, message } });
  },

  deleteLegacyMessage(id) {
    return prisma.message.delete({ where: { id } });
  },

  updateLegacyMessage(id, message) {
    return prisma.message.update({ where: { id }, data: { message } });
  },

  setMuted(conversationId, userId, muted) {
    return prisma.conversationMember.updateMany({ where: { conversationId, userId }, data: { muted } });
  },

  setMemberRole(conversationId, userId, role) {
    return prisma.conversationMember.updateMany({ where: { conversationId, userId }, data: { role } });
  },

  markRead(conversationId, userId, lastReadMessageId) {
    return prisma.conversationMember.updateMany({
      where: { conversationId, userId },
      data: { lastReadMessageId: BigInt(lastReadMessageId) },
    });
  },

  async unreadCounts(userId) {
    const rows = await prisma.$queryRaw`
      SELECT m.conversation_id AS "conversationId", count(*)::int AS unread
      FROM chat_messages m
      JOIN chat_thread_members me ON me.conversation_id = m.conversation_id AND me.user_id = ${userId}::int
      WHERE m.deleted_at IS NULL
        AND m.sender_id IS DISTINCT FROM ${userId}::int
        AND m.id > coalesce(me.last_read_message_id, 0)
      GROUP BY m.conversation_id`;
    return new Map(rows.map((r) => [Number(r.conversationId), Number(r.unread)]));
  },

  searchMessages(userId, term, { conversationId = null, limit }) {
    return prisma.conversationMessage.findMany({
      where: {
        deletedAt: null,
        body: { contains: term, mode: "insensitive" },
        ...(conversationId ? { conversationId } : {}),
        conversation: { members: { some: { userId } } },
      },
      orderBy: { id: "desc" },
      take: limit,
      select: { ...messageSelect, conversation: { select: { id: true, type: true, title: true } } },
    });
  },
};
