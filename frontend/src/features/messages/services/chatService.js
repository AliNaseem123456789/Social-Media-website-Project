import { apiClient, unwrap } from "../../../lib/apiClient";

export const chatService = {
  conversations: () => unwrap(apiClient.get("/chats")),
  conversation: (conversationId) => unwrap(apiClient.get(`/chats/${conversationId}`)),
  unread: () => unwrap(apiClient.get("/chats/unread")),
  openDirect: (userId) => unwrap(apiClient.post("/chats/direct", { userId })),
  createGroup: (payload) => unwrap(apiClient.post("/chats/groups", payload)),
  updateGroup: (conversationId, { title, image, removeImage }) => {
    const form = new FormData();
    if (title !== undefined) form.append("title", title);
    if (image instanceof File) form.append("image", image);
    if (removeImage) form.append("removeImage", "true");
    return unwrap(apiClient.patch(`/chats/${conversationId}`, form));
  },
  addMembers: (conversationId, userIds) => unwrap(apiClient.post(`/chats/${conversationId}/members`, { userIds })),
  removeMember: (conversationId, userId) => apiClient.delete(`/chats/${conversationId}/members/${userId}`),
  setMemberRole: (conversationId, userId, role) =>
    unwrap(apiClient.patch(`/chats/${conversationId}/members/${userId}`, { role })),
  mute: (conversationId, muted) => unwrap(apiClient.put(`/chats/${conversationId}/mute`, { muted })),

  messages: (conversationId, params) => unwrap(apiClient.get(`/chats/${conversationId}/messages`, { params })),
  send: (conversationId, { text, image, clientId }) => {
    if (!(image instanceof File)) {
      return unwrap(apiClient.post(`/chats/${conversationId}/messages`, { text, clientId }));
    }
    const form = new FormData();
    if (text) form.append("text", text);
    if (clientId) form.append("clientId", clientId);
    form.append("image", image);
    return unwrap(apiClient.post(`/chats/${conversationId}/messages`, form));
  },
  editMessage: (conversationId, messageId, text) =>
    unwrap(apiClient.patch(`/chats/${conversationId}/messages/${messageId}`, { text })),
  deleteMessage: (conversationId, messageId) => apiClient.delete(`/chats/${conversationId}/messages/${messageId}`),
  markRead: (conversationId, messageId) => unwrap(apiClient.post(`/chats/${conversationId}/read`, { messageId })),
  search: (params) => unwrap(apiClient.get("/chats/search", { params })),
};

export default chatService;
