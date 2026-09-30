import { config } from "#config";
import { childLogger } from "#core/logger/index.js";
import * as semantic from "./semantic.search.js";
import { assistantClient } from "#shared/assistant-client.js";

const log = childLogger("embeddings");

/**
 * Keeps post embeddings up to date, in the background, a batch at a time.
 *
 * Deliberately a polling job rather than a queue consumer. A post event would give fresher vectors, but
 * the work is idempotent, catches up on its own after any outage, and — the part that matters — has to
 * cover the thousands of posts that existed before this feature did. A backfill and a live path written
 * as two mechanisms is two things to get wrong; `pendingPosts` already answers "what needs doing" for
 * both, because an edited post's md5 no longer matches its stored hash.
 *
 * Free embedding quotas are per-minute, so the batch size and interval are the throttle. At the defaults
 * this is 20 posts a minute, which clears a few thousand posts overnight and then costs almost nothing.
 */
export function startEmbeddingBackfill({ intervalMs = 60_000 } = {}) {
  let running = false;
  let idleSince = null;

  const tick = async () => {
    // Overlapping runs would embed the same batch twice and double the quota spend for nothing.
    if (running) return;
    running = true;

    try {
      if (!(await semantic.available())) {
        log.debug("semantic search is off, nothing to do");
        return;
      }

      const pending = await semantic.pendingPosts(config.assistant.embedBatchSize);
      if (!pending.length) {
        // Only say so once, rather than every minute forever.
        if (!idleSince) {
          idleSince = Date.now();
          log.info("every post has an up-to-date embedding");
        }
        return;
      }
      idleSince = null;

      const vectors = await assistantClient.embed(pending.map((post) => post.content));
      if (!vectors) {
        log.warn({ batch: pending.length }, "no vectors came back, will retry next tick");
        return;
      }

      const written = await semantic.saveEmbeddings(
        pending.map((post, index) => ({ ...post, vector: vectors[index] })),
        `${config.assistant.embedDimensions}d`,
      );
      log.info({ written, pending: pending.length }, "embedded a batch");
    } catch (err) {
      // A failure here must never stop the timer: the next tick retries the same rows.
      log.warn({ err: err.message }, "embedding pass failed");
    } finally {
      running = false;
    }
  };

  const timer = setInterval(tick, intervalMs);
  timer.unref();
  tick();

  return () => clearInterval(timer);
}
