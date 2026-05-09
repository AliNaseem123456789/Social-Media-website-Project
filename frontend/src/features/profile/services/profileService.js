import apiClient from "../../../api/apiClient";

export const profileService = {
  getProfile: async (userId) => {
    const response = await apiClient.get(`/profile/${userId}`);
    return response.data.profile;
  },
  updateProfile: async (formData) => {
    const response = await apiClient.post("/profile/add", formData, {
      headers: {
        "Content-Type": "multipart/form-data", 
      },
    });
    return response.data;
  },

  // updateProfile: async (profileData) => {
  //   const response = await apiClient.post("/profile/add", profileData);
  //   return response.data;
  // },

  sendFriendRequest: async (requesterId, recipientId) => {
    return await apiClient.post("/friends/request", {
      requester_id: requesterId,
      recipient_id: recipientId,
    });
  },

  checkFriendship: async (userId) => {
    const res = await apiClient.get(`/friends/${userId}`);
    return res.data; 
  },
};
