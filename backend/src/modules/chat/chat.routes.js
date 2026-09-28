import { Router } from "express";
import { validate } from "#core/http/validate.js";
import { requireAuth } from "#core/http/authenticate.js";
import { singleImage } from "#core/http/upload.js";
import { chatController as c } from "./chat.controller.js";
import {
  conversationParams,
  memberParams,
  messageParams,
  messagesQuery,
  openDirectSchema,
  createGroupSchema,
  updateConversationSchema,
  addMembersSchema,
  sendMessageSchema,
  editMessageSchema,
  markReadSchema,
  muteSchema,
  memberRoleSchema,
  searchQuery,
} from "./chat.schemas.js";

const router = Router();
const image = singleImage("image");
const byConversation = validate({ params: conversationParams });

router.use(requireAuth);

router.get("/", c.list);
router.get("/unread", c.unread);
router.get("/search", validate({ query: searchQuery }), c.search);
router.post("/direct", validate({ body: openDirectSchema }), c.openDirect);
router.post("/groups", validate({ body: createGroupSchema }), c.createGroup);

router.get("/:conversationId", byConversation, c.get);
router.patch(
  "/:conversationId",
  image,
  validate({ params: conversationParams, body: updateConversationSchema }),
  c.update,
);

router.post("/:conversationId/members", validate({ params: conversationParams, body: addMembersSchema }), c.addMembers);
router.delete("/:conversationId/members/:userId", validate({ params: memberParams }), c.removeMember);
router.patch(
  "/:conversationId/members/:userId",
  validate({ params: memberParams, body: memberRoleSchema }),
  c.setMemberRole,
);
router.put("/:conversationId/mute", validate({ params: conversationParams, body: muteSchema }), c.setMuted);

router.get("/:conversationId/messages", validate({ params: conversationParams, query: messagesQuery }), c.history);
router.post(
  "/:conversationId/messages",
  image,
  validate({ params: conversationParams, body: sendMessageSchema }),
  c.send,
);
router.patch(
  "/:conversationId/messages/:messageId",
  validate({ params: messageParams, body: editMessageSchema }),
  c.editMessage,
);
router.delete("/:conversationId/messages/:messageId", validate({ params: messageParams }), c.deleteMessage);

router.post("/:conversationId/read", validate({ params: conversationParams, body: markReadSchema }), c.markRead);

export default router;
