import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../lib/queryClient";
import { getErrorMessage } from "../../lib/apiClient";
import { useToast } from "../../context/ToastContext";
import { settingsService } from "./services/settingsService";

export const DEFAULT_SETTINGS = Object.freeze({
  profileVisibility: "public",
  allowMessagesFrom: "everyone",
  emailOnLike: true,
  emailOnComment: true,
  emailOnFriendRequest: true,
  emailOnMessage: true,
  emailOnMention: true,
  theme: "system",
});

export function useSettings() {
  return useQuery({ queryKey: queryKeys.settings, queryFn: settingsService.get, staleTime: 120_000 });
}

/**
 * Every control writes a single field, so the cache is patched first and rolled back to the snapshot if
 * the request fails. Concurrent toggles each carry their own snapshot, which is why the rollback merges
 * the field it owns instead of replacing the whole object.
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (patch) => settingsService.update(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.settings });
      const previous = queryClient.getQueryData(queryKeys.settings);
      queryClient.setQueryData(queryKeys.settings, (current) => ({ ...DEFAULT_SETTINGS, ...current, ...patch }));
      const rollback = Object.fromEntries(Object.keys(patch).map((key) => [key, previous?.[key]]));
      return { rollback: previous ? rollback : null };
    },
    onSuccess: (updated) => {
      if (updated) queryClient.setQueryData(queryKeys.settings, updated);
    },
    onError: (err, _patch, context) => {
      if (context?.rollback) {
        queryClient.setQueryData(queryKeys.settings, (current) => (current ? { ...current, ...context.rollback } : current));
      }
      toast.error(getErrorMessage(err, "Couldn't save that setting"));
    },
  });
}
