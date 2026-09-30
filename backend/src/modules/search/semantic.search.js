import { createHash } from "node:crypto";

import { config } from "#config";
import { prisma } from "#core/db/prisma.js";
import { cache } from "#core/cache/cache.service.js";
import { cacheKeys } from "#core/cache/keys.js";
import { childLogger } from "#core/logger/index.js";
import { assistantClient } from "#shared/assistant-client.js";

const log = childLogger("search:semantic");

const QUERY_CACHE_SECONDS = 60 * 60 * 24;

let tableSupport;

/**
 * Semantic search is switched on by three things agreeing: the config asks for it, the database has the
 * pgvector table migration 6 tries to create, and the assistant service is configured. Any one missing
 * and this module reports itself unavailable, which the hybrid provider reads as "keyword only".
 *
 * Probed once and cached, the same way postgres.search.js probes pg_trgm — a managed database may
 * refuse the extension, and that is a normal outcome rather than an error.
 */
export function available() {
  if (!config.assistant.semanticSearch || !assistantClient.available) return Promise.resolve(false);

  if (!tableSupport) {
    tableSupport = prisma
      .$queryRaw`SELECT 1 AS ok FROM information_schema.tables WHERE table_name = 'post_embeddings'`
      .then((rows) => rows.length > 0)
      .catch(() => false)
      .then((ok) => {
        if (!ok) log.warn("post_embeddings is missing, semantic search stays off");
        return ok;
      });
  }
  return tableSupport;
}

/** Forget the probe result. Used by tests, and after a migration runs in a long-lived process. */
export function resetProbe() {
  tableSupport = undefined;
}

export const contentHash = (text) => createHash("md5").update(text ?? "").digest("hex");

/**
 * Embedding a query costs a network round trip, and people search for the same handful of things all
 * day, so the vector is cached under a hash of the text. A day is safe: the same words always embed to
 * the same place for a given model.
 */
async function embedQuery(term) {
  const key = cacheKeys.queryEmbedding(contentHash(term.toLowerCase().trim()));
  return cache.wrap(key, QUERY_CACHE_SECONDS, () => assistantClient.embedOne(term));
}

/**
 * Posts nearest the query in meaning. The WHERE clause is deliberately identical to the keyword
 * search's, so this can only ever return a subset of what keyword search is already allowed to return —
 * a new retrieval path must not become a new way to see someone else's posts.
 */
export async function searchPosts(term, limit, hidden = []) {
  if (!(await available())) return [];

  const vector = await embedQuery(term);
  if (!vector) return [];

  const exclude = hidden.length ? hidden : [0];
  // pgvector's input format is a bracketed list, and it has to be passed as text then cast: there is no
  // driver-level vector type. JSON.stringify of an array of numbers is exactly that format.
  const literal = JSON.stringify(vector);

  try {
    const rows = await prisma.$queryRaw`
      SELECT e.post_id AS id, 1 - (e.embedding <=> ${literal}::vector) AS score
      FROM post_embeddings e
      JOIN posts p ON p.post_id = e.post_id
      WHERE p.user_id <> ALL(${exclude}::int[])
      ORDER BY e.embedding <=> ${literal}::vector
      LIMIT ${limit}::int`;
    return rows.map((row) => ({ id: Number(row.id), score: Number(row.score) }));
  } catch (err) {
    // A bad cast or a missing extension should degrade to keyword results, not fail the request.
    log.warn({ err: err.message }, "vector query failed, falling back to keyword results");
    return [];
  }
}

/** Rows still needing a vector: never embedded, or edited since they were. */
export async function pendingPosts(limit) {
  const rows = await prisma.$queryRaw`
    SELECT p.post_id AS id, p.content
    FROM posts p
    LEFT JOIN post_embeddings e ON e.post_id = p.post_id
    WHERE p.content IS NOT NULL
      AND length(btrim(p.content)) > 0
      AND (e.post_id IS NULL OR e.content_hash <> md5(p.content))
    ORDER BY p.created_at DESC
    LIMIT ${limit}::int`;
  return rows.map((row) => ({ id: Number(row.id), content: row.content }));
}

/**
 * Writes one batch of vectors. Upsert rather than insert, because a post being re-embedded after an
 * edit already has a row.
 */
export async function saveEmbeddings(entries, model) {
  let written = 0;
  for (const { id, content, vector } of entries) {
    const literal = JSON.stringify(vector);
    const hash = contentHash(content);
    try {
      await prisma.$executeRaw`
        INSERT INTO post_embeddings (post_id, embedding, model, content_hash, updated_at)
        VALUES (${id}::bigint, ${literal}::vector, ${model}, ${hash}, now())
        ON CONFLICT (post_id) DO UPDATE
          SET embedding = EXCLUDED.embedding,
              model = EXCLUDED.model,
              content_hash = EXCLUDED.content_hash,
              updated_at = now()`;
      written += 1;
    } catch (err) {
      // One bad row must not abandon the rest of the batch; it will be picked up on the next pass.
      log.warn({ postId: id, err: err.message }, "could not store an embedding");
    }
  }
  return written;
}

export async function coverage() {
  if (!(await available())) return { enabled: false };
  const [row] = await prisma.$queryRaw`
    SELECT
      (SELECT count(*) FROM posts WHERE content IS NOT NULL AND length(btrim(content)) > 0) AS total,
      (SELECT count(*) FROM post_embeddings) AS embedded`;
  return { enabled: true, total: Number(row.total), embedded: Number(row.embedded) };
}
