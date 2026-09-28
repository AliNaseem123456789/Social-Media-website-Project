import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { MessageSquareX } from "lucide-react";
import UserAvatar from "../../../components/ui/UserAvatar";
import EmptyState from "../../../components/ui/EmptyState";
import { useInfiniteList } from "../../../hooks/useInfiniteList";
import { queryKeys } from "../../../lib/queryClient";
import { SOCKET_EVENTS } from "../../../lib/socketEvents";
import { getErrorMessage } from "../../../lib/apiClient";
import { tokens } from "../../../theme/tokens";
import { useSocket } from "../../../context/SocketContext";
import { useToast } from "../../../context/ToastContext";
import { useAuth } from "../../auth/context/AuthContext";
import { chatService } from "../services/chatService";
import { useDeleteMessage, useEditMessage, useMarkRead, useStartCall } from "../hooks";
import ConversationAvatar from "./ConversationAvatar";
import MessageBubble from "./MessageBubble";
import MessageComposer from "./MessageComposer";
import ThreadHeader from "./ThreadHeader";

const PAGE_SIZE = 30;
const RUN_GAP_MS = 120000;
const TYPING_TIMEOUT_MS = 4000;
const TYPING_THROTTLE_MS = 2000;
const STICK_THRESHOLD_PX = 120;

const dayLabel = (value) => {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(Date.now() - 864e5);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
};

const sameDay = (a, b) => new Date(a.createdAt).toDateString() === new Date(b.createdAt).toDateString();

const sameRun = (earlier, later) =>
  Boolean(earlier) &&
  Boolean(later) &&
  earlier.from === later.from &&
  sameDay(earlier, later) &&
  new Date(later.createdAt) - new Date(earlier.createdAt) < RUN_GAP_MS;

function TypingDots() {
  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{ mt: 1.25, px: 1.5, py: 1.25, width: "fit-content", borderRadius: "18px", bgcolor: tokens.surface, border: `1px solid ${tokens.line}` }}
    >
      {[0, 1, 2].map((index) => (
        <Box key={index} sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: tokens.inkFaint, animation: `pulse-dot 1.2s ${index * 0.15}s infinite` }} />
      ))}
    </Stack>
  );
}

export default function ChatThread({ conversationId }) {
  const { user } = useAuth();
  const toast = useToast();
  const { sendMessage, emit, on, connected, setActiveConversation } = useSocket();
  const [typingIds, setTypingIds] = useState([]);
  const [sending, setSending] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState === "visible");
  const scrollRef = useRef(null);
  const typingTimers = useRef(new Map());
  const lastTypingSent = useRef(0);
  const stickToBottom = useRef(true);
  const markedUpTo = useRef(0);

  const conversation = useQuery({
    queryKey: queryKeys.conversation(conversationId),
    queryFn: () => chatService.conversation(conversationId),
  });
  const history = useInfiniteList(queryKeys.messages(conversationId), (cursor) =>
    chatService.messages(conversationId, { cursor, limit: PAGE_SIZE }),
  );
  const editMessage = useEditMessage(conversationId);
  const deleteMessage = useDeleteMessage(conversationId);
  const markRead = useMarkRead(conversationId);
  const { start: startCall, canCall } = useStartCall();

  const thread = conversation.data;
  const isGroup = thread?.type === "group";
  const memberList = thread?.members;
  const messages = useMemo(() => [...history.items].reverse(), [history.items]);
  const latestId = history.items[0]?.id;
  const markReadFor = markRead.mutate;

  useEffect(() => {
    setActiveConversation(conversationId);
    return () => setActiveConversation(null);
  }, [conversationId, setActiveConversation]);

  useEffect(() => {
    const onVisibility = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  /**
   * `on` is a no-op until the socket exists, so this re-subscribes whenever the connection comes up.
   */
  useEffect(() => {
    const timers = typingTimers.current;
    const drop = (userId) => {
      timers.delete(userId);
      setTypingIds((ids) => ids.filter((id) => id !== userId));
    };
    const off = on(SOCKET_EVENTS.TYPING, (payload) => {
      if (payload?.conversationId !== conversationId || payload.from === user.id) return;
      clearTimeout(timers.get(payload.from));
      if (!payload.isTyping) return drop(payload.from);
      setTypingIds((ids) => (ids.includes(payload.from) ? ids : [...ids, payload.from]));
      timers.set(payload.from, setTimeout(() => drop(payload.from), TYPING_TIMEOUT_MS));
    });
    return () => {
      off();
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, [on, connected, conversationId, user.id]);

  useEffect(() => {
    if (!pageVisible || typeof latestId !== "number" || latestId <= markedUpTo.current) return;
    markedUpTo.current = latestId;
    markReadFor(latestId);
  }, [latestId, pageVisible, markReadFor]);

  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (node && stickToBottom.current) node.scrollTop = node.scrollHeight;
  }, [messages.length, typingIds.length]);

  const onScroll = () => {
    const node = scrollRef.current;
    stickToBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < STICK_THRESHOLD_PX;
  };

  const loadOlder = async () => {
    const node = scrollRef.current;
    const previousHeight = node.scrollHeight;
    stickToBottom.current = false;
    await history.fetchNextPage();
    requestAnimationFrame(() => {
      node.scrollTop = node.scrollHeight - previousHeight;
    });
  };

  const notifyTyping = useCallback(
    (isTyping) => {
      const now = Date.now();
      if (isTyping && now - lastTypingSent.current < TYPING_THROTTLE_MS) return;
      lastTypingSent.current = isTyping ? now : 0;
      emit(SOCKET_EVENTS.TYPING, { conversationId, isTyping });
    },
    [emit, conversationId],
  );

  const send = async ({ text, image }) => {
    stickToBottom.current = true;
    setSending(true);
    try {
      if (image) {
        await chatService.send(conversationId, { text, image });
        if (!connected) await history.refetch();
      } else if (connected) {
        await sendMessage(conversationId, text);
      } else {
        await chatService.send(conversationId, { text });
        await history.refetch();
      }
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err, "Message not sent"));
      return false;
    } finally {
      setSending(false);
    }
  };

  /**
   * A message of mine counts as read only once the slowest other member has caught up to it, which is
   * what turns the single check into a double one.
   */
  const readUpTo = useMemo(() => {
    const others = (memberList ?? []).filter((member) => member.id !== user.id);
    if (!others.length) return 0;
    return others.reduce((lowest, member) => Math.min(lowest, member.lastReadMessageId ?? 0), Number.POSITIVE_INFINITY);
  }, [memberList, user.id]);

  const typingLabel = useMemo(() => {
    if (!typingIds.length) return "";
    if (!isGroup) return "typing...";
    const names = typingIds.map((id) => memberList?.find((member) => member.id === id)?.username).filter(Boolean);
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return "Several people are typing...";
  }, [typingIds, isGroup, memberList]);

  const statusLine = () => {
    if (typingLabel) return typingLabel;
    if (isGroup) return `${thread.memberCount} ${thread.memberCount === 1 ? "member" : "members"}`;
    return thread?.partner?.online ? "Online" : "Offline";
  };

  const statusAccent = () => {
    if (typingLabel) return tokens.ember;
    if (!isGroup && thread?.partner?.online) return tokens.signal;
    return tokens.inkFaint;
  };

  if (conversation.isError) {
    return (
      <Stack sx={{ height: "100%", minHeight: 0 }}>
        <ThreadHeader conversation={null} myId={user.id} statusLine="" canCall={false} onCall={() => {}} />
        <Box sx={{ flex: 1, display: "grid", placeItems: "center", bgcolor: tokens.paper }}>
          <EmptyState
            icon={MessageSquareX}
            title="This conversation isn't available"
            description="It may have been deleted, or you are no longer one of its members."
            action={
              <Button component={RouterLink} to="/messages" variant="outlined">
                Back to messages
              </Button>
            }
          />
        </Box>
      </Stack>
    );
  }

  return (
    <Stack sx={{ height: "100%", minHeight: 0 }}>
      <ThreadHeader
        conversation={thread}
        myId={user.id}
        statusLine={thread ? statusLine() : ""}
        statusAccent={thread ? statusAccent() : undefined}
        canCall={canCall}
        onCall={(video) => startCall(thread?.partner?.id, video)}
      />

      <Box ref={scrollRef} onScroll={onScroll} sx={{ flex: 1, overflowY: "auto", px: { xs: 1.5, sm: 3 }, py: 2, bgcolor: tokens.paper }}>
        {history.hasNextPage && (
          <Stack sx={{ alignItems: "center", mb: 1 }}>
            <Button size="small" onClick={loadOlder} disabled={history.isFetchingNextPage}>
              {history.isFetchingNextPage ? "Loading..." : "Load earlier messages"}
            </Button>
          </Stack>
        )}
        {history.isLoading && (
          <Stack sx={{ alignItems: "center", py: 6 }}>
            <CircularProgress size={22} />
          </Stack>
        )}
        {!history.isLoading && messages.length === 0 && thread && (
          <Stack sx={{ alignItems: "center", textAlign: "center", py: 8 }}>
            <ConversationAvatar conversation={thread} size={72} showPresence={false} />
            <Typography variant="h6" sx={{ mt: 1.5 }}>
              {thread.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isGroup ? "Say something to get the group started." : "Say hello to start the conversation."}
            </Typography>
          </Stack>
        )}

        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const next = messages[index + 1];
          const mine = message.from === user.id;
          const newDay = !previous || !sameDay(previous, message);
          const grouped = sameRun(message, next);
          const startsRun = !sameRun(previous, message);
          const persisted = typeof message.id === "number";

          return (
            <Fragment key={message.clientId || message.id}>
              {newDay && (
                <Typography variant="overline" sx={{ display: "block", textAlign: "center", color: tokens.inkFaint, my: 2 }}>
                  {dayLabel(message.createdAt)}
                </Typography>
              )}
              <MessageBubble
                message={message}
                mine={mine}
                grouped={grouped}
                senderName={isGroup && !mine && startsRun ? message.sender?.username : null}
                avatar={
                  isGroup && !mine ? (
                    <Box sx={{ width: 28, flexShrink: 0 }}>{!grouped && <UserAvatar user={message.sender} size={28} />}</Box>
                  ) : null
                }
                readByAll={persisted && message.id <= readUpTo}
                canModify={mine && persisted && !message.deleted && !message.pending && !message.failed}
                deleting={deleteMessage.isPending}
                onSubmitEdit={async (text) => {
                  try {
                    await editMessage.mutateAsync({ messageId: message.id, text });
                    return true;
                  } catch {
                    return false;
                  }
                }}
                onDelete={async () => {
                  try {
                    await deleteMessage.mutateAsync(message.id);
                    return true;
                  } catch {
                    return false;
                  }
                }}
              />
            </Fragment>
          );
        })}

        {typingIds.length > 0 && <TypingDots />}
      </Box>

      <MessageComposer connected={connected} sending={sending} onSend={send} onTyping={notifyTyping} />
    </Stack>
  );
}
