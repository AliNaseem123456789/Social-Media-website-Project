import { ok, noContent } from "#core/http/respond.js";
import { clientInfo } from "#core/http/request-context.js";
import { authService } from "./auth.service.js";
import { setRefreshCookie, clearRefreshCookie, readRefreshCookie } from "./token.service.js";

function sendSession(res, result, status = 200) {
  if (result.refresh) setRefreshCookie(res, result.refresh.token, result.refresh.expiresAt);
  res.status(status).json({
    success: true,
    data: { user: result.user, accessToken: result.accessToken, expiresIn: result.expiresIn },
  });
}

export const authController = {
  async register(req, res) {
    sendSession(res, await authService.register(req.body, clientInfo(req)), 201);
  },

  async login(req, res) {
    sendSession(res, await authService.login(req.body, clientInfo(req)));
  },

  async google(req, res) {
    sendSession(res, await authService.googleLogin(req.body, clientInfo(req)));
  },

  async refresh(req, res) {
    try {
      sendSession(res, await authService.refresh(readRefreshCookie(req), clientInfo(req)));
    } catch (err) {
      clearRefreshCookie(res);
      throw err;
    }
  },

  async logout(req, res) {
    await authService.logout(
      { rawToken: readRefreshCookie(req), sessionId: req.user?.sessionId, userId: req.user?.id },
      clientInfo(req),
    );
    clearRefreshCookie(res);
    noContent(res);
  },

  async logoutAll(req, res) {
    const revoked = await authService.logoutAll(req.user.id, clientInfo(req));
    clearRefreshCookie(res);
    ok(res, { revoked });
  },

  async me(req, res) {
    ok(res, await authService.me(req.user.id));
  },

  async sessions(req, res) {
    ok(res, await authService.listSessions(req.user.id, req.user.sessionId));
  },

  async revokeSession(req, res) {
    await authService.revokeSession(req.user.id, req.validated.params.id, clientInfo(req));
    noContent(res);
  },

  async changePassword(req, res) {
    await authService.changePassword(req.user.id, req.user.sessionId, req.body, clientInfo(req));
    noContent(res);
  },

  async forgotPassword(req, res) {
    await authService.forgotPassword(req.body, clientInfo(req));
    ok(res, { message: "If an account exists for this email, a reset link has been sent" }, 202);
  },

  async resetPassword(req, res) {
    await authService.resetPassword(req.body, clientInfo(req));
    clearRefreshCookie(res);
    noContent(res);
  },

  async verifyEmail(req, res) {
    await authService.verifyEmail(req.body, clientInfo(req));
    ok(res, { verified: true });
  },

  async requestEmailChange(req, res) {
    ok(res, await authService.requestEmailChange(req.user.id, req.body, clientInfo(req)), 202);
  },

  async confirmEmailChange(req, res) {
    ok(res, await authService.confirmEmailChange(req.body, req.user?.sessionId, clientInfo(req)));
  },

  async resendVerification(req, res) {
    await authService.resendVerification(req.user.id, clientInfo(req));
    ok(res, { message: "Verification email sent" }, 202);
  },
};
