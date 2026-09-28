import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import { config } from "#config";
import { AppError } from "#core/http/errors.js";
import { signAccessToken, markSessionsRevoked } from "#core/auth/jwt.js";
import { cache } from "#core/cache/cache.service.js";
import { cacheKeys } from "#core/cache/keys.js";
import { eventBus } from "#core/messaging/event-bus.js";
import { EVENTS, EMAIL_TYPES } from "#core/messaging/topology.js";
import { storage, buckets } from "#core/storage/index.js";
import { authRepository } from "./auth.repository.js";
import { refreshTokens, oneTimeTokens } from "./token.service.js";
import { audit } from "./audit.service.js";
import { AUDIT, TOKEN_TYPES, REFRESH_REUSE_GRACE_MS } from "./auth.constants.js";

const { auth } = config;
const googleClient = auth.googleClientId ? new OAuth2Client(auth.googleClientId) : null;
let dummyHash;
const getDummyHash = async () => (dummyHash ??= await bcrypt.hash(randomUUID(), auth.bcryptRounds));

const isEmailVerified = (user) => Boolean(user.authState?.emailVerifiedAt);

function toAuthUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
    emailVerified: isEmailVerified(user),
    hasPassword: Boolean(user.password),
    onboardingCompleted: user.profile?.onboardingCompleted ?? false,
    avatarUrl: storage.resolveUrl(buckets.avatars, user.profile?.profileImage),
  };
}

async function startSession(user, context) {
  const sessionId = randomUUID();
  const refresh = refreshTokens.issue(sessionId);
  const session = await authRepository.createSession({
    id: sessionId,
    userId: user.id,
    refreshTokenHash: refresh.hash,
    userAgent: context.userAgent,
    ipAddress: context.ipAddress,
    expiresAt: refresh.expiresAt,
  });

  return {
    user: toAuthUser(user),
    accessToken: signAccessToken({
      userId: user.id,
      sessionId: session.id,
      username: user.username,
      emailVerified: isEmailVerified(user),
    }),
    expiresIn: auth.accessTtlSeconds,
    refresh,
  };
}

async function sendVerificationEmail(user, context) {
  const issued = oneTimeTokens.issue(auth.emailVerificationTtlHours * 60 * 60 * 1000);
  await authRepository.replaceToken({
    userId: user.id,
    type: TOKEN_TYPES.EMAIL_VERIFICATION,
    tokenHash: issued.hash,
    expiresAt: issued.expiresAt,
  });
  await eventBus.sendEmail(EMAIL_TYPES.VERIFY_EMAIL, user.email, {
    name: user.username,
    verificationUrl: `${config.appUrl}/verify-email?token=${issued.token}`,
    expiresInHours: auth.emailVerificationTtlHours,
  });
  audit(AUDIT.EMAIL_VERIFICATION_SENT, { userId: user.id, context });
}

async function revokeAll(userId, reason, exceptSessionId) {
  const where = { userId, ...(exceptSessionId ? { NOT: { id: exceptSessionId } } : {}) };
  const ids = await authRepository.revokeSessions(where, reason);
  await markSessionsRevoked(ids);
  return ids.length;
}

export const authService = {
  async register({ username, email, password }, context) {
    const existing = await authRepository.findUserByEmail(email);
    if (existing) throw AppError.conflict("An account with this email already exists", "EMAIL_TAKEN");

    const passwordHash = await bcrypt.hash(password, auth.bcryptRounds);
    const user = await authRepository.createUser({ username, email, passwordHash });

    audit(AUDIT.REGISTER, { userId: user.id, context });
    await eventBus.publish(EVENTS.USER_REGISTERED, { userId: user.id, username: user.username });
    await sendVerificationEmail(user, context);

    return startSession(user, context);
  },

  async login({ email, password }, context) {
    const user = await authRepository.findUserByEmail(email);

    if (!user) {
      await bcrypt.compare(password, await getDummyHash());
      audit(AUDIT.LOGIN_FAILED, { status: "failure", context, metadata: { reason: "unknown_email" } });
      throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
    }

    const lockedUntil = user.authState?.lockedUntil;
    if (lockedUntil && lockedUntil > new Date()) {
      audit(AUDIT.LOGIN_LOCKED, { userId: user.id, status: "failure", context });
      throw new AppError(
        423,
        "ACCOUNT_LOCKED",
        `Too many failed attempts. Try again after ${lockedUntil.toISOString()}`,
      );
    }

    if (!user.password) {
      throw AppError.unauthorized("This account uses Google sign-in", "USE_GOOGLE_LOGIN");
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const failed = (user.authState?.failedLoginCount ?? 0) + 1;
      const lock = failed >= auth.maxFailedLogins;
      await authRepository.upsertAuthState(user.id, {
        failedLoginCount: lock ? 0 : failed,
        lockedUntil: lock ? new Date(Date.now() + auth.lockoutMinutes * 60 * 1000) : null,
      });
      audit(AUDIT.LOGIN_FAILED, {
        userId: user.id,
        status: "failure",
        context,
        metadata: { reason: "bad_password", locked: lock },
      });
      throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
    }

    if (auth.requireEmailVerification && !isEmailVerified(user)) {
      throw new AppError(403, "EMAIL_NOT_VERIFIED", "Please verify your email address before signing in");
    }

    await authRepository.upsertAuthState(user.id, {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    });
    audit(AUDIT.LOGIN, { userId: user.id, context });
    return startSession(user, context);
  },

  async googleLogin({ credential }, context) {
    if (!googleClient) throw new AppError(503, "GOOGLE_DISABLED", "Google sign-in is not configured");

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: auth.googleClientId });
      payload = ticket.getPayload();
    } catch {
      throw AppError.unauthorized("Google sign-in failed", "GOOGLE_TOKEN_INVALID");
    }
    if (!payload?.email || !payload.email_verified) {
      throw AppError.unauthorized("Google account email is not verified", "GOOGLE_EMAIL_UNVERIFIED");
    }

    let user = await authRepository.findUserByEmail(payload.email);
    let isNew = false;
    if (!user) {
      user = await authRepository.createUser({
        username: (payload.name || payload.email.split("@")[0]).slice(0, 30),
        email: payload.email.toLowerCase(),
        passwordHash: null,
        emailVerified: true,
      });
      isNew = true;
      await eventBus.publish(EVENTS.USER_REGISTERED, { userId: user.id, username: user.username, provider: "google" });
      await eventBus.sendEmail(EMAIL_TYPES.WELCOME, user.email, {
        name: user.username,
        profileUrl: `${config.appUrl}/onboarding`,
      });
    } else if (!isEmailVerified(user)) {
      await authRepository.upsertAuthState(user.id, { emailVerifiedAt: new Date() });
      user = await authRepository.findUserById(user.id);
    }

    await authRepository.upsertAuthState(user.id, { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null });
    audit(AUDIT.GOOGLE_LOGIN, { userId: user.id, context, metadata: { isNew } });
    return startSession(user, context);
  },

  async refresh(rawToken, context) {
    const parsed = refreshTokens.parse(rawToken);
    if (!parsed) throw AppError.unauthorized("Refresh token missing or malformed", "REFRESH_INVALID");

    const session = await authRepository.findSession(parsed.sessionId);
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw AppError.unauthorized("Session expired, please sign in again", "REFRESH_INVALID");
    }

    const user = await authRepository.findUserById(session.userId);
    if (!user) throw AppError.unauthorized("Session expired, please sign in again", "REFRESH_INVALID");

    const accessFor = () =>
      signAccessToken({
        userId: user.id,
        sessionId: session.id,
        username: user.username,
        emailVerified: isEmailVerified(user),
      });

    if (parsed.hash === session.refreshTokenHash) {
      const next = refreshTokens.issue(session.id);
      await authRepository.rotateSession(session.id, {
        refreshTokenHash: next.hash,
        previousTokenHash: session.refreshTokenHash,
        expiresAt: next.expiresAt,
      });
      return { user: toAuthUser(user), accessToken: accessFor(), expiresIn: auth.accessTtlSeconds, refresh: next };
    }

    const withinGrace = Date.now() - session.lastUsedAt.getTime() < REFRESH_REUSE_GRACE_MS;
    if (parsed.hash === session.previousTokenHash && withinGrace) {
      return { user: toAuthUser(user), accessToken: accessFor(), expiresIn: auth.accessTtlSeconds, refresh: null };
    }

    const revoked = await authRepository.revokeSessions({ id: session.id }, "refresh_token_reuse");
    await markSessionsRevoked(revoked);
    audit(AUDIT.REFRESH_REUSE, { userId: user.id, status: "failure", context, metadata: { sessionId: session.id } });
    throw AppError.unauthorized("Session is no longer valid, please sign in again", "REFRESH_REUSED");
  },

  async logout({ rawToken, sessionId, userId }, context) {
    const id = sessionId || refreshTokens.parse(rawToken)?.sessionId;
    if (!id) return;
    const where = userId ? { id, userId } : { id };
    const revoked = await authRepository.revokeSessions(where, "logout");
    await markSessionsRevoked(revoked);
    if (revoked.length) audit(AUDIT.LOGOUT, { userId, context, metadata: { sessionId: id } });
  },

  async logoutAll(userId, context) {
    const count = await revokeAll(userId, "logout_all");
    audit(AUDIT.LOGOUT_ALL, { userId, context, metadata: { sessions: count } });
    return count;
  },

  async me(userId) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw AppError.notFound("User");
    return toAuthUser(user);
  },

  async listSessions(userId, currentSessionId) {
    const sessions = await authRepository.listActiveSessions(userId);
    return sessions.map((s) => ({ ...s, current: s.id === currentSessionId }));
  },

  async revokeSession(userId, sessionId, context) {
    const revoked = await authRepository.revokeSessions({ id: sessionId, userId }, "revoked_by_user");
    if (!revoked.length) throw AppError.notFound("Session");
    await markSessionsRevoked(revoked);
    audit(AUDIT.SESSION_REVOKED, { userId, context, metadata: { sessionId } });
  },

  async changePassword(userId, currentSessionId, { currentPassword, newPassword }, context) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw AppError.notFound("User");

    if (user.password) {
      if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
        audit(AUDIT.PASSWORD_CHANGED, { userId, status: "failure", context, metadata: { reason: "bad_password" } });
        throw AppError.badRequest("Current password is incorrect");
      }
    }

    await authRepository.updatePassword(userId, await bcrypt.hash(newPassword, auth.bcryptRounds));
    const revoked = await revokeAll(userId, "password_changed", currentSessionId);
    audit(AUDIT.PASSWORD_CHANGED, { userId, context, metadata: { revokedSessions: revoked } });
    await eventBus.sendEmail(EMAIL_TYPES.PASSWORD_CHANGED, user.email, { name: user.username });
    await cache.del(cacheKeys.userMe(userId));
  },

  /**
   * Two steps on purpose: the password proves it is really them, and the confirmation link goes to the
   * new address so an address nobody controls can never take over the account. The old address is told
   * either way, and every other session is signed out once the change lands.
   */
  async requestEmailChange(userId, { email, password }, context) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw AppError.notFound("User");
    if (user.email.toLowerCase() === email.toLowerCase()) {
      throw AppError.badRequest("That is already your email address");
    }
    if (user.password) {
      if (!password || !(await bcrypt.compare(password, user.password))) {
        audit(AUDIT.EMAIL_CHANGE_REQUESTED, { userId, status: "failure", context, metadata: { reason: "bad_password" } });
        throw AppError.badRequest("Your password is incorrect");
      }
    }

    const taken = await authRepository.findUserByEmail(email);
    if (taken && taken.id !== userId) throw AppError.conflict("That email is already in use", "EMAIL_TAKEN");

    const issued = oneTimeTokens.issue(auth.emailVerificationTtlHours * 60 * 60 * 1000);
    await authRepository.replaceToken({
      userId,
      type: TOKEN_TYPES.EMAIL_CHANGE,
      tokenHash: issued.hash,
      expiresAt: issued.expiresAt,
      payload: { email },
    });

    await eventBus.sendEmail(EMAIL_TYPES.VERIFY_EMAIL, email, {
      name: user.username,
      verificationUrl: `${config.appUrl}/verify-email?token=${issued.token}&change=1`,
      expiresInHours: auth.emailVerificationTtlHours,
    });
    await eventBus.sendEmail(EMAIL_TYPES.EMAIL_CHANGED, user.email, {
      name: user.username,
      newEmail: email,
      pending: true,
      supportUrl: `${config.appUrl}/settings`,
    });

    audit(AUDIT.EMAIL_CHANGE_REQUESTED, { userId, context, metadata: { to: email } });
    return { pendingEmail: email, expiresInHours: auth.emailVerificationTtlHours };
  },

  async confirmEmailChange({ token }, currentSessionId, context) {
    const record = await authRepository.consumeToken(oneTimeTokens.hash(token), TOKEN_TYPES.EMAIL_CHANGE);
    if (!record) throw AppError.badRequest("This link is invalid or has expired");

    const nextEmail = record.payload?.email;
    if (!nextEmail) throw AppError.badRequest("This link is no longer usable");

    const taken = await authRepository.findUserByEmail(nextEmail);
    if (taken && taken.id !== record.userId) throw AppError.conflict("That email is already in use", "EMAIL_TAKEN");

    const previous = await authRepository.findUserById(record.userId);
    const user = await authRepository.updateEmail(record.userId, nextEmail);
    await authRepository.upsertAuthState(record.userId, { emailVerifiedAt: new Date() });
    const revoked = await revokeAll(record.userId, "email_changed", currentSessionId);
    await cache.del(cacheKeys.userMe(record.userId));

    if (previous?.email) {
      await eventBus.sendEmail(EMAIL_TYPES.EMAIL_CHANGED, previous.email, {
        name: user.username,
        newEmail: nextEmail,
        pending: false,
        supportUrl: `${config.appUrl}/forgot-password`,
      });
    }
    audit(AUDIT.EMAIL_CHANGED, { userId: record.userId, context, metadata: { revokedSessions: revoked } });
    return { email: nextEmail };
  },

  async forgotPassword({ email }, context) {
    const user = await authRepository.findUserByEmail(email);
    audit(AUDIT.PASSWORD_RESET_REQUESTED, { userId: user?.id, context, metadata: { found: Boolean(user) } });
    if (!user) return;

    const issued = oneTimeTokens.issue(auth.passwordResetTtlMinutes * 60 * 1000);
    await authRepository.replaceToken({
      userId: user.id,
      type: TOKEN_TYPES.PASSWORD_RESET,
      tokenHash: issued.hash,
      expiresAt: issued.expiresAt,
    });
    await eventBus.sendEmail(EMAIL_TYPES.PASSWORD_RESET, user.email, {
      name: user.username,
      resetUrl: `${config.appUrl}/reset-password?token=${issued.token}`,
      expiresInMinutes: auth.passwordResetTtlMinutes,
    });
  },

  async resetPassword({ token, password }, context) {
    const record = await authRepository.consumeToken(oneTimeTokens.hash(token), TOKEN_TYPES.PASSWORD_RESET);
    if (!record) throw AppError.badRequest("This reset link is invalid or has expired");

    await authRepository.updatePassword(record.userId, await bcrypt.hash(password, auth.bcryptRounds));
    await authRepository.upsertAuthState(record.userId, { emailVerifiedAt: new Date() });
    const revoked = await revokeAll(record.userId, "password_reset");
    audit(AUDIT.PASSWORD_RESET, { userId: record.userId, context, metadata: { revokedSessions: revoked } });

    const user = await authRepository.findUserById(record.userId);
    if (user) await eventBus.sendEmail(EMAIL_TYPES.PASSWORD_CHANGED, user.email, { name: user.username });
  },

  async verifyEmail({ token }, context) {
    const record = await authRepository.consumeToken(oneTimeTokens.hash(token), TOKEN_TYPES.EMAIL_VERIFICATION);
    if (!record) throw AppError.badRequest("This verification link is invalid or has expired");

    await authRepository.upsertAuthState(record.userId, { emailVerifiedAt: new Date() });
    await cache.del(cacheKeys.userMe(record.userId));
    audit(AUDIT.EMAIL_VERIFIED, { userId: record.userId, context });

    const user = await authRepository.findUserById(record.userId);
    if (user) {
      await eventBus.publish(EVENTS.USER_VERIFIED, { userId: user.id });
      await eventBus.sendEmail(EMAIL_TYPES.WELCOME, user.email, {
        name: user.username,
        profileUrl: `${config.appUrl}/onboarding`,
      });
    }
  },

  async resendVerification(userId, context) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw AppError.notFound("User");
    if (isEmailVerified(user)) throw AppError.badRequest("Email is already verified");
    await sendVerificationEmail(user, context);
  },
};
