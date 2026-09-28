import { apiClient, unwrap } from "../../../lib/apiClient";

export const callService = {
  history: (params) => unwrap(apiClient.get("/calls", { params })),
  iceServers: () => unwrap(apiClient.get("/calls/ice")),
  newRoom: () => unwrap(apiClient.post("/calls/room")),
};

export default callService;
