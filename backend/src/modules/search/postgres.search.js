import { prisma } from "#core/db/prisma.js";
import { childLogger } from "#core/logger/index.js";
import { userSummarySelect } from "#shared/user-summary.js";
import { repostSelect } from "#modules/posts/posts.presenter.js";

const log = childLogger("search");

let trigramSupport;

/**
 * pg_trgm gives typo tolerance and makes "contains" queries indexable, but a managed database may
 * not grant the extension. It is probed once and the queries below degrade to plain ILIKE without it.
 */
function hasTrigram() {
  if (!trigramSupport) {
    trigramSupport = prisma
      .$queryRaw`SELECT 1 AS ok FROM pg_extension WHERE extname = 'pg_trgm'`
      .then((rows) => rows.length > 0)
      .catch(() => false)
      .then((available) => {
        if (!available) log.warn("pg_trgm is not installed, falling back to ILIKE for name search");
        return available;
      });
  }
  return trigramSupport;
}

const orderByIds = (rows, ids) => {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
};

/**
 * Search provider backed by Postgres. Posts are matched against the generated `search_vector` column
 * through its GIN index and ranked; names use trigram similarity. Swap for a dedicated engine by
 * implementing the same three methods and selecting it in search.service.js.
 */
export const postgresSearch = {
  async searchUsers(term, limit, hidden = []) {
    const exclude = hidden.length ? hidden : [0];
    const rows = (await hasTrigram())
      ? await prisma.$queryRaw`
          SELECT id, similarity(username, ${term}) AS score
          FROM users
          WHERE id <> ALL(${exclude}::int[])
            AND (username ILIKE ${`${term}%`} OR similarity(username, ${term}) > 0.35)
          ORDER BY (lower(username) = lower(${term})) DESC, score DESC, username ASC
          LIMIT ${limit}::int`
      : await prisma.$queryRaw`
          SELECT id, 0 AS score
          FROM users
          WHERE id <> ALL(${exclude}::int[]) AND username ILIKE ${`%${term}%`}
          ORDER BY (lower(username) = lower(${term})) DESC, username ASC
          LIMIT ${limit}::int`;

    const ids = rows.map((row) => Number(row.id));
    if (!ids.length) return [];
    const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: userSummarySelect });
    return orderByIds(users, ids);
  },

  async searchPosts(term, limit, hidden = []) {
    const exclude = hidden.length ? hidden : [0];

    // websearch_to_tsquery accepts what a person actually types, quotes and all, and never throws on
    // punctuation the way to_tsquery does.
    let matches = await prisma.$queryRaw`
      SELECT p.post_id AS id, ts_rank(p.search_vector, q) AS score
      FROM posts p, websearch_to_tsquery('english', ${term}) q
      WHERE p.search_vector @@ q AND p.user_id <> ALL(${exclude}::int[])
      ORDER BY score DESC, p.created_at DESC
      LIMIT ${limit}::int`;

    // A term that produces no lexemes (a single short word, an emoji, a partial word) still deserves
    // an answer, so fall back to a substring scan for those.
    if (!matches.length) {
      matches = await prisma.$queryRaw`
        SELECT post_id AS id, 0 AS score
        FROM posts
        WHERE content ILIKE ${`%${term}%`} AND user_id <> ALL(${exclude}::int[])
        ORDER BY created_at DESC
        LIMIT ${limit}::int`;
    }

    const ids = matches.map((row) => Number(row.id));
    if (!ids.length) return [];
    const posts = await prisma.post.findMany({ where: { id: { in: ids } }, select: repostSelect });
    return orderByIds(posts, ids);
  },

  async searchHashtags(term, limit) {
    const tag = term.replace(/^#/, "").toLowerCase();
    const rows = await prisma.$queryRaw`
      SELECT tag, count(*)::int AS posts
      FROM post_hashtags
      WHERE tag LIKE ${`${tag}%`}
      GROUP BY tag
      ORDER BY posts DESC, tag ASC
      LIMIT ${limit}::int`;
    return rows.map((row) => ({ tag: row.tag, posts: Number(row.posts) }));
  },
};
