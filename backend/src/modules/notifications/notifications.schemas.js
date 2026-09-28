import { z } from "zod";
import { cursorQuery } from "#core/http/pagination.js";

export const listNotificationsQuery = z.object({
  ...cursorQuery,
  unread: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});

export const notificationParams = z.object({ id: z.coerce.number().int().positive() });
