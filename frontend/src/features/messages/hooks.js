import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../lib/queryClient";
import { getErrorMessage } from "../../lib/apiClient";
import { SOCKET_EVENTS } from "../../lib/socketEvents";
import { useSocket } from "../../context/SocketContext";
import { useToast } from "../../context/ToastContext";
import { chatService } from "./services/chatService";
import { newRoomId } from "./lib/call";

function patchMessage(queryClient, conversationId, messageId, patch) {
  queryClient.setQueryData(queryKeys.messages(conversationId), (data) => {
    if (!data?.pages) return data;
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.map((message) => (message.id === messageId ? { ...message, ...patch } : message)),
      })),
    };
  });
}

function patchConversation(queryClient, conversationId, patch) {
  queryClient.setQueryData(queryKeys.conversations, (data) =>
    data?.items
      ? { ...data, items: data.items.map((c) => (c.id === conversationId ? { ...c, ...patch } : c)) }
      : data,
  );
}

export function useEditMessage(conversationId) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ messageId, text }) => chatService.editMessage(conversationId, messageId, text),
    onSuccess: (message) => {
      patchMessage(queryClient, conversationId, message.id, message);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
    onError: (err) => toast.error(getErrorMessage(err, "Couldn't save that edit")),
  });
}

export function useDeleteMessage(conversationId) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (messageId) => chatService.deleteMessage(conversationId, messageId),
    onSuccess: (_, messageId) => {
      patchMessage(queryClient, conversationId, messageId, { deleted: true, text: null, imageUrl: null });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
    onError: (err) => toast.error(getErrorMessage(err, "Couldn't delete that message")),
  });
}

/**
 * Read receipts are fire and forget: a failure here should never interrupt reading the thread, so it
 * stays silent and the next incoming message retries it.
 */
export function useMarkRead(conversationId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId) => chatService.markRead(conversationId, messageId),
    onSuccess: (result) => {
      patchConversation(queryClient, conversationId, { unreadCount: 0 });
      if (result?.total !== undefined) {
        queryClient.setQueryData(queryKeys.chatUnread, { total: result.total, conversations: result.conversations });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.chatUnread });
      }
    },
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload) => chatService.createGroup(payload),
    onSuccess: (conversation) => {
      queryClient.setQueryData(queryKeys.conversation(conversation.id), conversation);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
      toast.success("Group created");
    },
    onError: (err) => toast.error(getErrorMessage(err, "Couldn't create that group")),
  });
}

export function useUpdateGroup(conversationId) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload) => chatService.updateGroup(conversationId, payload),
    onSuccess: (conversation) => {
      queryClient.setQueryData(queryKeys.conversation(conversationId), conversation);
      patchConversation(queryClient, conversationId, { title: conversation.title, imageUrl: conversation.imageUrl });
      toast.success("Group updated");
    },
    onError: (err) => toast.error(getErrorMessage(err, "Couldn't update that group")),
  });
}

export function useAddMembers(conversationId) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (userIds) => chatService.addMembers(conversationId, userIds),
    onSuccess: (conversation) => {
      queryClient.setQueryData(queryKeys.conversation(conversationId), conversation);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
      toast.success("People added");
    },
    onError: (err) => toast.error(getErrorMessage(err, "Couldn't add those people")),
  });
}

/**
 * The bell flips before the request lands so the menu never lags behind the click, and the snapshot
 * puts it back if the server disagrees.
 */
export function useSetMuted(conversationId) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (muted) => chatService.mute(conversationId, muted),
    onMutate: async (muted) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.conversation(conversationId) });
      const previous = queryClient.getQueryData(queryKeys.conversation(conversationId))?.muted;
      queryClient.setQueryData(queryKeys.conversation(conversationId), (current) =>
        current ? { ...current, muted } : current,
      );
      patchConversation(queryClient, conversationId, { muted });
      return { previous };
    },
    onError: (err, _muted, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.conversation(conversationId), (current) =>
          current ? { ...current, muted: context.previous } : current,
        );
        patchConversation(queryClient, conversationId, { muted: context.previous });
      }
      toast.error(getErrorMessage(err, "Couldn't change that setting"));
    },
  });
}

/**
 * Role changes and removals stay quiet on failure: the roster dialog that owns them shows the server's
 * reason inline, next to the person it concerns.
 */
export function useSetMemberRole(conversationId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }) => chatService.setMemberRole(conversationId, userId, role),
    onSuccess: (conversation) => {
      queryClient.setQueryData(queryKeys.conversation(conversationId), conversation);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}

export function useRemoveMember(conversationId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId) => chatService.removeMember(conversationId, userId),
    onSuccess: (_result, userId) => {
      queryClient.setQueryData(queryKeys.conversation(conversationId), (current) => {
        if (!current?.members) return current;
        const members = current.members.filter((member) => member.id !== userId);
        return { ...current, members, memberCount: members.length };
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}

export function useLeaveGroup(conversationId) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  return useMutation({
    mutationFn: (userId) => chatService.removeMember(conversationId, userId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.conversation(conversationId) });
      queryClient.removeQueries({ queryKey: queryKeys.messages(conversationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
      toast.success("You left the group");
      navigate("/messages", { replace: true });
    },
    onError: (err) => toast.error(getErrorMessage(err, "Couldn't leave that group")),
  });
}

export function useStartCall() {
  const navigate = useNavigate();
  const { emit, connected } = useSocket();

  const start = useCallback(
    (peerId, video) => {
      if (!peerId) return;
      const roomId = newRoomId();
      emit(SOCKET_EVENTS.CALL_REQUEST, { to: peerId, roomId, video });
      navigate(`/call/${roomId}?peer=${peerId}&role=caller&video=${video ? 1 : 0}`);
    },
    [emit, navigate],
  );

  return { start, canCall: connected };
}
