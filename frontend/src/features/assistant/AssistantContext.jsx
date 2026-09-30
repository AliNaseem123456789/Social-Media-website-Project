import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { assistantEnabled, assistantService, streamChat } from "./services/assistantClient";

/**
 * The assistant's conversation, and the one thing that makes it more than a chat window: it can act on
 * the interface.
 *
 * Two intents come back from the service. `navigate` moves the router. `compose` opens the post editor
 * with text already in it — which is why the seeded draft lives up here rather than in the panel: the
 * editor is mounted by AppShell, and the panel is a sibling of it. A ref-free callback registry would be
 * neater in theory; in practice AppShell reading one piece of state is fewer moving parts.
 *
 * The service is stateless, so this is where the conversation actually exists. Only the visible turns are
 * sent back on the next question, which keeps a long session from growing without bound and means a
 * reload starts clean rather than resuming something half-finished.
 */

const AssistantContext = createContext(null);

const WELCOME = {
  role: "assistant",
  content:
    "I can look through your posts, find people worth following, catch you up on what you missed, or draft something for you. What do you need?",
};

let nextId = 1;
const newId = () => `m${nextId++}`;

export function AssistantProvider({ children }) {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ ...WELCOME, id: newId() }]);
  const [status, setStatus] = useState("idle"); // idle | thinking | speaking | listening
  const [error, setError] = useState(null);
  const [pendingWrite, setPendingWrite] = useState(null);
  const [seededDraft, setSeededDraft] = useState(null);
  const [unseen, setUnseen] = useState(0);

  const abortRef = useRef(null);

  const patch = useCallback((id, changes) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === id
          ? { ...message, ...(typeof changes === "function" ? changes(message) : changes) }
          : message,
      ),
    );
  }, []);

  const runIntent = useCallback(
    (intent) => {
      if (!intent || typeof intent !== "object") return;
      if (intent.action === "navigate" && typeof intent.to === "string" && intent.to.startsWith("/")) {
        // Only in-app paths. An absolute URL arriving here would be an open redirect dressed up as a tool
        // result, and the model's output is not something to hand to the router unchecked.
        navigate(intent.to);
      }
      if (intent.action === "compose" && typeof intent.content === "string") {
        setSeededDraft({ content: intent.content, at: Date.now() });
      }
    },
    [navigate],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
  }, []);

  const send = useCallback(
    async (text) => {
      const question = text.trim();
      if (!question || status === "thinking" || status === "speaking") return;

      setError(null);
      setPendingWrite(null);

      const answerId = newId();
      // The history sent to the service is what was on screen *before* this question, plus the question.
      // Reading it from the state updater avoids sending a stale copy when someone types quickly.
      let history = [];
      setMessages((current) => {
        history = current
          .filter((m) => m.content && (m.role === "user" || m.role === "assistant"))
          .map((m) => ({ role: m.role, content: m.content }));
        return [
          ...current,
          { id: newId(), role: "user", content: question },
          { id: answerId, role: "assistant", content: "", tools: [], streaming: true },
        ];
      });

      setStatus("thinking");
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamChat({
          messages: [...history, { role: "user", content: question }],
          signal: controller.signal,
          onEvent: ({ type, data }) => {
            if (type === "token") {
              setStatus("speaking");
              patch(answerId, (m) => ({ content: m.content + data.text }));
              return;
            }
            if (type === "tool") {
              patch(answerId, (m) => {
                const tools = [...(m.tools ?? [])];
                const at = tools.findIndex((t) => t.id === data.id);
                if (at === -1) tools.push(data);
                else tools[at] = { ...tools[at], ...data };
                return { tools };
              });
              return;
            }
            if (type === "ui") {
              runIntent(data);
              return;
            }
            if (type === "confirm") {
              setPendingWrite({ ...data, messageId: answerId });
              return;
            }
            if (type === "error") {
              setError(data.message);
              patch(answerId, { streaming: false });
              return;
            }
            if (type === "done") {
              patch(answerId, { streaming: false, usage: data.usage, ms: data.ms });
            }
          },
        });
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message);
        patch(answerId, { streaming: false });
      } finally {
        abortRef.current = null;
        setStatus("idle");
        // An answer that arrived while the panel was closed is worth a badge, not a popup.
        setUnseen((n) => (open ? n : n + 1));
      }
    },
    [open, patch, runIntent, status],
  );

  const confirm = useCallback(
    async (accepted) => {
      const write = pendingWrite;
      if (!write) return;
      setPendingWrite(null);

      if (!accepted) {
        setMessages((current) => [
          ...current,
          { id: newId(), role: "assistant", content: "Left it alone." },
        ]);
        return;
      }

      try {
        const result = await assistantService.confirm({ tool: write.tool, args: write.arguments });
        setMessages((current) => [
          ...current,
          { id: newId(), role: "assistant", content: result?.text || "Done." },
        ]);
        runIntent(result?.ui);
      } catch (err) {
        setError(err.message);
      }
    },
    [pendingWrite, runIntent],
  );

  const reset = useCallback(() => {
    stop();
    setMessages([{ ...WELCOME, id: newId() }]);
    setPendingWrite(null);
    setError(null);
  }, [stop]);

  const show = useCallback((next = true) => {
    setOpen(next);
    if (next) setUnseen(0);
  }, []);

  const value = useMemo(
    () => ({
      enabled: assistantEnabled,
      open,
      show,
      messages,
      status,
      setStatus,
      error,
      dismissError: () => setError(null),
      send,
      stop,
      reset,
      pendingWrite,
      confirm,
      unseen,
      seededDraft,
      clearSeededDraft: () => setSeededDraft(null),
    }),
    [confirm, error, messages, open, pendingWrite, reset, seededDraft, send, show, status, stop, unseen],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) throw new Error("useAssistant must be used inside an AssistantProvider");
  return context;
}
