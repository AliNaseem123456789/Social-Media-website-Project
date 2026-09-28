import { apiClient, unwrap } from "../../../lib/apiClient";

export const moderationService = {
  blocked: (params) => unwrap(apiClient.get("/moderation/blocks", { params })),
  block: (userId) => unwrap(apiClient.put(`/moderation/blocks/${userId}`)),
  unblock: (userId) => unwrap(apiClient.delete(`/moderation/blocks/${userId}`)),
  reasons: () => unwrap(apiClient.get("/moderation/reasons")),
  report: (payload) => unwrap(apiClient.post("/moderation/reports", payload)),
  reports: (params) => unwrap(apiClient.get("/moderation/reports", { params })),
  resolve: (reportId, payload) => unwrap(apiClient.patch(`/moderation/reports/${reportId}`, payload)),
  access: () => unwrap(apiClient.get("/moderation/access")),
};

export default moderationService;
