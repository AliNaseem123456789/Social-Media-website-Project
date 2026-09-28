import { userSummarySelect, toUserSummary } from "#shared/user-summary.js";

export const postSelect = {
  id: true,
  content: true,
  imageUrl: true,
  isPinned: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  author: { select: userSummarySelect },
  images: { select: { id: true, url: true, alt: true, position: true }, orderBy: { position: "asc" } },
  hashtags: { select: { tag: true } },
  _count: { select: { likes: true, comments: true, saves: true, repostedBy: true } },
};

export const repostSelect = {
  ...postSelect,
  reference: {
    select: {
      referenced: {
        select: {
          id: true,
          content: true,
          imageUrl: true,
          createdAt: true,
          author: { select: userSummarySelect },
          images: { select: { url: true, alt: true, position: true }, orderBy: { position: "asc" } },
        },
      },
    },
  },
};

export const commentSelect = {
  id: true,
  postId: true,
  text: true,
  parentId: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  author: { select: userSummarySelect },
  _count: { select: { likes: true, replies: true } },
};

export const draftSelect = {
  id: true,
  content: true,
  imageUrls: true,
  scheduledFor: true,
  publishedPostId: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
};

const toImages = (row) =>
  (row.images ?? []).map((image) => ({ id: image.id ?? null, url: image.url, alt: image.alt ?? null }));

export function toPost(row) {
  const images = toImages(row);
  const referenced = row.reference?.referenced;

  return {
    id: row.id,
    content: row.content ?? "",
    imageUrl: row.imageUrl ?? images[0]?.url ?? null,
    images: images.length ? images : row.imageUrl ? [{ id: null, url: row.imageUrl, alt: null }] : [],
    hashtags: (row.hashtags ?? []).map((h) => h.tag),
    isPinned: row.isPinned,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    likeCount: row._count?.likes ?? 0,
    commentCount: row._count?.comments ?? 0,
    saveCount: row._count?.saves ?? 0,
    repostCount: row._count?.repostedBy ?? 0,
    author: toUserSummary(row.author),
    repostOf: referenced
      ? {
          id: referenced.id,
          content: referenced.content ?? "",
          imageUrl: referenced.imageUrl ?? referenced.images?.[0]?.url ?? null,
          images: toImages(referenced),
          createdAt: referenced.createdAt,
          author: toUserSummary(referenced.author),
        }
      : null,
  };
}

export function toComment(row) {
  return {
    id: row.id,
    postId: row.postId,
    text: row.text,
    parentId: row.parentId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt ?? null,
    editedAt: row.updatedAt ?? null,
    likeCount: row._count?.likes ?? 0,
    replyCount: row._count?.replies ?? 0,
    author: toUserSummary(row.author),
  };
}

export function toDraft(row) {
  return {
    id: row.id,
    content: row.content ?? "",
    images: Array.isArray(row.imageUrls) ? row.imageUrls : [],
    scheduledFor: row.scheduledFor ?? null,
    publishedAt: row.publishedAt ?? null,
    publishedPostId: row.publishedPostId ?? null,
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null,
  };
}
