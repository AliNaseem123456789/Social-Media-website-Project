import { prisma } from "#core/db/prisma.js";
import { AppError } from "#core/http/errors.js";
import { settingsService } from "#modules/settings/settings.service.js";
import { blockDirection } from "./blocks.js";

export const VISIBILITY = Object.freeze({ PUBLIC: "public", FOLLOWERS: "followers", PRIVATE: "private" });

export async function profileVisibility(userId) {
  const settings = await settingsService.get(userId);
  return settings.profileVisibility ?? VISIBILITY.PUBLIC;
}

async function isConnected(viewerId, targetId) {
  const [follow, friendship] = await Promise.all([
    prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: viewerId, followingId: targetId } },
      select: { followerId: true },
    }),
    prisma.friendship.findFirst({
      where: {
        status: "accepted",
        OR: [
          { requesterId: viewerId, recipientId: targetId },
          { requesterId: targetId, recipientId: viewerId },
        ],
      },
      select: { id: true },
    }),
  ]);
  return Boolean(follow || friendship);
}

/**
 * "followers" hides a profile from strangers but not from people already connected to it; "private"
 * hides it from everyone but the owner.
 */
export async function canViewUser(viewerId, targetId) {
  if (viewerId && viewerId === targetId) return true;
  const { blocking, blockedBy } = await blockDirection(viewerId, targetId);
  if (blocking || blockedBy) return false;
  const visibility = await profileVisibility(targetId);
  if (visibility === VISIBILITY.PUBLIC) return true;
  if (!viewerId || visibility === VISIBILITY.PRIVATE) return false;
  return isConnected(viewerId, targetId);
}

export async function assertCanViewUser(viewerId, targetId) {
  if (await canViewUser(viewerId, targetId)) return;
  const { blocking, blockedBy } = await blockDirection(viewerId, targetId);
  if (blocking) throw new AppError(403, "YOU_BLOCKED_USER", "You blocked this account. Unblock it to continue.");
  if (blockedBy) throw AppError.notFound("User");
  throw new AppError(403, "PROFILE_PRIVATE", "This profile is private");
}
