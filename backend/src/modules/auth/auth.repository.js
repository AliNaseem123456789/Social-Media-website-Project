import { prisma } from "#core/db/prisma.js";

const userWithAuth = {
  id: true,
  username: true,
  email: true,
  password: true,
  createdAt: true,
  authState: true,
  profile: { select: { onboardingCompleted: true, profileImage: true } },
};

export const authRepository = {
  findUserByEmail(email) {
    return prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: userWithAuth,
    });
  },

  findUserById(id) {
    return prisma.user.findUnique({ where: { id }, select: userWithAuth });
  },

  createUser({ username, email, passwordHash, emailVerified = false }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { username, email, password: passwordHash } });
      const existingProfile = await tx.userProfile.count({ where: { userId: user.id } });
      if (existingProfile === 0) {
        await tx.userProfile.create({ data: { userId: user.id, onboardingCompleted: false } });
      }
      await tx.userAuthState.create({
        data: { userId: user.id, emailVerifiedAt: emailVerified ? new Date() : null },
      });
      return tx.user.findUnique({ where: { id: user.id }, select: userWithAuth });
    });
  },

  upsertAuthState(userId, data) {
    return prisma.userAuthState.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  },

  updateEmail(userId, email) {
    return prisma.user.update({ where: { id: userId }, data: { email }, select: userWithAuth });
  },

  updatePassword(userId, passwordHash) {
    return prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { password: passwordHash } }),
      prisma.userAuthState.upsert({
        where: { userId },
        create: { userId, passwordChangedAt: new Date() },
        update: { passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null },
      }),
    ]);
  },

  createSession(data) {
    return prisma.authSession.create({ data });
  },

  findSession(id) {
    return prisma.authSession.findUnique({ where: { id } });
  },

  rotateSession(id, { refreshTokenHash, previousTokenHash, expiresAt }) {
    return prisma.authSession.update({
      where: { id },
      data: { refreshTokenHash, previousTokenHash, expiresAt, lastUsedAt: new Date() },
    });
  },

  touchSession(id) {
    return prisma.authSession.update({ where: { id }, data: { lastUsedAt: new Date() } });
  },

  listActiveSessions(userId) {
    return prisma.authSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: "desc" },
      select: { id: true, userAgent: true, ipAddress: true, createdAt: true, lastUsedAt: true, expiresAt: true },
    });
  },

  async revokeSessions(where, reason) {
    const sessions = await prisma.authSession.findMany({ where: { ...where, revokedAt: null }, select: { id: true } });
    if (!sessions.length) return [];
    const ids = sessions.map((s) => s.id);
    await prisma.authSession.updateMany({
      where: { id: { in: ids } },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
    return ids;
  },

  async replaceToken({ userId, type, tokenHash, expiresAt, payload }) {
    await prisma.$transaction([
      prisma.authToken.updateMany({ where: { userId, type, usedAt: null }, data: { usedAt: new Date() } }),
      prisma.authToken.create({ data: { userId, type, tokenHash, expiresAt, payload } }),
    ]);
  },

  async consumeToken(tokenHash, type) {
    const token = await prisma.authToken.findUnique({ where: { tokenHash } });
    if (!token || token.type !== type || token.usedAt || token.expiresAt <= new Date()) return null;
    const { count } = await prisma.authToken.updateMany({
      where: { id: token.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    return count === 1 ? token : null;
  },

  audit(entry) {
    return prisma.auditLog.create({ data: entry });
  },
};
