// services/friendService.js - UPDATED FOR SESSION AUTH

import apiClient from "../../../api/apiClient";

export const friendService = {
  // ✅ CHANGED: No longer needs userId parameter
  // Server gets current user ID from session
  getFriends: async () => {
    // ❌ OLD: `/friends/${userId}`
    // ✅ NEW: `/friends` (no parameter)
    const response = await apiClient.get(`/friends`);
    return response.data;
  },

  // ✅ CHANGED: No longer needs requesterId parameter
  // Server gets requester ID from session
  sendRequest: async (recipientId) => {
    // ❌ OLD: { requester_id: requesterId, recipient_id: recipientId }
    // ✅ NEW: { recipient_id: recipientId } only
    const response = await apiClient.post("/friends/request", {
      recipient_id: recipientId,
    });
    return response.data;
  },

  // ✅ This is fine - requestId is the friend request ID
  acceptRequest: async (requestId) => {
    return await apiClient.put(`/friends/request/${requestId}/accept`);
  },

  // ✅ CHANGED: No longer needs userId parameter
  getPendingRequests: async () => {
    // ❌ OLD: `/friends/pending/${userId}`
    // ✅ NEW: `/friends/pending` (no parameter)
    const response = await apiClient.get(`/friends/pending`);
    return response.data;
  },

  // ✅ This is fine - uses friendshipId and status from body
  respondToRequest: async (friendshipId, status) => {
    const response = await apiClient.post("/friends/respond", {
      friendship_id: friendshipId,
      status: status,
    });
    return response.data;
  },
};