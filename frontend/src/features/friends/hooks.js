import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { friendsService } from "./services/friendsService";
import { suggestionService } from "../feed/services/suggestionService";
import { queryKeys } from "../../lib/queryClient";
import { getErrorMessage } from "../../lib/apiClient";
import { useToast } from "../../context/ToastContext";

/**
 * People to follow, each with the reason line the server worked out. The older friend suggestion
 * endpoint answers for accounts the newer one has nothing for yet.
 */
export function usePeopleSuggestions(limit = 24) {
  const suggested = useQuery({
    queryKey: queryKeys.suggestedPeople,
    queryFn: () => suggestionService.people({ limit }),
    staleTime: 120_000,
  });

  const people = suggested.data?.items ?? [];
  const needsFallback = !suggested.isPending && (suggested.isError || people.length === 0);

  const fallback = useQuery({
    queryKey: queryKeys.friendSuggestions,
    queryFn: () => friendsService.suggestions(limit),
    enabled: needsFallback,
    staleTime: 120_000,
  });

  return {
    people: people.length > 0 ? people : fallback.data ?? [],
    isLoading: suggested.isLoading || (needsFallback && fallback.isLoading),
    isError: suggested.isError && fallback.isError,
  };
}

function useFriendMutation(mutationFn, { success, statusFor } = {}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn,
    onSuccess: (result, variables) => {
      const userId = variables?.userId;
      if (userId && statusFor) {
        queryClient.setQueryData(queryKeys.friendStatus(userId), statusFor(result, variables));
      }
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["analytics", "users"] });
      if (success) toast.success(typeof success === "function" ? success(result, variables) : success);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useSendFriendRequest() {
  return useFriendMutation(({ userId }) => friendsService.send(userId), {
    success: "Friend request sent",
    statusFor: (result) => ({ status: "outgoing", requestId: result.id }),
  });
}

export function useRespondToRequest() {
  return useFriendMutation(({ requestId, action }) => friendsService.respond(requestId, action), {
    success: (_, { action }) => (action === "accept" ? "You're now friends" : "Request declined"),
    statusFor: (result, { action }) => ({ status: action === "accept" ? "friends" : "none", requestId: action === "accept" ? result.id : null }),
  });
}

export function useCancelRequest() {
  return useFriendMutation(({ requestId }) => friendsService.cancel(requestId), {
    success: "Request cancelled",
    statusFor: () => ({ status: "none", requestId: null }),
  });
}

export function useUnfriend() {
  return useFriendMutation(({ userId }) => friendsService.unfriend(userId), {
    success: "Removed from friends",
    statusFor: () => ({ status: "none", requestId: null }),
  });
}
