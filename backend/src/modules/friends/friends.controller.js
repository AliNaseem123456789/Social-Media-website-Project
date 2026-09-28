import { ok, created, noContent } from "#core/http/respond.js";
import { friendsService } from "./friends.service.js";

export const friendsController = {
  async list(req, res) {
    ok(res, await friendsService.listFriends(req.validated.query.userId ?? req.user.id));
  },

  async requests(req, res) {
    ok(res, await friendsService.listRequests(req.user.id, req.validated.query.direction));
  },

  async suggestions(req, res) {
    ok(res, await friendsService.suggestions(req.user.id, req.validated.query.limit));
  },

  async status(req, res) {
    ok(res, await friendsService.status(req.user.id, req.validated.params.userId));
  },

  async send(req, res) {
    created(res, await friendsService.sendRequest(req.user, req.body.recipientId));
  },

  async respond(req, res) {
    ok(res, await friendsService.respond(req.user, req.validated.params.id, req.body.action));
  },

  async cancel(req, res) {
    await friendsService.cancel(req.user, req.validated.params.id);
    noContent(res);
  },

  async unfriend(req, res) {
    await friendsService.unfriend(req.user, req.validated.params.userId);
    noContent(res);
  },
};
