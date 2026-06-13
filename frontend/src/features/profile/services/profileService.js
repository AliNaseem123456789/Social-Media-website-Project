// services/profileService.js - UPDATED

import apiClient from "../../../api/apiClient";

export const profileService = {
  // ✅ Get profile - still needs userId (viewing other users)
  getProfile: async (userId) => {
    const response = await apiClient.get(`/profile/${userId}`);
    return response.data.profile;
  },
  
  // ✅ Update profile - NO userId needed! Server gets from session
  updateProfile: async (formData) => {
    // ✅ No userId in body! Server gets from session cookie
    const response = await apiClient.post("/profile/add", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // ✅ Upload files - NO userId needed!
  uploadFiles: async (formData) => {
    const response = await apiClient.post("/profile/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // ⚠️ These friend-related methods should be moved to friendService
  // But for now, fix them to use session
  sendFriendRequest: async (recipientId) => {
    // ✅ NO requesterId needed! Server gets from session
    return await apiClient.post("/friends/request", {
      recipient_id: recipientId,
    });
  },

  checkFriendship: async () => {
    // ✅ NO userId needed! Server gets from session
    const res = await apiClient.get(`/friends`);
    return res.data;
  },
};