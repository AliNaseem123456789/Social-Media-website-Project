import apiClient from "../../../api/apiClient";

export const authService = {
  login: async (email, password) => {
    const res = await apiClient.post("/login", { email, password });
    return res.data;
  },
  googleLogin: async (credential) => {
    const res = await apiClient.post("/google", { token: credential });
    return res.data;
  },
  logout: async () => {
    const res = await apiClient.post("/logout");
    return res.data;
  },
  getCurrentUser: async () => {
    try {
      const res = await apiClient.get("/me");
      return res.data;
    } catch (error) {
      return { success: false, user: null };
    }
  },
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