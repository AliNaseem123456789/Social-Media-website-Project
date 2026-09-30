import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  IconButton,
  InputBase,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { ArrowUp, RotateCcw, Square, X } from "lucide-react";
import AssistantAvatar from "./AssistantAvatar";
import ConfirmCard from "./ConfirmCard";
import ToolTrace from "./ToolTrace";
import VoiceButton from "./VoiceButton";
import { useAssistant } from "../AssistantContext";
import { tokens } from "../../../theme/tokens";

const STARTERS = [
  "What did I miss?",
  "Who should I follow?",
  "Draft a post about my week",
  "Summarise my unread messages",
];

export default function AssistantPanel() {
  const {
    messages,
    status,
    setStatus,
    error,
    dismissError,
    send,
    stop,
    reset,
    pendingWrite,
    confirm,
    show,
  } = useAssistant();

  const [draft, setDraft] = useState("");
  const [level, setLevel] = useState(0);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const busy = status === "thinking" || status === "speaking";

  // Only follow the stream if they are already at the bottom. Yanking the view down while someone is
  // reading an earlier answer is worse than a scrollbar that does not move.
  const pinnedRef = useRef(true);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (pinnedRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, pendingWrite]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  const submit = (text) => {
    const value = (text ?? draft).trim();
    if (!value || busy) return;
    pinnedRef.current = true;
    setDraft("");
    send(value);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        width: { xs: "100vw", sm: 392 },
        height: { xs: "100dvh", sm: 560 },
        maxHeight: { sm: "calc(100dvh - 120px)" },
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: { xs: 0, sm: `${tokens.radius.lg}px` },
        border: `1px solid ${tokens.line}`,
        boxShadow: tokens.shadow.raised,
        bgcolor: tokens.surface,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", px: 1.5, py: 1, borderBottom: `1px solid ${tokens.lineSoft}` }}
      >
        <AssistantAvatar state={status === "idle" ? "idle" : status} size={44} amplitude={level} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>
            Assistant
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.inkFaint }}>
            {status === "thinking"
              ? "Working on it"
              : status === "speaking"
                ? "Answering"
                : status === "listening"
                  ? "Listening"
                  : "Only sees what you can see"}
          </Typography>
        </Box>
        <Tooltip title="Start over">
          <IconButton size="small" onClick={reset} aria-label="Start a new conversation">
            <RotateCcw size={16} />
          </IconButton>
        </Tooltip>
        <IconButton size="small" onClick={() => show(false)} aria-label="Close the assistant">
          <X size={18} />
        </IconButton>
      </Stack>

      <Box
        ref={scrollRef}
        onScroll={onScroll}
        sx={{ flex: 1, overflowY: "auto", px: 1.5, py: 1.5, overscrollBehavior: "contain" }}
      >
        <Stack spacing={1.5}>
          {messages.map((message) =>
            message.role === "user" ? (
              <Box
                key={message.id}
                sx={{
                  alignSelf: "flex-end",
                  maxWidth: "85%",
                  px: 1.5,
                  py: 1,
                  borderRadius: `${tokens.radius.md}px`,
                  borderBottomRightRadius: 6,
                  bgcolor: tokens.ember,
                  color: tokens.onInk,
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {message.content}
                </Typography>
              </Box>
            ) : (
              <Box key={message.id} sx={{ maxWidth: "92%" }}>
                <ToolTrace tools={message.tools} />
                {message.content || !message.streaming ? (
                  <Box
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderRadius: `${tokens.radius.md}px`,
                      borderBottomLeftRadius: 6,
                      bgcolor: tokens.surfaceMuted,
                      border: `1px solid ${tokens.lineSoft}`,
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {message.content}
                      {message.streaming ? (
                        // A caret while the text arrives, so a pause between tokens does not read as a stall.
                        <Box
                          component="span"
                          sx={{
                            display: "inline-block",
                            width: "0.5em",
                            borderBottom: `2px solid ${tokens.ember}`,
                            ml: 0.25,
                            animation: "assistantBlink 1s step-end infinite",
                            "@media (prefers-reduced-motion: reduce)": { animation: "none" },
                          }}
                        />
                      ) : null}
                    </Typography>
                  </Box>
                ) : null}
              </Box>
            ),
          )}

          {pendingWrite ? <ConfirmCard write={pendingWrite} onDecide={confirm} /> : null}

          {messages.length === 1 ? (
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, pt: 0.5 }}>
              {STARTERS.map((starter) => (
                <Chip
                  key={starter}
                  label={starter}
                  size="small"
                  variant="outlined"
                  onClick={() => submit(starter)}
                  sx={{ borderColor: tokens.line, color: tokens.inkSoft }}
                />
              ))}
            </Stack>
          ) : null}
        </Stack>
      </Box>

      {error ? (
        <Alert severity="error" onClose={dismissError} sx={{ mx: 1.5, mb: 1, py: 0 }}>
          <Typography variant="caption">{error}</Typography>
        </Alert>
      ) : null}

      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          alignItems: "flex-end",
          px: 1,
          py: 1,
          borderTop: `1px solid ${tokens.lineSoft}`,
          bgcolor: tokens.surface,
        }}
      >
        <VoiceButton
          disabled={busy}
          onLevel={setLevel}
          onRecordingChange={(on) => setStatus(on ? "listening" : "idle")}
          onTranscript={(text, failure) => {
            if (failure) return;
            // The transcript goes in the box rather than straight to the model: speech recognition gets
            // names and places wrong often enough that sending it unseen is a bad trade.
            setDraft((current) => (current ? `${current} ${text}` : text));
            inputRef.current?.focus();
          }}
        />

        <InputBase
          inputRef={inputRef}
          multiline
          maxRows={5}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Ask about your feed, or tell it what to write"
          sx={{
            flex: 1,
            px: 1.25,
            py: 0.75,
            borderRadius: `${tokens.radius.md}px`,
            bgcolor: tokens.surfaceMuted,
            border: `1px solid ${tokens.lineSoft}`,
            fontSize: 14,
          }}
        />

        {busy ? (
          <Tooltip title="Stop">
            <IconButton size="small" onClick={stop} aria-label="Stop the answer">
              <Square size={15} />
            </IconButton>
          </Tooltip>
        ) : (
          <IconButton
            size="small"
            onClick={() => submit()}
            disabled={!draft.trim()}
            aria-label="Send"
            sx={{
              bgcolor: draft.trim() ? tokens.ember : "transparent",
              color: draft.trim() ? tokens.onInk : tokens.inkFaint,
              "&:hover": { bgcolor: draft.trim() ? tokens.emberDark : tokens.wash.ink },
            }}
          >
            <ArrowUp size={16} />
          </IconButton>
        )}
      </Stack>
    </Paper>
  );
}
