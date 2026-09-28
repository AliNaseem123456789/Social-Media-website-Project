import { registerConsumer } from "#core/messaging/consumer.js";
import { QUEUES } from "#core/messaging/topology.js";

const WORKERS = {
  notifications: async () => ({
    queue: QUEUES.notifications,
    handler: (await import("#modules/notifications/notifications.consumer.js")).handleNotificationEvent,
  }),
  feed: async () => ({
    queue: QUEUES.feed,
    handler: (await import("#modules/feed/feed.consumer.js")).handleFeedEvent,
  }),
  analytics: async () => ({
    queue: QUEUES.analytics,
    handler: (await import("#modules/analytics/analytics.consumer.js")).handleAnalyticsEvent,
  }),
  scheduler: async () => ({
    start: (await import("./scheduler.js")).startScheduler,
  }),
};

export const WORKER_NAMES = Object.keys(WORKERS);

export function resolveWorkers(list) {
  const names = list.includes("*") ? WORKER_NAMES : list;
  const unknown = names.filter((n) => !WORKERS[n]);
  if (unknown.length) throw new Error(`Unknown workers: ${unknown.join(", ")}`);
  return names;
}

/**
 * Starts the given workers. Queue workers register a RabbitMQ consumer that is re-attached after
 * reconnects; timer workers expose a start function and return their own stop handle.
 */
export async function registerWorkers(names) {
  const stoppers = [];
  for (const name of names) {
    const worker = await WORKERS[name]();
    if (worker.queue) registerConsumer({ queue: worker.queue, handler: worker.handler });
    else stoppers.push(await worker.start());
  }
  return () => stoppers.forEach((stop) => stop?.());
}
