import { apiClient, unwrap } from "../../../lib/apiClient";

export const notificationService = {
  list: (params) => unwrap(apiClient.get("/notifications", { params })),
  unreadCount: () => unwrap(apiClient.get("/notifications/unread-count")),
  markRead: (id) => unwrap(apiClient.patch(`/notifications/${id}/read`)),
  markAllRead: () => unwrap(apiClient.post("/notifications/read-all")),
};
