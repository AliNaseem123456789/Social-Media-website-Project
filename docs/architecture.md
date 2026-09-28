# Architecture

## Backend layout

```
backend/src
├── config/            Validated environment configuration (zod). The only place process.env is read.
├── core/              Infrastructure shared by all modules
│   ├── auth/          JWT signing/verification, revoked-session checks
│   ├── cache/         Redis connection factory, cache service, key builders
│   ├── db/            Prisma client (driver adapter for Postgres)
│   ├── http/          Errors, validation, auth guards, rate limiting, uploads, security headers, pagination
│   ├── logger/        pino logger
│   ├── messaging/     RabbitMQ connection, topology, event bus, consumer with retry + DLQ
│   ├── realtime/      Socket.IO server (Redis adapter) and cross-process emitter
│   └── storage/       Storage provider contract + Supabase and S3 drivers
├── modules/           One folder per feature
│   └── <module>/      index.js, *.routes.js, *.controller.js, *.service.js, *.repository.js, *.schemas.js
├── shared/            Small helpers used by several modules (user summaries, crypto)
├── workers/           Worker entrypoint and registry of event consumers
├── app.js             Express app composition
└── server.js          HTTP + Socket.IO bootstrap and graceful shutdown
```

Request flow inside a module: **route** (validation, guards) → **controller** (HTTP in/out) → **service** (business rules, cache, events) → **repository** (Prisma queries). Controllers never touch Prisma, repositories never touch HTTP.

## Running modules separately

`ENABLED_MODULES` accepts `*` or a comma separated list:

```bash
ENABLED_MODULES=auth,users node src/server.js
ENABLED_MODULES=posts,feed,search node src/server.js
```

Every module is mounted under `API_PREFIX` (default `/api/v1`) at its `basePath`, so a reverse proxy can route `/api/v1/auth/*` to one deployment and `/api/v1/posts/*` to another. Modules share nothing in memory: sessions are JWTs, caches and socket rooms live in Redis, and side effects travel through RabbitMQ. That is what makes the split safe.

Workers work the same way with `WORKERS=notifications,feed,analytics,scheduler`. The first three consume queues; `scheduler` is a timer worker that publishes due scheduled posts and settles calls left ringing. On hosts without background workers, `EMBEDDED_WORKERS=*` runs them inside the API process.

## Messaging

| Exchange | Type | Purpose |
| --- | --- | --- |
| `social.events` | topic | Domain events published by modules |
| `social.email` | topic | Email jobs for the email service |

| Queue | Bound to | Consumer |
| --- | --- | --- |
| `social.notifications` | `post.liked`, `comment.created`, `comment.replied`, `comment.liked`, `post.reposted`, `user.mentioned`, `user.followed`, `call.missed`, `friend.request.sent`, `friend.request.accepted`, `message.sent` | notifications worker (DB row, socket push, email job when the recipient's settings allow it) |
| `social.feed` | `post.created/updated/deleted`, `friend.request.accepted`, `friend.removed`, `user.followed`, `user.unfollowed`, `feed.rebuild.requested` | feed worker (Redis sorted-set feeds) |
| `social.analytics` | `#` | analytics worker (`analytics_events`, stats cache) |
| `social.email.outbox` | `#` on `social.email` | email service |

The `social` prefix comes from `RABBITMQ_PREFIX`, so several environments can share one broker.

Each message is an envelope: `{ id, type, occurredAt, source, data }`. Publishing uses a confirm channel. A failed consumer publishes the message to `<queue>.retry.<n>` (queue-level TTL taken from `RABBITMQ_RETRY_DELAYS_MS`), which dead-letters it back to the main queue. After the last attempt it goes to `<queue>.dlq`. Validation and parse errors skip retries and go straight to the DLQ.

Connections reconnect with exponential back-off, and consumers are re-attached automatically.

## Redis

One connection factory (`core/cache/redis.js`) with named clients: `main`, and `socket-pub` / `socket-sub` for Socket.IO. All keys go through `core/cache/keys.js` and are prefixed with `REDIS_KEY_PREFIX`.

| Use | Keys |
| --- | --- |
| Read-through cache | `profile:*`, `post:*`, `posts:author:*`, `feed:global:*`, `chats:recent:*`, `settings:*`, `follows:counts:*`, `suggest:*`, `stats:user:*`, `analytics:*` |
| Ranked feeds | `feed:user:<id>` (sorted set built by the feed worker) |
| Unread counters | `notifications:unread:<id>`, `chats:unread:<id>` |
| Presence | `presence:<userId>` (set of socket ids) |
| Session revocation | `auth:revoked:<sessionId>` (lives as long as an access token) |
| Rate limiting | `ratelimit:*` (express-rate-limit Redis store) |

Cache failures are logged and treated as misses. Redis being down slows the app but doesn't break reads.

## Realtime

Socket.IO authenticates with the access token (`auth.token` in the handshake) and joins each socket to `user:<id>`. The Redis adapter lets any API instance deliver to any user, and workers push through `@socket.io/redis-emitter` without holding sockets. Clients can no longer join arbitrary rooms. Call rooms need an unguessable id.

Chat events fan out to every member of a conversation: new messages, edits and deletes, read receipts and membership changes. Call signalling lives in its own module, which also writes `call_logs` as a call is requested, answered, rejected or ended.

## Storage

`core/storage/storage.provider.js` defines the contract (`upload`, `remove`, `publicUrl`). `STORAGE_DRIVER` picks `supabase.storage.js` (Storage REST API over `fetch`, no SDK) or `s3.storage.js` (works with AWS S3, R2, MinIO via `S3_ENDPOINT`). Avatars are stored as object keys and resolved to URLs at read time; a stored value may be a bare key, `<bucket>/<key>` or a full URL, and all three resolve. Post images keep full URLs so rows written by the legacy app still render. `npm run storage:check` uploads, fetches and deletes a pixel in every bucket to prove the credentials work.

To add a provider, implement the three methods and register it in `core/storage/index.js`.

## Blocking

Blocking is the one rule that cuts across every module, so it lives in `shared/blocks.js` rather than inside a feature. `hiddenUserIds(userId)` returns everyone the user blocked *and* everyone who blocked them, cached in Redis for five minutes and invalidated on both sides of a block. Read paths take that set as a filter (posts, comments, saved and liked lists, chat history, follow lists, notifications), the cross-viewer caches (the global feed) filter per request instead, and write paths call `assertNotBlocked`, which answers 403 to the blocker and 404 to the blocked so nothing confirms the block to the person on the wrong side of it.

## Authentication

- **Access token:** HS256 JWT, 15 minutes by default, sent as `Authorization: Bearer`. Carries the session id (`sid`).
- **Refresh token:** `<sessionId>.<secret>` in an httpOnly cookie scoped to `/api/v1/auth`. Only a SHA-256 hash is stored in `auth_sessions`.
- **Rotation:** every refresh issues a new secret. Replaying an older secret revokes the session (reuse detection). There is a 30-second grace window for parallel tabs.
- **Revocation:** logout, "sign out everywhere", password change and password reset revoke sessions in the database and mark them in Redis, so their access tokens stop working right away.
- **Lockout:** `LOGIN_MAX_FAILED_ATTEMPTS` failures lock the account for `LOGIN_LOCKOUT_MINUTES`. There are also IP+email rate limits.
- **Email verification and password reset:** single-use, hashed tokens in `auth_tokens` with expiry.
- **Email change:** two steps. The password proves it is the account holder, then a single-use token sent to the new address applies it; the old address is notified at both points and every other session is revoked once it lands.
- **Audit log:** registrations, logins (success and failure), lockouts, refresh-token reuse, session revocations, password changes and resets, email verification and change, blocks and moderator decisions are written to `audit_logs` with IP and user agent.

## Frontend

```
frontend/src
├── config/env.js        VITE_* configuration
├── lib/                 apiClient (token refresh interceptor), queryClient, cache helpers, formatters
├── theme/               Design tokens + MUI theme
├── context/             Socket and toast providers
├── components/          Layout shell and UI primitives
├── features/<feature>/  pages, components, services and hooks per feature
└── pages/               Legal, 404, and the AI assistant widget
```

Colour tokens are CSS variables defined for both modes in the MUI baseline, so `tokens.ink` follows the active theme without a component reading it again. `ColorModeProvider` resolves the System / Light / Dark preference, stores it locally and mirrors it to `user_settings.theme`.

Server state is managed with TanStack Query. Likes, messages and notification reads update optimistically. The access token lives in memory only and is refreshed before it expires. A 401 triggers one shared refresh and then retries the request.
