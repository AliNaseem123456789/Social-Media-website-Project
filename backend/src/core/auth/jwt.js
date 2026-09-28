import jwt from "jsonwebtoken";
import { config } from "#config";
import { getRedis } from "#core/cache/redis.js";
import { cacheKeys } from "#core/cache/keys.js";

const { accessSecret, accessTtlSeconds, issuer, audience } = config.auth;

export function signAccessToken({ userId, sessionId, username, emailVerified }) {
  return jwt.sign({ sid: sessionId, name: username, ev: Boolean(emailVerified) }, accessSecret, {
    subject: String(userId),
    expiresIn: accessTtlSeconds,
    issuer,
    audience,
    algorithm: "HS256",
  });
}

export function verifyAccessToken(token) {
  const payload = jwt.verify(token, accessSecret, { issuer, audience, algorithms: ["HS256"] });
  return {
    id: Number(payload.sub),
    sessionId: payload.sid,
    username: payload.name,
    emailVerified: payload.ev,
  };
}

export async function isSessionRevoked(sessionId) {
  try {
    return (await getRedis().exists(cacheKeys.revokedSession(sessionId))) === 1;
  } catch {
    return false;
  }
}

export async function markSessionsRevoked(sessionIds) {
  if (!sessionIds.length) return;
  const pipeline = getRedis().pipeline();
  for (const id of sessionIds) pipeline.set(cacheKeys.revokedSession(id), "1", "EX", accessTtlSeconds);
  await pipeline.exec();
}
