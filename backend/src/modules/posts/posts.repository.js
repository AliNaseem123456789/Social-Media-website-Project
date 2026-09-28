import { prisma } from "#core/db/prisma.js";
import { repostSelect, commentSelect, draftSelect } from "./posts.presenter.js";

const SINCE = {
  week: () => new Date(Date.now() - 7 * 864e5),
  month: () => new Date(Date.now() - 30 * 864e5),
  year: () => new Date(Date.now() - 365 * 864e5),
};

export function buildPostFilter({ author, time, type, minLikes, hashtag, hidden = [] }) {
  const where = {};
  if (author) where.userId = author;
  else if (hidden.length) where.userId = { notIn: hidden };
  if (time && time !== "all") where.createdAt = { gte: SINCE[time]() };
  if (type === "image") where.OR = [{ imageUrl: { not: null } }, { images: { some: {} } }];
  if (type === "text") where.AND = [{ imageUrl: null }, { images: { none: {} } }];
  if (minLikes > 0) where.totalLikes = { gte: minLikes };
  if (hashtag) where.hashtags = { some: { tag: hashtag.toLowerCase() } };
  return where;
}

function sortSpec(sort, cursor) {
  if (sort === "likes") {
    return {
      orderBy: [{ totalLikes: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      after: cursor && {
        OR: [
          { totalLikes: { lt: cursor.likes } },
          { totalLikes: cursor.likes, createdAt: { lt: new Date(cursor.at) } },
          { totalLikes: cursor.likes, createdAt: new Date(cursor.at), id: { lt: cursor.id } },
        ],
      },
    };
  }
  const dir = sort === "oldest" ? "asc" : "desc";
  const op = sort === "oldest" ? "gt" : "lt";
  return {
    orderBy: [{ createdAt: dir }, { id: dir }],
    after: cursor && {
      OR: [
        { createdAt: { [op]: new Date(cursor.at) } },
        { createdAt: new Date(cursor.at), id: { [op]: cursor.id } },
      ],
    },
  };
}

const descendingAfter = (cursor) =>
  cursor && {
    OR: [
      { createdAt: { lt: new Date(cursor.at) } },
      { createdAt: new Date(cursor.at), id: { lt: cursor.id } },
    ],
  };

const ascendingAfter = (cursor) =>
  cursor && {
    OR: [
      { createdAt: { gt: new Date(cursor.at) } },
      { createdAt: new Date(cursor.at), id: { gt: cursor.id } },
    ],
  };

async function syncCommentCount(tx, postId) {
  const count = await tx.comment.count({ where: { postId } });
  await tx.post.update({ where: { id: postId }, data: { totalComments: count } });
  return count;
}

export const postsRepository = {
  async list(filters, cursor, limit) {
    const { orderBy, after } = sortSpec(filters.sort, cursor);
    const where = buildPostFilter(filters);
    return prisma.post.findMany({
      where: after ? { AND: [where, after] } : where,
      orderBy,
      take: limit + 1,
      select: { ...repostSelect, totalLikes: true },
    });
  },

  async listLikedBy(userId, filters, cursor, limit) {
    const after = descendingAfter(cursor);
    return prisma.like.findMany({
      where: { userId, post: buildPostFilter(filters), ...(after ? { AND: [after] } : {}) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: { id: true, createdAt: true, post: { select: repostSelect } },
    });
  },

  async listSavedBy(userId, cursor, limit, hidden = []) {
    const after = cursor && {
      OR: [
        { createdAt: { lt: new Date(cursor.at) } },
        { createdAt: new Date(cursor.at), postId: { lt: cursor.id } },
      ],
    };
    return prisma.postSave.findMany({
      where: {
        userId,
        ...(hidden.length ? { post: { userId: { notIn: hidden } } } : {}),
        ...(after ? { AND: [after] } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { postId: "desc" }],
      take: limit + 1,
      select: { postId: true, createdAt: true, post: { select: repostSelect } },
    });
  },

  findById(id) {
    return prisma.post.findUnique({ where: { id }, select: repostSelect });
  },

  findOwnership(id) {
    return prisma.post.findUnique({
      where: { id },
      select: { id: true, userId: true, imageUrl: true, content: true },
    });
  },

  async create({ images = [], hashtags = [], repostOf = null, ...data }) {
    return prisma.post.create({
      data: {
        ...data,
        ...(images.length
          ? { images: { create: images.map((image, index) => ({ ...image, position: index })) } }
          : {}),
        ...(hashtags.length ? { hashtags: { create: hashtags.map((tag) => ({ tag })) } } : {}),
        ...(repostOf ? { reference: { create: { referencedPostId: repostOf } } } : {}),
      },
      select: repostSelect,
    });
  },

  async update(id, { images, hashtags, ...data }) {
    return prisma.$transaction(async (tx) => {
      if (images) {
        await tx.postImage.deleteMany({ where: { postId: id } });
        if (images.length) {
          await tx.postImage.createMany({
            data: images.map((image, index) => ({ ...image, postId: id, position: index })),
          });
        }
      }
      if (hashtags) {
        await tx.postHashtag.deleteMany({ where: { postId: id } });
        if (hashtags.length) {
          await tx.postHashtag.createMany({ data: hashtags.map((tag) => ({ postId: id, tag })) });
        }
      }
      return tx.post.update({
        where: { id },
        data: { ...data, updatedAt: new Date() },
        select: repostSelect,
      });
    });
  },

  delete(id) {
    return prisma.post.delete({ where: { id } });
  },

  imagesOf(postId) {
    return prisma.postImage.findMany({ where: { postId }, select: { url: true } });
  },

  async setPinned(userId, postId, pinned) {
    return prisma.$transaction(async (tx) => {
      if (pinned) await tx.post.updateMany({ where: { userId, isPinned: true }, data: { isPinned: false } });
      return tx.post.update({ where: { id: postId }, data: { isPinned: pinned }, select: repostSelect });
    });
  },

  async viewerState(userId, postIds) {
    const empty = { liked: new Set(), saved: new Set(), reposted: new Set() };
    if (!userId || !postIds.length) return empty;
    const [likes, saves, reposts] = await Promise.all([
      prisma.like.findMany({ where: { userId, postId: { in: postIds } }, select: { postId: true } }),
      prisma.postSave.findMany({ where: { userId, postId: { in: postIds } }, select: { postId: true } }),
      prisma.postReference.findMany({
        where: { referencedPostId: { in: postIds }, post: { userId } },
        select: { referencedPostId: true },
      }),
    ]);
    return {
      liked: new Set(likes.map((r) => r.postId)),
      saved: new Set(saves.map((r) => r.postId)),
      reposted: new Set(reposts.map((r) => r.referencedPostId)),
    };
  },

  async like(userId, postId) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.like.findFirst({ where: { userId, postId }, select: { id: true } });
      if (!existing) await tx.like.create({ data: { userId, postId } });
      const count = await tx.like.count({ where: { postId } });
      await tx.post.update({ where: { id: postId }, data: { totalLikes: count } });
      return { created: !existing, count };
    });
  },

  async unlike(userId, postId) {
    return prisma.$transaction(async (tx) => {
      const { count: removed } = await tx.like.deleteMany({ where: { userId, postId } });
      const count = await tx.like.count({ where: { postId } });
      await tx.post.update({ where: { id: postId }, data: { totalLikes: count } });
      return { removed: removed > 0, count };
    });
  },

  async save(userId, postId) {
    const existing = await prisma.postSave.findUnique({
      where: { userId_postId: { userId, postId } },
      select: { postId: true },
    });
    if (!existing) await prisma.postSave.create({ data: { userId, postId } });
    return { created: !existing };
  },

  async unsave(userId, postId) {
    const { count } = await prisma.postSave.deleteMany({ where: { userId, postId } });
    return { removed: count > 0 };
  },

  countSaves(postId) {
    return prisma.postSave.count({ where: { postId } });
  },

  findRepostBy(userId, postId) {
    return prisma.postReference.findFirst({
      where: { referencedPostId: postId, post: { userId } },
      select: { postId: true },
    });
  },

  countReposts(postId) {
    return prisma.postReference.count({ where: { referencedPostId: postId } });
  },

  /**
   * Reposts of a repost point at the original so threads never nest more than one level deep.
   */
  originalOf(postId) {
    return prisma.postReference.findUnique({
      where: { postId },
      select: { referencedPostId: true },
    });
  },

  async trendingHashtags(days, limit) {
    const rows = await prisma.$queryRaw`
      SELECT h.tag, count(*)::int AS posts
      FROM post_hashtags h
      JOIN posts p ON p.post_id = h.post_id
      WHERE p.created_at > now() - make_interval(days => ${days}::int)
      GROUP BY h.tag
      ORDER BY posts DESC, h.tag ASC
      LIMIT ${limit}::int`;
    return rows.map((row) => ({ tag: row.tag, posts: Number(row.posts) }));
  },

  listComments(postId, { parentId = null, topLevelOnly = true, hidden = [] }, cursor, limit) {
    const after = ascendingAfter(cursor);
    return prisma.comment.findMany({
      where: {
        postId,
        ...(hidden.length ? { userId: { notIn: hidden } } : {}),
        ...(parentId ? { parentId } : topLevelOnly ? { parentId: null } : {}),
        ...(after ? { AND: [after] } : {}),
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: limit + 1,
      select: commentSelect,
    });
  },

  /**
   * Fetches the first replies of several comments in one query so a comment list can ship a preview
   * of its thread without one request per comment.
   */
  async firstReplies(commentIds, perComment, hidden = []) {
    if (!commentIds.length) return new Map();
    const rows = await prisma.comment.findMany({
      where: { parentId: { in: commentIds }, ...(hidden.length ? { userId: { notIn: hidden } } : {}) },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: commentSelect,
    });
    const grouped = new Map();
    for (const row of rows) {
      const list = grouped.get(row.parentId) ?? [];
      if (list.length < perComment) list.push(row);
      grouped.set(row.parentId, list);
    }
    return grouped;
  },

  async addComment({ postId, userId, text, parentId = null }) {
    return prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: { postId, userId, text, parentId },
        select: commentSelect,
      });
      await syncCommentCount(tx, postId);
      return comment;
    });
  },

  updateComment(id, text) {
    return prisma.comment.update({
      where: { id },
      data: { text, updatedAt: new Date() },
      select: commentSelect,
    });
  },

  findComment(id) {
    return prisma.comment.findUnique({
      where: { id },
      select: {
        id: true,
        postId: true,
        userId: true,
        parentId: true,
        text: true,
        post: { select: { userId: true, content: true } },
      },
    });
  },

  async deleteComment(id, postId) {
    return prisma.$transaction(async (tx) => {
      await tx.comment.delete({ where: { id } });
      await syncCommentCount(tx, postId);
    });
  },

  async likeComment(userId, commentId) {
    const existing = await prisma.commentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
      select: { commentId: true },
    });
    if (!existing) await prisma.commentLike.create({ data: { commentId, userId } });
    const count = await prisma.commentLike.count({ where: { commentId } });
    return { created: !existing, count };
  },

  async unlikeComment(userId, commentId) {
    const { count: removed } = await prisma.commentLike.deleteMany({ where: { commentId, userId } });
    const count = await prisma.commentLike.count({ where: { commentId } });
    return { removed: removed > 0, count };
  },

  async likedCommentIds(userId, commentIds) {
    if (!userId || !commentIds.length) return new Set();
    const rows = await prisma.commentLike.findMany({
      where: { userId, commentId: { in: commentIds } },
      select: { commentId: true },
    });
    return new Set(rows.map((r) => r.commentId));
  },

  listDrafts(userId) {
    return prisma.postDraft.findMany({
      where: { userId, publishedAt: null },
      orderBy: [{ scheduledFor: "asc" }, { updatedAt: "desc" }],
      take: 100,
      select: draftSelect,
    });
  },

  findDraft(id) {
    return prisma.postDraft.findUnique({ where: { id }, select: { ...draftSelect, userId: true } });
  },

  createDraft(data) {
    return prisma.postDraft.create({ data, select: draftSelect });
  },

  updateDraft(id, data) {
    return prisma.postDraft.update({ where: { id }, data, select: draftSelect });
  },

  deleteDraft(id) {
    return prisma.postDraft.delete({ where: { id } });
  },

  markDraftPublished(id, postId) {
    return prisma.postDraft.update({
      where: { id },
      data: { publishedPostId: postId, publishedAt: new Date() },
      select: draftSelect,
    });
  },

  /**
   * Claims scheduled drafts that are due. publishedAt is stamped inside the same statement so two
   * scheduler processes cannot publish the same draft twice.
   */
  async claimDueDrafts(limit) {
    const rows = await prisma.$queryRaw`
      UPDATE post_drafts
      SET published_at = now()
      WHERE id IN (
        SELECT id FROM post_drafts
        WHERE published_at IS NULL AND scheduled_for IS NOT NULL AND scheduled_for <= now()
        ORDER BY scheduled_for ASC
        LIMIT ${limit}::int
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, user_id AS "userId", content, image_urls AS "imageUrls", scheduled_for AS "scheduledFor"`;
    return rows;
  },
};
