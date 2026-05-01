import apiClient from "../../../api/apiClient";

export const searchService = {
  /**
   * Search for users by username
   * @param {string} query - The search term
   * @returns {Promise<Array>} List of users matching the search
   */
  searchUsers: async (query) => {
    try {
      const response = await apiClient.get(
        `/search/users?q=${encodeURIComponent(query)}`,
      );
      return response.data;
    } catch (error) {
      console.error("Search users error:", error);
      throw error;
    }
  },

  /**
   * Search for posts by content
   * @param {string} query - The search term
   * @returns {Promise<Array>} List of posts matching the search
   */
  searchPosts: async (query) => {
    try {
      const response = await apiClient.get(
        `/search/posts?q=${encodeURIComponent(query)}`,
      );
      return response.data;
    } catch (error) {
      console.error("Search posts error:", error);
      throw error;
    }
  },

  /**
   * Combined search for both users and posts
   * @param {string} query - The search term
   * @returns {Promise<Object>} Object containing users and posts arrays
   */
  searchAll: async (query) => {
    try {
      const response = await apiClient.get(
        `/search/all?q=${encodeURIComponent(query)}`,
      );
      return response.data;
    } catch (error) {
      console.error("Combined search error:", error);
      throw error;
    }
  },

  /**
   * Send friend request
   * @param {number} fromUserId - Current user ID
   * @param {number} toUserId - Target user ID
   * @returns {Promise<Object>} Response data
   */
  sendFriendRequest: async (fromUserId, toUserId) => {
    try {
      const response = await apiClient.post("/friends/request", {
        from_user: fromUserId,
        to_user: toUserId,
      });
      return response.data;
    } catch (error) {
      console.error("Send friend request error:", error);
      throw error;
    }
  },

  /**
   * Check if users are friends
   * @param {number} userId - Current user ID
   * @param {number} targetUserId - Target user ID
   * @returns {Promise<boolean>} True if friends
   */
  checkFriendshipStatus: async (userId, targetUserId) => {
    try {
      const response = await apiClient.get(
        `/friends/status/${userId}/${targetUserId}`,
      );
      return response.data.isFriend;
    } catch (error) {
      console.error("Check friendship error:", error);
      return false;
    }
  },
};
