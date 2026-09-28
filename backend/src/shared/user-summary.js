import { prisma } from "#core/db/prisma.js";
import { storage, buckets } from "#core/storage/index.js";

export const userSummarySelect = {
  id: true,
  username: true,
  profile: { select: { username: true, profileImage: true } },
};

/**
 * Accounts created by the older deployment can carry their display name on the profile row rather than
 * on the user row, so both are consulted before giving up on a name.
 */
export function toUserSummary(user) {
  if (!user) return null;
  const name = user.username?.trim() || user.profile?.username?.trim() || null;
  return {
    id: user.id,
    username: name,
    avatarUrl: storage.resolveUrl(buckets.avatars, user.profile?.profileImage),
  };
}

/**
 * Adds the viewer's follow state to already presented summaries in one query, so any list of people
 * can render a follow button without a request per row.
 */
export async function withFollowState(summaries, viewerId) {
  const ids = summaries.map((s) => s?.id).filter(Boolean);
  if (!viewerId || !ids.length) return summaries.map((s) => (s ? { ...s, followedByMe: false } : s));
  const rows = await prisma.follow.findMany({
    where: { followerId: viewerId, followingId: { in: ids } },
    select: { followingId: true },
  });
  const following = new Set(rows.map((r) => r.followingId));
  return summaries.map((s) => (s ? { ...s, followedByMe: following.has(s.id) } : s));
}
