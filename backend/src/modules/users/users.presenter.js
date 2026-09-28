import { storage, buckets } from "#core/storage/index.js";

export function toProfile(user, { includePrivate = false } = {}) {
  const profile = user.profile ?? {};
  return {
    id: user.id,
    username: user.username,
    ...(includePrivate ? { email: user.email } : {}),
    joinedAt: user.createdAt,
    bio: profile.bio ?? null,
    gender: profile.gender ?? null,
    age: profile.age ?? null,
    country: profile.country ?? null,
    education: profile.education ?? null,
    hobbies: profile.hobbies ? profile.hobbies.split(",").map((h) => h.trim()).filter(Boolean) : [],
    avatarUrl: storage.resolveUrl(buckets.avatars, profile.profileImage),
    coverUrl: storage.resolveUrl(buckets.avatars, profile.coverImage),
    onboardingCompleted: profile.onboardingCompleted ?? false,
  };
}
