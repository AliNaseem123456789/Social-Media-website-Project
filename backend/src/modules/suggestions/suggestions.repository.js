import { prisma } from "#core/db/prisma.js";

const CANDIDATES_PER_SOURCE = 200;

/**
 * Candidates are gathered from three cheap, indexed directions and only those are scored. The earlier
 * version scored every account in one pass, which is fine at a few hundred users and nothing beyond.
 */
export const suggestionsRepository = {
  async people(userId, limit, hidden = []) {
    const exclude = hidden.length ? hidden : [0];
    const rows = await prisma.$queryRaw`
      WITH me AS (
        SELECT
          lower(coalesce(p.country, '')) AS country,
          lower(coalesce(p.education, '')) AS education,
          coalesce((
            SELECT array_agg(btrim(h))
            FROM unnest(string_to_array(lower(coalesce(p.hobbies, '')), ',')) AS h
            WHERE btrim(h) <> ''
          ), '{}'::text[]) AS hobbies
        FROM users u
        LEFT JOIN user_profiles p ON p.user_id = u.id
        WHERE u.id = ${userId}::int
      ),
      my_follows AS (
        SELECT following_id FROM follows WHERE follower_id = ${userId}::int
      ),
      excluded AS (
        SELECT ${userId}::int AS id
        UNION SELECT following_id FROM my_follows
        UNION SELECT unnest(${exclude}::int[])
        UNION SELECT CASE WHEN requester_id = ${userId}::int THEN recipient_id ELSE requester_id END
          FROM friends WHERE requester_id = ${userId}::int OR recipient_id = ${userId}::int
      ),
      -- 1. people followed by the people I follow
      by_network AS (
        SELECT f.following_id AS id
        FROM follows f
        WHERE f.follower_id IN (SELECT following_id FROM my_follows)
        GROUP BY f.following_id
        ORDER BY count(*) DESC
        LIMIT ${CANDIDATES_PER_SOURCE}::int
      ),
      -- 2. people from the same place or school
      by_profile AS (
        SELECT p.user_id AS id
        FROM user_profiles p CROSS JOIN me
        WHERE (me.country <> '' AND lower(coalesce(p.country, '')) = me.country)
           OR (me.education <> '' AND lower(coalesce(p.education, '')) = me.education)
        LIMIT ${CANDIDATES_PER_SOURCE}::int
      ),
      -- 3. people who have posted recently, so a new account still sees somebody
      by_activity AS (
        SELECT DISTINCT user_id AS id
        FROM posts
        WHERE created_at > now() - interval '30 days'
        ORDER BY user_id DESC
        LIMIT ${CANDIDATES_PER_SOURCE}::int
      ),
      candidate_ids AS (
        SELECT id FROM by_network
        UNION SELECT id FROM by_profile
        UNION SELECT id FROM by_activity
      ),
      candidates AS (
        SELECT
          u.id,
          u.username,
          p.profile_image,
          p.bio,
          lower(coalesce(p.country, '')) AS country,
          lower(coalesce(p.education, '')) AS education,
          coalesce((
            SELECT array_agg(btrim(h))
            FROM unnest(string_to_array(lower(coalesce(p.hobbies, '')), ',')) AS h
            WHERE btrim(h) <> ''
          ), '{}'::text[]) AS hobbies,
          (SELECT count(*) FROM follows f WHERE f.following_id = u.id AND f.follower_id IN (SELECT following_id FROM my_follows))::int AS mutual_follows,
          (SELECT count(*) FROM posts po WHERE po.user_id = u.id AND po.created_at > now() - interval '30 days')::int AS recent_posts
        FROM candidate_ids c
        JOIN users u ON u.id = c.id
        LEFT JOIN user_profiles p ON p.user_id = u.id
        LEFT JOIN user_settings s ON s.user_id = u.id
        WHERE u.id NOT IN (SELECT id FROM excluded)
          AND coalesce(s.profile_visibility, 'public') <> 'private'
      )
      SELECT
        c.id,
        c.username,
        c.profile_image,
        c.bio,
        c.mutual_follows AS "mutualFollows",
        ARRAY(SELECT unnest(c.hobbies) INTERSECT SELECT unnest(me.hobbies)) AS "sharedHobbies",
        (c.country <> '' AND c.country = me.country) AS "sameCountry",
        (c.education <> '' AND c.education = me.education) AS "sameEducation",
        (
          c.mutual_follows * 3
          + cardinality(ARRAY(SELECT unnest(c.hobbies) INTERSECT SELECT unnest(me.hobbies))) * 2
          + CASE WHEN c.country <> '' AND c.country = me.country THEN 1 ELSE 0 END
          + CASE WHEN c.education <> '' AND c.education = me.education THEN 1 ELSE 0 END
          + least(c.recent_posts, 4) * 0.5
        )::float AS score
      FROM candidates c CROSS JOIN me
      ORDER BY score DESC, c.id DESC
      LIMIT ${limit}::int`;

    return rows.map((row) => ({
      id: Number(row.id),
      username: row.username,
      profileImage: row.profile_image,
      bio: row.bio ?? null,
      mutualFollows: Number(row.mutualFollows),
      sharedHobbies: row.sharedHobbies ?? [],
      sameCountry: Boolean(row.sameCountry),
      sameEducation: Boolean(row.sameEducation),
      score: Number(row.score),
    }));
  },

  async hashtags(userId, limit) {
    const rows = await prisma.$queryRaw`
      SELECT h.tag, count(*)::int AS score
      FROM post_hashtags h
      WHERE h.post_id IN (
        SELECT post_id FROM likes WHERE user_id = ${userId}::int
        UNION SELECT post_id FROM post_saves WHERE user_id = ${userId}::int
        UNION SELECT post_id FROM comments WHERE user_id = ${userId}::int
      )
      GROUP BY h.tag
      ORDER BY score DESC, h.tag ASC
      LIMIT ${limit}::int`;
    return rows.map((row) => ({ tag: row.tag, posts: Number(row.score) }));
  },
};
