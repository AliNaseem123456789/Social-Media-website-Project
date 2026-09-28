import { ok, noContent } from "#core/http/respond.js";
import { markSessionsRevoked } from "#core/auth/jwt.js";
import { usersService } from "./users.service.js";

export const usersController = {
  async getMe(req, res) {
    ok(res, await usersService.getProfile(req.user.id, req.user.id));
  },

  async getById(req, res) {
    ok(res, await usersService.getProfile(req.validated.params.id, req.user?.id));
  },

  async getByUsername(req, res) {
    ok(res, await usersService.getProfileByUsername(req.validated.params.username, req.user?.id));
  },

  async updateMe(req, res) {
    ok(res, await usersService.updateProfile(req.user.id, req.body, req.files));
  },

  async completeOnboarding(req, res) {
    await usersService.completeOnboarding(req.user.id);
    noContent(res);
  },

  async deleteMe(req, res) {
    await usersService.deleteAccount(req.user.id, req.body);
    await markSessionsRevoked([req.user.sessionId]);
    noContent(res);
  },
};
