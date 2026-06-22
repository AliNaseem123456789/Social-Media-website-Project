// Update your typeDefs
export const typeDefs = `#graphql
  type User {
    username: String
    avatar_url: String
  }
  
  type Comment {
    comment_id: ID
    comment_text: String
    users: User
    created_at: String
  }
  
  type Post {
    post_id: ID
    user_id: ID      
    content: String
    image_url: String 
    total_likes: Int
    username: String
    created_at: String 
    comments: [Comment]
    avatar_url: String
    liked: Boolean  
  }
  
  type PostEdge {
    node: Post!
    cursor: String!
  }
  
  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
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