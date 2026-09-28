import { randomUUID } from "node:crypto";
import { config } from "#config";
import { childLogger } from "#core/logger/index.js";
import { rabbitmq } from "./rabbitmq.js";
import { EXCHANGES } from "./topology.js";

const log = childLogger("event-bus");

export function createEnvelope(type, data, meta = {}) {
  return {
    id: randomUUID(),
    type,
    occurredAt: new Date().toISOString(),
    source: config.serviceName,
    data,
    ...(Object.keys(meta).length ? { meta } : {}),
  };
}

export const eventBus = {
  async publish(type, data, meta) {
    const envelope = createEnvelope(type, data, meta);
    try {
      await rabbitmq.publish(EXCHANGES.events, type, envelope, { messageId: envelope.id, type });
      return true;
    } catch (err) {
      log.error({ err: err.message, type }, "failed to publish event");
      return false;
    }
  },

  async sendEmail(type, to, data) {
    const envelope = createEnvelope(type, { to, ...data });
    try {
      await rabbitmq.publish(EXCHANGES.email, type, envelope, { messageId: envelope.id, type });
      return true;
    } catch (err) {
      log.error({ err: err.message, type }, "failed to queue email");
      return false;
    }
  },
};
