import { z } from "zod";
import { config } from "#config";
import { AppError } from "#core/http/errors.js";
import { decodeCursor, page } from "#core/http/pagination.js";
import { cache } from "#core/cache/cache.service.js";
import { cacheKeys } from "#core/cache/keys.js";
import { eventBus } from "#core/messaging/event-bus.js";
import { EVENTS } from "#core/messaging/topology.js";
import { storage, buckets } from "#core/storage/index.js";
import { childLogger } from "#core/logger/index.js";
import { extractHashtags, preview } from "#shared/text.js";
import { resolveMentions } from "#shared/mentions.js";
import { assertCanViewUser } from "#shared/visibility.js";
import { hiddenUserIds } from "#shared/blocks.js";
import { postsRepository } from "./posts.repository.js";
import { withPostViewerState as withViewerState } from "./posts.viewer.js";
import { toPost, toComment, toDraft } from "./posts.presenter.js";

const log = childLogger("posts");
const POST_TTL = 300;
const LIST_TTL = 60;
const TRENDING_TTL = 600;
const REPLY_PREVIEW = 2;

const timeCursor = z.object({ at: z.string(), id: z.number().int() });
const likesCursor = timeCursor.extend({ likes: z.number().int() });

const listKey = (q) =>
  [q.sort, q.time, q.type, q.minLikes, q.hashtag || "any", q.limit, q.cursor || "start"].join(":");

async function withCommentState(comments, viewerId) {
  const liked = await postsRepository.likedCommentIds(
    viewerId,
    comments.flatMap((c) => [c.id, ...(c.replies ?? []).map((r) => r.id)]),
  );
  const mark = (comment) => ({
    ...comment,
    likedByMe: liked.has(comment.id),
    ...(comment.replies ? { replies: comment.replies.map(mark) } : {}),
  });
  return comments.map(mark);
}

async function invalidatePost(authorId, postId) {
  await Promise.all([
    postId ? cache.del(cacheKeys.post(postId)) : null,
    cache.delPattern(cacheKeys.userPostsPattern(authorId)),
    cache.delPattern(cacheKeys.globalFeedPattern()),
  ]);
}

async function getOwnedPost(userId, postId) {
  const post = await postsRepository.findOwnership(postId);
  if (!post) throw AppError.notFound("Post");
  if (post.userId !== userId) throw AppError.forbidden("You can only modify your own posts");
  return post;
}

async function removeImages(urls) {
  const keys = urls.map((url) => storage.keyFromValue(buckets.posts, url)).filter(Boolean);
  if (!keys.length) return;
  try {
    await storage.remove(buckets.posts, keys);
  } catch (err) {
    log.warn({ err: err.message, keys }, "could not remove post images");
  }
}

async function uploadAll(userId, files) {
  const uploads = [];
  for (const file of files) {
    uploads.push(await storage.uploadImage(buckets.posts, file, { folder: `users/${userId}`, preset: "post" }));
  }
  return uploads.map((upload) => upload.url);
}

const altFor = (alt, index) => {
  const list = Array.isArray(alt) ? alt : alt ? [alt] : [];
  const value = list[index];
  return value ? String(value).slice(0, 300) : null;
};

async function announceMentions(actor, text, { postId, commentId = null }) {
  const mentioned = await resolveMentions(text, { exclude: actor.id });
  for (const target of mentioned) {
    await eventBus.publish(EVENTS.USER_MENTIONED, {
      targetUserId: target.id,
      actorId: actor.id,
      actorName: actor.username,
      postId,
      commentId,
      textPreview: preview(text, 200),
    });
  }
  return mentioned.map((m) => m.username);
}

export const postsService = {
  async list(query, viewerId) {
    if (query.author) await assertCanViewUser(viewerId, query.author);
    const hidden = await hiddenUserIds(viewerId);
    const cursor = decodeCursor(query.cursor, query.sort === "likes" ? likesCursor : timeCursor);
    const producer = async () => {
      const rows = await postsRepository.list({ ...query, hidden }, cursor, query.limit);
      const result = page(rows, query.limit, (r) =>
        query.sort === "likes"
          ? { at: r.createdAt.toISOString(), id: r.id, likes: r.totalLikes }
          : { at: r.createdAt.toISOString(), id: r.id },
      );
      return { items: result.items.map(toPost), pageInfo: result.pageInfo };
    };

    const result = query.author
      ? await cache.wrap(cacheKeys.userPosts(query.author, listKey(query)), LIST_TTL, producer)
      : await producer();

    return { items: await withViewerState(result.items, viewerId), pageInfo: result.pageInfo };
  },

  async listLiked(userId, query) {
    const cursor = decodeCursor(query.cursor, timeCursor);
    const hidden = await hiddenUserIds(userId);
    const rows = await postsRepository.listLikedBy(userId, { ...query, hidden }, cursor, query.limit);
    const result = page(rows, query.limit, (r) => ({ at: r.createdAt.toISOString(), id: r.id }));
    // A like whose post has since been deleted resolves to null. Skipping it keeps the page useful
    // instead of failing the whole request over one stale row.
    const present = result.items.filter((r) => r.post);
    const items = await withViewerState(present.map((r) => toPost(r.post)), userId);
    return {
      items: items.map((post, index) => ({ ...post, likedAt: present[index].createdAt })),
      pageInfo: result.pageInfo,
    };
  },

  async listSaved(userId, query) {
    const cursor = decodeCursor(query.cursor, timeCursor);
    const rows = await postsRepository.listSavedBy(userId, cursor, query.limit, await hiddenUserIds(userId));
    const result = page(rows, query.limit, (r) => ({ at: r.createdAt.toISOString(), id: r.postId }));
    const present = result.items.filter((r) => r.post);
    const items = await withViewerState(present.map((r) => toPost(r.post)), userId);
    return {
      items: items.map((post, index) => ({ ...post, savedAt: present[index].createdAt })),
      pageInfo: result.pageInfo,
    };
  },

  async get(postId, viewerId) {
    const post = await cache.wrap(cacheKeys.post(postId), POST_TTL, async () => {
      const row = await postsRepository.findById(postId);
      return row ? toPost(row) : null;
    });
    if (!post) throw AppError.notFound("Post");
    await assertCanViewUser(viewerId, post.author.id);
    const [withState] = await withViewerState([post], viewerId);
    return withState;
  },

  async trendingHashtags({ days, limit }) {
    return cache.wrap(cacheKeys.trendingTags(days, limit), TRENDING_TTL, () =>
      postsRepository.trendingHashtags(days, limit),
    );
  },

  async create(user, body, files = []) {
    const content = body.content?.trim() || null;
    if (!content && !files.length) throw AppError.badRequest("A post needs text or an image");
    if (files.length > config.storage.maxPostImages) {
      throw AppError.badRequest(`A post can hold at most ${config.storage.maxPostImages} images`);
    }

    const urls = await uploadAll(user.id, files);
    const images = urls.map((url, index) => ({ url, alt: altFor(body.alt, index) }));

    const row = await postsRepository.create({
      userId: user.id,
      content,
      imageUrl: urls[0] ?? null,
      images,
      hashtags: extractHashtags(content),
    });

    const post = toPost(row);
    await invalidatePost(user.id);
    await eventBus.publish(EVENTS.POST_CREATED, {
      postId: post.id,
      authorId: user.id,
      hasImage: images.length > 0,
    });
    await announceMentions(user, content, { postId: post.id });
    return { ...post, likedByMe: false, savedByMe: false, repostedByMe: false };
  },

  async repost(user, postId, { content } = {}) {
    const target = await postsRepository.findOwnership(postId);
    if (!target) throw AppError.notFound("Post");
    await assertCanViewUser(user.id, target.userId);

    const original = await postsRepository.originalOf(postId);
    const referencedPostId = original?.referencedPostId ?? postId;

    const existing = await postsRepository.findRepostBy(user.id, referencedPostId);
    if (existing) throw new AppError(409, "ALREADY_REPOSTED", "You already shared this post");

    const text = content?.trim() || null;
    const row = await postsRepository.create({
      userId: user.id,
      content: text,
      imageUrl: null,
      hashtags: extractHashtags(text),
      repostOf: referencedPostId,
    });

    await invalidatePost(user.id);
    await cache.del(cacheKeys.post(referencedPostId));
    await eventBus.publish(EVENTS.POST_REPOSTED, {
      postId: row.id,
      referencedPostId,
      postOwnerId: target.userId,
      actorId: user.id,
      actorName: user.username,
      postPreview: preview(target.content),
    });
    if (text) await announceMentions(user, text, { postId: row.id });

    const [post] = await withViewerState([toPost(row)], user.id);
    return post;
  },

  async removeRepost(user, postId) {
    const original = await postsRepository.originalOf(postId);
    const referencedPostId = original?.referencedPostId ?? postId;
    const existing = await postsRepository.findRepostBy(user.id, referencedPostId);
    if (!existing) throw AppError.notFound("Repost");
    await postsRepository.delete(existing.postId);
    await invalidatePost(user.id, existing.postId);
    await cache.del(cacheKeys.post(referencedPostId));
    await eventBus.publish(EVENTS.POST_DELETED, { postId: existing.postId, authorId: user.id });
    return { reposted: false, repostCount: await postsRepository.countReposts(referencedPostId) };
  },

  async update(user, postId, body, files = []) {
    const existing = await getOwnedPost(user.id, postId);
    const data = {};
    if (body.content !== undefined) data.content = body.content?.trim() || null;

    const previousImages = (await postsRepository.imagesOf(postId)).map((i) => i.url);
    const hadImages = previousImages.length ? previousImages : existing.imageUrl ? [existing.imageUrl] : [];

    if (files.length) {
      const urls = await uploadAll(user.id, files);
      data.images = urls.map((url, index) => ({ url, alt: altFor(body.alt, index) }));
      data.imageUrl = urls[0];
    } else if (body.removeImage) {
      data.images = [];
      data.imageUrl = null;
    }

    const nextContent = data.content !== undefined ? data.content : existing.content;
    const nextImages = data.images !== undefined ? data.images.length : hadImages.length;
    if (!nextContent && !nextImages) throw AppError.badRequest("A post needs text or an image");
    if (data.content !== undefined) data.hashtags = extractHashtags(data.content);

    const row = await postsRepository.update(postId, data);
    if (data.images !== undefined) await removeImages(hadImages);
    await invalidatePost(user.id, postId);
    await eventBus.publish(EVENTS.POST_UPDATED, { postId, authorId: user.id });
    if (data.content) await announceMentions(user, data.content, { postId });
    const [withState] = await withViewerState([toPost(row)], user.id);
    return withState;
  },

  async remove(user, postId) {
    const existing = await getOwnedPost(user.id, postId);
    const images = (await postsRepository.imagesOf(postId)).map((i) => i.url);
    await postsRepository.delete(postId);
    await removeImages(images.length ? images : [existing.imageUrl]);
    await invalidatePost(user.id, postId);
    await eventBus.publish(EVENTS.POST_DELETED, { postId, authorId: user.id });
  },

  async setPinned(user, postId, pinned) {
    await getOwnedPost(user.id, postId);
    const row = await postsRepository.setPinned(user.id, postId, pinned);
    await invalidatePost(user.id, postId);
    return { id: row.id, isPinned: row.isPinned };
  },

  async like(user, postId) {
    const post = await postsRepository.findOwnership(postId);
    if (!post) throw AppError.notFound("Post");
    const { created, count } = await postsRepository.like(user.id, postId);
    await cache.del(cacheKeys.post(postId));
    if (created) {
      await eventBus.publish(EVENTS.POST_LIKED, {
        postId,
        postOwnerId: post.userId,
        actorId: user.id,
        actorName: user.username,
        postPreview: preview(post.content),
      });
    }
    return { liked: true, likeCount: count };
  },

  async unlike(user, postId) {
    const post = await postsRepository.findOwnership(postId);
    if (!post) throw AppError.notFound("Post");
    const { removed, count } = await postsRepository.unlike(user.id, postId);
    await cache.del(cacheKeys.post(postId));
    if (removed) await eventBus.publish(EVENTS.POST_UNLIKED, { postId, postOwnerId: post.userId, actorId: user.id });
    return { liked: false, likeCount: count };
  },

  async save(user, postId) {
    const post = await postsRepository.findOwnership(postId);
    if (!post) throw AppError.notFound("Post");
    await assertCanViewUser(user.id, post.userId);
    await postsRepository.save(user.id, postId);
    await cache.del(cacheKeys.post(postId));
    return { saved: true, saveCount: await postsRepository.countSaves(postId) };
  },

  async unsave(user, postId) {
    await postsRepository.unsave(user.id, postId);
    await cache.del(cacheKeys.post(postId));
    return { saved: false, saveCount: await postsRepository.countSaves(postId) };
  },

  async listComments(postId, query, viewerId) {
    const post = await postsRepository.findOwnership(postId);
    if (!post) throw AppError.notFound("Post");
    await assertCanViewUser(viewerId, post.userId);

    const hidden = await hiddenUserIds(viewerId);
    const cursor = decodeCursor(query.cursor, timeCursor);
    const rows = await postsRepository.listComments(
      postId,
      { parentId: query.parentId ?? null, topLevelOnly: !query.parentId && !query.flat, hidden },
      cursor,
      query.limit,
    );
    const result = page(rows, query.limit, (r) => ({ at: r.createdAt.toISOString(), id: r.id }));
    const comments = result.items.map(toComment);

    if (!query.parentId && !query.flat) {
      const replies = await postsRepository.firstReplies(
        comments.filter((c) => c.replyCount > 0).map((c) => c.id),
        REPLY_PREVIEW,
        hidden,
      );
      for (const comment of comments) {
        comment.replies = (replies.get(comment.id) ?? []).map(toComment);
      }
    }

    return { items: await withCommentState(comments, viewerId), pageInfo: result.pageInfo };
  },

  async addComment(user, postId, { text, parentId = null }) {
    const post = await postsRepository.findOwnership(postId);
    if (!post) throw AppError.notFound("Post");
    await assertCanViewUser(user.id, post.userId);

    let parent = null;
    if (parentId) {
      parent = await postsRepository.findComment(parentId);
      if (!parent || parent.postId !== postId) throw AppError.notFound("Comment");
      // Replies stay one level deep: a reply to a reply is attached to the same thread root.
      if (parent.parentId) parentId = parent.parentId;
    }

    const comment = toComment(
      await postsRepository.addComment({ postId, userId: user.id, text, parentId }),
    );
    await cache.del(cacheKeys.post(postId));

    if (parent) {
      await eventBus.publish(EVENTS.COMMENT_REPLIED, {
        commentId: comment.id,
        parentCommentId: parent.id,
        parentAuthorId: parent.userId,
        postId,
        actorId: user.id,
        actorName: user.username,
        commentPreview: preview(text, 200),
      });
    } else {
      await eventBus.publish(EVENTS.COMMENT_CREATED, {
        commentId: comment.id,
        postId,
        postOwnerId: post.userId,
        actorId: user.id,
        actorName: user.username,
        commentPreview: preview(text, 200),
        postPreview: preview(post.content),
      });
    }

    await announceMentions(user, text, { postId, commentId: comment.id });
    return { ...comment, likedByMe: false, replies: [] };
  },

  async updateComment(user, postId, commentId, { text }) {
    const comment = await postsRepository.findComment(commentId);
    if (!comment || comment.postId !== postId) throw AppError.notFound("Comment");
    if (comment.userId !== user.id) throw AppError.forbidden("You can only edit your own comments");
    const updated = toComment(await postsRepository.updateComment(commentId, text));
    await cache.del(cacheKeys.post(postId));
    await announceMentions(user, text, { postId, commentId });
    const [withState] = await withCommentState([updated], user.id);
    return withState;
  },

  async deleteComment(user, postId, commentId) {
    const comment = await postsRepository.findComment(commentId);
    if (!comment || comment.postId !== postId) throw AppError.notFound("Comment");
    if (comment.userId !== user.id && comment.post.userId !== user.id) {
      throw AppError.forbidden("You can only delete your own comments");
    }
    await postsRepository.deleteComment(commentId, postId);
    await cache.del(cacheKeys.post(postId));
  },

  async likeComment(user, postId, commentId) {
    const comment = await postsRepository.findComment(commentId);
    if (!comment || comment.postId !== postId) throw AppError.notFound("Comment");
    const { created, count } = await postsRepository.likeComment(user.id, commentId);
    if (created && comment.userId !== user.id) {
      await eventBus.publish(EVENTS.COMMENT_LIKED, {
        commentId,
        postId,
        commentOwnerId: comment.userId,
        actorId: user.id,
        actorName: user.username,
        commentPreview: preview(comment.text, 200),
      });
    }
    return { liked: true, likeCount: count };
  },

  async unlikeComment(user, postId, commentId) {
    const comment = await postsRepository.findComment(commentId);
    if (!comment || comment.postId !== postId) throw AppError.notFound("Comment");
    const { count } = await postsRepository.unlikeComment(user.id, commentId);
    return { liked: false, likeCount: count };
  },

  async listDrafts(userId) {
    const rows = await postsRepository.listDrafts(userId);
    return { items: rows.map(toDraft) };
  },

  async createDraft(user, body, files = []) {
    const urls = files.length ? await uploadAll(user.id, files) : [];
    const images = [...(body.images ?? []), ...urls].slice(0, config.storage.maxPostImages);
    const row = await postsRepository.createDraft({
      userId: user.id,
      content: body.content?.trim() || null,
      imageUrls: images,
      scheduledFor: body.scheduledFor ?? null,
    });
    return toDraft(row);
  },

  async updateDraft(user, draftId, body, files = []) {
    const draft = await postsRepository.findDraft(draftId);
    if (!draft) throw AppError.notFound("Draft");
    if (draft.userId !== user.id) throw AppError.forbidden("You can only edit your own drafts");
    if (draft.publishedAt) throw AppError.badRequest("This draft was already published");

    const data = {};
    if (body.content !== undefined) data.content = body.content?.trim() || null;
    if (body.scheduledFor !== undefined) data.scheduledFor = body.scheduledFor;
    if (body.images !== undefined || files.length) {
      const urls = files.length ? await uploadAll(user.id, files) : [];
      data.imageUrls = [...(body.images ?? []), ...urls].slice(0, config.storage.maxPostImages);
    }
    return toDraft(await postsRepository.updateDraft(draftId, data));
  },

  async deleteDraft(user, draftId) {
    const draft = await postsRepository.findDraft(draftId);
    if (!draft) throw AppError.notFound("Draft");
    if (draft.userId !== user.id) throw AppError.forbidden("You can only delete your own drafts");
    const images = Array.isArray(draft.imageUrls) ? draft.imageUrls : [];
    await postsRepository.deleteDraft(draftId);
    if (!draft.publishedAt) await removeImages(images);
  },

  async publishDraft(user, draftId) {
    const draft = await postsRepository.findDraft(draftId);
    if (!draft) throw AppError.notFound("Draft");
    if (draft.userId !== user.id) throw AppError.forbidden("You can only publish your own drafts");
    if (draft.publishedAt) throw AppError.badRequest("This draft was already published");
    const post = await this.publishDraftRow(draft, user);
    return post;
  },

  /**
   * Shared by the manual publish endpoint and the scheduler: turns a stored draft into a post without
   * re-uploading its images, which already live in object storage.
   */
  async publishDraftRow(draft, actor) {
    const images = (Array.isArray(draft.imageUrls) ? draft.imageUrls : []).map((entry) =>
      typeof entry === "string" ? { url: entry, alt: null } : { url: entry.url, alt: entry.alt ?? null },
    );
    const content = draft.content?.trim() || null;
    if (!content && !images.length) throw AppError.badRequest("A post needs text or an image");

    const row = await postsRepository.create({
      userId: draft.userId,
      content,
      imageUrl: images[0]?.url ?? null,
      images,
      hashtags: extractHashtags(content),
    });
    await postsRepository.markDraftPublished(draft.id, row.id);
    await invalidatePost(draft.userId);
    await eventBus.publish(EVENTS.POST_CREATED, {
      postId: row.id,
      authorId: draft.userId,
      hasImage: images.length > 0,
    });
    if (actor) await announceMentions(actor, content, { postId: row.id });
    return { ...toPost(row), likedByMe: false, savedByMe: false, repostedByMe: false };
  },
};
