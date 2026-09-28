import { apiClient, unwrap } from "../../../lib/apiClient";

/**
 * The post endpoints take multipart so images can travel with the text. Alt text is sent as one "alt"
 * field per image, in the same order as the files.
 */
function toFormData({ content, images, alt, removeImage }) {
  const form = new FormData();
  if (content !== undefined && content !== null) form.append("content", content);
  (images ?? []).forEach((file, index) => {
    if (!(file instanceof File)) return;
    form.append("images", file);
    form.append("alt", alt?.[index] ?? "");
  });
  if (removeImage) form.append("removeImage", "true");
  return form;
}

/**
 * Drafts go as JSON unless new files are attached: multipart cannot express "no images" or "no
 * schedule", because an empty array or a null appends nothing and the server would keep the old value.
 */
function draftPayload({ content, images, files, scheduledFor }) {
  const newFiles = (files ?? []).filter((file) => file instanceof File);
  if (!newFiles.length) {
    const body = {};
    if (content !== undefined) body.content = content ?? "";
    if (images !== undefined) body.images = images ?? [];
    if (scheduledFor !== undefined) body.scheduledFor = scheduledFor ?? null;
    return body;
  }

  const form = new FormData();
  if (content !== undefined && content !== null) form.append("content", content);
  (images ?? []).forEach((url) => form.append("images", url));
  newFiles.forEach((file) => form.append("images", file));
  if (scheduledFor) form.append("scheduledFor", scheduledFor);
  return form;
}

export const postService = {
  list: (params) => unwrap(apiClient.get("/posts", { params })),
  liked: (params) => unwrap(apiClient.get("/posts/liked", { params })),
  saved: (params) => unwrap(apiClient.get("/posts/saved", { params })),
  trendingHashtags: (params) => unwrap(apiClient.get("/posts/hashtags/trending", { params })),
  get: (id) => unwrap(apiClient.get(`/posts/${id}`)),
  createPost: (payload) => unwrap(apiClient.post("/posts", toFormData(payload))),
  update: (id, payload) => unwrap(apiClient.patch(`/posts/${id}`, toFormData(payload))),
  remove: (id) => apiClient.delete(`/posts/${id}`),
  pin: (id) => unwrap(apiClient.put(`/posts/${id}/pin`)),
  unpin: (id) => unwrap(apiClient.delete(`/posts/${id}/pin`)),
  like: (id) => unwrap(apiClient.put(`/posts/${id}/like`)),
  unlike: (id) => unwrap(apiClient.delete(`/posts/${id}/like`)),
  save: (id) => unwrap(apiClient.put(`/posts/${id}/save`)),
  unsave: (id) => unwrap(apiClient.delete(`/posts/${id}/save`)),
  repost: (id, content = "") => unwrap(apiClient.post(`/posts/${id}/repost`, { content })),
  removeRepost: (id) => unwrap(apiClient.delete(`/posts/${id}/repost`)),

  comments: (id, params) => unwrap(apiClient.get(`/posts/${id}/comments`, { params })),
  addComment: (id, payload) =>
    unwrap(apiClient.post(`/posts/${id}/comments`, typeof payload === "string" ? { text: payload } : payload)),
  updateComment: (id, commentId, text) => unwrap(apiClient.patch(`/posts/${id}/comments/${commentId}`, { text })),
  deleteComment: (id, commentId) => apiClient.delete(`/posts/${id}/comments/${commentId}`),
  likeComment: (id, commentId) => unwrap(apiClient.put(`/posts/${id}/comments/${commentId}/like`)),
  unlikeComment: (id, commentId) => unwrap(apiClient.delete(`/posts/${id}/comments/${commentId}/like`)),

  drafts: () => unwrap(apiClient.get("/posts/drafts")),
  createDraft: (payload) => unwrap(apiClient.post("/posts/drafts", draftPayload(payload))),
  updateDraft: (draftId, payload) => unwrap(apiClient.patch(`/posts/drafts/${draftId}`, draftPayload(payload))),
  deleteDraft: (draftId) => apiClient.delete(`/posts/drafts/${draftId}`),
  publishDraft: (draftId) => unwrap(apiClient.post(`/posts/drafts/${draftId}/publish`)),
};

export default postService;
