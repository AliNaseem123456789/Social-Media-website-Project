import { prisma } from "#core/db/prisma.js";
import { extractMentions } from "./text.js";

/**
 * Turns "@name" handles inside a text into the users they refer to. Handles that match no account are
 * dropped silently so a post is never rejected because of a typo.
 */
export async function resolveMentions(text, { exclude } = {}) {
  const handles = extractMentions(text);
  if (!handles.length) return [];
  const rows = await prisma.$queryRaw`
    SELECT id, username FROM users WHERE lower(username) = ANY(${handles}::text[]) LIMIT 20`;
  return rows
    .map((row) => ({ id: Number(row.id), username: row.username }))
    .filter((row) => row.id !== exclude);
}
