export const NOTIFICATION_TYPES = Object.freeze({
  LIKE: "like",
  COMMENT: "comment",
  COMMENT_REPLY: "comment_reply",
  COMMENT_LIKE: "comment_like",
  MENTION: "mention",
  FOLLOW: "follow",
  REPOST: "repost",
  MISSED_CALL: "missed_call",
  FRIEND_REQUEST: "friend_request",
  FRIEND_ACCEPT: "friend_accept",
});

/**
 * Where the client should navigate when a notification is opened. The notifications table only stores
 * a single target id, so the type decides how to read it.
 */
const LINKS = {
  [NOTIFICATION_TYPES.LIKE]: (n) => `/posts/${n.targetId}`,
  [NOTIFICATION_TYPES.COMMENT]: (n) => `/posts/${n.targetId}`,
  [NOTIFICATION_TYPES.COMMENT_REPLY]: (n) => `/posts/${n.targetId}`,
  [NOTIFICATION_TYPES.COMMENT_LIKE]: (n) => `/posts/${n.targetId}`,
  [NOTIFICATION_TYPES.MENTION]: (n) => `/posts/${n.targetId}`,
  [NOTIFICATION_TYPES.REPOST]: (n) => `/posts/${n.targetId}`,
  [NOTIFICATION_TYPES.FOLLOW]: (n) => (n.actorId ? `/profile/${n.actorId}` : null),
  [NOTIFICATION_TYPES.MISSED_CALL]: (n) => (n.actorId ? `/calls` : null),
  [NOTIFICATION_TYPES.FRIEND_REQUEST]: () => "/friends/requests",
  [NOTIFICATION_TYPES.FRIEND_ACCEPT]: () => "/friends",
};

export function toNotification(n) {
  const link = LINKS[n.type]?.(n) ?? null;
  return {
    id: n.id,
    type: n.type,
    content: n.content,
    read: n.read,
    createdAt: n.createdAt,
    actor: n.actorId ? { id: n.actorId, username: n.actorName } : null,
    targetId: n.targetId,
    link,
  };
}
