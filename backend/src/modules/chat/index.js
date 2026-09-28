import router from "./chat.routes.js";
import { registerChatSocket } from "./chat.socket.js";

export default {
  name: "chat",
  basePath: "/chats",
  router,
  socket: registerChatSocket,
};
