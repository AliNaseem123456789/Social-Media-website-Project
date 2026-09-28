-- Safety layer (blocks, reports), the settings they need, and the indexes that make search scale.
-- Additive and idempotent: every statement is guarded, so running it twice changes nothing and the
-- legacy app and the assistant keep reading the same tables they always did.

-- ---------------------------------------------------------------------------
-- Blocks
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "blocks" (
  "blocker_id" INTEGER NOT NULL,
  "blocked_id" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "blocks_pkey" PRIMARY KEY ("blocker_id", "blocked_id"),
  CONSTRAINT "blocks_no_self" CHECK ("blocker_id" <> "blocked_id")
);

DO $$
BEGIN
  ALTER TABLE "blocks"
    ADD CONSTRAINT "blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id")
    REFERENCES "users"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "blocks"
    ADD CONSTRAINT "blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id")
    REFERENCES "users"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "blocks_blocked_id_idx" ON "blocks" ("blocked_id");

ALTER TABLE "blocks" ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "reports" (
  "id" BIGSERIAL PRIMARY KEY,
  "reporter_id" INTEGER NOT NULL,
  "subject_type" TEXT NOT NULL,
  "subject_id" BIGINT NOT NULL,
  "subject_user_id" INTEGER,
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "resolution" TEXT,
  "reviewed_by" INTEGER,
  "reviewed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

DO $$
BEGIN
  ALTER TABLE "reports"
    ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id")
    REFERENCES "users"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- One open report per person per thing: re-reporting updates nothing instead of piling up rows.
CREATE UNIQUE INDEX IF NOT EXISTS "reports_open_unique"
  ON "reports" ("reporter_id", "subject_type", "subject_id")
  WHERE "status" = 'open';

CREATE INDEX IF NOT EXISTS "reports_status_created_idx" ON "reports" ("status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "reports_subject_idx" ON "reports" ("subject_type", "subject_id");

ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Settings: who may start a conversation with me
-- ---------------------------------------------------------------------------

ALTER TABLE "user_settings"
  ADD COLUMN IF NOT EXISTS "allow_messages_from" TEXT NOT NULL DEFAULT 'everyone';

-- ---------------------------------------------------------------------------
-- Auth tokens carry a payload, which is what lets an email change remember the new address
-- ---------------------------------------------------------------------------

ALTER TABLE "auth_tokens"
  ADD COLUMN IF NOT EXISTS "payload" JSONB;

-- ---------------------------------------------------------------------------
-- Search
-- ---------------------------------------------------------------------------

-- A stored generated column keeps the vector in step with the text without a trigger, and reading
-- posts is unaffected: the extra column is simply ignored by anything that does not ask for it.
ALTER TABLE "posts"
  ADD COLUMN IF NOT EXISTS "search_vector" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce("content", ''))) STORED;

CREATE INDEX IF NOT EXISTS "posts_search_vector_idx" ON "posts" USING GIN ("search_vector");

-- Trigram indexes make "contains" searches on names indexable and give us a similarity score for
-- typos. The extension may be unavailable to this role on a managed database, so a failure here is
-- not fatal: the search provider falls back to plain ILIKE when the index is missing.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_trgm unavailable (%), username search will fall back to ILIKE', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    CREATE INDEX IF NOT EXISTS "users_username_trgm_idx" ON "users" USING GIN ("username" gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS "post_hashtags_tag_trgm_idx" ON "post_hashtags" USING GIN ("tag" gin_trgm_ops);
  END IF;
END $$;

-- Suggestions score candidates gathered from these three directions, so each one needs an index.
CREATE INDEX IF NOT EXISTS "user_profiles_country_idx" ON "user_profiles" (lower("country")) WHERE "country" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "user_profiles_education_idx" ON "user_profiles" (lower("education")) WHERE "education" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "follows_follower_idx" ON "follows" ("follower_id");
