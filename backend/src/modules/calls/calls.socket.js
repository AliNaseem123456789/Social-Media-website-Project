import { SOCKET_EVENTS, userRoom } from "#core/realtime/rooms.js";
import { childLogger } from "#core/logger/index.js";
import { callsService } from "./calls.service.js";

const log = childLogger("calls-socket");
const ROOM_ID = /^[A-Za-z0-9_-]{8,64}$/;
const callRoom = (roomId) => `call:${roomId}`;

const asUserId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const swallow = (promise) => promise.catch((err) => log.warn({ err: err.message }, "call log write failed"));

export function registerCallsSocket(io, socket) {
  const { user } = socket.data;

  socket.on(SOCKET_EVENTS.CALL_REQUEST, (payload) => {
    const to = asUserId(payload?.to);
    if (!to || !ROOM_ID.test(payload?.roomId || "")) return;
    const video = payload.video !== false;

    swallow(callsService.start({ roomId: payload.roomId, callerId: user.id, calleeId: to, video }));
    io.to(userRoom(to)).emit(SOCKET_EVENTS.CALL_REQUEST, {
      from: { id: user.id, username: user.username },
      roomId: payload.roomId,
      video,
    });
  });

  socket.on(SOCKET_EVENTS.CALL_REJECTED, (payload) => {
    const to = asUserId(payload?.to);
    if (!ROOM_ID.test(payload?.roomId || "")) return;
    swallow(callsService.rejected(payload.roomId));
    if (to) io.to(userRoom(to)).emit(SOCKET_EVENTS.CALL_REJECTED, { from: user.id, roomId: payload.roomId });
  });

  socket.on(SOCKET_EVENTS.CALL_END, (payload) => {
    const to = asUserId(payload?.to);
    if (!ROOM_ID.test(payload?.roomId || "")) return;
    swallow(callsService.ended(payload.roomId));
    if (to) io.to(userRoom(to)).emit(SOCKET_EVENTS.CALL_END, { from: user.id, roomId: payload.roomId });
    socket.leave(callRoom(payload.roomId));
  });

  socket.on(SOCKET_EVENTS.CALL_JOIN, (payload) => {
    if (!ROOM_ID.test(payload?.roomId || "")) return;
    swallow(callsService.answered(payload.roomId, user.id));
    socket.join(callRoom(payload.roomId));
    socket.to(callRoom(payload.roomId)).emit(SOCKET_EVENTS.CALL_JOIN, { from: user.id });
  });

  for (const event of [SOCKET_EVENTS.CALL_OFFER, SOCKET_EVENTS.CALL_ANSWER, SOCKET_EVENTS.CALL_ICE]) {
    socket.on(event, (payload) => {
      if (!ROOM_ID.test(payload?.roomId || "")) return;
      socket.to(callRoom(payload.roomId)).emit(event, { from: user.id, data: payload.data });
    });
  }
}
