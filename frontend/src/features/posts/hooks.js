import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { postService } from "./services/postService";
import {
  dropFromSaved,
  prependPost,
  removePostEverywhere,
  updatePostEverywhere,
} from "../../lib/postCache";
import { getErrorMessage } from "../../lib/apiClient";
import { queryKeys } from "../../lib/queryClient";
import { useToast } from "../../context/ToastContext";

function mapPages(data, fn) {
  if (!data?.pages) return data;
  return { ...data, pages: data.pages.map((page) => ({ ...page, items: fn(page.items) })) };
}

function appendToPages(data, comment) {
  if (!data?.pages?.length) return data;
  const pages = [...data.pages];
  const last = pages[pages.length - 1];
  pages[pages.length - 1] = { ...last, items: [...last.items, comment] };
  return { ...data, pages };
}

/**
 * A comment can be cached twice: in the top level list, where it carries a preview of its replies, and
 * in its own reply page once a thread is expanded. Both hang off the same key prefix, so one pass keeps
 * the two copies identical.
 */
function patchComment(queryClient, postId, commentId, updater) {
  const apply = (comment) => {
    const next = comment.id === commentId ? { ...comment, ...updater(comment) } : comment;
    if (!next.replies?.length) return next;
    return { ...next, replies: next.replies.map(apply) };
  };
  queryClient.setQueriesData({ queryKey: queryKeys.comments(postId) }, (data) =>
    mapPages(data, (items) => items.map(apply)),
  );
}

function dropComment(queryClient, postId, commentId) {
  const strip = (items) =>
    items
      .filter((comment) => comment.id !== commentId)
      .map((comment) =>
        comment.replies?.length
          ? { ...comment, replies: comment.replies.filter((reply) => reply.id !== commentId) }
          : comment,
      );
  queryClient.setQueriesData({ queryKey: queryKeys.comments(postId) }, (data) => mapPages(data, strip));
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload) => postService.createPost(payload),
    onSuccess: (post) => {
      prependPost(queryClient, post);
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      toast.success("Posted");
    },
    onError: (err) => toast.error(getErrorMessage(err, "Couldn't publish your post")),
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, ...payload }) => postService.update(id, payload),
    onSuccess: (post) => {
      updatePostEverywhere(queryClient, post.id, () => post);
      toast.success("Post updated");
    },
    onError: (err) => toast.error(getErrorMessage(err, "Couldn't update the post")),
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id) => postService.remove(id),
    onSuccess: (_, id) => {
      removePostEverywhere(queryClient, id);
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      toast.success("Post deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err, "Couldn't delete the post")),
  });
}

export function useToggleLike() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, liked }) => (liked ? postService.unlike(id) : postService.like(id)),
    onMutate: ({ id, liked }) => {
      updatePostEverywhere(queryClient, id, (p) => ({
        likedByMe: !liked,
        likeCount: Math.max(0, p.likeCount + (liked ? -1 : 1)),
      }));
    },
    onSuccess: (result, { id }) => {
      updatePostEverywhere(queryClient, id, () => ({ likedByMe: result.liked, likeCount: result.likeCount }));
    },
    onError: (err, { id, liked }) => {
      updatePostEverywhere(queryClient, id, (p) => ({
        likedByMe: liked,
        likeCount: Math.max(0, p.likeCount + (liked ? 1 : -1)),
      }));
      toast.error(getErrorMessage(err));
    },
  });
}

export function useTogglePin() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, pinned }) => (pinned ? postService.unpin(id) : postService.pin(id)),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["posts", "list"] });
      updatePostEverywhere(queryClient, result.id, () => ({ isPinned: result.isPinned }));
      toast.success(result.isPinned ? "Pinned to your profile" : "Unpinned");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

/**
 * Pass `fromSaved` from the saved list so unsaving takes the card out of that page instead of leaving a
 * row the server would no longer return.
 */
export function useToggleSave() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, saved }) => (saved ? postService.unsave(id) : postService.save(id)),
    onMutate: ({ id, saved }) => {
      updatePostEverywhere(queryClient, id, (p) => ({
        savedByMe: !saved,
        saveCount: Math.max(0, (p.saveCount ?? 0) + (saved ? -1 : 1)),
      }));
    },
    onSuccess: (result, { id, fromSaved }) => {
      updatePostEverywhere(queryClient, id, () => ({ savedByMe: result.saved, saveCount: result.saveCount }));
      if (fromSaved && !result.saved) dropFromSaved(queryClient, id);
      else queryClient.invalidateQueries({ queryKey: queryKeys.savedPosts });
      toast.success(result.saved ? "Saved" : "Removed from saved");
    },
    onError: (err, { id, saved }) => {
      updatePostEverywhere(queryClient, id, (p) => ({
        savedByMe: saved,
        saveCount: Math.max(0, (p.saveCount ?? 0) + (saved ? 1 : -1)),
      }));
      toast.error(getErrorMessage(err, "Couldn't update your saved posts"));
    },
  });
}

/**
 * Reposting creates a post of its own, optionally with a quote, so the new card is prepended to the
 * feeds while the original keeps the count. Removing one deletes a post the client never held an id
 * for, which is why the lists are refetched instead of patched.
 */
export function useToggleRepost() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, reposted, content }) =>
      reposted ? postService.removeRepost(id) : postService.repost(id, content ?? ""),
    onSuccess: (result, { id, reposted }) => {
      if (reposted) {
        updatePostEverywhere(queryClient, id, () => ({ repostedByMe: false, repostCount: result.repostCount }));
        queryClient.invalidateQueries({ queryKey: ["feed"] });
        queryClient.invalidateQueries({ queryKey: ["posts", "list"] });
        toast.success("Repost removed");
        return;
      }
      prependPost(queryClient, result);
      const targets = new Set([id, result.repostOf?.id].filter(Boolean));
      targets.forEach((target) =>
        updatePostEverywhere(queryClient, target, (p) => ({
          repostedByMe: true,
          repostCount: (p.repostCount ?? 0) + 1,
        })),
      );
      toast.success(result.content ? "Shared with your comment" : "Shared to your feed");
    },
    onError: (err) => toast.error(getErrorMessage(err, "Couldn't share that post")),
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ postId, text, parentId }) => postService.addComment(postId, { text, parentId }),
    onSuccess: (comment, { postId, parentId }) => {
      if (parentId) {
        patchComment(queryClient, postId, parentId, (c) => ({
          replyCount: (c.replyCount ?? 0) + 1,
          replies: [...(c.replies ?? []), comment],
        }));
        queryClient.setQueryData(queryKeys.commentReplies(postId, parentId), (data) =>
          appendToPages(data, comment),
        );
      } else {
        queryClient.setQueryData(queryKeys.comments(postId), (data) => appendToPages(data, comment));
      }
      updatePostEverywhere(queryClient, postId, (p) => ({ commentCount: (p.commentCount ?? 0) + 1 }));
    },
    onError: (err) => toast.error(getErrorMessage(err, "Couldn't add your comment")),
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ postId, commentId, text }) => postService.updateComment(postId, commentId, text),
    onSuccess: (comment, { postId, commentId }) => {
      patchComment(queryClient, postId, commentId, () => comment);
      toast.success("Comment updated");
    },
    onError: (err) => toast.error(getErrorMessage(err, "Couldn't save your edit")),
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ postId, commentId }) => postService.deleteComment(postId, commentId),
    onSuccess: (_, { postId, commentId, parentId }) => {
      dropComment(queryClient, postId, commentId);
      if (parentId) {
        patchComment(queryClient, postId, parentId, (c) => ({ replyCount: Math.max(0, (c.replyCount ?? 0) - 1) }));
      }
      updatePostEverywhere(queryClient, postId, (p) => ({ commentCount: Math.max(0, (p.commentCount ?? 0) - 1) }));
      toast.success("Comment deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err, "Couldn't delete the comment")),
  });
}

export function useToggleCommentLike() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ postId, commentId, liked }) =>
      liked ? postService.unlikeComment(postId, commentId) : postService.likeComment(postId, commentId),
    onMutate: ({ postId, commentId, liked }) => {
      patchComment(queryClient, postId, commentId, (c) => ({
        likedByMe: !liked,
        likeCount: Math.max(0, (c.likeCount ?? 0) + (liked ? -1 : 1)),
      }));
    },
    onSuccess: (result, { postId, commentId }) => {
      patchComment(queryClient, postId, commentId, () => ({
        likedByMe: result.liked,
        likeCount: result.likeCount,
      }));
    },
    onError: (err, { postId, commentId, liked }) => {
      patchComment(queryClient, postId, commentId, (c) => ({
        likedByMe: liked,
        likeCount: Math.max(0, (c.likeCount ?? 0) + (liked ? 1 : -1)),
      }));
      toast.error(getErrorMessage(err));
    },
  });
}

export function useDrafts(options = {}) {
  return useQuery({
    queryKey: queryKeys.drafts,
    queryFn: () => postService.drafts(),
    select: (data) => data?.items ?? [],
    ...options,
  });
}

export function useCreateDraft() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload) => postService.createDraft(payload),
    onSuccess: (draft) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drafts });
      toast.success(draft.scheduledFor ? "Post scheduled" : "Draft saved");
    },
    onError: (err) => toast.error(getErrorMessage(err, "Couldn't save your draft")),
  });
}

export function useUpdateDraft() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, ...payload }) => postService.updateDraft(id, payload),
    onSuccess: (draft) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drafts });
      toast.success(draft.scheduledFor ? "Schedule updated" : "Draft updated");
    },
    onError: (err) => toast.error(getErrorMessage(err, "Couldn't save your draft")),
  });
}

export function useDeleteDraft() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id) => postService.deleteDraft(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(queryKeys.drafts, (data) =>
        data?.items ? { ...data, items: data.items.filter((draft) => draft.id !== id) } : data,
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.drafts });
      toast.success("Draft deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err, "Couldn't delete the draft")),
  });
}

export function usePublishDraft() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id) => postService.publishDraft(id),
    onSuccess: (post) => {
      prependPost(queryClient, post);
      queryClient.invalidateQueries({ queryKey: queryKeys.drafts });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      toast.success("Posted");
    },
    onError: (err) => toast.error(getErrorMessage(err, "Couldn't publish the draft")),
  });
}

/**
 * One query for the trending tags so the sidebar and the hashtag page share a single cache entry.
 */
export function useTrendingHashtags() {
  return useQuery({
    queryKey: queryKeys.trendingTags,
    queryFn: () => postService.trendingHashtags({ days: 7, limit: 20 }),
    select: (data) => data?.items ?? [],
    staleTime: 120_000,
  });
}
