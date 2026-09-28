import { apiClient, unwrap } from "../../../lib/apiClient";

export const friendsService = {
  list: (userId) => unwrap(apiClient.get("/friends", { params: userId ? { userId } : {} })),
  requests: (direction = "incoming") => unwrap(apiClient.get("/friends/requests", { params: { direction } })),
  suggestions: (limit = 8) => unwrap(apiClient.get("/friends/suggestions", { params: { limit } })),
  status: (userId) => unwrap(apiClient.get(`/friends/status/${userId}`)),
  send: (recipientId) => unwrap(apiClient.post("/friends/requests", { recipientId })),
  respond: (requestId, action) => unwrap(apiClient.patch(`/friends/requests/${requestId}`, { action })),
  cancel: (requestId) => apiClient.delete(`/friends/requests/${requestId}`),
  unfriend: (userId) => apiClient.delete(`/friends/${userId}`),
};
