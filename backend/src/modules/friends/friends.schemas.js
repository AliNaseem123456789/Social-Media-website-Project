import { z } from "zod";

const id = z.coerce.number().int().positive();

export const listFriendsQuery = z.object({ userId: id.optional() });
export const listRequestsQuery = z.object({ direction: z.enum(["incoming", "outgoing"]).default("incoming") });
export const sendRequestSchema = z.object({ recipientId: id });
export const respondSchema = z.object({ action: z.enum(["accept", "reject"]) });
export const requestParams = z.object({ id });
export const userParams = z.object({ userId: id });
export const suggestionsQuery = z.object({ limit: z.coerce.number().int().min(1).max(30).default(8) });
