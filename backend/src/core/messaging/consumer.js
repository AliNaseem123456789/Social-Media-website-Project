import { config } from "#config";
import { childLogger } from "#core/logger/index.js";
import { rabbitmq } from "./rabbitmq.js";
import { assertQueueWithRetries, deadLetterQueueName, retryQueueName } from "./topology.js";

export class NonRetryableError extends Error {}

export function registerConsumer({ queue, handler, prefetch = config.rabbitmq.prefetch }) {
  const log = childLogger(`consumer:${queue}`);
  const maxAttempts = config.rabbitmq.retryDelaysMs.length;

  return rabbitmq.onReady(async () => {
    const channel = await rabbitmq.createChannel();
    channel.on("error", (err) => log.error({ err: err.message }, "consumer channel error"));
    await channel.prefetch(prefetch);
    await assertQueueWithRetries(channel, queue);

    await channel.consume(queue, async (msg) => {
      if (!msg) return;
      const attempt = Number(msg.properties.headers?.["x-attempt"] ?? 0);
      let envelope;

      try {
        envelope = JSON.parse(msg.content.toString());
        await handler(envelope, { routingKey: msg.fields.routingKey, attempt });
        channel.ack(msg);
      } catch (err) {
        const retryable = !(err instanceof NonRetryableError) && !(err instanceof SyntaxError);
        const nextAttempt = attempt + 1;
        const headers = { ...msg.properties.headers, "x-attempt": nextAttempt, "x-last-error": err.message };
        const target =
          retryable && nextAttempt <= maxAttempts
            ? retryQueueName(queue, nextAttempt)
            : deadLetterQueueName(queue);

        log.warn({ err: err.message, attempt: nextAttempt, target, type: envelope?.type }, "message failed");

        try {
          channel.sendToQueue(target, msg.content, {
            persistent: true,
            contentType: msg.properties.contentType,
            messageId: msg.properties.messageId,
            type: msg.properties.type,
            headers,
          });
          channel.ack(msg);
        } catch (republishErr) {
          log.error({ err: republishErr.message }, "could not reroute failed message, requeueing");
          channel.nack(msg, false, true);
        }
      }
    });

    log.info("consumer started");
  });
}
