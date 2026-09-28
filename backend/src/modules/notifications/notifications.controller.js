import { ok } from "#core/http/respond.js";
import { notificationsService } from "./notifications.service.js";

export const notificationsController = {
  async list(req, res) {
    ok(res, await notificationsService.list(req.user.id, req.validated.query));
  },

  async unreadCount(req, res) {
    ok(res, await notificationsService.unreadCount(req.user.id));
  },

  async markRead(req, res) {
    ok(res, await notificationsService.markRead(req.user.id, req.validated.params.id));
  },

  async markAllRead(req, res) {
    ok(res, await notificationsService.markAllRead(req.user.id));
  },
};
