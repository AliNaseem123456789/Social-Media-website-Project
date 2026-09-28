import { ok } from "#core/http/respond.js";
import { feedService } from "./feed.service.js";

export const feedController = {
  async get(req, res) {
    ok(res, await feedService.getFeed(req.user.id, req.validated.query));
  },
};
