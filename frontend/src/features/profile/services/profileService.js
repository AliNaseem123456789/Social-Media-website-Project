import { apiClient, unwrap } from "../../../lib/apiClient";

export const profileService = {
  me: () => unwrap(apiClient.get("/users/me")),
  get: (id) => unwrap(apiClient.get(`/users/${id}`)),
  byUsername: (username) => unwrap(apiClient.get(`/users/by-username/${encodeURIComponent(username)}`)),
  update: ({ avatar, cover, removeCover, ...fields }) => {
    const form = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      form.append(key, Array.isArray(value) ? value.join(", ") : String(value));
    });
    if (avatar instanceof File) form.append("avatar", avatar);
    if (cover instanceof File) form.append("cover", cover);
    if (removeCover) form.append("removeCoverImage", "true");
    return unwrap(apiClient.patch("/users/me", form));
  },
  completeOnboarding: () => apiClient.post("/users/me/onboarding/complete"),
  deleteAccount: (payload) => apiClient.delete("/users/me", { data: payload }),
  stats: (id) => unwrap(apiClient.get(`/analytics/users/${id}`)),
  refreshStats: () => unwrap(apiClient.post("/analytics/me/refresh")),
};
