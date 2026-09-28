import { config } from "#config";
import { prisma } from "#core/db/prisma.js";
import { AppError } from "#core/http/errors.js";
import { cache } from "#core/cache/cache.service.js";
import { cacheKeys } from "#core/cache/keys.js";
import { storage, buckets } from "#core/storage/index.js";
import { preview } from "#shared/text.js";
import { canViewUser } from "#shared/visibility.js";

const TTL = 300;
const SITE_NAME = "Circle";

const postPath = (id) => `${config.appUrl}/posts/${id}`;
const profilePath = (username) => `${config.appUrl}/u/${encodeURIComponent(username)}`;

export const shareService = {
  async postPreview(postId) {
    const card = await cache.wrap(cacheKeys.linkPreview("post", postId), TTL, async () => {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: {
          id: true,
          content: true,
          imageUrl: true,
          createdAt: true,
          userId: true,
          author: { select: { username: true, profile: { select: { profileImage: true } } } },
          images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
          _count: { select: { likes: true, comments: true } },
        },
      });
      if (!post) return null;

      const image = post.images[0]?.url ?? post.imageUrl;
      return {
        kind: "post",
        id: post.id,
        authorId: post.userId,
        url: postPath(post.id),
        title: `${post.author.username} on ${SITE_NAME}`,
        description: preview(post.content, 200) || "Shared a photo",
        image: image ? storage.resolveUrl(buckets.posts, image) : null,
        authorAvatar: storage.resolveUrl(buckets.avatars, post.author.profile?.profileImage),
        createdAt: post.createdAt,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
      };
    });

    if (!card) throw AppError.notFound("Post");
    return card;
  },

  async profilePreview(username) {
    const card = await cache.wrap(cacheKeys.linkPreview("user", username.toLowerCase()), TTL, async () => {
      const [user] = await prisma.$queryRaw`
        SELECT u.id, u.username, p.bio, p.profile_image AS "profileImage", p.country
        FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id
        WHERE lower(u.username) = lower(${username}) LIMIT 1`;
      if (!user) return null;
      return {
        kind: "profile",
        id: Number(user.id),
        username: user.username,
        url: profilePath(user.username),
        title: `${user.username} on ${SITE_NAME}`,
        description: preview(user.bio, 200) || `See what ${user.username} is sharing on ${SITE_NAME}`,
        image: storage.resolveUrl(buckets.avatars, user.profileImage),
      };
    });

    if (!card) throw AppError.notFound("User");
    return card;
  },

  /**
   * Resolves links to this app only: an in-app preview card never fetches a third-party URL, so the
   * endpoint cannot be used to make the server call arbitrary hosts.
   */
  async resolve(url, viewerId) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      throw AppError.badRequest("That does not look like a link");
    }
    if (parsed.origin !== new URL(config.appUrl).origin) {
      throw new AppError(422, "EXTERNAL_LINK", "Only links to this app can be previewed");
    }

    const post = parsed.pathname.match(/^\/posts\/(\d+)\/?$/);
    if (post) {
      const card = await this.postPreview(Number(post[1]));
      if (!(await canViewUser(viewerId, card.authorId))) throw AppError.notFound("Post");
      const { authorId: _authorId, ...rest } = card;
      return rest;
    }

    const profile = parsed.pathname.match(/^\/u\/([^/]+)\/?$/);
    if (profile) return this.profilePreview(decodeURIComponent(profile[1]));

    throw new AppError(422, "UNSUPPORTED_LINK", "Only post and profile links can be previewed");
  },
};
