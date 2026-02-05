import apiClient from "../../../api/apiClient";

export const profileService = {
  getProfile: async (userId) => {
    const response = await apiClient.get(`/profile/${userId}`);
    return response.data.profile;
  },
  updateProfile: async (formData) => {
    // Use the formData object directly
    const response = await apiClient.post("/profile/add", formData, {
      headers: {
        "Content-Type": "multipart/form-data", // Ensure this is set
      },
    });
    return response.data;
  },

  // updateProfile: async (profileData) => {
  //   const response = await apiClient.post("/profile/add", profileData);
  //   return response.data;
  // },

  // FIXED: Using apiClient instead of raw axios
  sendFriendRequest: async (requesterId, recipientId) => {
    return await apiClient.post("/friends/request", {
      requester_id: requesterId,
      recipient_id: recipientId,
    });
  },

  // FIXED: Using apiClient instead of raw axios
  checkFriendship: async (userId) => {
    const res = await apiClient.get(`/friends/${userId}`);
    return res.data; // returns list of friends
  },
};
