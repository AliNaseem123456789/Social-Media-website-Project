import { prisma } from "#core/db/prisma.js";
import { AppError } from "#core/http/errors.js";
import { cache } from "#core/cache/cache.service.js";
import { cacheKeys } from "#core/cache/keys.js";

const TTL = 300;

/**
 * Everyone who should be invisible to this user: the accounts they blocked and the accounts that
 * blocked them. Blocking cuts both ways, so one set covers every read path.
 */
export async function hiddenUserIds(userId) {
  if (!userId) return [];
  const ids = await cache.wrap(cacheKeys.blockedIds(userId), TTL, async () => {
    const rows = await prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    return [...new Set(rows.map((r) => (r.blockerId === userId ? r.blockedId : r.blockerId)))];
  });
  return Array.isArray(ids) ? ids : [];
}

export async function isHidden(viewerId, otherId) {
  if (!viewerId || !otherId || viewerId === otherId) return false;
  return (await hiddenUserIds(viewerId)).includes(otherId);
}

export async function blockDirection(viewerId, otherId) {
  if (!viewerId || !otherId || viewerId === otherId) return { blocking: false, blockedBy: false };
  const rows = await prisma.block.findMany({
    where: {
      OR: [
        { blockerId: viewerId, blockedId: otherId },
        { blockerId: otherId, blockedId: viewerId },
      ],
    },
    select: { blockerId: true },
  });
  return {
    blocking: rows.some((r) => r.blockerId === viewerId),
    blockedBy: rows.some((r) => r.blockerId === otherId),
  };
}

/**
 * Stops an interaction with a blocked account. The two directions answer differently on purpose: the
 * person who blocked is told plainly, while someone who was blocked is told nothing that confirms it.
 */
export async function assertNotBlocked(viewerId, otherId) {
  const { blocking, blockedBy } = await blockDirection(viewerId, otherId);
  if (blocking) throw new AppError(403, "YOU_BLOCKED_USER", "You blocked this account. Unblock it to continue.");
  if (blockedBy) throw AppError.notFound("User");
}

export function invalidateBlocks(...userIds) {
  return cache.del(...userIds.filter(Boolean).map((id) => cacheKeys.blockedIds(id)));
}

/** Prisma `where` fragment hiding rows authored by a blocked account. */
export const notAuthoredByHidden = (hidden, column = "userId") =>
  hidden.length ? { [column]: { notIn: hidden } } : {};
