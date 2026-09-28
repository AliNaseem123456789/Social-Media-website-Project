import { z } from "zod";
import { decodeCursor, encodeCursor, page } from "#core/http/pagination.js";
import { getRedis } from "#core/cache/redis.js";
import { cache } from "#core/cache/cache.service.js";
import { cacheKeys } from "#core/cache/keys.js";
import { eventBus } from "#core/messaging/event-bus.js";
import { EVENTS } from "#core/messaging/topology.js";
import { toPost } from "#modules/posts/posts.presenter.js";
import { withPostViewerState as withViewerState } from "#modules/posts/posts.viewer.js";
import { hiddenUserIds } from "#shared/blocks.js";
import { feedRepository } from "./feed.repository.js";

const GLOBAL_TTL = 30;
const timeCursor = z.object({ at: z.string(), id: z.number().int() });
const rankCursor = z.object({ offset: z.number().int().min(0) });

function isTimeCursor(cursor) {
  try {
    return timeCursor.safeParse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))).success;
  } catch {
    return false;
  }
}

async function chronological(authorIds, query) {
  const cursor = decodeCursor(query.cursor, timeCursor);
  const rows = await feedRepository.chronological({ authorIds }, cursor, query.limit);
  const result = page(rows, query.limit, (r) => ({ at: r.createdAt.toISOString(), id: r.id }));
  return { items: result.items.map(toPost), pageInfo: result.pageInfo };
}

async function ranked(viewerId, query) {
  const key = cacheKeys.userFeed(viewerId);
  const redis = getRedis();
  if (!(await redis.exists(key))) return null;

  const { offset } = decodeCursor(query.cursor, rankCursor) ?? { offset: 0 };
  const ids = (await redis.zrevrange(key, offset, offset + query.limit))
    .map(Number)
    .filter((id) => id > 0);
  const hasMore = ids.length > query.limit;
  const pageIds = ids.slice(0, query.limit);

  const rows = await feedRepository.byIds(pageIds);
  const byId = new Map(rows.map((r) => [r.id, toPost(r)]));
  return {
    items: pageIds.map((id) => byId.get(id)).filter(Boolean),
    pageInfo: { hasMore, nextCursor: hasMore ? encodeCursor({ offset: offset + query.limit }) : null },
  };
}

export const feedService = {
  async getFeed(viewerId, query) {
    let result;
    let mode = query.mode;

    if (mode === "global") {
      const producer = () => chronological(null, query);
      result = query.cursor ? await producer() : await cache.wrap(cacheKeys.globalFeed(query.limit), GLOBAL_TTL, producer);
    } else if (mode === "for-you") {
      result = await ranked(viewerId, query);
      if (!result) {
        // No precomputed feed yet: ask a worker to build one and serve the chronological feed meanwhile.
        // A ranked cursor cannot be used by the fallback, a chronological one can.
        await eventBus.publish(EVENTS.FEED_REBUILD_REQUESTED, { userId: viewerId });
        mode = "following";
        if (query.cursor && !isTimeCursor(query.cursor)) query = { ...query, cursor: undefined };
      }
    }

    if (!result) {
      const authorIds = [viewerId, ...(await feedRepository.connectionIds(viewerId))];
      result = await chronological(authorIds, query);
    }

    // The global feed is cached across viewers, so blocked authors are filtered out per request
    // rather than in the query.
    const hidden = new Set(await hiddenUserIds(viewerId));
    const items = hidden.size ? result.items.filter((post) => !hidden.has(post.author?.id)) : result.items;

    return { mode, items: await withViewerState(items, viewerId), pageInfo: result.pageInfo };
  },
};
