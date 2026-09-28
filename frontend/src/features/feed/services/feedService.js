import { apiClient, unwrap } from "../../../lib/apiClient";

export const feedService = {
  get: (params) => unwrap(apiClient.get("/feed", { params })),
  trending: (limit = 5) => unwrap(apiClient.get("/analytics/trending", { params: { limit } })),
};
