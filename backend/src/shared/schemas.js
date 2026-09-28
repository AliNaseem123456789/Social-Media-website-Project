import { z } from "zod";

export const idParam = (name = "id") => z.object({ [name]: z.coerce.number().int().positive() });

export const trimmedString = (min, max) => z.string().trim().min(min).max(max);
