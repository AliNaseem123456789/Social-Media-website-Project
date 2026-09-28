import { EVENTS } from "#core/messaging/topology.js";
import { feedBuilder } from "./feed.builder.js";

const handlers = {
  [EVENTS.POST_CREATED]: (d, envelope) => feedBuilder.fanOutPost(d.postId, d.authorId, envelope.occurredAt),
  [EVENTS.POST_DELETED]: (d) => feedBuilder.removePost(d.postId, d.authorId),
  [EVENTS.POST_UPDATED]: () => undefined,
  [EVENTS.FRIEND_REQUEST_ACCEPTED]: (d) =>
    Promise.all([feedBuilder.rebuild(d.requesterId), feedBuilder.rebuild(d.recipientId)]),
  [EVENTS.FRIEND_REMOVED]: (d) => Promise.all([feedBuilder.rebuild(d.userId), feedBuilder.rebuild(d.friendId)]),
  [EVENTS.USER_FOLLOWED]: (d) => feedBuilder.rebuild(d.actorId),
  [EVENTS.USER_UNFOLLOWED]: (d) => feedBuilder.rebuild(d.actorId),
  [EVENTS.FEED_REBUILD_REQUESTED]: (d) => feedBuilder.rebuild(d.userId),
};

export async function handleFeedEvent(envelope) {
  const handler = handlers[envelope.type];
  if (handler) await handler(envelope.data, envelope);
}
