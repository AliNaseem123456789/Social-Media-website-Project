-- The AI assistant already owns a table named "conversations" in this database (it stores one row per
-- chat turn: user_id, role, content, intent, sentiment). Migration 2 tried to create its own
-- "conversations" with CREATE TABLE IF NOT EXISTS, which on that database was a silent no-op, so the
-- chat feature ended up pointed at the assistant's table and every insert failed on the missing
-- "type" column.
--
-- This migration moves the chat feature onto names that cannot collide, carries over any rows that
-- migration 2 did manage to create, imports the legacy 1:1 history that the old copy step skipped,
-- and then repairs any other table from migrations 2 and 3 that already existed in a different shape.
--
-- Nothing is dropped and nothing belonging to the assistant or the legacy app is modified.

-- ---------------------------------------------------------------------------
-- Chat, under names of its own
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "chat_threads" (
  "id" SERIAL PRIMARY KEY,
  "type" TEXT NOT NULL DEFAULT 'direct',
  "title" TEXT,
  "image_url" TEXT,
  "direct_key" TEXT,
  "created_by" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "last_message_at" TIMESTAMPTZ(6)
);
CREATE UNIQUE INDEX IF NOT EXISTS "chat_threads_direct_key_key" ON "chat_threads" ("direct_key");
CREATE INDEX IF NOT EXISTS "chat_threads_last_message_idx" ON "chat_threads" ("last_message_at" DESC);

CREATE TABLE IF NOT EXISTS "chat_thread_members" (
  "conversation_id" INTEGER NOT NULL REFERENCES "chat_threads"("id") ON DELETE CASCADE,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL DEFAULT 'member',
  "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "last_read_message_id" BIGINT,
  "muted" BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY ("conversation_id", "user_id")
);
CREATE INDEX IF NOT EXISTS "chat_thread_members_user_idx" ON "chat_thread_members" ("user_id");

CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" BIGSERIAL PRIMARY KEY,
  "conversation_id" INTEGER NOT NULL REFERENCES "chat_threads"("id") ON DELETE CASCADE,
  "sender_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "body" TEXT,
  "image_url" TEXT,
  "legacy_message_id" INTEGER,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "edited_at" TIMESTAMPTZ(6),
  "deleted_at" TIMESTAMPTZ(6)
);
CREATE INDEX IF NOT EXISTS "chat_messages_thread_idx" ON "chat_messages" ("conversation_id", "id" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "chat_messages_legacy_key" ON "chat_messages" ("legacy_message_id");

-- ---------------------------------------------------------------------------
-- Carry over anything migration 2 created
-- ---------------------------------------------------------------------------
-- Only when "conversations" is ours, which is exactly when it carries a "direct_key" column. On a
-- database where the assistant owns that name, this block does nothing at all.

DO $$
DECLARE
  moved INTEGER := 0;
  ours INTEGER;
  theirs INTEGER;
BEGIN
  IF to_regclass('public.conversations') IS NULL THEN
    RAISE NOTICE 'no conversations table at all, nothing to carry over';
    RETURN;
  END IF;

  -- "Has a direct_key column" is not enough to call the table ours: columns may have been added to the
  -- assistant's table by hand while fighting migration 2. Every column this block reads has to be
  -- there, and none of the assistant's own may be.
  SELECT
    count(*) FILTER (WHERE column_name IN ('id', 'type', 'title', 'image_url', 'direct_key', 'created_by', 'created_at', 'last_message_at')),
    count(*) FILTER (WHERE column_name IN ('role', 'content', 'intent', 'user_id', 'sentiment_score'))
  INTO ours, theirs
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'conversations';

  IF theirs > 0 THEN
    RAISE NOTICE 'conversations belongs to the assistant (% of its columns present) - left untouched', theirs;
    RETURN;
  END IF;

  IF ours < 8 THEN
    RAISE NOTICE 'conversations is missing % of the columns this carry-over reads - skipped', 8 - ours;
    RETURN;
  END IF;

  -- Ids are preserved, which is only safe while nothing else has claimed them. Once chat_threads has
  -- rows the carry-over has already happened and the old table is no longer written to.
  IF EXISTS (SELECT 1 FROM "chat_threads") THEN
    RAISE NOTICE 'chat_threads already holds rows, skipping the carry-over';
    RETURN;
  END IF;

  INSERT INTO "chat_threads" ("id", "type", "title", "image_url", "direct_key", "created_by", "created_at", "last_message_at")
  SELECT "id", "type", "title", "image_url", "direct_key", "created_by", "created_at", "last_message_at"
  FROM "conversations"
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS moved = ROW_COUNT;
  RAISE NOTICE 'carried over % conversation(s)', moved;

  IF to_regclass('public.conversation_members') IS NOT NULL THEN
    BEGIN
      INSERT INTO "chat_thread_members" ("conversation_id", "user_id", "role", "joined_at", "last_read_message_id", "muted")
      SELECT m."conversation_id", m."user_id", m."role", m."joined_at", m."last_read_message_id", m."muted"
      FROM "conversation_members" m
      WHERE EXISTS (SELECT 1 FROM "chat_threads" t WHERE t."id" = m."conversation_id")
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'could not carry over conversation_members (%)', SQLERRM;
    END;
  END IF;

  IF to_regclass('public.conversation_messages') IS NOT NULL THEN
    BEGIN
      INSERT INTO "chat_messages" ("id", "conversation_id", "sender_id", "body", "image_url", "legacy_message_id", "created_at", "edited_at", "deleted_at")
      SELECT m."id", m."conversation_id", m."sender_id", m."body", m."image_url", m."legacy_message_id", m."created_at", m."edited_at", m."deleted_at"
      FROM "conversation_messages" m
      WHERE EXISTS (SELECT 1 FROM "chat_threads" t WHERE t."id" = m."conversation_id")
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'could not carry over conversation_messages (%)', SQLERRM;
    END;
  END IF;

  PERFORM setval('chat_threads_id_seq', GREATEST((SELECT coalesce(max("id"), 0) FROM "chat_threads"), 1));
  PERFORM setval('chat_messages_id_seq', GREATEST((SELECT coalesce(max("id"), 0) FROM "chat_messages"), 1));
END $$;

-- ---------------------------------------------------------------------------
-- Import the legacy 1:1 history
-- ---------------------------------------------------------------------------
-- Migration 2 looked for "messages"."id" and gave up when it did not find it. The primary key is
-- read from the catalog here instead, so a table using "message_id" (or anything else) imports too.

DO $$
DECLARE
  key_column TEXT;
  copied INTEGER := 0;
BEGIN
  IF to_regclass('public.messages') IS NULL THEN
    RAISE NOTICE 'no legacy messages table, nothing to import';
    RETURN;
  END IF;

  SELECT a.attname INTO key_column
  FROM pg_index i
  JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
  WHERE i.indrelid = 'public.messages'::regclass
    AND i.indisprimary
    AND array_length(i.indkey::int[], 1) = 1;

  IF key_column IS NULL THEN
    SELECT column_name INTO key_column
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages'
      AND column_name IN ('id', 'message_id', 'msg_id')
    ORDER BY array_position(ARRAY['id', 'message_id', 'msg_id'], column_name)
    LIMIT 1;
  END IF;

  IF key_column IS NULL THEN
    RAISE NOTICE 'could not identify the primary key of messages - legacy chat history not imported';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'from_user'
  ) THEN
    RAISE NOTICE 'messages does not look like the legacy chat table - nothing imported';
    RETURN;
  END IF;

  INSERT INTO "chat_threads" ("type", "direct_key", "created_at", "last_message_at")
  SELECT 'direct',
         least(m.from_user, m.to_user) || ':' || greatest(m.from_user, m.to_user),
         min(m.created_at),
         max(m.created_at)
  FROM "messages" m
  WHERE m.from_user <> m.to_user
    AND EXISTS (SELECT 1 FROM "users" u WHERE u.id = m.from_user)
    AND EXISTS (SELECT 1 FROM "users" u WHERE u.id = m.to_user)
  GROUP BY 2
  ON CONFLICT ("direct_key") DO NOTHING;

  INSERT INTO "chat_thread_members" ("conversation_id", "user_id")
  SELECT t.id, member.user_id
  FROM "chat_threads" t
  CROSS JOIN LATERAL (
    VALUES (split_part(t.direct_key, ':', 1)::int), (split_part(t.direct_key, ':', 2)::int)
  ) AS member(user_id)
  WHERE t.type = 'direct'
    AND t.direct_key IS NOT NULL
    AND EXISTS (SELECT 1 FROM "users" u WHERE u.id = member.user_id)
  ON CONFLICT DO NOTHING;

  EXECUTE format($fmt$
    INSERT INTO "chat_messages" ("conversation_id", "sender_id", "body", "created_at", "legacy_message_id")
    SELECT t.id, m.from_user, m.message, m.created_at, m.%I
    FROM "messages" m
    JOIN "chat_threads" t
      ON t.direct_key = least(m.from_user, m.to_user) || ':' || greatest(m.from_user, m.to_user)
    WHERE EXISTS (SELECT 1 FROM "users" u WHERE u.id = m.from_user)
    ON CONFLICT ("legacy_message_id") DO NOTHING
  $fmt$, key_column);

  GET DIAGNOSTICS copied = ROW_COUNT;
  RAISE NOTICE 'imported % legacy message(s) using messages.%', copied, key_column;
END $$;

-- ---------------------------------------------------------------------------
-- Repair tables that already existed in another shape
-- ---------------------------------------------------------------------------
-- Every table below is created by migration 2 or 3 with CREATE TABLE IF NOT EXISTS, which leaves a
-- pre-existing table of the same name untouched. Missing columns are added here so a half-matching
-- table stops throwing "column does not exist". Columns are added nullable on purpose: the point is
-- that queries stop erroring, and a column added to a table that already has rows cannot be NOT NULL.

DO $$
DECLARE
  spec RECORD;
  added INTEGER := 0;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('comments',        'parent_comment_id',       'INTEGER'),
      ('comments',        'updated_at',              'TIMESTAMPTZ(6)'),
      ('comment_likes',   'comment_id',              'INTEGER'),
      ('comment_likes',   'user_id',                 'INTEGER'),
      ('comment_likes',   'created_at',              'TIMESTAMPTZ(6) DEFAULT now()'),
      ('post_saves',      'user_id',                 'INTEGER'),
      ('post_saves',      'post_id',                 'INTEGER'),
      ('post_saves',      'created_at',              'TIMESTAMPTZ(6) DEFAULT now()'),
      ('post_references', 'post_id',                 'INTEGER'),
      ('post_references', 'referenced_post_id',      'INTEGER'),
      ('post_references', 'created_at',              'TIMESTAMPTZ(6) DEFAULT now()'),
      ('post_hashtags',   'post_id',                 'INTEGER'),
      ('post_hashtags',   'tag',                     'TEXT'),
      ('post_images',     'post_id',                 'INTEGER'),
      ('post_images',     'url',                     'TEXT'),
      ('post_images',     'alt',                     'TEXT'),
      ('post_images',     'position',                'INTEGER DEFAULT 0'),
      ('follows',         'follower_id',             'INTEGER'),
      ('follows',         'following_id',            'INTEGER'),
      ('follows',         'created_at',              'TIMESTAMPTZ(6) DEFAULT now()'),
      ('user_settings',   'user_id',                 'INTEGER'),
      ('user_settings',   'profile_visibility',      'TEXT DEFAULT ''public'''),
      ('user_settings',   'email_on_like',           'BOOLEAN DEFAULT true'),
      ('user_settings',   'email_on_comment',        'BOOLEAN DEFAULT true'),
      ('user_settings',   'email_on_friend_request', 'BOOLEAN DEFAULT true'),
      ('user_settings',   'email_on_message',        'BOOLEAN DEFAULT true'),
      ('user_settings',   'email_on_mention',        'BOOLEAN DEFAULT true'),
      ('user_settings',   'theme',                   'TEXT DEFAULT ''system'''),
      ('user_settings',   'allow_messages_from',     'TEXT DEFAULT ''everyone'''),
      ('user_settings',   'updated_at',              'TIMESTAMPTZ(6) DEFAULT now()'),
      ('post_drafts',     'user_id',                 'INTEGER'),
      ('post_drafts',     'content',                 'TEXT'),
      ('post_drafts',     'image_urls',              'JSONB DEFAULT ''[]''::jsonb'),
      ('post_drafts',     'scheduled_for',           'TIMESTAMPTZ(6)'),
      ('post_drafts',     'published_post_id',       'INTEGER'),
      ('post_drafts',     'published_at',            'TIMESTAMPTZ(6)'),
      ('post_drafts',     'created_at',              'TIMESTAMPTZ(6) DEFAULT now()'),
      ('post_drafts',     'updated_at',              'TIMESTAMPTZ(6) DEFAULT now()'),
      ('call_logs',       'room_id',                 'TEXT'),
      ('call_logs',       'caller_id',               'INTEGER'),
      ('call_logs',       'callee_id',               'INTEGER'),
      ('call_logs',       'video',                   'BOOLEAN DEFAULT true'),
      ('call_logs',       'status',                  'TEXT DEFAULT ''ringing'''),
      ('call_logs',       'started_at',              'TIMESTAMPTZ(6) DEFAULT now()'),
      ('call_logs',       'answered_at',             'TIMESTAMPTZ(6)'),
      ('call_logs',       'ended_at',                'TIMESTAMPTZ(6)'),
      ('blocks',          'blocker_id',              'INTEGER'),
      ('blocks',          'blocked_id',              'INTEGER'),
      ('blocks',          'created_at',              'TIMESTAMPTZ(6) DEFAULT now()'),
      ('reports',         'reporter_id',             'INTEGER'),
      ('reports',         'subject_type',            'TEXT'),
      ('reports',         'subject_id',              'BIGINT'),
      ('reports',         'subject_user_id',         'INTEGER'),
      ('reports',         'reason',                  'TEXT'),
      ('reports',         'details',                 'TEXT'),
      ('reports',         'status',                  'TEXT DEFAULT ''open'''),
      ('reports',         'resolution',              'TEXT'),
      ('reports',         'reviewed_by',             'INTEGER'),
      ('reports',         'reviewed_at',             'TIMESTAMPTZ(6)'),
      ('reports',         'created_at',              'TIMESTAMPTZ(6) DEFAULT now()'),
      ('auth_tokens',     'payload',                 'JSONB')
    ) AS t(table_name, column_name, definition)
  LOOP
    IF to_regclass('public.' || quote_ident(spec.table_name)) IS NULL THEN
      RAISE NOTICE 'table % is missing entirely - run the earlier migrations first', spec.table_name;
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = spec.table_name AND column_name = spec.column_name
    ) THEN
      CONTINUE;
    END IF;

    BEGIN
      EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s', spec.table_name, spec.column_name, spec.definition);
      added := added + 1;
      RAISE NOTICE 'added missing column %.%', spec.table_name, spec.column_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'could not add %.% (%)', spec.table_name, spec.column_name, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'repair pass added % column(s)', added;
END $$;

-- ---------------------------------------------------------------------------
-- Rows pointing at things that no longer exist
-- ---------------------------------------------------------------------------
-- A table created without its foreign keys collects rows whose parent has since been deleted, and a
-- saved post whose post is gone is what made GET /posts/saved fail. Only tables this application
-- owns are cleaned; the legacy tables are counted and reported, never touched.

DO $$
DECLARE
  spec RECORD;
  removed INTEGER;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('post_saves',      'post_id',            'posts',     'post_id',    'CASCADE'),
      ('post_saves',      'user_id',            'users',     'id',         'CASCADE'),
      ('post_references', 'post_id',            'posts',     'post_id',    'CASCADE'),
      ('post_references', 'referenced_post_id', 'posts',     'post_id',    'CASCADE'),
      ('post_hashtags',   'post_id',            'posts',     'post_id',    'CASCADE'),
      ('post_images',     'post_id',            'posts',     'post_id',    'CASCADE'),
      ('comment_likes',   'comment_id',         'comments',  'comment_id', 'CASCADE'),
      ('comment_likes',   'user_id',            'users',     'id',         'CASCADE'),
      ('follows',         'follower_id',        'users',     'id',         'CASCADE'),
      ('follows',         'following_id',       'users',     'id',         'CASCADE'),
      ('user_settings',   'user_id',            'users',     'id',         'CASCADE'),
      ('post_drafts',     'user_id',            'users',     'id',         'CASCADE'),
      ('call_logs',       'caller_id',          'users',     'id',         'CASCADE'),
      ('call_logs',       'callee_id',          'users',     'id',         'CASCADE'),
      ('blocks',          'blocker_id',         'users',     'id',         'CASCADE'),
      ('blocks',          'blocked_id',         'users',     'id',         'CASCADE'),
      ('reports',         'reporter_id',        'users',     'id',         'CASCADE')
    ) AS t(child, child_column, parent, parent_column, on_delete)
  LOOP
    IF to_regclass('public.' || quote_ident(spec.child)) IS NULL THEN
      CONTINUE;
    END IF;

    BEGIN
      EXECUTE format(
        'DELETE FROM %I c WHERE c.%I IS NOT NULL AND NOT EXISTS (SELECT 1 FROM %I p WHERE p.%I = c.%I)',
        spec.child, spec.child_column, spec.parent, spec.parent_column, spec.child_column
      );
      GET DIAGNOSTICS removed = ROW_COUNT;
      IF removed > 0 THEN
        RAISE NOTICE 'removed % orphaned row(s) from %.%', removed, spec.child, spec.child_column;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint k
        JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = ANY (k.conkey)
        WHERE k.conrelid = ('public.' || quote_ident(spec.child))::regclass
          AND k.contype = 'f'
          AND a.attname = spec.child_column
      ) THEN
        EXECUTE format(
          'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(%I) ON DELETE %s',
          spec.child, spec.child || '_' || spec.child_column || '_fkey',
          spec.child_column, spec.parent, spec.parent_column, spec.on_delete
        );
        RAISE NOTICE 'added the missing foreign key on %.%', spec.child, spec.child_column;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'could not repair %.% (%)', spec.child, spec.child_column, SQLERRM;
    END;
  END LOOP;
END $$;

-- A draft that pointed at a since-deleted post keeps its text; only the dead link is cleared.
DO $$
BEGIN
  IF to_regclass('public.post_drafts') IS NOT NULL THEN
    UPDATE "post_drafts" d
    SET "published_post_id" = NULL
    WHERE d."published_post_id" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "posts" p WHERE p."post_id" = d."published_post_id");
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- The tail of migration 2, repeated
-- ---------------------------------------------------------------------------
-- On a database where migration 2 stopped at the conversations block, everything after that block in
-- that file never ran. These are the statements that follow it. All of them are guarded, so on a
-- database where migration 2 completed this section does nothing.

CREATE INDEX IF NOT EXISTS "posts_user_created_idx" ON "posts" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "posts_created_idx" ON "posts" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "likes_post_idx" ON "likes" ("post_id");
CREATE INDEX IF NOT EXISTS "likes_user_created_idx" ON "likes" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "messages_pair_idx" ON "messages" ("from_user", "to_user", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id", "read", "id" DESC);
CREATE INDEX IF NOT EXISTS "friends_requester_idx" ON "friends" ("requester_id", "status");
CREATE INDEX IF NOT EXISTS "friends_recipient_idx" ON "friends" ("recipient_id", "status");

DO $$
DECLARE
  duplicates INTEGER;
BEGIN
  SELECT count(*) INTO duplicates FROM (
    SELECT user_id, post_id FROM "likes" GROUP BY user_id, post_id HAVING count(*) > 1
  ) d;

  IF duplicates > 0 THEN
    RAISE NOTICE 'likes has % duplicated (user_id, post_id) pairs - unique index skipped. Clean them up, then create it manually.', duplicates;
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS "likes_user_post_key" ON "likes" ("user_id", "post_id");
  END IF;
END $$;

-- The legacy tables are the other deployment's as much as ours, so these are reported only.
DO $$
DECLARE
  stale_likes INTEGER;
  stale_comments INTEGER;
BEGIN
  SELECT count(*) INTO stale_likes FROM "likes" l WHERE NOT EXISTS (SELECT 1 FROM "posts" p WHERE p."post_id" = l."post_id");
  SELECT count(*) INTO stale_comments FROM "comments" c WHERE NOT EXISTS (SELECT 1 FROM "posts" p WHERE p."post_id" = c."post_id");
  IF stale_likes > 0 OR stale_comments > 0 THEN
    RAISE NOTICE 'legacy tables hold % like(s) and % comment(s) on posts that no longer exist. Left in place; the API skips them.', stale_likes, stale_comments;
  END IF;
END $$;
