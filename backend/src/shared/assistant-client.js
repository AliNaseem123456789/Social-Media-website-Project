import { config } from "#config";
import { childLogger } from "#core/logger/index.js";

const log = childLogger("assistant-client");

/**
 * Talks to the Python assistant service for the two things it is better at than this process: turning
 * text into vectors, and asking a model to judge whether something breaks the rules.
 *
 * The direction of the dependency matters. The assistant service reads user data through this API with
 * the user's own token and holds no database credentials; this process asks the assistant service for
 * model output and does all the writing itself. Nothing is duplicated, and there is exactly one place
 * where permission rules live.
 *
 * These calls are internal, so they carry a shared secret rather than a user token. Every one of them
 * is optional by design: if the service is down or not configured, the caller gets null and falls back
 * to behaviour that does not need a model. Search must never 500 because a model was unreachable.
 */

const configured = () => Boolean(config.assistant.url && config.assistant.internalSecret);

async function call(path, body) {
  if (!configured()) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.assistant.timeoutMs);

  try {
    const response = await fetch(`${config.assistant.url}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": config.assistant.internalSecret,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      log.warn({ path, status: response.status }, "assistant service refused an internal call");
      return null;
    }
    return await response.json();
  } catch (err) {
    // An abort here is the timeout firing, which reads better as "unavailable" than as an error.
    const reason = err.name === "AbortError" ? `timed out after ${config.assistant.timeoutMs}ms` : err.message;
    log.warn({ path, reason }, "assistant service unreachable");
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const assistantClient = {
  get available() {
    return configured();
  },

  /**
   * Embeds up to a batch of texts. Returns null rather than throwing when the service is unavailable,
   * and null rather than a short array if the service returns the wrong count — a misaligned batch
   * would attach every vector to the wrong post, which is worse than no vectors at all.
   */
  async embed(texts, { model } = {}) {
    if (!texts.length) return [];
    const payload = await call("/internal/embed", { texts, model });
    if (!payload?.vectors) return null;

    if (payload.vectors.length !== texts.length) {
      log.error(
        { asked: texts.length, got: payload.vectors.length },
        "embedding count did not match the batch, discarding it",
      );
      return null;
    }
    const wrong = payload.vectors.find((v) => !Array.isArray(v) || v.length !== config.assistant.embedDimensions);
    if (wrong) {
      log.error(
        { expected: config.assistant.embedDimensions, got: wrong?.length },
        "embedding dimensions did not match the column, discarding the batch",
      );
      return null;
    }
    return payload.vectors;
  },

  async embedOne(text) {
    const vectors = await this.embed([text]);
    return vectors?.[0] ?? null;
  },

  /**
   * Asks the safety model to triage a piece of text. Returns null when unavailable, which the caller
   * reads as "no opinion" and leaves the report for a human.
   */
  async moderate({ text, reason }) {
    const payload = await call("/internal/moderate", { text, reason });
    if (!payload || typeof payload.verdict !== "string") return null;
    return payload;
  },
};
