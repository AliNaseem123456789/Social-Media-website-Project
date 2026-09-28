import { z } from "zod";
import { cursorQuery } from "#core/http/pagination.js";

const id = z.coerce.number().int().positive();
const text = z.string().trim().min(1).max(4000);

export const conversationParams = z.object({ conversationId: id });
export const memberParams = z.object({ conversationId: id, userId: id });
export const messageParams = z.object({ conversationId: id, messageId: id });

export const messagesQuery = z.object({
  ...cursorQuery,
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const openDirectSchema = z.object({ userId: id });

export const createGroupSchema = z.object({
  title: z.string().trim().min(1, "Give the group a name").max(120),
  userIds: z.array(id).min(1, "Pick at least one other person").max(49),
});

export const updateConversationSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  removeImage: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((v) => v === true || v === "true")
    .optional(),
});

export const addMembersSchema = z.object({ userIds: z.array(id).min(1).max(49) });

export const sendMessageSchema = z.object({
  text: z.string().trim().max(4000).optional(),
  clientId: z.string().max(64).optional(),
});

export const editMessageSchema = z.object({ text });

export const markReadSchema = z.object({ messageId: id.optional() });

export const muteSchema = z.object({ muted: z.boolean() });

export const memberRoleSchema = z.object({ role: z.enum(["admin", "member"]) });

export const searchQuery = z.object({
  q: z.string().trim().min(2, "Search term must be at least 2 characters").max(100),
  conversationId: id.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const socketMessage = z.object({
  conversationId: id.optional(),
  to: id.optional(),
  text: z.string().trim().max(4000).optional(),
  clientId: z.string().max(64).optional(),
});

export const socketTyping = z.object({
  conversationId: id.optional(),
  to: id.optional(),
  isTyping: z.boolean().optional(),
});
