import { z } from "zod";
import { cursorQuery } from "#core/http/pagination.js";

export const feedQuery = z.object({
  ...cursorQuery,
  mode: z.enum(["for-you", "following", "global"]).default("for-you"),
});
