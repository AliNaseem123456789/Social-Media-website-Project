import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { env } from "../config/env";
import { tokenStore } from "../lib/tokenStore";
import { refreshSession } from "../lib/apiClient";
import { queryKeys } from "../lib/queryClient";
import { SOCKET_EVENTS } from "../lib/socketEvents";
import { useAuth } from "../features/auth/context/AuthContext";
import { useToast } from "./ToastContext";

const SocketContext = createContext(null);

function upsertMessage(queryClient, conversationId, message) {
  queryClient.setQueryData(queryKeys.messages(conversationId), (data) => {
    if (!data?.pages?.length) return data;
    const [first, ...rest] = data.pages;
    const matches = (m) => m.id === message.id || (message.clientId && m.clientId === message.clientId);
    const items = first.items.some(matches)
      ? first.items.map((m) => (matches(m) ? { ...m, ...message } : m))
      : [message, ...first.items];
    return { ...data, pages: [{ ...first, items }, ...rest] };
  });
}

function patchConversationList(queryClient, conversationId, patch) {
  queryClient.setQueryData(queryKeys.conversations, (data) => {
    if (!data?.items) return data;
    return {
      ...data,
      items: data.items.map((c) => (c.id === conversationId ? { ...c, ...patch(c) } : c)),
    };
  });
}

export function SocketProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const socketRef = useRef(null);
  const activeConversation = useRef(null);
  const [connected, setConnected] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return undefined;

    const socket = io(env.socketUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: (cb) => cb({ token: tokenStore.get() }),
      reconnectionDelayMax: 10000,
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", async (err) => {
      if (err.message === "TOKEN_EXPIRED" || err.message === "UNAUTHORIZED") {
        try {
          await refreshSession();
          socket.connect();
        } catch {
          socket.disconnect();
        }
      }
    });

    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, (notification) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      if (notification.type === "friend_request" || notification.type === "friend_accept") {
        queryClient.invalidateQueries({ queryKey: ["friends"] });
      }
      if (notification.type === "follow") {
        queryClient.invalidateQueries({ queryKey: ["follows"] });
        queryClient.invalidateQueries({ queryKey: ["users"] });
      }
      if (notification.type === "missed_call") queryClient.invalidateQueries({ queryKey: queryKeys.calls });
      toast.info(notification.content);
    });

    socket.on(SOCKET_EVENTS.NOTIFICATION_UNREAD, ({ count }) => {
      queryClient.setQueryData(queryKeys.unreadCount, { count });
    });

    socket.on(SOCKET_EVENTS.MESSAGE_NEW, (message) => {
      upsertMessage(queryClient, message.conversationId, message);
      const mine = message.from === user.id;
      const isOpen = activeConversation.current === message.conversationId;
      patchConversationList(queryClient, message.conversationId, (c) => ({
        lastMessage: message,
        lastMessageAt: message.createdAt,
        unreadCount: mine || isOpen ? c.unreadCount : (c.unreadCount ?? 0) + 1,
      }));
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
      if (!mine) {
        queryClient.invalidateQueries({ queryKey: queryKeys.chatUnread });
        if (!isOpen) toast.info(`${message.sender?.username ?? "New message"}: ${message.text ?? "Sent a photo"}`);
      }
    });

    socket.on(SOCKET_EVENTS.MESSAGE_UPDATED, (message) => {
      upsertMessage(queryClient, message.conversationId, message);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    });

    socket.on(SOCKET_EVENTS.MESSAGE_READ, ({ conversationId, userId, lastReadMessageId }) => {
      patchConversationList(queryClient, conversationId, (c) => ({
        members: (c.members ?? []).map((m) => (m.id === userId ? { ...m, lastReadMessageId } : m)),
        unreadCount: userId === user.id ? 0 : c.unreadCount,
      }));
      queryClient.setQueryData(queryKeys.conversation(conversationId), (c) =>
        c ? { ...c, members: c.members.map((m) => (m.id === userId ? { ...m, lastReadMessageId } : m)) } : c,
      );
    });

    socket.on(SOCKET_EVENTS.CONVERSATION_UPDATED, ({ conversationId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversation(conversationId) });
    });

    socket.on(SOCKET_EVENTS.CALL_REQUEST, (call) => setIncomingCall(call));
    socket.on(SOCKET_EVENTS.CALL_END, ({ roomId }) => {
      setIncomingCall((current) => (current?.roomId === roomId ? null : current));
      queryClient.invalidateQueries({ queryKey: queryKeys.calls });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [isAuthenticated, user?.id, queryClient, toast]);

  const emit = useCallback((event, payload, ack) => {
    socketRef.current?.emit(event, payload, ack);
  }, []);

  const on = useCallback((event, handler) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, []);

  const userId = user?.id;
  const sendMessage = useCallback(
    (conversationId, text) =>
      new Promise((resolve, reject) => {
        const socket = socketRef.current;
        if (!socket?.connected) return reject(new Error("offline"));
        const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const optimistic = {
          id: clientId,
          clientId,
          conversationId,
          from: userId,
          text,
          createdAt: new Date().toISOString(),
          pending: true,
        };
        upsertMessage(queryClient, conversationId, optimistic);
        socket.timeout(10000).emit(SOCKET_EVENTS.MESSAGE_SEND, { conversationId, text, clientId }, (err, ack) => {
          if (err || !ack?.ok) {
            upsertMessage(queryClient, conversationId, { ...optimistic, pending: false, failed: true });
            return reject(new Error(ack?.error || "SEND_FAILED"));
          }
          upsertMessage(queryClient, conversationId, { ...ack.message, clientId });
          resolve(ack.message);
        });
      }),
    [queryClient, userId],
  );

  const setActiveConversation = useCallback((conversationId) => {
    activeConversation.current = conversationId;
  }, []);

  const value = useMemo(
    () => ({ connected, emit, on, sendMessage, setActiveConversation, incomingCall, setIncomingCall }),
    [connected, emit, on, sendMessage, setActiveConversation, incomingCall],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error("useSocket must be used within SocketProvider");
  return context;
}
