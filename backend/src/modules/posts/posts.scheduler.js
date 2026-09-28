import { childLogger } from "#core/logger/index.js";
import { postsRepository } from "./posts.repository.js";
import { postsService } from "./posts.service.js";

const log = childLogger("scheduled-posts");
const BATCH = 20;

/**
 * Publishes drafts whose scheduled time has passed. Claiming marks the draft first, so several
 * scheduler processes can run without publishing the same draft twice; a failed publish releases it.
 */
export function startScheduledPosts({ intervalMs = 30_000 } = {}) {
  let busy = false;

  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      const due = await postsRepository.claimDueDrafts(BATCH);
      for (const draft of due) {
        try {
          await postsService.publishDraftRow(draft);
        } catch (err) {
          log.error({ err: err.message, draftId: draft.id }, "could not publish scheduled post");
          await postsRepository.updateDraft(draft.id, { publishedAt: null }).catch(() => {});
        }
      }
      if (due.length) log.info({ count: due.length }, "published scheduled posts");
    } catch (err) {
      log.error({ err: err.message }, "scheduled posts sweep failed");
    } finally {
      busy = false;
    }
  };

  const timer = setInterval(tick, intervalMs);
  timer.unref();
  tick();
  return () => clearInterval(timer);
}
