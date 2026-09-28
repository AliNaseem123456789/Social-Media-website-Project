import router from "./calls.routes.js";
import { registerCallsSocket } from "./calls.socket.js";

export default {
  name: "calls",
  basePath: "/calls",
  router,
  socket: registerCallsSocket,
};
