-- Additive migration: creates new tables only. Existing tables and data are not modified.

CREATE TABLE IF NOT EXISTS "auth_sessions" (
  "id" UUID PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "refresh_token_hash" TEXT NOT NULL,
  "previous_token_hash" TEXT,
  "user_agent" TEXT,
  "ip_address" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "last_used_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "revoked_at" TIMESTAMPTZ(6),
  "revoked_reason" TEXT
);
CREATE INDEX IF NOT EXISTS "auth_sessions_user_id_idx" ON "auth_sessions" ("user_id");

CREATE TABLE IF NOT EXISTS "auth_tokens" (
  "id" UUID PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "used_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "auth_tokens_token_hash_key" ON "auth_tokens" ("token_hash");
CREATE INDEX IF NOT EXISTS "auth_tokens_user_id_type_idx" ON "auth_tokens" ("user_id", "type");

CREATE TABLE IF NOT EXISTS "user_auth_state" (
  "user_id" INTEGER PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "email_verified_at" TIMESTAMPTZ(6),
  "password_changed_at" TIMESTAMPTZ(6),
  "failed_login_count" INTEGER NOT NULL DEFAULT 0,
  "locked_until" TIMESTAMPTZ(6),
  "last_login_at" TIMESTAMPTZ(6),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" BIGSERIAL PRIMARY KEY,
  "user_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "action" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'success',
  "ip_address" TEXT,
  "user_agent" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_created_at_idx" ON "audit_logs" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_action_created_at_idx" ON "audit_logs" ("action", "created_at");

-- Supabase exposes the public schema through PostgREST. These tables hold credentials material,
-- so row level security is enabled with no policies: only the backend (table owner / service role) can read them.
ALTER TABLE "auth_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_auth_state" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
