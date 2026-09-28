import bcrypt from "bcrypt";
import { AppError } from "#core/http/errors.js";
import { cache } from "#core/cache/cache.service.js";
import { cacheKeys } from "#core/cache/keys.js";
import { storage, buckets } from "#core/storage/index.js";
import { childLogger } from "#core/logger/index.js";
import { canViewUser, profileVisibility } from "#shared/visibility.js";
import { blockDirection } from "#shared/blocks.js";
import { followsService } from "#modules/follows/follows.service.js";
import { usersRepository } from "./users.repository.js";
import { toProfile } from "./users.presenter.js";

const log = childLogger("users");
const PROFILE_TTL = 600;

async function removeStoredImage(value) {
  const key = storage.keyFromValue(buckets.avatars, value);
  if (!key) return;
  try {
    await storage.remove(buckets.avatars, [key]);
  } catch (err) {
    log.warn({ err: err.message, key }, "could not remove previous image");
  }
}

async function invalidate(userId) {
  await cache.del(cacheKeys.profile(userId), cacheKeys.userMe(userId));
}

export const usersService = {
  async getProfile(userId, viewerId) {
    const profile = await cache.wrap(cacheKeys.profile(userId), PROFILE_TTL, async () => {
      const user = await usersRepository.findWithProfile(userId);
      return user ? toProfile(user, { includePrivate: true }) : null;
    });
    if (!profile) throw AppError.notFound("User");

    const [counts, relation, block] = await Promise.all([
      followsService.counts(userId),
      followsService.relation(viewerId, userId),
      blockDirection(viewerId, userId),
    ]);
    const social = {
      followerCount: counts.followers,
      followingCount: counts.following,
      followedByMe: relation.following,
      followsMe: relation.followedBy,
      blockedByMe: block.blocking,
    };

    if (viewerId === userId) {
      return { ...profile, ...social, visibility: await profileVisibility(userId) };
    }

    const { email: _email, ...publicProfile } = profile;
    if (block.blockedBy) throw AppError.notFound("User");
    if (await canViewUser(viewerId, userId)) return { ...publicProfile, ...social, isPrivate: false };

    // A hidden profile still answers with the identity a follow button needs, and nothing else.
    return {
      id: publicProfile.id,
      username: publicProfile.username,
      avatarUrl: publicProfile.avatarUrl,
      coverUrl: null,
      joinedAt: publicProfile.joinedAt,
      hobbies: [],
      ...social,
      isPrivate: !block.blocking,
    };
  },

  async getProfileByUsername(username, viewerId) {
    const userId = await usersRepository.findIdByUsername(username);
    if (!userId) throw AppError.notFound("User");
    return this.getProfile(userId, viewerId);
  },

  async updateProfile(userId, input, files = {}) {
    const current = await usersRepository.findWithProfile(userId);
    if (!current) throw AppError.notFound("User");

    const { removeCoverImage, ...fields } = input;
    const update = { ...fields };
    const replaced = [];

    const avatar = files.avatar?.[0];
    if (avatar) {
      const stored = await storage.uploadImage(buckets.avatars, avatar, { folder: `users/${userId}`, preset: "avatar" });
      update.profileImage = stored.key;
      replaced.push(current.profile?.profileImage);
    }

    const cover = files.cover?.[0];
    if (cover) {
      const stored = await storage.uploadImage(buckets.avatars, cover, { folder: `users/${userId}`, preset: "cover" });
      update.coverImage = stored.key;
      replaced.push(current.profile?.coverImage);
    } else if (removeCoverImage) {
      update.coverImage = null;
      replaced.push(current.profile?.coverImage);
    }

    const user = await usersRepository.updateProfile(userId, update);
    await invalidate(userId);
    await Promise.all(replaced.filter(Boolean).map(removeStoredImage));
    return toProfile(user, { includePrivate: true });
  },

  async completeOnboarding(userId) {
    await usersRepository.completeOnboarding(userId);
    await invalidate(userId);
  },

  async deleteAccount(userId, { password }) {
    const user = await usersRepository.findWithProfile(userId);
    if (!user) throw AppError.notFound("User");
    if (user.password && (!password || !(await bcrypt.compare(password, user.password)))) {
      throw AppError.badRequest("Password is incorrect");
    }
    try {
      await usersRepository.deleteUser(userId);
    } catch (err) {
      if (err.code === "P2003") {
        throw AppError.conflict("Account has linked records that must be removed first", "ACCOUNT_HAS_DEPENDENCIES");
      }
      throw err;
    }
    await invalidate(userId);
    await Promise.all([user.profile?.profileImage, user.profile?.coverImage].filter(Boolean).map(removeStoredImage));
    return user;
  },
};
