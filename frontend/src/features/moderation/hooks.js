import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../lib/queryClient";
import { getErrorMessage } from "../../lib/apiClient";
import { useToast } from "../../context/ToastContext";
import { useInfiniteList } from "../../hooks/useInfiniteList";
import { moderationService } from "./services/moderationService";

const BLOCK_PAGE = 20;
const REPORT_PAGE = 20;

/**
 * Blocking severs follows and friendship and hides both accounts from each other, so every cache that
 * mixes people with their content is refetched rather than patched.
 */
const TOUCHED_BY_BLOCK = [["feed"], ["posts"], ["follows"], ["friends"], ["chats"], ["suggestions"], ["users"]];

function patchProfile(queryClient, userId, patch) {
  queryClient.setQueryData(queryKeys.profile(userId), (profile) => (profile ? { ...profile, ...patch } : profile));
}

function dropFromBlockedList(queryClient, userId) {
  queryClient.setQueryData(queryKeys.blockedAccounts, (data) => {
    if (!data?.pages) return data;
    return {
      ...data,
      pages: data.pages.map((page) => ({ ...page, items: page.items.filter((person) => person.id !== userId) })),
    };
  });
}

/**
 * Block and unblock with an optimistic flip of `blockedByMe`, so the profile switches over at once and
 * the slower list refetches catch up behind it.
 */
export function useToggleBlock() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ userId, blocked }) =>
      blocked ? moderationService.unblock(userId) : moderationService.block(userId),
    onMutate: ({ userId, blocked }) => {
      patchProfile(queryClient, userId, { blockedByMe: !blocked });
    },
    onSuccess: (result, { userId, username }) => {
      patchProfile(queryClient, userId, { blockedByMe: result.blocked });
      if (!result.blocked) dropFromBlockedList(queryClient, userId);
      TOUCHED_BY_BLOCK.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      queryClient.invalidateQueries({ queryKey: queryKeys.blockedAccounts });
      const name = result.user?.username || username;
      toast.success(result.blocked ? `Blocked${name ? ` @${name}` : ""}` : `Unblocked${name ? ` @${name}` : ""}`);
    },
    onError: (err, { userId, blocked }) => {
      patchProfile(queryClient, userId, { blockedByMe: blocked });
      toast.error(getErrorMessage(err, "Couldn't update your blocked accounts"));
    },
  });
}

export function useBlockedAccounts() {
  return useInfiniteList(queryKeys.blockedAccounts, (cursor) =>
    moderationService.blocked({ cursor, limit: BLOCK_PAGE }),
  );
}

export function useReportReasons({ enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.reportReasons,
    queryFn: () => moderationService.reasons(),
    select: (data) => data?.reasons ?? [],
    staleTime: Infinity,
    enabled,
  });
}

/**
 * The server answers with the line to show the reporter, including the case where they had already
 * reported the same thing, so nothing is toasted on success and the dialog reads it instead.
 */
export function useReport() {
  const toast = useToast();
  return useMutation({
    mutationFn: (payload) => moderationService.report(payload),
    onError: (err) => toast.error(getErrorMessage(err, "Couldn't send your report")),
  });
}

export function useModeratorAccess() {
  return useQuery({
    queryKey: queryKeys.moderatorAccess,
    queryFn: () => moderationService.access(),
    select: (data) => Boolean(data?.moderator),
    staleTime: 300_000,
  });
}

export function useReports(status, verdict = "all", options = {}) {
  const list = useInfiniteList(
    queryKeys.reports(status, verdict),
    (cursor) => moderationService.reports({ status, verdict, cursor, limit: REPORT_PAGE }),
    options,
  );
  return { ...list, openCount: list.data?.pages?.[0]?.openCount ?? 0 };
}

export function useResolveReport() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ reportId, status, resolution, removeContent }) =>
      moderationService.resolve(reportId, { status, resolution, removeContent }),
    onSuccess: (report, { removeContent }) => {
      queryClient.invalidateQueries({ queryKey: ["moderation", "reports"] });
      if (removeContent) {
        queryClient.invalidateQueries({ queryKey: ["feed"] });
        queryClient.invalidateQueries({ queryKey: ["posts"] });
        queryClient.invalidateQueries({ queryKey: ["chats"] });
      }
      if (report.status === "dismissed") toast.success("Report dismissed");
      else if (report.status === "reviewing") toast.success("Marked as reviewing");
      else toast.success(removeContent ? "Content removed and report closed" : "Report closed");
    },
    onError: (err) => toast.error(getErrorMessage(err, "Couldn't update the report")),
  });
}
