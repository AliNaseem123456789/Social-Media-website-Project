import { createHmac, randomBytes } from "node:crypto";
import { z } from "zod";
import { config } from "#config";
import { decodeCursor, page } from "#core/http/pagination.js";
import { eventBus } from "#core/messaging/event-bus.js";
import { EVENTS } from "#core/messaging/topology.js";
import { childLogger } from "#core/logger/index.js";
import { toUserSummary } from "#shared/user-summary.js";
import { callsRepository } from "./calls.repository.js";

const log = childLogger("calls");
const RINGING_TIMEOUT_MS = 2 * 60 * 1000;
const cursorShape = z.object({ at: z.string(), id: z.number().int() });

const duration = (row) =>
  row.answeredAt && row.endedAt ? Math.max(0, Math.round((row.endedAt - row.answeredAt) / 1000)) : 0;

function toCall(row, viewerId) {
  const outgoing = row.callerId === viewerId;
  return {
    id: row.id,
    roomId: row.roomId,
    direction: outgoing ? "outgoing" : "incoming",
    video: row.video,
    status: row.status,
    startedAt: row.startedAt,
    answeredAt: row.answeredAt,
    endedAt: row.endedAt,
    durationSeconds: duration(row),
    peer: toUserSummary(outgoing ? row.callee : row.caller),
  };
}

export const callsService = {
  newRoomId() {
    return randomBytes(16).toString("hex");
  },

  start({ roomId, callerId, calleeId, video }) {
    return callsRepository.start({ roomId, callerId, calleeId, video });
  },

  async answered(roomId, userId) {
    const call = await callsRepository.findByRoom(roomId);
    if (!call || call.status !== "ringing" || call.callerId === userId) return null;
    return callsRepository.update(roomId, { status: "answered", answeredAt: new Date() });
  },

  async rejected(roomId) {
    const call = await callsRepository.findByRoom(roomId);
    if (!call || call.status !== "ringing") return null;
    return callsRepository.update(roomId, { status: "rejected", endedAt: new Date() });
  },

  /**
   * Ends a call, or records it as missed when nobody ever answered, which is what produces the
   * missed-call notification for the person who was called.
   */
  async ended(roomId) {
    const call = await callsRepository.findByRoom(roomId);
    if (!call || !["ringing", "answered"].includes(call.status)) return null;
    if (call.status === "answered") {
      return callsRepository.update(roomId, { status: "ended", endedAt: new Date() });
    }
    const missed = await callsRepository.update(roomId, { status: "missed", endedAt: new Date() });
    await eventBus.publish(EVENTS.CALL_MISSED, {
      roomId,
      callId: missed.id,
      targetUserId: missed.calleeId,
      actorId: missed.callerId,
      actorName: missed.caller?.username ?? "Someone",
      video: missed.video,
    });
    return missed;
  },

  async history(userId, query) {
    const cursor = decodeCursor(query.cursor, cursorShape);
    const rows = await callsRepository.list(userId, cursor, query.limit);
    const result = page(rows, query.limit, (r) => ({ at: r.startedAt.toISOString(), id: r.id }));
    return {
      items: result.items.map((row) => toCall(row, userId)),
      pageInfo: result.pageInfo,
      missedCount: await callsRepository.countMissed(userId),
    };
  },

  /**
   * ICE servers for the browser. TURN credentials follow the coturn REST convention: the username is
   * an expiry timestamp and the password an HMAC of it, so no long-lived secret reaches the client.
   */
  iceServers() {
    const servers = config.rtc.stunUrls.map((urls) => ({ urls }));
    const { turnUrls, turnSecret, turnTtlSeconds } = config.rtc;

    if (turnUrls.length && turnSecret) {
      const expiry = Math.floor(Date.now() / 1000) + turnTtlSeconds;
      const username = String(expiry);
      const credential = createHmac("sha1", turnSecret).update(username).digest("base64");
      servers.push({ urls: turnUrls, username, credential });
    }

    return { iceServers: servers, ttlSeconds: turnTtlSeconds, turnConfigured: Boolean(turnUrls.length && turnSecret) };
  },

  async sweepStale() {
    const stale = await callsRepository.staleRinging(new Date(Date.now() - RINGING_TIMEOUT_MS), 50);
    for (const call of stale) {
      try {
        await this.ended(call.roomId);
      } catch (err) {
        log.warn({ err: err.message, roomId: call.roomId }, "could not settle stale call");
      }
    }
    if (stale.length) log.info({ count: stale.length }, "settled stale calls");
  },
};
