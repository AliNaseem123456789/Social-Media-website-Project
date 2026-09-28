import { EVENTS } from "#core/messaging/topology.js";
import { analyticsRepository } from "./analytics.repository.js";
import { analyticsService } from "./analytics.service.js";

function affectedUsers(type, d) {
  switch (type) {
    case EVENTS.POST_CREATED:
    case EVENTS.POST_DELETED:
      return [d.authorId];
    case EVENTS.POST_LIKED:
    case EVENTS.POST_UNLIKED:
    case EVENTS.COMMENT_CREATED:
      return [d.postOwnerId];
    case EVENTS.FRIEND_REQUEST_ACCEPTED:
      return [d.requesterId, d.recipientId];
    case EVENTS.FRIEND_REMOVED:
      return [d.userId, d.friendId];
    default:
      return [];
  }
}

const PRIVATE_FIELDS = new Set(["preview", "commentPreview", "postPreview", "messagePreview"]);

function stripPrivate(data) {
  return Object.fromEntries(Object.entries(data ?? {}).filter(([key]) => !PRIVATE_FIELDS.has(key)));
}

function actorOf(d) {
  return d.actorId ?? d.authorId ?? d.userId ?? d.senderId ?? d.requesterId ?? null;
}

export async function handleAnalyticsEvent(envelope) {
  if (envelope.type === EVENTS.FEED_REBUILD_REQUESTED) return;
  const { type, data, occurredAt } = envelope;

  await analyticsRepository.recordEvent({
    userId: actorOf(data),
    eventType: type,
    eventData: stripPrivate(data),
    createdAt: new Date(occurredAt),
  });
  await analyticsService.invalidateUserStats(...affectedUsers(type, data));
}
