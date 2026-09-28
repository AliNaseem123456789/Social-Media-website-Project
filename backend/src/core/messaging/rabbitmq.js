import amqp from "amqplib";
import { config } from "#config";
import { childLogger } from "#core/logger/index.js";
import { assertTopology } from "./topology.js";

const log = childLogger("rabbitmq");

class RabbitConnection {
  #connection = null;
  #publishChannel = null;
  #readyHandlers = [];
  #connecting = null;
  #closing = false;
  #reconnectAttempt = 0;
  #reconnectTimer = null;

  get isConnected() {
    return Boolean(this.#connection && this.#publishChannel);
  }

  onReady(handler) {
    this.#readyHandlers.push(handler);
    if (this.isConnected) return handler(this);
    return undefined;
  }

  async connect() {
    if (this.isConnected) return;
    if (this.#connecting) return this.#connecting;
    this.#closing = false;
    this.#connecting = this.#open()
      .catch((err) => {
        this.#scheduleReconnect();
        throw err;
      })
      .finally(() => {
        this.#connecting = null;
      });
    return this.#connecting;
  }

  async #open() {
    const connection = await amqp.connect(config.rabbitmq.url, {
      clientProperties: { connection_name: config.serviceName },
    });
    connection.on("error", (err) => log.error({ err: err.message }, "connection error"));
    connection.on("close", () => this.#handleClose());

    const channel = await connection.createConfirmChannel();
    channel.on("error", (err) => log.error({ err: err.message }, "publish channel error"));
    await assertTopology(channel);

    this.#connection = connection;
    this.#publishChannel = channel;
    this.#reconnectAttempt = 0;
    log.info("rabbitmq connected");

    for (const handler of this.#readyHandlers) {
      await handler(this);
    }
  }

  #handleClose() {
    this.#connection = null;
    this.#publishChannel = null;
    this.#scheduleReconnect();
  }

  #scheduleReconnect() {
    if (this.#closing || this.#reconnectTimer) return;
    const delay = Math.min(1000 * 2 ** this.#reconnectAttempt, 30000);
    this.#reconnectAttempt += 1;
    log.warn({ delay }, "rabbitmq unavailable, reconnecting");
    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = null;
      this.connect().catch((err) => log.error({ err: err.message }, "rabbitmq reconnect failed"));
    }, delay);
    this.#reconnectTimer.unref?.();
  }

  async createChannel() {
    if (!this.#connection) throw new Error("RabbitMQ is not connected");
    return this.#connection.createChannel();
  }

  async publish(exchange, routingKey, payload, options = {}) {
    if (!this.isConnected) await this.connect();
    const body = Buffer.from(JSON.stringify(payload));
    await new Promise((resolve, reject) => {
      this.#publishChannel.publish(
        exchange,
        routingKey,
        body,
        { persistent: true, contentType: "application/json", timestamp: Date.now(), ...options },
        (err) => (err ? reject(err) : resolve()),
      );
    });
  }

  async sendToQueue(queue, payload, options = {}) {
    return this.publish("", queue, payload, options);
  }

  async close() {
    this.#closing = true;
    clearTimeout(this.#reconnectTimer);
    this.#reconnectTimer = null;
    try {
      await this.#publishChannel?.close();
      await this.#connection?.close();
    } catch (err) {
      log.warn({ err: err.message }, "error while closing rabbitmq");
    }
    this.#connection = null;
    this.#publishChannel = null;
  }
}

export const rabbitmq = new RabbitConnection();

export async function pingRabbit() {
  return rabbitmq.isConnected;
}
