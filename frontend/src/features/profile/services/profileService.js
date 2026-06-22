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
  uploadFiles: async (formData) => {
    const response = await apiClient.post("/profile/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
  sendFriendRequest: async (recipientId) => {
    return await apiClient.post("/friends/request", {
      recipient_id: recipientId,
    });
  },
  checkFriendship: async () => {
    const res = await apiClient.get(`/friends`);
    return res.data;
  },
};