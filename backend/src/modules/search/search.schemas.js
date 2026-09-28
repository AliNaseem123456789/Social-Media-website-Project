import { z } from "zod";

export const searchQuery = z.object({
  q: z.string().trim().min(2, "Search term must be at least 2 characters").max(100),
  type: z.enum(["all", "users", "posts", "hashtags"]).default("all"),
  limit: z.coerce.number().int().min(1).max(30).default(10),
});
