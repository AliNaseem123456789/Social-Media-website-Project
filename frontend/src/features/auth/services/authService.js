import { apiClient, unwrap } from "../../../lib/apiClient";

export const authService = {
  register: (payload) => unwrap(apiClient.post("/auth/register", payload)),
  login: (payload) => unwrap(apiClient.post("/auth/login", payload)),
  google: (credential) => unwrap(apiClient.post("/auth/google", { credential })),
  logout: () => apiClient.post("/auth/logout"),
  logoutAll: () => unwrap(apiClient.post("/auth/logout-all")),
  me: () => unwrap(apiClient.get("/auth/me")),
  sessions: () => unwrap(apiClient.get("/auth/sessions")),
  revokeSession: (id) => apiClient.delete(`/auth/sessions/${id}`),
  changePassword: (payload) => apiClient.post("/auth/password/change", payload),
  forgotPassword: (email) => unwrap(apiClient.post("/auth/password/forgot", { email })),
  resetPassword: (payload) => apiClient.post("/auth/password/reset", payload),
  verifyEmail: (token) => unwrap(apiClient.post("/auth/email/verify", { token })),
  resendVerification: () => unwrap(apiClient.post("/auth/email/resend")),
  requestEmailChange: (payload) => unwrap(apiClient.post("/auth/email/change", payload)),
  confirmEmailChange: (token) => unwrap(apiClient.post("/auth/email/change/confirm", { token })),
};
