import { prisma } from "#core/db/prisma.js";
import { childLogger } from "#core/logger/index.js";
import { repostSelect } from "#modules/posts/posts.presenter.js";
import { fuse } from "./rrf.js";
import { postgresSearch } from "./postgres.search.js";
import * as semantic from "./semantic.search.js";

const log = childLogger("search:hybrid");

/**
 * Keyword search and semantic search are good at different questions.
 *
 * Keyword ("hiking boots") finds the exact words, and is the only thing that works for a name, a
 * product, a typo or a quoted phrase. Semantic ("that thing about walking in the mountains") finds
 * posts that never use the words at all. Neither is a superset of the other, so the useful system runs
 * both and merges them with reciprocal rank fusion — see rrf.js for why that merge reads ranks and
 * ignores scores.
 */

const orderByIds = (rows, ids) => {
  const byId = new Map(rows.map((row) => [Number(row.id), row]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
};

/**
 * Search posts by keyword and by meaning, fused.
 *
 * Both retrievers are asked for more than the caller wants, because fusion is only interesting when the
 * lists disagree — asking each for exactly `limit` means the merge has almost nothing to work with.
 */
async function searchPosts(term, limit, hidden = []) {
  const deep = Math.min(limit * 3, 50);

  const [keyword, vectors] = await Promise.all([
    postgresSearch.searchPosts(term, deep, hidden),
    semantic.searchPosts(term, deep, hidden).catch((err) => {
      log.warn({ err: err.message }, "semantic leg failed, continuing with keyword only");
      return [];
    }),
  ]);

  // Nothing to fuse: one retriever off, or one found nothing. Return the other's order untouched
  // rather than running it through RRF, which would only reorder a single list against itself.
  if (!vectors.length) return keyword.slice(0, limit);
  if (!keyword.length) return hydrate(vectors.slice(0, limit).map((row) => row.id));

  // postgresSearch returns hydrated post rows; the vector leg returns ids. Fuse on ids, then hydrate
  // once, so a post found by both is still only fetched once.
  const fused = fuse(
    [
      { name: "keyword", rows: keyword.map((post) => ({ id: post.id })) },
      { name: "semantic", rows: vectors },
    ],
    limit,
  );

  const alreadyHave = new Map(keyword.map((post) => [Number(post.id), post]));
  const missing = fused.map((row) => row.id).filter((id) => !alreadyHave.has(id));
  const fetched = missing.length
    ? await prisma.post.findMany({ where: { id: { in: missing } }, select: repostSelect })
    : [];
  for (const post of fetched) alreadyHave.set(Number(post.id), post);

  return fused.map((row) => alreadyHave.get(row.id)).filter(Boolean);
}

async function hydrate(ids) {
  if (!ids.length) return [];
  const posts = await prisma.post.findMany({ where: { id: { in: ids } }, select: repostSelect });
  return orderByIds(posts, ids);
}

/**
 * The provider search.service.js uses. Users and hashtags have no semantic leg — nobody searches for a
 * username by describing it — so those pass straight through to the keyword provider.
 */
export const hybridSearch = {
  searchUsers: (...args) => postgresSearch.searchUsers(...args),
  searchHashtags: (...args) => postgresSearch.searchHashtags(...args),
  searchPosts,
};

