import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../lib/queryClient";
import { getErrorMessage } from "../../lib/apiClient";
import { useToast } from "../../context/ToastContext";
import { followService } from "./services/followService";
import { profileService } from "./services/profileService";

const asUserId = (value) => (/^\d+$/.test(String(value ?? "")) && Number(value) > 0 ? Number(value) : null);

/**
 * Mentions link to /u/<username> while the rest of the app links to /u/<id>, so a route param can be
 * either. A username is resolved first and its result seeds the id keyed entry, which is the copy every
 * other screen and the optimistic follow updates read from.
 */
export function useProfileByParam(param) {
  const directId = asUserId(param);
  const username = directId || !param ? null : String(param);

  const lookup = useQuery({
    queryKey: queryKeys.profileByUsername(username),
    queryFn: () => profileService.byUsername(username),
    enabled: Boolean(username),
  });

  const id = directId ?? lookup.data?.id ?? null;

  const profile = useQuery({
    queryKey: queryKeys.profile(id),
    queryFn: () => profileService.get(id),
    enabled: Boolean(id),
    initialData: directId ? undefined : lookup.data,
  });

  return {
    id,
    data: profile.data,
    isLoading: lookup.isLoading || profile.isLoading,
    isError: lookup.isError || profile.isError,
  };
}

function patchProfile(queryClient, userId, patch) {
  queryClient.setQueryData(queryKeys.profile(userId), (profile) => (profile ? { ...profile, ...patch } : profile));
}

function patchLists(queryClient, userId, followedByMe) {
  const apply = (data) => {
    if (!data?.pages) return data;
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.map((person) => (person.id === userId ? { ...person, followedByMe } : person)),
      })),
    };
  };
  queryClient.setQueriesData({ queryKey: ["follows"] }, apply);
  queryClient.setQueryData(queryKeys.suggestedPeople, (data) =>
    data?.items ? { ...data, items: data.items.map((p) => (p.id === userId ? { ...p, followedByMe } : p)) } : data,
  );
}

/**
 * Follow and unfollow with an optimistic flip, so the button never waits on the round trip.
 */
export function useToggleFollow() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ userId, following }) =>
      following ? followService.unfollow(userId) : followService.follow(userId),
    onMutate: ({ userId, following }) => {
      patchProfile(queryClient, userId, { followedByMe: !following });
      patchLists(queryClient, userId, !following);
    },
    onSuccess: (result, { userId }) => {
      patchProfile(queryClient, userId, {
        followedByMe: result.following,
        followerCount: result.followerCount,
      });
      queryClient.invalidateQueries({ queryKey: ["follows"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.suggestedPeople });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (err, { userId, following }) => {
      patchProfile(queryClient, userId, { followedByMe: following });
      patchLists(queryClient, userId, following);
      toast.error(getErrorMessage(err, "Couldn't update who you follow"));
    },
  });
}
