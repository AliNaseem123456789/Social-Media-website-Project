-- Additive migration: new tables, two nullable columns on "comments", and indexes.
-- Nothing is dropped or rewritten. Existing chat history is COPIED into the new conversation tables;
-- the legacy "messages" table is left untouched.

-- ---------------------------------------------------------------- comments: threads and editing
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "parent_comment_id" INTEGER;
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_parent_comment_id_fkey') THEN
    ALTER TABLE "comments"
      ADD CONSTRAINT "comments_parent_comment_id_fkey"
      FOREIGN KEY ("parent_comment_id") REFERENCES "comments"("comment_id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "comments_parent_comment_id_idx" ON "comments" ("parent_comment_id");
CREATE INDEX IF NOT EXISTS "comments_post_id_created_at_idx" ON "comments" ("post_id", "created_at");

CREATE TABLE IF NOT EXISTS "comment_likes" (
  "comment_id" INTEGER NOT NULL REFERENCES "comments"("comment_id") ON DELETE CASCADE,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  PRIMARY KEY ("comment_id", "user_id")
);

-- ---------------------------------------------------------------- saved posts and reposts
CREATE TABLE IF NOT EXISTS "post_saves" (
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "post_id" INTEGER NOT NULL REFERENCES "posts"("post_id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "post_id")
);
CREATE INDEX IF NOT EXISTS "post_saves_user_created_idx" ON "post_saves" ("user_id", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "post_references" (
  "post_id" INTEGER PRIMARY KEY REFERENCES "posts"("post_id") ON DELETE CASCADE,
  "referenced_post_id" INTEGER NOT NULL REFERENCES "posts"("post_id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "post_references_referenced_idx" ON "post_references" ("referenced_post_id");

-- ---------------------------------------------------------------- hashtags and extra images
CREATE TABLE IF NOT EXISTS "post_hashtags" (
  "post_id" INTEGER NOT NULL REFERENCES "posts"("post_id") ON DELETE CASCADE,
  "tag" TEXT NOT NULL,
  PRIMARY KEY ("post_id", "tag")
);
CREATE INDEX IF NOT EXISTS "post_hashtags_tag_idx" ON "post_hashtags" ("tag");

CREATE TABLE IF NOT EXISTS "post_images" (
  "id" SERIAL PRIMARY KEY,
  "post_id" INTEGER NOT NULL REFERENCES "posts"("post_id") ON DELETE CASCADE,
  "url" TEXT NOT NULL,
  "alt" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "post_images_post_position_idx" ON "post_images" ("post_id", "position");

-- ---------------------------------------------------------------- follows
CREATE TABLE IF NOT EXISTS "follows" (
  "follower_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "following_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  PRIMARY KEY ("follower_id", "following_id"),
  CONSTRAINT "follows_no_self" CHECK ("follower_id" <> "following_id")
);
CREATE INDEX IF NOT EXISTS "follows_following_idx" ON "follows" ("following_id");

-- ---------------------------------------------------------------- per-user settings
CREATE TABLE IF NOT EXISTS "user_settings" (
  "user_id" INTEGER PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "profile_visibility" TEXT NOT NULL DEFAULT 'public',
  "email_on_like" BOOLEAN NOT NULL DEFAULT true,
  "email_on_comment" BOOLEAN NOT NULL DEFAULT true,
  "email_on_friend_request" BOOLEAN NOT NULL DEFAULT true,
  "email_on_message" BOOLEAN NOT NULL DEFAULT true,
  "email_on_mention" BOOLEAN NOT NULL DEFAULT true,
  "theme" TEXT NOT NULL DEFAULT 'system',
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- drafts and scheduled posts
CREATE TABLE IF NOT EXISTS "post_drafts" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "content" TEXT,
  "image_urls" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "scheduled_for" TIMESTAMPTZ(6),
  "published_post_id" INTEGER REFERENCES "posts"("post_id") ON DELETE SET NULL,
  "published_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "post_drafts_user_idx" ON "post_drafts" ("user_id", "updated_at" DESC);
CREATE INDEX IF NOT EXISTS "post_drafts_due_idx" ON "post_drafts" ("scheduled_for") WHERE "published_at" IS NULL;

-- ---------------------------------------------------------------- calls
CREATE TABLE IF NOT EXISTS "call_logs" (
  "id" SERIAL PRIMARY KEY,
  "room_id" TEXT NOT NULL,
  "caller_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "callee_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "video" BOOLEAN NOT NULL DEFAULT true,
  "status" TEXT NOT NULL DEFAULT 'ringing',
  "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "answered_at" TIMESTAMPTZ(6),
  "ended_at" TIMESTAMPTZ(6)
);
CREATE UNIQUE INDEX IF NOT EXISTS "call_logs_room_id_key" ON "call_logs" ("room_id");
CREATE INDEX IF NOT EXISTS "call_logs_caller_idx" ON "call_logs" ("caller_id", "started_at" DESC);
CREATE INDEX IF NOT EXISTS "call_logs_callee_idx" ON "call_logs" ("callee_id", "started_at" DESC);

-- ---------------------------------------------------------------- conversations (direct and group)
CREATE TABLE IF NOT EXISTS "conversations" (
  "id" SERIAL PRIMARY KEY,
  "type" TEXT NOT NULL DEFAULT 'direct',
  "title" TEXT,
  "image_url" TEXT,
  "direct_key" TEXT,
  "created_by" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "last_message_at" TIMESTAMPTZ(6)
);
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "direct_key" TEXT;
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "last_message_at" TIMESTAMPTZ(6);
CREATE UNIQUE INDEX IF NOT EXISTS "conversations_direct_key_key" ON "conversations" ("direct_key");
CREATE INDEX IF NOT EXISTS "conversations_last_message_idx" ON "conversations" ("last_message_at" DESC);

CREATE TABLE IF NOT EXISTS "conversation_members" (
  "conversation_id" INTEGER NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL DEFAULT 'member',
  "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "last_read_message_id" BIGINT,
  "muted" BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY ("conversation_id", "user_id")
);
CREATE INDEX IF NOT EXISTS "conversation_members_user_idx" ON "conversation_members" ("user_id");

CREATE TABLE IF NOT EXISTS "conversation_messages" (
  "id" BIGSERIAL PRIMARY KEY,
  "conversation_id" INTEGER NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "sender_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "body" TEXT,
  "image_url" TEXT,
  "legacy_message_id" INTEGER,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "edited_at" TIMESTAMPTZ(6),
  "deleted_at" TIMESTAMPTZ(6)
);
CREATE INDEX IF NOT EXISTS "conversation_messages_thread_idx" ON "conversation_messages" ("conversation_id", "id" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "conversation_messages_legacy_key" ON "conversation_messages" ("legacy_message_id");

-- ---------------------------------------------------------------- copy legacy 1:1 chat history
-- DO $$
-- DECLARE
--   has_id BOOLEAN;
--   copied INTEGER;
-- BEGIN
--   SELECT EXISTS (
--     SELECT 1 FROM information_schema.columns
--     WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'id'
--   ) INTO has_id;

--   IF NOT has_id THEN
--     RAISE NOTICE 'messages.id not found - legacy chat history was not copied. Run npm run chat:import after checking the primary key name.';
--     RETURN;
--   END IF;

--   INSERT INTO "conversations" ("type", "direct_key", "created_at", "last_message_at")
--   SELECT 'direct',
--          least(m.from_user, m.to_user) || ':' || greatest(m.from_user, m.to_user),
--          min(m.created_at),
--          max(m.created_at)
--   FROM "messages" m
--   WHERE m.from_user <> m.to_user
--     AND EXISTS (SELECT 1 FROM "users" u WHERE u.id = m.from_user)
--     AND EXISTS (SELECT 1 FROM "users" u WHERE u.id = m.to_user)
--   GROUP BY 2
--   ON CONFLICT ("direct_key") DO NOTHING;

--   INSERT INTO "conversation_members" ("conversation_id", "user_id")
--   SELECT c.id, member.user_id
--   FROM "conversations" c
--   CROSS JOIN LATERAL (
--     VALUES (split_part(c.direct_key, ':', 1)::int), (split_part(c.direct_key, ':', 2)::int)
--   ) AS member(user_id)
--   WHERE c.type = 'direct'
--     AND c.direct_key IS NOT NULL
--     AND EXISTS (SELECT 1 FROM "users" u WHERE u.id = member.user_id)
--   ON CONFLICT DO NOTHING;

--   INSERT INTO "conversation_messages" ("conversation_id", "sender_id", "body", "created_at", "legacy_message_id")
--   SELECT c.id, m.from_user, m.message, m.created_at, m.id
--   FROM "messages" m
--   JOIN "conversations" c
--     ON c.direct_key = least(m.from_user, m.to_user) || ':' || greatest(m.from_user, m.to_user)
--   WHERE EXISTS (SELECT 1 FROM "users" u WHERE u.id = m.from_user)
--   ON CONFLICT ("legacy_message_id") DO NOTHING;

--   GET DIAGNOSTICS copied = ROW_COUNT;
--   RAISE NOTICE 'Copied % legacy messages into conversation_messages', copied;
-- END $$;

-- -- ---------------------------------------------------------------- indexes on existing tables
-- CREATE INDEX IF NOT EXISTS "posts_user_created_idx" ON "posts" ("user_id", "created_at" DESC);
-- CREATE INDEX IF NOT EXISTS "posts_created_idx" ON "posts" ("created_at" DESC);
-- CREATE INDEX IF NOT EXISTS "likes_post_idx" ON "likes" ("post_id");
-- CREATE INDEX IF NOT EXISTS "likes_user_created_idx" ON "likes" ("user_id", "created_at" DESC);
-- CREATE INDEX IF NOT EXISTS "messages_pair_idx" ON "messages" ("from_user", "to_user", "created_at" DESC);
-- CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id", "read", "id" DESC);
-- CREATE INDEX IF NOT EXISTS "friends_requester_idx" ON "friends" ("requester_id", "status");
-- CREATE INDEX IF NOT EXISTS "friends_recipient_idx" ON "friends" ("recipient_id", "status");

-- -- One like per user per post. Skipped (with a notice) if duplicates already exist.
-- DO $$
-- DECLARE
--   duplicates INTEGER;
-- BEGIN
--   SELECT count(*) INTO duplicates FROM (
--     SELECT user_id, post_id FROM "likes" GROUP BY user_id, post_id HAVING count(*) > 1
--   ) d;

--   IF duplicates > 0 THEN
--     RAISE NOTICE 'likes has % duplicated (user_id, post_id) pairs - unique index skipped. Clean them up, then create it manually.', duplicates;
--   ELSE
--     CREATE UNIQUE INDEX IF NOT EXISTS "likes_user_post_key" ON "likes" ("user_id", "post_id");
--   END IF;
-- END $$;
