import apiClient from "../../../api/apiClient";

export const friendService = {
  getFriends: async () => {
    const response = await apiClient.get(`/friends`);
    return response.data;
  },
  sendRequest: async (recipientId) => {
    const response = await apiClient.post("/friends/request", {
      recipient_id: recipientId,
    });
    return response.data;
  },
  acceptRequest: async (requestId) => {
    return await apiClient.put(`/friends/request/${requestId}/accept`);
  },
  getPendingRequests: async () => {
    const response = await apiClient.get(`/friends/pending`);
    return response.data;
  },
  respondToRequest: async (friendshipId, status) => {
    const response = await apiClient.post("/friends/respond", {
      friendship_id: friendshipId,
      status: status,
    });
    return response.data;
  },
};