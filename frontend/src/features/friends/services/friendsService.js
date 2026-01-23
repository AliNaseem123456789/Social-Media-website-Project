import apiClient from "../../../api/apiClient";

export const friendService = {
  getFriends: async (userId) => {
    const response = await apiClient.get(`/friends/${userId}`);
    return response.data;
  },

  sendRequest: async (requesterId, recipientId) => {
    const response = await apiClient.post("/friends/request", {
      requester_id: requesterId,
      recipient_id: recipientId,
    });
    return response.data;
  },
  acceptRequest: async (requestId) => {
    return await apiClient.put(`/friends/request/${requestId}/accept`);
  },

  getPendingRequests: async (userId) => {
    const response = await apiClient.get(`/friends/pending/${userId}`);
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
