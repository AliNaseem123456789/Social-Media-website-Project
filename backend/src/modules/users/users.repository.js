import { prisma } from "#core/db/prisma.js";

/**
 * Writes the profile row without relying on a unique constraint on user_profiles.user_id:
 * updateMany touches every row for the user, and a row is only created when none exists.
 */
async function writeProfile(client, userId, data) {
  const { count } = await client.userProfile.updateMany({ where: { userId }, data });
  if (count === 0) await client.userProfile.create({ data: { userId, ...data } });
}

export const usersRepository = {
  async findIdByUsername(username) {
    const [row] = await prisma.$queryRaw`
      SELECT id FROM users WHERE lower(username) = lower(${username}) LIMIT 1`;
    return row ? Number(row.id) : null;
  },

  findWithProfile(id) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, email: true, password: true, createdAt: true, profile: true },
    });
  },

  async updateProfile(userId, { username, ...profile }) {
    return prisma.$transaction(async (tx) => {
      if (username) await tx.user.update({ where: { id: userId }, data: { username } });
      const data = { ...profile, ...(username ? { username } : {}), updatedAt: new Date() };
      await writeProfile(tx, userId, data);
      return tx.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, email: true, createdAt: true, profile: true },
      });
    });
  },

  completeOnboarding(userId) {
    return writeProfile(prisma, userId, { onboardingCompleted: true, updatedAt: new Date() });
  },

  deleteUser(userId) {
    return prisma.user.delete({ where: { id: userId } });
  },
};
