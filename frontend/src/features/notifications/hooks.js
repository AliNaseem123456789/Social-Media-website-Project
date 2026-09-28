import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../lib/queryClient";
import { notificationService } from "./services/notificationService";

export function useUnreadCount(enabled = true) {
  return useQuery({ queryKey: queryKeys.unreadCount, queryFn: notificationService.unreadCount, enabled, refetchInterval: 120_000 });
}

function markLocal(queryClient, predicate) {
  queryClient.setQueriesData({ queryKey: ["notifications"] }, (data) => {
    if (!data?.pages) return data;
    return { ...data, pages: data.pages.map((p) => ({ ...p, items: p.items.map((n) => (predicate(n) ? { ...n, read: true } : n)) })) };
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => notificationService.markRead(id),
    onMutate: (id) => markLocal(queryClient, (n) => n.id === id),
    onSuccess: (result) => queryClient.setQueryData(queryKeys.unreadCount, result),
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationService.markAllRead,
    onMutate: () => markLocal(queryClient, () => true),
    onSuccess: (result) => queryClient.setQueryData(queryKeys.unreadCount, result),
  });
}
