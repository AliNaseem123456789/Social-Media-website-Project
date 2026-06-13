// services/authService.js

import apiClient from "../../../api/apiClient";

export const authService = {
  // Login - NO localStorage!
  login: async (email, password) => {
    const res = await apiClient.post("/login", { email, password });
    // ✅ NO localStorage.setItem!
    return res.data;
  },

  // Google Login - NO localStorage!
  googleLogin: async (credential) => {
    const res = await apiClient.post("/google", { token: credential });
    // ✅ NO localStorage.setItem!
    return res.data;
  },

  // Logout
  logout: async () => {
    const res = await apiClient.post("/logout");
    // ✅ NO localStorage.removeItem!
    return res.data;
  },

  // Get current user from session
  getCurrentUser: async () => {
    try {
      const res = await apiClient.get("/me");
      return res.data;
    } catch (error) {
      return { success: false, user: null };
    }
  },

  // Signup
  signup: async (username, email, password) => {
    const passwordRegex = /^[A-Za-z]\w{7,14}$/;
    if (!passwordRegex.test(password)) {
      throw new Error(
        "Password must be 8–15 chars, start with a letter, only letters/numbers/_"
      );
    }
    const res = await apiClient.post("/signup", { username, email, password });
    return res.data;
  },
};