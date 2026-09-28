// DEPRECATED: legacy GraphQL feed, superseded by the REST endpoint GET /api/v1/feed.
// Kept only for reference and backwards compatibility. Disabled unless ENABLE_LEGACY_GRAPHQL=true.
// Do not add new fields here; extend the REST feed module instead.
export const typeDefs = `#graphql
  type Author {
    id: ID!
    username: String
    avatarUrl: String
  }

  type Post {
    id: ID!
    content: String
    imageUrl: String
    likeCount: Int
    commentCount: Int
    likedByMe: Boolean
    createdAt: String
    author: Author
  }

  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }

  type PostEdge {
    node: Post!
    cursor: String!
  }

  type FeedResult {
    edges: [PostEdge!]!
    pageInfo: PageInfo!
  }

  type Query {
    getFeed(first: Int, after: String): FeedResult!
    getChronologicalFeed(first: Int, after: String): FeedResult!
    getGlobalFeed(first: Int, after: String): FeedResult!
  }
`;
