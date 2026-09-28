# Database

The backend talks to Postgres through Prisma 7 (`prisma-client-js` generator with the `@prisma/adapter-pg` driver adapter). The schema is `backend/prisma/schema.prisma` and the CLI configuration is `backend/prisma.config.js`.

## The shared Supabase database

The production database is shared with the legacy app and the Python assistant, which read and write the tables directly. Because of that:

- Table and column names are unchanged. Models use `@@map` / `@map` for nicer names in code.
- Migrations only **add** things. Nothing in `prisma/migrations` alters or drops an existing table or column.
- `0_baseline` describes the existing tables with `CREATE TABLE IF NOT EXISTS`, so running it against the live database changes nothing. It exists so fresh local databases get the same shape.
- `1_auth_security` creates four new tables: `auth_sessions`, `auth_tokens`, `user_auth_state` and `audit_logs`. Row level security is enabled on them with no policies, so they're invisible to the Supabase anon key.
- `2_social_features` adds the tables behind replies, hashtags, reposts, saves, follows, settings, drafts, calls and group chat: `comment_likes`, `post_saves`, `post_references`, `post_hashtags`, `post_images`, `follows`, `user_settings`, `post_drafts`, `call_logs`, `conversations`, `conversation_members`, `conversation_messages`. It also adds two nullable columns to `comments` (`parent_comment_id`, `updated_at`) and a set of indexes. Everything is guarded, so re-running it is a no-op.

- `3_safety_and_search` adds `blocks` and `reports` (both with row level security enabled and no policies), `user_settings.allow_messages_from`, `auth_tokens.payload`, and the search indexes: a generated `posts.search_vector` column with a GIN index, trigram indexes on `users.username` and `post_hashtags.tag`, and covering indexes for the suggestion queries. `pg_trgm` is created inside an exception block, so a database that will not grant the extension still applies the migration and the search provider falls back to `ILIKE`.

### What the legacy app sees after `2_social_features`

- Existing `messages` rows are **copied** into `conversations` / `conversation_messages`; nothing is deleted. New direct messages are written to both tables, and edits and deletes follow, so the old chat page keeps working. Group messages exist only in the new tables.
- A repost is a real row in `posts` with its link to the original in `post_references`, so the legacy app renders it as a post with empty text.
- Everything else the legacy app reads is untouched.

### One thing to know about `3_safety_and_search`

Adding the generated `search_vector` column rewrites the `posts` table, which takes a brief exclusive lock. On a table this size that is milliseconds, but it is the only statement in any migration here that is not instant. The column is generated, so nothing can write to it and the legacy app simply ignores an extra column it never selects.

Never run `prisma migrate dev`, `prisma migrate reset` or `prisma db push` against the shared database. They can reset it or drop anything they don't recognise.

## First-time setup against Supabase

1. Get the connection string from Supabase: **Project Settings → Database → Connection string**. Use the session pooler URI and put it in `backend/.env` as `DATABASE_URL`.
2. Check that the inferred schema matches the real one. The fields marked `verify` in `schema.prisma` were inferred from code:
   - `user_profiles.age`: integer or text?
   - `messages` primary key: name and type
   - `notifications.id`: integer or uuid?
   - `analytics_events` primary key

   Pull the live schema into a scratch file and compare. This command is read-only:
   ```bash
   cd backend
   npx prisma db pull --print > /tmp/live-schema.prisma
   ```
   Fix any type mismatch in `schema.prisma` (keep the `@map` names) and run `npx prisma generate`.
3. Record the baseline as already applied, then apply the additive migration:
   ```bash
   npx prisma migrate resolve --applied 0_baseline
   npx prisma migrate deploy
   npx prisma migrate status
   ```

After that, every deploy runs `prisma migrate deploy` (see `scripts/start_container.sh` and `render.yaml`). It only applies new migration folders.

## Adding a migration later

1. Change `schema.prisma`.
2. Generate SQL against a **local** database (the dev compose stack), never the shared one:
   ```bash
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/social npx prisma migrate dev --name <change>
   ```
3. Read the generated SQL. If it drops or rewrites anything the legacy app or the assistant uses, rewrite it as an additive change.
4. Commit the migration folder. Deploys apply it with `migrate deploy`.

## Moving off Supabase

Point `DATABASE_URL` at the new Postgres, restore a `pg_dump` of the Supabase database, and run `npx prisma migrate deploy`. Storage moves separately with `STORAGE_DRIVER=s3` and the `S3_*` settings.
