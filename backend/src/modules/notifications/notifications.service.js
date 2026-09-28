import { z } from "zod";
import { decodeCursor, page } from "#core/http/pagination.js";
import { cache } from "#core/cache/cache.service.js";
import { cacheKeys } from "#core/cache/keys.js";
import { emitToUser } from "#core/realtime/emitter.js";
import { SOCKET_EVENTS } from "#core/realtime/rooms.js";
import { isHidden, hiddenUserIds } from "#shared/blocks.js";
import { notificationsRepository } from "./notifications.repository.js";
import { toNotification } from "./notifications.presenter.js";

const UNREAD_TTL = 300;
const cursorShape = z.object({ id: z.number().int() });

async function refreshUnread(userId) {
  const count = await notificationsRepository.countUnread(userId, await hiddenUserIds(userId));
  await cache.set(cacheKeys.unreadCount(userId), count, UNREAD_TTL);
  emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_UNREAD, { count });
  return count;
}

export const notificationsService = {
  async list(userId, query) {
    const cursor = decodeCursor(query.cursor, cursorShape);
    const rows = await notificationsRepository.list(userId, query, cursor, query.limit, await hiddenUserIds(userId));
    const result = page(rows, query.limit, (n) => ({ id: n.id }));
    return { items: result.items.map(toNotification), pageInfo: result.pageInfo };
  },

  async unreadCount(userId) {
    const count = await cache.wrap(cacheKeys.unreadCount(userId), UNREAD_TTL, async () =>
      notificationsRepository.countUnread(userId, await hiddenUserIds(userId)),
    );
    return { count: Number(count) || 0 };
  },

  async markRead(userId, id) {
    await notificationsRepository.markRead(userId, id);
    return { count: await refreshUnread(userId) };
  },

  async markAllRead(userId) {
    await notificationsRepository.markAllRead(userId);
    return { count: await refreshUnread(userId) };
  },

  /**
   * Persists a notification and pushes it to the recipient's open sockets.
   */
  async notify({ userId, type, actorId, actorName, targetId = null, content }) {
    if (!userId || userId === actorId) return null;
    if (actorId && (await isHidden(userId, actorId))) return null;
    const duplicate = await notificationsRepository.findDuplicate({ userId, type, actorId, targetId });
    if (duplicate) return null;

    const notification = toNotification(
      await notificationsRepository.create({ userId, type, actorId, actorName, targetId, content }),
    );
    emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_NEW, notification);
    await refreshUnread(userId);
    return notification;
  },

  recipient(userId) {
    return notificationsRepository.recipient(userId);
  },
};
