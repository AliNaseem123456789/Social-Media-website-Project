import { config } from "#config";

const p = (...parts) => `${config.redis.keyPrefix}${parts.join(":")}`;

export const cacheKeys = {
  prefix: config.redis.keyPrefix,
  userMe: (userId) => p("user", userId, "me"),
  profile: (userId) => p("profile", userId),
  post: (postId) => p("post", postId),
  userPosts: (userId, query) => p("posts", "author", userId, query),
  userPostsPattern: (userId) => p("posts", "author", userId, "*"),
  likedPosts: (userId, query) => p("posts", "liked", userId, query),
  likedPostsPattern: (userId) => p("posts", "liked", userId, "*"),
  globalFeed: (query) => p("feed", "global", query),
  globalFeedPattern: () => p("feed", "global", "*"),
  userFeed: (userId) => p("feed", "user", userId),
  recentChats: (userId) => p("chats", "recent", userId),
  chatUnread: (userId) => p("chats", "unread", userId),
  userSettings: (userId) => p("settings", userId),
  followCounts: (userId) => p("follows", "counts", userId),
  blockedIds: (userId) => p("blocks", userId),
  suggestedPeople: (userId) => p("suggest", "people", userId),
  suggestedTags: (userId) => p("suggest", "tags", userId),
  trendingTags: (days, limit) => p("analytics", "tags", days, limit),
  linkPreview: (kind, id) => p("preview", kind, id),
  unreadCount: (userId) => p("notifications", "unread", userId),
  userStats: (userId) => p("stats", "user", userId),
  trending: () => p("analytics", "trending"),
  revokedSession: (sessionId) => p("auth", "revoked", sessionId),
  rateLimit: () => p("ratelimit", ""),
};
