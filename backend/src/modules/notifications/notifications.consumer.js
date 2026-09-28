import { config } from "#config";
import { eventBus } from "#core/messaging/event-bus.js";
import { EVENTS, EMAIL_TYPES } from "#core/messaging/topology.js";
import { presence } from "#modules/chat/presence.js";
import { emailEnabled } from "#modules/settings/settings.service.js";
import { notificationsService } from "./notifications.service.js";
import { NOTIFICATION_TYPES } from "./notifications.presenter.js";

const postUrl = (postId) => `${config.appUrl}/posts/${postId}`;

/**
 * Sends an email only when the recipient still has that channel switched on in their settings.
 */
async function email(userId, channel, type, build) {
  if (!(await emailEnabled(userId, channel))) return;
  const recipient = await notificationsService.recipient(userId);
  if (!recipient) return;
  await eventBus.sendEmail(type, recipient.email, { name: recipient.username, ...build(recipient) });
}

const handlers = {
  async [EVENTS.POST_LIKED](d) {
    const created = await notificationsService.notify({
      userId: d.postOwnerId,
      type: NOTIFICATION_TYPES.LIKE,
      actorId: d.actorId,
      actorName: d.actorName,
      targetId: d.postId,
      content: `${d.actorName} liked your post`,
    });
    if (!created) return;
    await email(d.postOwnerId, "emailOnLike", EMAIL_TYPES.POST_LIKE, () => ({
      actorName: d.actorName,
      postPreview: d.postPreview,
      postUrl: postUrl(d.postId),
    }));
  },

  async [EVENTS.COMMENT_CREATED](d) {
    const created = await notificationsService.notify({
      userId: d.postOwnerId,
      type: NOTIFICATION_TYPES.COMMENT,
      actorId: d.actorId,
      actorName: d.actorName,
      targetId: d.postId,
      content: `${d.actorName} commented on your post`,
    });
    if (!created) return;
    await email(d.postOwnerId, "emailOnComment", EMAIL_TYPES.COMMENT, () => ({
      actorName: d.actorName,
      commentPreview: d.commentPreview,
      postPreview: d.postPreview,
      postUrl: postUrl(d.postId),
    }));
  },

  async [EVENTS.COMMENT_REPLIED](d) {
    const created = await notificationsService.notify({
      userId: d.parentAuthorId,
      type: NOTIFICATION_TYPES.COMMENT_REPLY,
      actorId: d.actorId,
      actorName: d.actorName,
      targetId: d.postId,
      content: `${d.actorName} replied to your comment`,
    });
    if (!created) return;
    await email(d.parentAuthorId, "emailOnComment", EMAIL_TYPES.COMMENT, () => ({
      actorName: d.actorName,
      commentPreview: d.commentPreview,
      postPreview: "",
      postUrl: postUrl(d.postId),
    }));
  },

  async [EVENTS.COMMENT_LIKED](d) {
    await notificationsService.notify({
      userId: d.commentOwnerId,
      type: NOTIFICATION_TYPES.COMMENT_LIKE,
      actorId: d.actorId,
      actorName: d.actorName,
      targetId: d.postId,
      content: `${d.actorName} liked your comment`,
    });
  },

  async [EVENTS.USER_MENTIONED](d) {
    const created = await notificationsService.notify({
      userId: d.targetUserId,
      type: NOTIFICATION_TYPES.MENTION,
      actorId: d.actorId,
      actorName: d.actorName,
      targetId: d.postId,
      content: d.commentId
        ? `${d.actorName} mentioned you in a comment`
        : `${d.actorName} mentioned you in a post`,
    });
    if (!created) return;
    await email(d.targetUserId, "emailOnMention", EMAIL_TYPES.MENTION, () => ({
      actorName: d.actorName,
      textPreview: d.textPreview,
      postUrl: postUrl(d.postId),
    }));
  },

  async [EVENTS.USER_FOLLOWED](d) {
    await notificationsService.notify({
      userId: d.targetUserId,
      type: NOTIFICATION_TYPES.FOLLOW,
      actorId: d.actorId,
      actorName: d.actorName,
      targetId: d.actorId,
      content: `${d.actorName} started following you`,
    });
  },

  async [EVENTS.POST_REPOSTED](d) {
    await notificationsService.notify({
      userId: d.postOwnerId,
      type: NOTIFICATION_TYPES.REPOST,
      actorId: d.actorId,
      actorName: d.actorName,
      targetId: d.postId,
      content: `${d.actorName} shared your post`,
    });
  },

  async [EVENTS.CALL_MISSED](d) {
    await notificationsService.notify({
      userId: d.targetUserId,
      type: NOTIFICATION_TYPES.MISSED_CALL,
      actorId: d.actorId,
      actorName: d.actorName,
      targetId: d.callId,
      content: `Missed ${d.video ? "video" : "voice"} call from ${d.actorName}`,
    });
  },

  async [EVENTS.FRIEND_REQUEST_SENT](d) {
    await notificationsService.notify({
      userId: d.recipientId,
      type: NOTIFICATION_TYPES.FRIEND_REQUEST,
      actorId: d.requesterId,
      actorName: d.requesterName,
      targetId: d.requestId,
      content: `${d.requesterName} sent you a friend request`,
    });
    await email(d.recipientId, "emailOnFriendRequest", EMAIL_TYPES.FRIEND_REQUEST, () => ({
      actorName: d.requesterName,
      requestsUrl: `${config.appUrl}/friends/requests`,
    }));
  },

  async [EVENTS.FRIEND_REQUEST_ACCEPTED](d) {
    await notificationsService.notify({
      userId: d.requesterId,
      type: NOTIFICATION_TYPES.FRIEND_ACCEPT,
      actorId: d.recipientId,
      actorName: d.recipientName,
      targetId: d.requestId,
      content: `${d.recipientName} accepted your friend request`,
    });
  },

  async [EVENTS.MESSAGE_SENT](d) {
    const recipients = d.recipientIds ?? (d.recipientId ? [d.recipientId] : []);
    for (const userId of recipients) {
      if (await presence.isOnline(userId)) continue;
      await email(userId, "emailOnMessage", EMAIL_TYPES.NEW_MESSAGE, () => ({
        actorName: d.senderName,
        messagePreview: d.preview,
        conversationUrl: d.conversationId
          ? `${config.appUrl}/messages/${d.conversationId}`
          : `${config.appUrl}/messages`,
      }));
    }
  },
};

export async function handleNotificationEvent(envelope) {
  const handler = handlers[envelope.type];
  if (handler) await handler(envelope.data);
}
