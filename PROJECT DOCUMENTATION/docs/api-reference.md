# API Documentation

## REST Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | Email/password login |
| POST | `/api/signup` | Register new user |
| POST | `/api/google` | Google OAuth login |

### Posts

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/posts` | Create post |
| POST | `/api/posts/like` | Like/unlike post |
| POST | `/api/posts/comment` | Add comment |
| GET | `/api/posts/fullpost/:id` | Get full post details |
| GET | `/api/posts/myposts/:id` | Get user's posts |
| POST | `/api/posts/upload` | Upload post image |

### Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile/:user_id` | Get user profile |
| POST | `/api/profile/add` | Add profile info (with profileImage & coverImage) |
| POST | `/api/profile/upload` | Upload profile/cover images |

### Friends

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/friends/request` | Send friend request |
| GET | `/api/friends/pending/:userId` | Get pending requests |
| POST | `/api/friends/respond` | Accept/reject request |
| GET | `/api/friends/:userId` | Get friends list |

### Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search/users` | Search users |
| GET | `/api/search/posts` | Search posts |
| GET | `/api/search/all` | Combined search (users & posts) |

### Chats

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recentchat/:userId` | Get recent chats list |
| POST | `/api/chat/:user1/:user2` | Get chat history between two users |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `register` | Client → Server | Register user ID |
| `private_message` | Client → Server | Send message |
| `private_message` | Server → Client | Receive message |
| `join-room` | Client → Server | Join call room |
| `offer` | Bidirectional | WebRTC offer |
| `answer` | Bidirectional | WebRTC answer |
| `ice-candidate` | Bidirectional | ICE candidate |
## GraphQL API

```graphql
query GetFeed($userId: ID!) {
  getFeed(userId: $userId) {
    post_id
    content
    image_url
    total_likes
    username
    avatar_url
    comments {
      comment_id
      comment_text
      users {
        username
      }
    }
  }
}