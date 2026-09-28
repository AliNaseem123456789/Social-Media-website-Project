import { z } from "zod";
import { AppError } from "#core/http/errors.js";
import { decodeCursor, page } from "#core/http/pagination.js";
import { cache } from "#core/cache/cache.service.js";
import { cacheKeys } from "#core/cache/keys.js";
import { eventBus } from "#core/messaging/event-bus.js";
import { EVENTS } from "#core/messaging/topology.js";
import { emitToUser } from "#core/realtime/emitter.js";
import { SOCKET_EVENTS } from "#core/realtime/rooms.js";
import { storage, buckets } from "#core/storage/index.js";
import { childLogger } from "#core/logger/index.js";
import { preview } from "#shared/text.js";
import { toUserSummary } from "#shared/user-summary.js";
import { assertNotBlocked, hiddenUserIds } from "#shared/blocks.js";
import { assertCanMessage } from "#shared/messaging-policy.js";
import { chatRepository } from "./chat.repository.js";
import { toConversation, toMessage } from "./chat.presenter.js";
import { presence } from "./presence.js";

const log = childLogger("chat");
const MAX_CONVERSATIONS = 50;
const MAX_GROUP_MEMBERS = 50;
const cursorShape = z.object({ id: z.number().int() });

async function membership(conversationId, userId) {
  const member = await chatRepository.membership(conversationId, userId);
  if (!member) throw AppError.notFound("Conversation");
  return member;
}

async function requireAdmin(conversationId, userId) {
  const conversation = await chatRepository.findConversation(conversationId);
  if (!conversation) throw AppError.notFound("Conversation");
  const member = conversation.members.find((m) => m.userId === userId);
  if (!member) throw AppError.notFound("Conversation");
  if (conversation.type === "group" && member.role !== "admin") {
    throw AppError.forbidden("Only group admins can do that");
  }
  return conversation;
}

async function broadcast(conversationId, event, payload, { exclude = [], fromUserId = null } = {}) {
  const memberIds = await chatRepository.memberIds(conversationId);
  for (const userId of memberIds) {
    if (exclude.includes(userId)) continue;
    // A member who blocked the sender never receives their messages, even inside a group.
    if (fromUserId && userId !== fromUserId && (await hiddenUserIds(userId)).includes(fromUserId)) continue;
    emitToUser(userId, event, payload);
  }
  return memberIds;
}

async function resetLists(userIds) {
  await cache.del(
    ...userIds.flatMap((id) => [cacheKeys.recentChats(id), cacheKeys.chatUnread(id)]),
  );
}

export const chatService = {
  async listConversations(userId) {
    const [all, unread, hidden] = await Promise.all([
      chatRepository.listForUser(userId, MAX_CONVERSATIONS),
      chatRepository.unreadCounts(userId),
      hiddenUserIds(userId),
    ]);
    const rows = hidden.length
      ? all.filter(
          (row) => row.type !== "direct" || !row.members.some((m) => hidden.includes(m.userId)),
        )
      : all;
    const memberIds = [...new Set(rows.flatMap((row) => row.members.map((m) => m.userId)))];
    const online = await presence.onlineSet(memberIds);
    return {
      items: rows.map((row) =>
        toConversation(row, userId, { unread: unread.get(row.id) ?? 0, online }),
      ),
    };
  },

  async unreadTotal(userId) {
    const counts = await chatRepository.unreadCounts(userId);
    let total = 0;
    const byConversation = {};
    for (const [conversationId, value] of counts) {
      total += value;
      byConversation[conversationId] = value;
    }
    return { total, conversations: byConversation };
  },

  async openDirect(user, otherUserId) {
    if (user.id === otherUserId) throw AppError.badRequest("You cannot message yourself");
    const other = await chatRepository.userById(otherUserId);
    if (!other) throw AppError.notFound("User");
    await assertNotBlocked(user.id, otherUserId);

    const existing = await chatRepository.findDirect(user.id, otherUserId);
    // The recipient's privacy setting gates starting a conversation, not continuing one.
    if (!existing) await assertCanMessage(user.id, otherUserId);
    const row = existing ?? (await chatRepository.createDirect(user.id, otherUserId));
    if (!existing) await resetLists([user.id, otherUserId]);
    return this.present(row, user.id);
  },

  async createGroup(user, { title, userIds }) {
    const unique = [...new Set(userIds.filter((id) => id !== user.id))];
    if (!unique.length) throw AppError.badRequest("Pick at least one other person");
    const hidden = await hiddenUserIds(user.id);
    if (unique.some((id) => hidden.includes(id))) throw AppError.badRequest("You cannot add a blocked account");
    if (unique.length + 1 > MAX_GROUP_MEMBERS) {
      throw AppError.badRequest(`A group can hold at most ${MAX_GROUP_MEMBERS} people`);
    }
    const members = await chatRepository.usersByIds(unique);
    if (members.length !== unique.length) throw AppError.badRequest("Some of those accounts no longer exist");

    const row = await chatRepository.createGroup({ title, createdBy: user.id, memberIds: unique });
    await resetLists([user.id, ...unique]);
    const conversation = await this.present(row, user.id);
    for (const memberId of unique) {
      emitToUser(memberId, SOCKET_EVENTS.CONVERSATION_UPDATED, { conversationId: row.id, reason: "created" });
    }
    return conversation;
  },

  async get(userId, conversationId) {
    await membership(conversationId, userId);
    const row = await chatRepository.findConversation(conversationId);
    return this.present(row, userId);
  },

  async present(row, viewerId) {
    const unread = await chatRepository.unreadCounts(viewerId);
    const online = await presence.onlineSet(row.members.map((m) => m.userId));
    return toConversation(row, viewerId, { unread: unread.get(row.id) ?? 0, online });
  },

  async update(user, conversationId, { title, removeImage }, file) {
    const conversation = await requireAdmin(conversationId, user.id);
    if (conversation.type !== "group") throw AppError.badRequest("Only group chats can be renamed");

    const data = {};
    if (title !== undefined) data.title = title;
    if (file) {
      const stored = await storage.uploadImage(buckets.avatars, file, {
        folder: `groups/${conversationId}`,
        preset: "avatar",
      });
      data.imageUrl = stored.key;
    } else if (removeImage) {
      data.imageUrl = null;
    }

    const row = await chatRepository.updateConversation(conversationId, data);
    await broadcast(conversationId, SOCKET_EVENTS.CONVERSATION_UPDATED, { conversationId, reason: "updated" });
    await resetLists(row.members.map((m) => m.userId));
    return this.present(row, user.id);
  },

  async addMembers(user, conversationId, { userIds }) {
    const conversation = await requireAdmin(conversationId, user.id);
    if (conversation.type !== "group") throw AppError.badRequest("Only group chats take extra members");

    const current = new Set(conversation.members.map((m) => m.userId));
    const toAdd = [...new Set(userIds)].filter((id) => !current.has(id));
    if (!toAdd.length) throw AppError.badRequest("Those people are already in the group");
    if (current.size + toAdd.length > MAX_GROUP_MEMBERS) {
      throw AppError.badRequest(`A group can hold at most ${MAX_GROUP_MEMBERS} people`);
    }
    const found = await chatRepository.usersByIds(toAdd);
    if (found.length !== toAdd.length) throw AppError.badRequest("Some of those accounts no longer exist");

    const row = await chatRepository.addMembers(conversationId, toAdd);
    await resetLists([...current, ...toAdd]);
    await broadcast(conversationId, SOCKET_EVENTS.CONVERSATION_UPDATED, { conversationId, reason: "members" });
    return this.present(row, user.id);
  },

  async removeMember(user, conversationId, targetId) {
    const conversation = await chatRepository.findConversation(conversationId);
    if (!conversation) throw AppError.notFound("Conversation");
    const me = conversation.members.find((m) => m.userId === user.id);
    if (!me) throw AppError.notFound("Conversation");
    if (conversation.type !== "group") throw AppError.badRequest("Direct chats have no members to remove");
    if (targetId !== user.id && me.role !== "admin") {
      throw AppError.forbidden("Only group admins can remove people");
    }

    const remaining = await chatRepository.removeMember(conversationId, targetId);
    const formerMembers = conversation.members.map((m) => m.userId);
    await resetLists(formerMembers);
    if (remaining === 0) {
      await chatRepository.deleteConversation(conversationId);
    } else {
      await broadcast(conversationId, SOCKET_EVENTS.CONVERSATION_UPDATED, { conversationId, reason: "members" });
    }
    emitToUser(targetId, SOCKET_EVENTS.CONVERSATION_UPDATED, { conversationId, reason: "removed" });
  },

  async history(userId, conversationId, query) {
    await membership(conversationId, userId);
    const hidden = await hiddenUserIds(userId);
    const cursor = decodeCursor(query.cursor, cursorShape);
    const rows = await chatRepository.listMessages(conversationId, cursor, query.limit, hidden);
    const result = page(rows, query.limit, (m) => ({ id: Number(m.id) }));
    return { items: result.items.map(toMessage), pageInfo: result.pageInfo };
  },

  async send(user, conversationId, { text, clientId } = {}, file) {
    const conversation = await chatRepository.findConversation(conversationId);
    if (!conversation) throw AppError.notFound("Conversation");
    if (!conversation.members.some((m) => m.userId === user.id)) throw AppError.notFound("Conversation");

    const body = text?.trim() || null;
    let imageUrl = null;
    if (file) {
      imageUrl = (
        await storage.uploadImage(buckets.posts, file, { folder: `chat/${conversationId}`, preset: "post" })
      ).url;
    }
    if (!body && !imageUrl) throw AppError.badRequest("A message needs text or an image");

    const recipients = conversation.members.map((m) => m.userId).filter((id) => id !== user.id);
    if (conversation.type === "direct" && recipients.length === 1) {
      await assertNotBlocked(user.id, recipients[0]);
    }
    let legacyMessageId = null;
    if (conversation.type === "direct" && body && recipients.length === 1) {
      legacyMessageId = await this.mirrorToLegacy(user, recipients[0], body);
    }

    const saved = await chatRepository.createMessage({
      conversationId,
      senderId: user.id,
      body,
      imageUrl,
      legacyMessageId,
    });
    const message = { ...toMessage(saved), clientId };

    await broadcast(conversationId, SOCKET_EVENTS.MESSAGE_NEW, message, { fromUserId: user.id });
    await resetLists(conversation.members.map((m) => m.userId));

    await eventBus.publish(EVENTS.MESSAGE_SENT, {
      messageId: message.id,
      conversationId,
      conversationType: conversation.type,
      conversationTitle: conversation.title,
      senderId: user.id,
      senderName: user.username,
      recipientIds: recipients.filter(
        (id) => !conversation.members.find((m) => m.userId === id)?.muted,
      ),
      preview: preview(body ?? "Sent a photo", 150),
    });
    return message;
  },

  /**
   * The previous deployment of this app still reads the flat messages table, so direct messages are
   * written there too. A failure there must not stop the message being delivered here.
   */
  async mirrorToLegacy(user, recipientId, body) {
    try {
      const row = await chatRepository.createLegacyMessage({
        fromUser: user.id,
        toUser: recipientId,
        username: user.username,
        message: body,
      });
      return row.id;
    } catch (err) {
      log.warn({ err: err.message }, "could not mirror message to the legacy table");
      return null;
    }
  },

  async editMessage(user, conversationId, messageId, { text }) {
    await membership(conversationId, user.id);
    const existing = await chatRepository.findMessage(messageId);
    if (!existing || existing.conversationId !== conversationId) throw AppError.notFound("Message");
    if (existing.senderId !== user.id) throw AppError.forbidden("You can only edit your own messages");
    if (existing.deletedAt) throw AppError.badRequest("This message was deleted");

    const row = await chatRepository.updateMessage(messageId, { body: text, editedAt: new Date() });
    if (existing.legacyMessageId) {
      await chatRepository.updateLegacyMessage(existing.legacyMessageId, text).catch(() => {});
    }
    const message = toMessage(row);
    await broadcast(conversationId, SOCKET_EVENTS.MESSAGE_UPDATED, message);
    await resetLists(await chatRepository.memberIds(conversationId));
    return message;
  },

  async deleteMessage(user, conversationId, messageId) {
    const member = await membership(conversationId, user.id);
    const existing = await chatRepository.findMessage(messageId);
    if (!existing || existing.conversationId !== conversationId) throw AppError.notFound("Message");
    if (existing.senderId !== user.id && member.role !== "admin") {
      throw AppError.forbidden("You can only delete your own messages");
    }
    if (existing.deletedAt) return;

    const row = await chatRepository.updateMessage(messageId, {
      deletedAt: new Date(),
      body: null,
      imageUrl: null,
    });
    if (existing.legacyMessageId) {
      await chatRepository.deleteLegacyMessage(existing.legacyMessageId).catch(() => {});
    }
    if (existing.imageUrl) {
      const key = storage.keyFromValue(buckets.posts, existing.imageUrl);
      if (key) await storage.remove(buckets.posts, [key]).catch(() => {});
    }
    await broadcast(conversationId, SOCKET_EVENTS.MESSAGE_UPDATED, toMessage(row));
    await resetLists(await chatRepository.memberIds(conversationId));
  },

  async setMuted(user, conversationId, muted) {
    await membership(conversationId, user.id);
    await chatRepository.setMuted(conversationId, user.id, muted);
    await cache.del(cacheKeys.recentChats(user.id));
    return { conversationId, muted };
  },

  async setMemberRole(user, conversationId, targetId, role) {
    const conversation = await requireAdmin(conversationId, user.id);
    if (conversation.type !== "group") throw AppError.badRequest("Direct chats have no roles");
    if (!conversation.members.some((m) => m.userId === targetId)) throw AppError.notFound("Member");
    if (targetId === user.id && role !== "admin") {
      const admins = conversation.members.filter((m) => m.role === "admin");
      if (admins.length <= 1) throw AppError.badRequest("Promote someone else before stepping down");
    }

    await chatRepository.setMemberRole(conversationId, targetId, role);
    await broadcast(conversationId, SOCKET_EVENTS.CONVERSATION_UPDATED, { conversationId, reason: "members" });
    const row = await chatRepository.findConversation(conversationId);
    return this.present(row, user.id);
  },

  async markRead(user, conversationId, { messageId } = {}) {
    await membership(conversationId, user.id);
    let lastId = messageId;
    if (!lastId) {
      const [latest] = await chatRepository.listMessages(conversationId, null, 1);
      lastId = latest ? Number(latest.id) : 0;
    }
    if (lastId > 0) await chatRepository.markRead(conversationId, user.id, lastId);
    await cache.del(cacheKeys.chatUnread(user.id));

    await broadcast(
      conversationId,
      SOCKET_EVENTS.MESSAGE_READ,
      { conversationId, userId: user.id, lastReadMessageId: lastId },
      { exclude: [] },
    );
    return { conversationId, lastReadMessageId: lastId, ...(await this.unreadTotal(user.id)) };
  },

  async search(userId, { q, conversationId, limit }) {
    if (conversationId) await membership(conversationId, userId);
    const rows = await chatRepository.searchMessages(userId, q, { conversationId, limit });
    return { query: q, items: rows.map(toMessage) };
  },

  async partner(userId) {
    const user = await chatRepository.userById(userId);
    if (!user) throw AppError.notFound("User");
    return { ...toUserSummary(user), online: await presence.isOnline(userId) };
  },
};
