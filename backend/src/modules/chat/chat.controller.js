import { ok, created, noContent } from "#core/http/respond.js";
import { chatService } from "./chat.service.js";

const params = (req) => req.validated.params;
const query = (req) => req.validated.query;

export const chatController = {
  async list(req, res) {
    ok(res, await chatService.listConversations(req.user.id));
  },

  async unread(req, res) {
    ok(res, await chatService.unreadTotal(req.user.id));
  },

  async search(req, res) {
    ok(res, await chatService.search(req.user.id, query(req)));
  },

  async openDirect(req, res) {
    ok(res, await chatService.openDirect(req.user, req.body.userId));
  },

  async createGroup(req, res) {
    created(res, await chatService.createGroup(req.user, req.body));
  },

  async get(req, res) {
    ok(res, await chatService.get(req.user.id, params(req).conversationId));
  },

  async update(req, res) {
    ok(res, await chatService.update(req.user, params(req).conversationId, req.body, req.file));
  },

  async addMembers(req, res) {
    ok(res, await chatService.addMembers(req.user, params(req).conversationId, req.body));
  },

  async removeMember(req, res) {
    await chatService.removeMember(req.user, params(req).conversationId, params(req).userId);
    noContent(res);
  },

  async history(req, res) {
    ok(res, await chatService.history(req.user.id, params(req).conversationId, query(req)));
  },

  async send(req, res) {
    created(res, await chatService.send(req.user, params(req).conversationId, req.body, req.file));
  },

  async editMessage(req, res) {
    ok(res, await chatService.editMessage(req.user, params(req).conversationId, params(req).messageId, req.body));
  },

  async deleteMessage(req, res) {
    await chatService.deleteMessage(req.user, params(req).conversationId, params(req).messageId);
    noContent(res);
  },

  async setMuted(req, res) {
    ok(res, await chatService.setMuted(req.user, params(req).conversationId, req.body.muted));
  },

  async setMemberRole(req, res) {
    ok(res, await chatService.setMemberRole(req.user, params(req).conversationId, params(req).userId, req.body.role));
  },

  async markRead(req, res) {
    ok(res, await chatService.markRead(req.user, params(req).conversationId, req.body));
  },
};
