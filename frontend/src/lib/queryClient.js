import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (count, error) => {
        const status = error?.response?.status;
        if (status && status < 500) return false;
        return count < 2;
      },
    },
    mutations: { retry: false },
  },
});

export const queryKeys = {
  me: ["auth", "me"],
  sessions: ["auth", "sessions"],
  settings: ["settings"],

  profile: (id) => ["users", id],
  profileByUsername: (username) => ["users", "by-username", username],
  stats: (id) => ["analytics", "users", id],
  trending: ["analytics", "trending"],
  trendingTags: ["posts", "hashtags", "trending"],

  feed: (mode) => ["feed", mode],
  posts: (params) => ["posts", "list", params],
  likedPosts: (params) => ["posts", "liked", params],
  savedPosts: ["posts", "saved"],
  hashtagPosts: (tag) => ["posts", "hashtag", tag],
  post: (id) => ["posts", "detail", id],
  comments: (postId) => ["posts", postId, "comments"],
  commentReplies: (postId, parentId) => ["posts", postId, "comments", parentId],
  drafts: ["posts", "drafts"],

  followers: (userId) => ["follows", "followers", userId],
  following: (userId) => ["follows", "following", userId],
  suggestedPeople: ["suggestions", "people"],
  suggestedTags: ["suggestions", "hashtags"],

  friends: (userId) => ["friends", "list", userId ?? "me"],
  friendRequests: (direction) => ["friends", "requests", direction],
  friendSuggestions: ["friends", "suggestions"],
  friendStatus: (userId) => ["friends", "status", userId],

  conversations: ["chats"],
  conversation: (conversationId) => ["chats", "detail", conversationId],
  messages: (conversationId) => ["chats", "messages", conversationId],
  chatUnread: ["chats", "unread"],
  chatSearch: (q, conversationId) => ["chats", "search", q, conversationId ?? "all"],

  blockedAccounts: ["moderation", "blocks"],
  reportReasons: ["moderation", "reasons"],
  reports: (status, verdict = "all") => ["moderation", "reports", status, verdict],
  moderatorAccess: ["moderation", "access"],

  calls: ["calls"],
  iceServers: ["calls", "ice"],

  notifications: (filter) => ["notifications", filter],
  unreadCount: ["notifications", "unread"],
  search: (q, type) => ["search", q, type],
  linkPreview: (url) => ["share", "resolve", url],
};
