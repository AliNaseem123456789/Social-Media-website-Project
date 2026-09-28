import { apiClient, unwrap } from "../../../lib/apiClient";

export const settingsService = {
  get: () => unwrap(apiClient.get("/settings")),
  update: (payload) => unwrap(apiClient.patch("/settings", payload)),
};

export default settingsService;
