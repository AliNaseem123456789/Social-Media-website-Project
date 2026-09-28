# API reference

Base URL: `{API_ORIGIN}/api/v1`. Unless marked **public**, endpoints need `Authorization: Bearer <accessToken>`.

Successful responses: `{ "success": true, "data": ... }`. `204` responses have no body.
Errors: `{ "success": false, "error": { "code", "message", "details?", "requestId" } }`.

Paginated endpoints take `cursor` and `limit` and return `{ items, pageInfo: { hasMore, nextCursor } }`. Pass `nextCursor` back as `cursor`.

| Code | Meaning |
| --- | --- |
| 401 `TOKEN_EXPIRED` / `INVALID_TOKEN` / `SESSION_REVOKED` | Refresh the session or sign in again |
| 403 `FORBIDDEN` / `EMAIL_NOT_VERIFIED` | Not allowed |
| 403 `PROFILE_PRIVATE` | The profile, or its posts, are hidden from the caller |
| 403 `YOU_BLOCKED_USER` | The caller blocked that account. An account that blocked *the caller* answers 404 instead, so nothing confirms it |
| 403 `MESSAGES_NOT_ALLOWED` | The recipient's message setting does not let the caller start a conversation |
| 409 `EMAIL_TAKEN`, `REQUEST_PENDING`, `ALREADY_FRIENDS`, `ALREADY_REPOSTED` | Conflict |
| 502 `STORAGE_UPLOAD_FAILED` | The object store rejected the upload |
| 422 `VALIDATION_FAILED` | `details: [{ field, message }]` |
| 423 `ACCOUNT_LOCKED` | Too many failed logins |
| 429 `RATE_LIMITED` | Slow down |

## Health

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | **public**. Liveness and enabled modules |
| GET | `/api/ready` | **public**. Database, Redis and RabbitMQ status (503 when degraded) |

## Auth `/auth`

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| POST | `/register` | `{ username, email, password }` | **public**. Returns session and sends a verification email |
| POST | `/login` | `{ email, password }` | **public** |
| POST | `/google` | `{ credential }` | **public**. Google ID token |
| POST | `/refresh` | none | **public**. Uses the refresh cookie and rotates it |
| POST | `/logout` | none | Revokes the current session |
| POST | `/logout-all` | none | Revokes every session |
| GET | `/me` | none | Current user |
| GET | `/sessions` | none | Active sessions (`current` flag) |
| DELETE | `/sessions/:id` | none | Revoke one session |
| POST | `/password/change` | `{ currentPassword?, newPassword }` | Signs out other sessions |
| POST | `/password/forgot` | `{ email }` | **public**. Always 202 |
| POST | `/password/reset` | `{ token, password }` | **public** |
| POST | `/email/verify` | `{ token }` | **public** |
| POST | `/email/resend` | none | |
| POST | `/email/change` | `{ email, password? }` | 202. Sends a confirmation link to the **new** address and a notice to the old one |
| POST | `/email/change/confirm` | `{ token }` | **public**. Applies the change and signs out every other session |

Session response: `{ user, accessToken, expiresIn }` plus the `rt` httpOnly cookie.
`user`: `{ id, username, email, createdAt, emailVerified, hasPassword, onboardingCompleted, avatarUrl }`.
Password rules: 8 to 72 characters, at least one letter and one number.

## Users `/users`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/me` | Own profile (includes email) |
| PATCH | `/me` | multipart: `username, bio, gender, age, country, education, hobbies` (comma separated), files `avatar`, `cover`, `removeCoverImage=true` |
| POST | `/me/onboarding/complete` | |
| DELETE | `/me` | `{ password?, confirm: "DELETE" }` |
| GET | `/:id` | Public profile |
| GET | `/by-username/:username` | Same profile, looked up by handle (what `@mentions` link to) |
| PUT / DELETE | `/:id/follow` | Follow or unfollow. Returns `{ following, followerCount, followingCount }` |
| GET | `/:id/followers` | Paginated. `{ id, username, avatarUrl, followedAt, followedByMe, mutualFollowers }` |
| GET | `/:id/following` | Same shape |

Profile shape: `{ id, username, email?, joinedAt, bio, gender, age, country, education, hobbies[], avatarUrl, coverUrl, onboardingCompleted, followerCount, followingCount, followedByMe, followsMe }`.
Own profile also carries `visibility`. A profile the caller may not see returns only identity, counts and `isPrivate: true`, and that user's posts answer `403 PROFILE_PRIVATE`.

## Settings `/settings`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | `{ profileVisibility, allowMessagesFrom, emailOnLike, emailOnComment, emailOnFriendRequest, emailOnMessage, emailOnMention, theme, updatedAt }` |
| PATCH | `/` | Any subset of the same fields |

`profileVisibility` is `public`, `followers` or `private`; `theme` is `system`, `light` or `dark`.
`allowMessagesFrom` is `everyone`, `following` (only people this account follows), `friends` or `nobody`. It gates **starting** a conversation, not continuing one, so a thread that already exists stays open if the setting is tightened later.
The notification worker checks the matching `emailOn*` flag before sending; in-app notifications are always created.

## Suggestions `/suggestions`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/people` | `limit`. Ranked by mutual follows, shared hobbies, country and education. Each item carries `reason`, `mutualFollows`, `sharedHobbies` |
| GET | `/hashtags` | `limit`. Tags from what the caller liked, saved and commented on, topped up from trending |

## Posts `/posts`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | `author, hashtag, sort=recent\|oldest\|likes, time=all\|week\|month\|year, type=all\|image\|text, minLikes, cursor, limit` |
| POST | `/` | multipart: `content`, up to `MAX_POST_IMAGES` files `images`, one `alt` field per image in the same order |
| GET | `/liked` | Posts the caller liked (same filters, no `author` or `sort`) |
| GET | `/saved` | Posts the caller saved, newest save first |
| GET | `/hashtags/trending` | `days` (default 7), `limit`. `{ items: [{ tag, posts }] }` |
| GET | `/:id` | |
| PATCH | `/:id` | multipart: `content`, files `images`, `alt`, `removeImage=true`. Owner only. Sent images replace the set |
| DELETE | `/:id` | Owner only |
| PUT / DELETE | `/:id/pin` | Pin or unpin (one pinned post per user) |
| PUT / DELETE | `/:id/like` | Like or unlike (idempotent). Returns `{ liked, likeCount }` |
| PUT / DELETE | `/:id/save` | Save or unsave. Returns `{ saved, saveCount }` |
| POST | `/:id/repost` | `{ content? }`. Creates a post linked to the original; a repost of a repost points at the original |
| DELETE | `/:id/repost` | Removes the caller's repost of that post |
| GET | `/:id/comments` | Top level comments, oldest first, each with up to two preloaded `replies`. `parentId` pages one thread, `flat=true` returns everything |
| POST | `/:id/comments` | `{ text, parentId? }`. A reply to a reply is attached to the thread root |
| PATCH | `/:id/comments/:commentId` | `{ text }`. Author only |
| DELETE | `/:id/comments/:commentId` | Comment author or post owner |
| PUT / DELETE | `/:id/comments/:commentId/like` | Returns `{ liked, likeCount }` |

Post shape: `{ id, content, imageUrl, images: [{ id, url, alt }], hashtags: [], isPinned, createdAt, updatedAt, likeCount, commentCount, saveCount, repostCount, likedByMe, savedByMe, repostedByMe, repostOf: null | { id, content, imageUrl, images, createdAt, author }, author: { id, username, avatarUrl } }`.
Comment shape: `{ id, postId, text, parentId, createdAt, updatedAt, editedAt, likeCount, replyCount, likedByMe, author, replies? }`.

`#hashtags` and `@mentions` are parsed out of the text on create and edit: tags become filterable, mentions raise a notification and an email.

### Drafts and scheduled posts

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/drafts` | Unpublished drafts, scheduled ones first |
| POST | `/drafts` | JSON `{ content, images: [url], scheduledFor }` or multipart with files `images` |
| PATCH | `/drafts/:draftId` | Same body. JSON `images: []` clears the images, `scheduledFor: null` clears the schedule |
| DELETE | `/drafts/:draftId` | |
| POST | `/drafts/:draftId/publish` | Publishes immediately |

Draft shape: `{ id, content, images: [url], scheduledFor, publishedAt, publishedPostId, createdAt, updatedAt }`.
A draft with `scheduledFor` in the past is published by the `scheduler` worker, which claims it in a single statement so two schedulers cannot publish it twice.

## Feed `/feed`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | `mode=for-you\|following\|global`, `cursor`, `limit`. Returns `{ mode, items, pageInfo }`. `for-you` falls back to `following` while the ranked feed is being built |

The legacy GraphQL feed (`/api/graphql`, `getFeed`, `getChronologicalFeed`, `getGlobalFeed`) is deprecated and only mounted when `ENABLE_LEGACY_GRAPHQL=true`.

## Friends `/friends`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | `userId?`. Friends of a user (default: caller) |
| GET | `/requests` | `direction=incoming\|outgoing` |
| POST | `/requests` | `{ recipientId }` |
| PATCH | `/requests/:id` | `{ action: "accept" \| "reject" }`. Recipient only |
| DELETE | `/requests/:id` | Cancel an outgoing request |
| GET | `/suggestions` | `limit` |
| GET | `/status/:userId` | `{ status: none\|outgoing\|incoming\|friends\|self, requestId }` |
| DELETE | `/:userId` | Unfriend |

## Chats `/chats`

| Method | Path | Notes |
| --- | --- | --- |
Chat runs on conversations. A direct chat is a two person conversation, a group holds up to 50 with admins.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | `{ items: [Conversation] }`, most recent activity first |
| GET | `/unread` | `{ total, conversations: { [id]: count } }` |
| GET | `/search` | `q`, `conversationId?`, `limit`. Message search across the caller's conversations |
| POST | `/direct` | `{ userId }`. Returns the existing direct conversation or creates it |
| POST | `/groups` | `{ title, userIds }`. Creator becomes admin |
| GET | `/:conversationId` | One conversation |
| PATCH | `/:conversationId` | multipart `title`, file `image`, `removeImage=true`. Group admins only |
| POST | `/:conversationId/members` | `{ userIds }`. Group admins only |
| DELETE | `/:conversationId/members/:userId` | Admins remove anyone, members remove themselves. The conversation is deleted when the last member leaves |
| GET | `/:conversationId/messages` | Newest first, paginated |
| POST | `/:conversationId/messages` | `{ text }` or multipart with `text` and file `image` |
| PATCH | `/:conversationId/messages/:messageId` | `{ text }`. Author only |
| DELETE | `/:conversationId/messages/:messageId` | Author or group admin. Soft delete, the row stays as a tombstone |
| PATCH | `/:conversationId/members/:userId` | `{ role: "admin" \| "member" }`. Group admins only; the last admin cannot step down |
| PUT | `/:conversationId/mute` | `{ muted }`. Muting silences the email for that conversation and the unread styling, per member |
| POST | `/:conversationId/read` | `{ messageId? }`, defaults to the newest message |

Conversation shape: `{ id, type, title, imageUrl, partner, members: [{ id, username, avatarUrl, role, lastReadMessageId, online }], memberCount, myRole, muted, unreadCount, lastMessage, lastMessageAt, createdAt }`.
Message shape: `{ id, conversationId, from, text, imageUrl, createdAt, editedAt, deleted, sender }`.

Direct messages are also mirrored into the legacy `messages` table, and edits and deletes follow, so the older deployment reading that table keeps working.

## Moderation `/moderation`

Blocking is mutual and applies everywhere: profiles, posts, comments, the feed, search, suggestions, follows, friend requests, conversations and notifications. Blocking also deletes any follow in either direction and any friendship or pending request between the two accounts; unblocking does not bring them back.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/blocks` | Accounts the caller has blocked, newest first |
| PUT | `/blocks/:id` | Block. Returns `{ blocked: true, user }` |
| DELETE | `/blocks/:id` | Unblock |
| GET | `/reasons` | The report reasons this build accepts |
| POST | `/reports` | `{ subjectType: post\|comment\|user\|message, subjectId, reason, details? }`. Reporting the same thing twice returns `alreadyReported: true` rather than a second row |
| GET | `/access` | `{ moderator }` for the caller |
| GET | `/reports` | **moderators only**. `status=open\|reviewing\|actioned\|dismissed\|all`. Each report carries the reporter, the reviewer and the reported content itself |
| PATCH | `/reports/:reportId` | **moderators only**. `{ status, resolution?, removeContent? }`. `removeContent` deletes the reported post or comment, or tombstones the message; an account cannot be removed this way |

Moderators are listed in `ADMIN_USER_IDS`, so no column was added to the shared `users` table. Every block, unblock and report decision is written to `audit_logs`.

## Calls `/calls`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | Call history, newest first, plus `missedCount`. `{ id, roomId, direction, video, status, startedAt, answeredAt, endedAt, durationSeconds, peer }` |
| GET | `/ice` | `{ iceServers, ttlSeconds, turnConfigured }`. TURN credentials are minted per request from `TURN_SECRET` |
| POST | `/room` | `{ roomId }` for a new call |

`status` is `ringing`, `answered`, `ended`, `rejected` or `missed`. A call nobody answered becomes `missed` and notifies the callee; calls left ringing are settled by the `scheduler` worker.

## Share `/share`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/posts/:id` | **public**. HTML with Open Graph and Twitter meta, redirecting to the app. For crawlers |
| GET | `/u/:username` | **public**. The same for a profile |
| POST | `/resolve` | `{ url }`. Preview card for a link to this app. Any other origin answers 422 |

## Notifications `/notifications`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | `unread=true`, `cursor`, `limit` |

| GET | `/unread-count` | `{ count }` |
| PATCH | `/:id/read` | Returns `{ count }` |
| POST | `/read-all` | Returns `{ count }` |

Types: `like`, `comment`, `comment_reply`, `comment_like`, `mention`, `follow`, `repost`, `missed_call`, `friend_request`, `friend_accept`. Each notification carries a `link` for the client to open.

## Search `/search`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | `q` (at least 2 characters), `type=all\|users\|posts\|hashtags`, `limit`. Returns `{ users, posts, hashtags }`. Users carry `followedByMe` |

Posts are matched against a generated `tsvector` column through its GIN index and ranked with `ts_rank`; a term that produces no lexemes falls back to a substring scan. Names use trigram similarity, so a one-character typo still finds the person. Blocked accounts and their posts never appear.

## Analytics `/analytics`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/users/:id` | `{ totalPosts, totalLikesReceived, totalCommentsReceived, totalFriends }` |
| POST | `/me/refresh` | Recompute own stats |
| GET | `/trending` | `limit`. Most liked posts of the last 7 days |

## Socket.IO

Connect to the API origin (path `/socket.io`) with `auth: { token: accessToken }`. Connection errors: `UNAUTHORIZED`, `TOKEN_EXPIRED`, `SESSION_REVOKED`.

| Direction | Event | Payload |
| --- | --- | --- |
| client → server | `message:send` | `{ conversationId, text, clientId? }` (or `to` for a direct chat, which opens one). Ack: `{ ok, message?, error? }` |
| server → client | `message:new` | Message object, sent to every member |
| server → client | `message:updated` | Message object after an edit or delete |
| server → client | `message:read` | `{ conversationId, userId, lastReadMessageId }` |
| server → client | `conversation:updated` | `{ conversationId, reason }` |
| both | `chat:typing` | `{ conversationId, isTyping }` → other members get `{ conversationId, from, isTyping }` |
| server → client | `notification:new` | notification object |
| server → client | `notification:unread` | `{ count }` |
| client → server | `call:request` | `{ to, roomId, video }` → callee gets `{ from, roomId, video }` |
| client → server | `call:rejected` / `call:end` | `{ to, roomId }` |
| client → server | `call:join` | `{ roomId }` → others in the room get `{ from }` |
| both | `call:offer` / `call:answer` / `call:ice-candidate` | `{ roomId, data }` → peers get `{ from, data }` |
