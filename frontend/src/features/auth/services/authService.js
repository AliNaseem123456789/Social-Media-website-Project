import apiClient from "../../../api/apiClient";
export const authService = {
  login: async (email, password) => {
    const res = await apiClient.post("/login", { email, password });
    if (res.data.success) {
      localStorage.setItem("user_id", res.data.user_id);
      localStorage.setItem("username", res.data.username);
    }
    return res.data;
  },
  googleLogin: async (credential) => {
    const res = await apiClient.post("/google", { token: credential });
    if (res.data.success) {
      localStorage.setItem("user_id", res.data.user_id);
      localStorage.setItem("username", res.data.username);
    }
    return res.data;
  },
  logout: () => {
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
  },
  getCurrentUser: () => {
    return {
      userId: localStorage.getItem("user_id"),
      username: localStorage.getItem("username"),
    };
  },
  signup: async (username, email, password) => {
    const passwordRegex = /^[A-Za-z]\w{7,14}$/;
    if (!passwordRegex.test(password)) {
      throw new Error(
        "Password must be 8–15 chars, start with a letter, only letters/numbers/_",
      );
    }
    const res = await apiClient.post("/signup", { username, email, password });
    return res.data;
  },
};
