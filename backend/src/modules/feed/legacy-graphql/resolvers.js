// DEPRECATED: legacy GraphQL resolvers. They delegate to feedService so behaviour matches GET /api/v1/feed.
import { GraphQLError } from "graphql";
import { feedService } from "../feed.service.js";

function toConnection(result) {
  return {
    edges: result.items.map((post) => ({
      node: { ...post, createdAt: new Date(post.createdAt).toISOString() },
      cursor: result.pageInfo.nextCursor ?? "",
    })),
    pageInfo: { hasNextPage: result.pageInfo.hasMore, endCursor: result.pageInfo.nextCursor },
  };
}

const resolveFeed = (mode) => async (_, { first = 10, after }, { user }) => {
  if (!user) throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
  const limit = Math.min(Math.max(first, 1), 50);
  return toConnection(await feedService.getFeed(user.id, { mode, limit, cursor: after || undefined }));
};

export const resolvers = {
  Query: {
    getFeed: resolveFeed("for-you"),
    getChronologicalFeed: resolveFeed("following"),
    getGlobalFeed: resolveFeed("global"),
  },
};
