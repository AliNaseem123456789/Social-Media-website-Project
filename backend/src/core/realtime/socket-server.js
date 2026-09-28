import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { config } from "#config";
import { childLogger } from "#core/logger/index.js";
import { corsOptions } from "#core/http/security.js";
import { getRedis, connectRedis } from "#core/cache/redis.js";
import { verifyAccessToken, isSessionRevoked } from "#core/auth/jwt.js";
import { userRoom } from "./rooms.js";

const log = childLogger("socket");

export async function createSocketServer(httpServer, registrars = []) {
  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: { origin: corsOptions.origin, credentials: true },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  await connectRedis("socket-pub", "socket-sub");
  io.adapter(createAdapter(getRedis("socket-pub"), getRedis("socket-sub"), { key: `${config.redis.keyPrefix}socket.io` }));

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("UNAUTHORIZED"));
      const user = verifyAccessToken(token);
      if (await isSessionRevoked(user.sessionId)) return next(new Error("SESSION_REVOKED"));
      socket.data.user = user;
      next();
    } catch (err) {
      next(new Error(err.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket) => {
    const { user } = socket.data;
    socket.join(userRoom(user.id));
    log.debug({ userId: user.id, socketId: socket.id }, "socket connected");

    for (const register of registrars) register(io, socket);

    socket.on("disconnect", (reason) => log.debug({ userId: user.id, reason }, "socket disconnected"));
  });

  return io;
}
