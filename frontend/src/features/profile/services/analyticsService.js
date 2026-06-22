import apiClient from "../../../api/apiClient";
export const analyticsService = {
  getMyAnalytics: async () => {
    try {
      const response = await apiClient.get("/analytics/me");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch my analytics:", error);
      throw error;
    }
  },

getUserAnalytics: async (userId) => {
    try {
      const response = await apiClient.get(`/analytics/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch analytics for user ${userId}:`, error);
      throw error;
    }
  },

  // Refresh analytics (force recalculate)
  refreshAnalytics: async () => {
    try {
      const response = await apiClient.post("/analytics/refresh");
      return response.data;
    } catch (error) {
      console.error("Failed to refresh analytics:", error);
      throw error;
    }
  },

  // Get admin dashboard (admin only)
  getAdminDashboard: async () => {
    try {
      const response = await apiClient.get("/analytics/admin");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch admin dashboard:", error);
      throw error;
    }
  },

  // Get trending posts
  getTrending: async () => {
    try {
      const response = await apiClient.get("/analytics/trending");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch trending:", error);
      throw error;
    }
  }
};