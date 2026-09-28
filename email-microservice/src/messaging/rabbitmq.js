import amqp from "amqplib";
import { config } from "../config/index.js";
import { logger } from "../logger.js";

const log = logger.child({ component: "rabbitmq" });

class RabbitConnection {
  #connection = null;
  #readyHandlers = [];
  #closing = false;
  #attempt = 0;
  #timer = null;

  get isConnected() {
    return Boolean(this.#connection);
  }

  onReady(handler) {
    this.#readyHandlers.push(handler);
  }

  async connect() {
    if (this.#connection) return;
    this.#closing = false;
    try {
      const connection = await amqp.connect(config.rabbitmq.url, {
        clientProperties: { connection_name: config.serviceName },
      });
      connection.on("error", (err) => log.error({ err: err.message }, "connection error"));
      connection.on("close", () => {
        this.#connection = null;
        this.#scheduleReconnect();
      });
      this.#connection = connection;
      this.#attempt = 0;
      log.info("rabbitmq connected");
      for (const handler of this.#readyHandlers) await handler(connection);
    } catch (err) {
      this.#connection = null;
      this.#scheduleReconnect();
      throw err;
    }
  }

  #scheduleReconnect() {
    if (this.#closing || this.#timer) return;
    const delay = Math.min(1000 * 2 ** this.#attempt, 30000);
    this.#attempt += 1;
    log.warn({ delay }, "rabbitmq unavailable, reconnecting");
    this.#timer = setTimeout(() => {
      this.#timer = null;
      this.connect().catch((err) => log.error({ err: err.message }, "reconnect failed"));
    }, delay);
  }

  async close() {
    this.#closing = true;
    clearTimeout(this.#timer);
    try {
      await this.#connection?.close();
    } catch (err) {
      log.warn({ err: err.message }, "error while closing");
    }
    this.#connection = null;
  }
}

export const rabbitmq = new RabbitConnection();
