import { prisma } from "#core/db/prisma.js";
import { userSummarySelect, toUserSummary } from "#shared/user-summary.js";

const reportSelect = {
  id: true,
  reporterId: true,
  subjectType: true,
  subjectId: true,
  subjectUserId: true,
  reason: true,
  details: true,
  status: true,
  resolution: true,
  reviewedBy: true,
  reviewedAt: true,
  createdAt: true,
  reporter: { select: userSummarySelect },
};

export const moderationRepository = {
  async block(blockerId, blockedId) {
    const key = { blockerId_blockedId: { blockerId, blockedId } };
    const existing = await prisma.block.findUnique({ where: key, select: { blockerId: true } });
    if (!existing) await prisma.block.create({ data: { blockerId, blockedId } });
    return { created: !existing };
  },

  async unblock(blockerId, blockedId) {
    const { count } = await prisma.block.deleteMany({ where: { blockerId, blockedId } });
    return { removed: count > 0 };
  },

  listBlocked(blockerId, cursor, limit) {
    const after = cursor && {
      OR: [
        { createdAt: { lt: new Date(cursor.at) } },
        { createdAt: new Date(cursor.at), blockedId: { lt: cursor.id } },
      ],
    };
    return prisma.block.findMany({
      where: { blockerId, ...(after ? { AND: [after] } : {}) },
      orderBy: [{ createdAt: "desc" }, { blockedId: "desc" }],
      take: limit + 1,
      select: { blockedId: true, createdAt: true, blocked: { select: userSummarySelect } },
    });
  },

  /**
   * Severing every existing connection is part of blocking: follows both ways, any friendship or
   * pending request, and the conversations they share.
   */
  async severConnections(a, b) {
    return prisma.$transaction(async (tx) => {
      await tx.follow.deleteMany({
        where: {
          OR: [
            { followerId: a, followingId: b },
            { followerId: b, followingId: a },
          ],
        },
      });
      await tx.friendship.deleteMany({
        where: {
          OR: [
            { requesterId: a, recipientId: b },
            { requesterId: b, recipientId: a },
          ],
        },
      });
    });
  },

  findUser(id) {
    return prisma.user.findUnique({ where: { id }, select: { id: true, username: true } });
  },

  async createReport(data) {
    const existing = await prisma.report.findFirst({
      where: {
        reporterId: data.reporterId,
        subjectType: data.subjectType,
        subjectId: data.subjectId,
        status: "open",
      },
      select: { id: true },
    });
    if (existing) return { created: false, id: existing.id };
    const report = await prisma.report.create({ data, select: { id: true } });
    return { created: true, id: report.id };
  },

  listReports({ status }, cursor, limit) {
    return prisma.report.findMany({
      where: {
        ...(status && status !== "all" ? { status } : {}),
        ...(cursor ? { id: { lt: BigInt(cursor.id) } } : {}),
      },
      orderBy: { id: "desc" },
      take: limit + 1,
      select: reportSelect,
    });
  },

  async reviewers(ids) {
    const unique = [...new Set(ids)];
    if (!unique.length) return new Map();
    const rows = await prisma.user.findMany({ where: { id: { in: unique } }, select: userSummarySelect });
    return new Map(rows.map((row) => [row.id, toUserSummary(row)]));
  },

  findReport(id) {
    return prisma.report.findUnique({ where: { id: BigInt(id) }, select: reportSelect });
  },

  updateReport(id, data) {
    return prisma.report.update({ where: { id: BigInt(id) }, data, select: reportSelect });
  },

  countOpen() {
    return prisma.report.count({ where: { status: "open" } });
  },

  /**
   * Resolves what a report points at, so a moderator sees the content rather than an id, and so
   * acting on it knows whose post or comment to remove.
   */
  async subject(type, id) {
    if (type === "post") {
      const post = await prisma.post.findUnique({
        where: { id: Number(id) },
        select: { id: true, content: true, imageUrl: true, userId: true, createdAt: true, author: { select: userSummarySelect } },
      });
      return post && { kind: "post", id: post.id, text: post.content, imageUrl: post.imageUrl, ownerId: post.userId, author: toUserSummary(post.author), createdAt: post.createdAt };
    }
    if (type === "comment") {
      const comment = await prisma.comment.findUnique({
        where: { id: Number(id) },
        select: { id: true, text: true, postId: true, userId: true, createdAt: true, author: { select: userSummarySelect } },
      });
      return comment && { kind: "comment", id: comment.id, text: comment.text, postId: comment.postId, ownerId: comment.userId, author: toUserSummary(comment.author), createdAt: comment.createdAt };
    }
    if (type === "message") {
      const message = await prisma.conversationMessage.findUnique({
        where: { id: BigInt(id) },
        select: { id: true, body: true, imageUrl: true, senderId: true, conversationId: true, createdAt: true, sender: { select: userSummarySelect } },
      });
      return message && { kind: "message", id: Number(message.id), text: message.body, imageUrl: message.imageUrl, ownerId: message.senderId, author: toUserSummary(message.sender), conversationId: message.conversationId, createdAt: message.createdAt };
    }
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: { id: true, username: true, createdAt: true, profile: { select: { bio: true, profileImage: true } } },
    });
    return user && { kind: "user", id: user.id, text: user.profile?.bio ?? null, ownerId: user.id, author: toUserSummary({ id: user.id, username: user.username, profile: user.profile }), createdAt: user.createdAt };
  },

  deletePost(id) {
    return prisma.post.delete({ where: { id: Number(id) } });
  },

  async deleteComment(id) {
    const comment = await prisma.comment.findUnique({ where: { id: Number(id) }, select: { postId: true } });
    if (!comment) return;
    await prisma.$transaction(async (tx) => {
      await tx.comment.delete({ where: { id: Number(id) } });
      const count = await tx.comment.count({ where: { postId: comment.postId } });
      await tx.post.update({ where: { id: comment.postId }, data: { totalComments: count } });
    });
  },

  hideMessage(id) {
    return prisma.conversationMessage.update({
      where: { id: BigInt(id) },
      data: { deletedAt: new Date(), body: null, imageUrl: null },
    });
  },
};
