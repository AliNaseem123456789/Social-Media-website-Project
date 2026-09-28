export const AUDIT = Object.freeze({
  REGISTER: "auth.register",
  LOGIN: "auth.login",
  LOGIN_FAILED: "auth.login_failed",
  LOGIN_LOCKED: "auth.login_locked",
  GOOGLE_LOGIN: "auth.google_login",
  LOGOUT: "auth.logout",
  LOGOUT_ALL: "auth.logout_all",
  REFRESH: "auth.refresh",
  REFRESH_REUSE: "auth.refresh_token_reuse",
  SESSION_REVOKED: "auth.session_revoked",
  PASSWORD_CHANGED: "auth.password_changed",
  PASSWORD_RESET_REQUESTED: "auth.password_reset_requested",
  PASSWORD_RESET: "auth.password_reset",
  EMAIL_VERIFICATION_SENT: "auth.email_verification_sent",
  EMAIL_VERIFIED: "auth.email_verified",
  EMAIL_CHANGE_REQUESTED: "auth.email_change_requested",
  EMAIL_CHANGED: "auth.email_changed",
  ACCOUNT_DELETED: "account.deleted",
  USER_BLOCKED: "moderation.user_blocked",
  USER_UNBLOCKED: "moderation.user_unblocked",
  REPORT_RESOLVED: "moderation.report_resolved",
});

export const TOKEN_TYPES = Object.freeze({
  EMAIL_VERIFICATION: "email_verification",
  PASSWORD_RESET: "password_reset",
  EMAIL_CHANGE: "email_change",
});

export const REFRESH_REUSE_GRACE_MS = 30_000;
