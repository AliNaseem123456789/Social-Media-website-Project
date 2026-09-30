import { env } from "../../../config/env";
import { refreshSession } from "../../../lib/apiClient";
import { tokenStore } from "../../../lib/tokenStore";

/**
 * Talks to the Python assistant service.
 *
 * Not through `apiClient`, and not because of laziness: axios buffers a response before handing it over,
 * so a streamed answer would arrive all at once at the end. `fetch` gives a ReadableStream, which is the
 * whole point — words appear as the model produces them.
 *
 * What is kept from apiClient is the auth behaviour. The same access token goes out, and a 401 triggers
 * exactly one refresh-and-retry through the shared `refreshSession()`, so a stream that starts just as a
 * token expires recovers instead of dropping the person's question on the floor.
 */

export const assistantEnabled = Boolean(env.assistantUrl);

function url(path) {
  return `${env.assistantUrl}${path}`;
}

function authHeaders(extra = {}) {
  const token = tokenStore.get();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

class AssistantError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function readError(response) {
  try {
    const body = await response.json();
    return body?.detail || body?.message || null;
  } catch {
    return null;
  }
}

/** One request, with a single refresh-and-retry on 401. `send` is called again after the refresh. */
async function withRetry(send) {
  let response = await send();
  if (response.status === 401) {
    try {
      await refreshSession();
    } catch {
      throw new AssistantError("Your session expired. Sign in again.", 401);
    }
    response = await send();
  }
  if (!response.ok) {
    throw new AssistantError(
      (await readError(response)) ?? "The assistant is not answering right now.",
      response.status,
    );
  }
  return response;
}

async function postJson(path, body) {
  const response = await withRetry(() =>
    fetch(url(path), {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    }),
  );
  return response.json();
}

async function postForm(path, form) {
  const response = await withRetry(() => fetch(url(path), { method: "POST", headers: authHeaders(), body: form }));
  return response.json();
}

/**
 * Streams a turn, calling `onEvent({ type, data })` as each event arrives.
 *
 * Server-sent events are framed by a blank line, and a chunk from the network can split a frame anywhere
 * — mid-line, mid-JSON, mid-multibyte-character. So the buffer is only consumed up to the last complete
 * frame, and the decoder is told the stream is not finished. Parsing each chunk as if it were whole is
 * the classic version of this bug: it works on localhost and drops tokens over a real connection.
 */
export async function streamChat({ messages, onEvent, signal }) {
  const response = await withRetry(() =>
    fetch(url("/chat"), {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ messages }),
      signal,
    }),
  );

  const reader = response.body?.getReader();
  if (!reader) throw new AssistantError("This browser cannot stream the answer.", 0);

  const decoder = new TextDecoder();
  let buffer = "";

  const flush = () => {
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      let type = "message";
      const dataLines = [];
      for (const raw of frame.split("\n")) {
        if (raw.startsWith("event:")) type = raw.slice(6).trim();
        else if (raw.startsWith("data:")) dataLines.push(raw.slice(5).trim());
      }
      if (dataLines.length) {
        try {
          onEvent({ type, data: JSON.parse(dataLines.join("\n")) });
        } catch {
          // A frame we cannot parse is one lost event, not a reason to abandon the stream.
        }
      }
      boundary = buffer.indexOf("\n\n");
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      flush();
    }
    buffer += decoder.decode();
    flush();
  } finally {
    // Cancelling on abort matters: without it the server keeps generating, and paying for, an answer
    // nobody is going to read.
    reader.cancel().catch(() => {});
  }
}

export const assistantService = {
  capabilities: () => withRetry(() => fetch(url("/capabilities"), { headers: authHeaders() })).then((r) => r.json()),

  confirm: ({ tool, args }) => postJson("/chat/confirm", { tool, arguments: args ?? {} }),

  evals: {
    latest: () => withRetry(() => fetch(url("/evals/latest"), { headers: authHeaders() })).then((r) => r.json()),
    history: () => withRetry(() => fetch(url("/evals/history"), { headers: authHeaders() })).then((r) => r.json()),
    // `full` spends roughly a day of free-tier tokens, so it is never the default.
    run: ({ full = false } = {}) => postJson(`/evals/run${full ? "?full=true" : ""}`, {}),
  },

  replies: (conversationId) => postJson("/compose/replies", { conversation_id: conversationId }),

  polish: (draft) => postJson("/compose/polish", { draft }),

  hashtags: (text, count = 4) => postJson("/compose/hashtags", { text, count }),

  transcribe: (blob, filename = "note.webm") => {
    const form = new FormData();
    form.append("file", blob, filename);
    return postForm("/media/transcribe", form);
  },

  altText: (file, { withHashtags = false } = {}) => {
    const form = new FormData();
    form.append("file", file);
    if (withHashtags) form.append("with_hashtags", "true");
    return postForm("/media/alt-text", form);
  },
};

export { AssistantError };
