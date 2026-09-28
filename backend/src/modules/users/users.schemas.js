import { z } from "zod";
import { idParam } from "#shared/schemas.js";

const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .optional();

export const userIdParams = idParam("id");

export const usernameParams = z.object({ username: z.string().trim().min(1).max(60) });

export const updateProfileSchema = z.object({
  username: z.string().trim().min(3).max(30).optional(),
  bio: optionalText(500),
  gender: optionalText(30),
  age: z
    .union([z.literal(""), z.coerce.number().int().min(13).max(120)])
    .transform((v) => (v === "" ? null : v))
    .optional(),
  country: optionalText(80),
  education: optionalText(120),
  hobbies: z
    .union([z.array(z.string().trim().max(40)).max(20), z.string().max(800)])
    .transform((v) => {
      const list = Array.isArray(v) ? v : v.split(",");
      const unique = [...new Set(list.map((h) => h.trim()).filter(Boolean))];
      return unique.length ? unique.join(", ") : null;
    })
    .optional(),
  removeCoverImage: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});

export const deleteAccountSchema = z.object({
  password: z.string().max(200).optional(),
  confirm: z.literal("DELETE"),
});
