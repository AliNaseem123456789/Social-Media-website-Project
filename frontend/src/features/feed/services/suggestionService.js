import { apiClient, unwrap } from "../../../lib/apiClient";

export const suggestionService = {
  people: (params) => unwrap(apiClient.get("/suggestions/people", { params })),
  hashtags: (params) => unwrap(apiClient.get("/suggestions/hashtags", { params })),
};

export default suggestionService;
