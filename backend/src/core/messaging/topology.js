import { config } from "#config";

const prefix = config.rabbitmq.prefix;

export const EXCHANGES = Object.freeze({
  events: `${prefix}.events`,
  email: `${prefix}.email`,
});

export const QUEUES = Object.freeze({
  notifications: `${prefix}.notifications`,
  feed: `${prefix}.feed`,
  analytics: `${prefix}.analytics`,
  email: `${prefix}.email.outbox`,
});

export const EVENTS = Object.freeze({
  USER_REGISTERED: "user.registered",
  USER_VERIFIED: "user.verified",
  POST_CREATED: "post.created",
  POST_UPDATED: "post.updated",
  POST_DELETED: "post.deleted",
  POST_LIKED: "post.liked",
  POST_UNLIKED: "post.unliked",
  COMMENT_CREATED: "comment.created",
  FRIEND_REQUEST_SENT: "friend.request.sent",
  FRIEND_REQUEST_ACCEPTED: "friend.request.accepted",
  FRIEND_REMOVED: "friend.removed",
  MESSAGE_SENT: "message.sent",
  USER_MENTIONED: "user.mentioned",
  USER_FOLLOWED: "user.followed",
  USER_UNFOLLOWED: "user.unfollowed",
  COMMENT_REPLIED: "comment.replied",
  COMMENT_LIKED: "comment.liked",
  POST_REPOSTED: "post.reposted",
  CALL_MISSED: "call.missed",
  FEED_REBUILD_REQUESTED: "feed.rebuild.requested",
});

export const EMAIL_TYPES = Object.freeze({
  WELCOME: "welcome",
  VERIFY_EMAIL: "verify-email",
  PASSWORD_RESET: "password-reset",
  PASSWORD_CHANGED: "password-changed",
  NEW_MESSAGE: "new-message",
  POST_LIKE: "post-like",
  COMMENT: "comment",
  FRIEND_REQUEST: "friend-request",
  MENTION: "mention",
  EMAIL_CHANGED: "email-changed",
});

const BINDINGS = {
  [QUEUES.notifications]: [
    EVENTS.POST_LIKED,
    EVENTS.COMMENT_CREATED,
    EVENTS.FRIEND_REQUEST_SENT,
    EVENTS.FRIEND_REQUEST_ACCEPTED,
    EVENTS.MESSAGE_SENT,
    EVENTS.USER_MENTIONED,
    EVENTS.USER_FOLLOWED,
    EVENTS.COMMENT_REPLIED,
    EVENTS.COMMENT_LIKED,
    EVENTS.POST_REPOSTED,
    EVENTS.CALL_MISSED,
  ],
  [QUEUES.feed]: [
    EVENTS.POST_CREATED,
    EVENTS.POST_UPDATED,
    EVENTS.POST_DELETED,
    EVENTS.FRIEND_REQUEST_ACCEPTED,
    EVENTS.FRIEND_REMOVED,
    EVENTS.USER_FOLLOWED,
    EVENTS.USER_UNFOLLOWED,
    EVENTS.FEED_REBUILD_REQUESTED,
  ],
  [QUEUES.analytics]: ["#"],
};

export function retryQueueName(queue, attempt) {
  return `${queue}.retry.${attempt}`;
}

export function deadLetterQueueName(queue) {
  return `${queue}.dlq`;
}

export async function assertQueueWithRetries(channel, queue) {
  await channel.assertQueue(queue, { durable: true });
  await channel.assertQueue(deadLetterQueueName(queue), { durable: true });
  await Promise.all(
    config.rabbitmq.retryDelaysMs.map((delay, index) =>
      channel.assertQueue(retryQueueName(queue, index + 1), {
        durable: true,
        arguments: {
          "x-message-ttl": delay,
          "x-dead-letter-exchange": "",
          "x-dead-letter-routing-key": queue,
        },
      }),
    ),
  );
}

export async function assertTopology(channel) {
  await channel.assertExchange(EXCHANGES.events, "topic", { durable: true });
  await channel.assertExchange(EXCHANGES.email, "topic", { durable: true });

  // The email outbox is consumed by the email microservice. Declaring it here too means emails published
  // before that service first starts are kept instead of being dropped by an exchange with no bindings.
  await channel.assertQueue(QUEUES.email, { durable: true });
  await channel.bindQueue(QUEUES.email, EXCHANGES.email, "#");

  for (const [queue, keys] of Object.entries(BINDINGS)) {
    await assertQueueWithRetries(channel, queue);
    for (const key of keys) await channel.bindQueue(queue, EXCHANGES.events, key);
  }
}
