import { config } from "#config";
import { randomToken, sha256 } from "#shared/crypto.js";

const { refreshTtlDays, cookie } = config.auth;

export const refreshTokens = {
  issue(sessionId) {
    const secret = randomToken(48);
    return {
      token: `${sessionId}.${secret}`,
      hash: sha256(secret),
      expiresAt: new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000),
    };
  },

  parse(raw) {
    if (typeof raw !== "string") return null;
    const [sessionId, secret] = raw.split(".");
    if (!sessionId || !secret || !/^[0-9a-f-]{36}$/i.test(sessionId)) return null;
    return { sessionId, hash: sha256(secret) };
  },
};

const cookieOptions = () => ({
  httpOnly: true,
  secure: cookie.secure,
  sameSite: cookie.sameSite,
  domain: cookie.domain,
  path: cookie.path,
});

export function setRefreshCookie(res, token, expiresAt) {
  res.cookie(cookie.name, token, { ...cookieOptions(), expires: expiresAt });
}

export function clearRefreshCookie(res) {
  res.clearCookie(cookie.name, cookieOptions());
}

export function readRefreshCookie(req) {
  return req.cookies?.[cookie.name];
}

export const oneTimeTokens = {
  issue(ttlMs) {
    const token = randomToken(32);
    return { token, hash: sha256(token), expiresAt: new Date(Date.now() + ttlMs) };
  },
  hash: (token) => sha256(token),
};
