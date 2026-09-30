-- Semantic search: an embedding per post, alongside the tsvector column migration 3 added.
--
-- Everything here is guarded. pgvector is available on Supabase, but "available" and "grantable by this
-- role" are different things, and a managed database can refuse the extension. If it does, this
-- migration still applies, the table is simply not created, and postgres.search.js keeps working exactly
-- as it does today — it probes for the table the same way it already probes for pg_trgm. Semantic search
-- switches itself on when the extension appears; nothing else has to change.
--
-- Additive only: no existing table, column or index is altered or dropped.

-- --------------------------------------------------------------------------- the extension

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
  WHEN insufficient_privilege OR undefined_file OR feature_not_supported OR duplicate_object THEN
    RAISE NOTICE 'pgvector could not be installed (%). Semantic search stays off; keyword search is unaffected.', SQLERRM;
END $$;

-- --------------------------------------------------------------------------- the table

-- The type does not exist at parse time if the extension failed above, so the DDL has to be dynamic.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
    RAISE NOTICE 'No vector type, skipping post_embeddings.';
    RETURN;
  END IF;

  EXECUTE $ddl$
    CREATE TABLE IF NOT EXISTS post_embeddings (
      post_id      bigint      PRIMARY KEY,
      embedding    vector(768) NOT NULL,
      model        text        NOT NULL,
      -- md5 of the text that was embedded. An edited post has a different hash, which is how the
      -- worker knows to redo it without a separate dirty flag anyone could forget to set.
      content_hash text        NOT NULL,
      updated_at   timestamptz NOT NULL DEFAULT now()
    )
  $ddl$;

  -- HNSW needs pgvector 0.5+. On an older build the table is still useful — an exact scan over a few
  -- thousand posts is milliseconds — so a missing index must not fail the migration.
  BEGIN
    EXECUTE $ddl$
      CREATE INDEX IF NOT EXISTS post_embeddings_vector_idx
      ON post_embeddings USING hnsw (embedding vector_cosine_ops)
    $ddl$;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'HNSW index unavailable (%), falling back to exact search.', SQLERRM;
  END;

  -- Finding what still needs embedding is the worker's hot query.
  EXECUTE 'CREATE INDEX IF NOT EXISTS post_embeddings_updated_idx ON post_embeddings (updated_at)';

  -- Deleting a post must take its vector with it, or search returns rows that no longer exist.
  BEGIN
    EXECUTE $ddl$
      ALTER TABLE post_embeddings
      ADD CONSTRAINT post_embeddings_post_fk
      FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE
    $ddl$;
  EXCEPTION WHEN duplicate_object OR duplicate_table THEN
    NULL;
  END;
END $$;

-- --------------------------------------------------------------------------- what the assistant cost

-- One row per assistant turn: which model, how many tokens, how long, whether it errored. This is what
-- the evals page reads, and the only way to answer "why did the quota run out" after the fact. No
-- message text is stored — the question and answer stay in the browser.
CREATE TABLE IF NOT EXISTS assistant_turns (
  id           bigserial   PRIMARY KEY,
  -- bigint, matching users.id as it actually exists in this database. The schema says Int, but the
  -- tables the older deployment created are int8 — the mismatch that broke every chat relation until
  -- prisma.js taught the driver to read int8 as a Number. New columns follow the real type.
  user_id      bigint,
  kind         text        NOT NULL DEFAULT 'chat',
  model        text,
  tools_used   text[]      NOT NULL DEFAULT '{}',
  input_tokens integer     NOT NULL DEFAULT 0,
  output_tokens integer    NOT NULL DEFAULT 0,
  duration_ms  integer     NOT NULL DEFAULT 0,
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assistant_turns_created_idx ON assistant_turns (created_at DESC);
CREATE INDEX IF NOT EXISTS assistant_turns_user_idx ON assistant_turns (user_id, created_at DESC);

-- Nullable and ON DELETE SET NULL rather than CASCADE: a deleted account should not silently erase the
-- record of what it cost to serve.
DO $$
BEGIN
  ALTER TABLE assistant_turns
  ADD CONSTRAINT assistant_turns_user_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
