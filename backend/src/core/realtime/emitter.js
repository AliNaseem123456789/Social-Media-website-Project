import { Emitter } from "@socket.io/redis-emitter";
import { config } from "#config";
import { getRedis } from "#core/cache/redis.js";
import { userRoom } from "./rooms.js";

let emitter;

function getEmitter() {
  if (!emitter) emitter = new Emitter(getRedis("socket-pub"), { key: `${config.redis.keyPrefix}socket.io` });
  return emitter;
}

/**
 * Emits to a user's sockets from any process (API or worker) through the Redis adapter.
 */
export function emitToUser(userId, event, payload) {
  getEmitter().to(userRoom(userId)).emit(event, payload);
}
