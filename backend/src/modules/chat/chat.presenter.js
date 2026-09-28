import { storage, buckets } from "#core/storage/index.js";
import { toUserSummary } from "#shared/user-summary.js";

const num = (value) => (value === null || value === undefined ? null : Number(value));

export function toMessage(row) {
  const deleted = Boolean(row.deletedAt);
  return {
    id: num(row.id),
    conversationId: row.conversationId,
    from: row.senderId,
    text: deleted ? null : row.body ?? "",
    imageUrl: deleted ? null : row.imageUrl ?? null,
    createdAt: row.createdAt,
    editedAt: row.editedAt ?? null,
    deleted,
    sender: toUserSummary(row.sender),
    ...(row.conversation
      ? { conversation: { id: row.conversation.id, type: row.conversation.type, title: row.conversation.title } }
      : {}),
  };
}

export function toConversation(row, viewerId, { unread = 0, online = new Set() } = {}) {
  const members = row.members.map((member) => ({
    ...toUserSummary(member.user),
    role: member.role,
    joinedAt: member.joinedAt,
    lastReadMessageId: num(member.lastReadMessageId),
    online: online.has(member.userId),
  }));
  const mine = row.members.find((member) => member.userId === viewerId);
  const partner = row.type === "direct" ? members.find((member) => member.id !== viewerId) ?? null : null;

  return {
    id: row.id,
    type: row.type,
    title: row.type === "direct" ? partner?.username ?? "Conversation" : row.title ?? "Group",
    imageUrl:
      row.type === "direct" ? partner?.avatarUrl ?? null : storage.resolveUrl(buckets.avatars, row.imageUrl),
    partner,
    members,
    memberCount: members.length,
    myRole: mine?.role ?? null,
    muted: Boolean(mine?.muted),
    unreadCount: unread,
    lastMessage: row.messages?.[0] ? toMessage(row.messages[0]) : null,
    lastMessageAt: row.lastMessageAt,
    createdAt: row.createdAt,
  };
}
