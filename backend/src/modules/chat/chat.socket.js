import { SOCKET_EVENTS, userRoom } from "#core/realtime/rooms.js";
import { childLogger } from "#core/logger/index.js";
import { chatRepository } from "./chat.repository.js";
import { chatService } from "./chat.service.js";
import { socketMessage, socketTyping } from "./chat.schemas.js";
import { presence } from "./presence.js";

const log = childLogger("chat-socket");

/**
 * Accepts either a conversation id or, for direct chats started from a profile, the other user's id.
 */
async function resolveConversation(user, { conversationId, to }) {
  if (conversationId) return conversationId;
  if (!to) return null;
  const conversation = await chatService.openDirect(user, to);
  return conversation.id;
}

export function registerChatSocket(io, socket) {
  const { user } = socket.data;

  presence.connect(user.id, socket.id).catch((err) => log.warn({ err: err.message }, "presence connect failed"));
  socket.on("disconnect", () => {
    presence.disconnect(user.id, socket.id).catch(() => {});
  });

  socket.on(SOCKET_EVENTS.MESSAGE_SEND, async (payload, ack) => {
    const reply = typeof ack === "function" ? ack : () => {};
    const parsed = socketMessage.safeParse(payload);
    if (!parsed.success) return reply({ ok: false, error: "INVALID_MESSAGE" });
    if (!parsed.data.text) return reply({ ok: false, error: "EMPTY_MESSAGE" });

    try {
      const conversationId = await resolveConversation(user, parsed.data);
      if (!conversationId) return reply({ ok: false, error: "NO_CONVERSATION" });
      const message = await chatService.send(user, conversationId, {
        text: parsed.data.text,
        clientId: parsed.data.clientId,
      });
      reply({ ok: true, message });
    } catch (err) {
      log.warn({ err: err.message }, "message send failed");
      reply({ ok: false, error: err.code || "SEND_FAILED" });
    }
  });

  socket.on(SOCKET_EVENTS.TYPING, async (payload) => {
    const parsed = socketTyping.safeParse(payload);
    if (!parsed.success) return;
    const { conversationId, to, isTyping } = parsed.data;

    if (conversationId) {
      const member = await chatRepository.membership(conversationId, user.id);
      if (!member) return;
      const memberIds = await chatRepository.memberIds(conversationId);
      for (const memberId of memberIds) {
        if (memberId === user.id) continue;
        io.to(userRoom(memberId)).emit(SOCKET_EVENTS.TYPING, {
          conversationId,
          from: user.id,
          isTyping: Boolean(isTyping),
        });
      }
      return;
    }

    if (to) {
      io.to(userRoom(to)).emit(SOCKET_EVENTS.TYPING, { from: user.id, isTyping: Boolean(isTyping) });
    }
  });
}
