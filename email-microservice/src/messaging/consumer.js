import { config } from "../config/index.js";
import { logger } from "../logger.js";
import { rabbitmq } from "./rabbitmq.js";

export class PermanentError extends Error {}

const { exchange, queue, retryDelaysMs, prefetch } = config.rabbitmq;
const retryQueue = (attempt) => `${queue}.retry.${attempt}`;
const deadLetterQueue = `${queue}.dlq`;

async function assertTopology(channel) {
  await channel.assertExchange(exchange, "topic", { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, "#");
  await channel.assertQueue(deadLetterQueue, { durable: true });
  for (const [index, delay] of retryDelaysMs.entries()) {
    await channel.assertQueue(retryQueue(index + 1), {
      durable: true,
      arguments: {
        "x-message-ttl": delay,
        "x-dead-letter-exchange": "",
        "x-dead-letter-routing-key": queue,
      },
    });
  }
}

export function startConsumer(handle) {
  const log = logger.child({ component: "consumer", queue });

  rabbitmq.onReady(async (connection) => {
    const channel = await connection.createChannel();
    channel.on("error", (err) => log.error({ err: err.message }, "channel error"));
    await assertTopology(channel);
    await channel.prefetch(prefetch);

    await channel.consume(queue, async (msg) => {
      if (!msg) return;
      const attempt = Number(msg.properties.headers?.["x-attempt"] ?? 0);
      let envelope;
      try {
        envelope = JSON.parse(msg.content.toString());
        await handle(envelope, { routingKey: msg.fields.routingKey, attempt });
        channel.ack(msg);
      } catch (err) {
        const permanent = err instanceof PermanentError || err instanceof SyntaxError;
        const next = attempt + 1;
        const target = !permanent && next <= retryDelaysMs.length ? retryQueue(next) : deadLetterQueue;
        log.warn({ err: err.message, type: envelope?.type, attempt: next, target }, "email job failed");
        try {
          channel.sendToQueue(target, msg.content, {
            persistent: true,
            contentType: "application/json",
            messageId: msg.properties.messageId,
            type: msg.properties.type,
            headers: { ...msg.properties.headers, "x-attempt": next, "x-last-error": err.message },
          });
          channel.ack(msg);
        } catch (rerouteErr) {
          log.error({ err: rerouteErr.message }, "could not reroute job, requeueing");
          channel.nack(msg, false, true);
        }
      }
    });
    log.info("email consumer started");
  });
}
