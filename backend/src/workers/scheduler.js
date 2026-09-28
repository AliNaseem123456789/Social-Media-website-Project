import { childLogger } from "#core/logger/index.js";

const log = childLogger("scheduler");

/**
 * Runs the periodic jobs that are not driven by queue messages. Each job keeps its own interval and a
 * failure in one never stops the others.
 */
export async function startScheduler() {
  const [{ startScheduledPosts }, { callsService }] = await Promise.all([
    import("#modules/posts/posts.scheduler.js"),
    import("#modules/calls/calls.service.js"),
  ]);

  const stopDrafts = startScheduledPosts({ intervalMs: 30_000 });

  const sweep = () =>
    callsService.sweepStale().catch((err) => log.warn({ err: err.message }, "call sweep failed"));
  const callTimer = setInterval(sweep, 60_000);
  callTimer.unref();
  sweep();

  return () => {
    stopDrafts();
    clearInterval(callTimer);
  };
}
