-- Baseline of the tables that already exist in the shared Supabase database.
-- On the existing database this migration must NOT be executed. Mark it as applied instead:
--   npx prisma migrate resolve --applied 0_baseline
-- It only runs on a fresh, empty database (local development, CI).

CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user_profiles" (
  "user_id" INTEGER PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "username" TEXT,
  "bio" TEXT,
  "gender" TEXT,
  "age" INTEGER,
  "country" TEXT,
  "education" TEXT,
  "hobbies" TEXT,
  "profile_image" TEXT,
  "cover_image" TEXT,
  "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
  "updated_at" TIMESTAMPTZ(6)
);

CREATE TABLE IF NOT EXISTS "posts" (
  "post_id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "content" TEXT,
  "image_url" TEXT,
  "total_likes" INTEGER NOT NULL DEFAULT 0,
  "total_comments" INTEGER NOT NULL DEFAULT 0,
  "is_pinned" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6)
);

CREATE TABLE IF NOT EXISTS "comments" (
  "comment_id" SERIAL PRIMARY KEY,
  "post_id" INTEGER NOT NULL REFERENCES "posts"("post_id") ON DELETE CASCADE,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "comment_text" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "likes" (
  "like_id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "post_id" INTEGER NOT NULL REFERENCES "posts"("post_id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "friends" (
  "friendship_id" SERIAL PRIMARY KEY,
  "requester_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "recipient_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "messages" (
  "id" SERIAL PRIMARY KEY,
  "from_user" INTEGER NOT NULL,
  "to_user" INTEGER NOT NULL,
  "username" TEXT,
  "message" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "actor_id" INTEGER,
  "actor_name" TEXT,
  "target_id" INTEGER,
  "content" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user_stats" (
  "user_id" INTEGER PRIMARY KEY,
  "total_posts" INTEGER NOT NULL DEFAULT 0,
  "total_likes_received" INTEGER NOT NULL DEFAULT 0,
  "total_comments_received" INTEGER NOT NULL DEFAULT 0,
  "total_friends" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ(6)
);

CREATE TABLE IF NOT EXISTS "analytics_events" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER,
  "event_type" TEXT NOT NULL,
  "event_data" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
