export const typeDefs = `#graphql
  type User {
    username: String
  }
  type Comment {
    comment_id: ID
    comment_text: String
    users: User
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
  }

  type Query {
    getFeed(userId: ID!): [Post]
  }
`;
