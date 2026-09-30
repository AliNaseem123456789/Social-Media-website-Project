import { toUserSummary, withFollowState } from "#shared/user-summary.js";
import { toPost } from "#modules/posts/posts.presenter.js";
import { withPostViewerState } from "#modules/posts/posts.viewer.js";
import { hiddenUserIds } from "#shared/blocks.js";
import { hybridSearch } from "./hybrid.search.js";

// Keyword search plus, when it is switched on and available, semantic search fused into it.
// With SEMANTIC_SEARCH off this is the plain Postgres provider and nothing changes.
const provider = hybridSearch;

export const searchService = {
  async search({ q, type, limit }, viewerId) {
    const hidden = await hiddenUserIds(viewerId);
    const [users, posts, hashtags] = await Promise.all([
      type === "posts" || type === "hashtags" ? [] : provider.searchUsers(q, limit, hidden),
      type === "users" || type === "hashtags" ? [] : provider.searchPosts(q, limit, hidden),
      type === "users" || type === "posts" ? [] : provider.searchHashtags(q, limit),
    ]);

    return {
      query: q,
      users: await withFollowState(users.map(toUserSummary), viewerId),
      posts: await withPostViewerState(posts.map(toPost), viewerId),
      hashtags,
    };
  },
};
