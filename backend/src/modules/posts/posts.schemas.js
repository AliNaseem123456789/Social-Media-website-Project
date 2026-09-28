import { z } from "zod";
import { cursorQuery } from "#core/http/pagination.js";

const id = z.coerce.number().int().positive();

export const postIdParams = z.object({ id });

export const commentParams = z.object({ id, commentId: id });

export const draftParams = z.object({ draftId: id });

const hashtag = z
  .string()
  .trim()
  .max(50)
  .transform((v) => v.replace(/^#/, "").toLowerCase());

export const listPostsQuery = z.object({
  ...cursorQuery,
  author: id.optional(),
  hashtag: hashtag.optional(),
  sort: z.enum(["recent", "oldest", "likes"]).default("recent"),
  time: z.enum(["all", "week", "month", "year"]).default("all"),
  type: z.enum(["all", "image", "text"]).default("all"),
  minLikes: z.coerce.number().int().min(0).max(1_000_000).default(0),
});

export const likedPostsQuery = listPostsQuery.omit({ author: true, sort: true });

export const savedPostsQuery = z.object({ ...cursorQuery });

export const trendingTagsQuery = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const content = z.string().trim().max(5000, "Post is too long");
const boolish = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .transform((v) => v === true || v === "true" || v === "1");

/**
 * Multipart sends one "alt" field per image, which arrives as a string for a single image and as an
 * array for several.
 */
const altText = z
  .union([z.string(), z.array(z.string())])
  .transform((v) => (Array.isArray(v) ? v : [v]))
  .optional();

export const createPostSchema = z.object({
  content: content.optional().default(""),
  alt: altText,
});

export const updatePostSchema = z.object({
  content: content.optional(),
  alt: altText,
  removeImage: boolish.optional(),
});

export const repostSchema = z.object({
  content: content.optional().default(""),
});

export const listCommentsQuery = z.object({
  ...cursorQuery,
  parentId: id.optional(),
  flat: boolish.optional(),
});

export const createCommentSchema = z.object({
  text: z.string().trim().min(1, "Comment cannot be empty").max(2000, "Comment is too long"),
  parentId: id.optional(),
});

export const updateCommentSchema = createCommentSchema.omit({ parentId: true });

const scheduledFor = z.coerce
  .date()
  .refine((value) => value.getTime() > Date.now() - 60_000, "Schedule a time in the future")
  .nullable();

const draftImages = z.union([z.string(), z.array(z.string())]).transform((v) => (Array.isArray(v) ? v : [v]));

export const createDraftSchema = z.object({
  content: content.optional().default(""),
  images: draftImages.optional(),
  scheduledFor: scheduledFor.optional(),
});

export const updateDraftSchema = z.object({
  content: content.optional(),
  images: draftImages.optional(),
  scheduledFor: scheduledFor.optional(),
});
