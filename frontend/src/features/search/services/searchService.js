import { apiClient, unwrap } from "../../../lib/apiClient";

export const searchService = {
  search: (q, type = "all", limit = 10) => unwrap(apiClient.get("/search", { params: { q, type, limit } })),
};
