import { z } from "zod";

export const updateSettingsSchema = z
  .object({
    profileVisibility: z.enum(["public", "followers", "private"]).optional(),
    allowMessagesFrom: z.enum(["everyone", "following", "friends", "nobody"]).optional(),
    emailOnLike: z.boolean().optional(),
    emailOnComment: z.boolean().optional(),
    emailOnFriendRequest: z.boolean().optional(),
    emailOnMessage: z.boolean().optional(),
    emailOnMention: z.boolean().optional(),
    theme: z.enum(["system", "light", "dark"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Nothing to update");
