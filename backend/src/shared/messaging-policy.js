import { prisma } from "#core/db/prisma.js";
import { AppError } from "#core/http/errors.js";
import { settingsService } from "#modules/settings/settings.service.js";

export const MESSAGE_POLICY = Object.freeze({
  EVERYONE: "everyone",
  FOLLOWING: "following",
  FRIENDS: "friends",
  NOBODY: "nobody",
});

const REASONS = {
  [MESSAGE_POLICY.FOLLOWING]: "only accepts messages from people they follow",
  [MESSAGE_POLICY.FRIENDS]: "only accepts messages from friends",
  [MESSAGE_POLICY.NOBODY]: "is not accepting new messages",
};

async function recipientFollows(recipientId, senderId) {
  const row = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: recipientId, followingId: senderId } },
    select: { followerId: true },
  });
  return Boolean(row);
}

async function areFriends(a, b) {
  const row = await prisma.friendship.findFirst({
    where: {
      status: "accepted",
      OR: [
        { requesterId: a, recipientId: b },
        { requesterId: b, recipientId: a },
      ],
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function canMessage(senderId, recipientId) {
  if (senderId === recipientId) return true;
  const { allowMessagesFrom = MESSAGE_POLICY.EVERYONE } = await settingsService.get(recipientId);

  if (allowMessagesFrom === MESSAGE_POLICY.EVERYONE) return true;
  if (allowMessagesFrom === MESSAGE_POLICY.NOBODY) return false;
  if (allowMessagesFrom === MESSAGE_POLICY.FRIENDS) return areFriends(senderId, recipientId);
  return recipientFollows(recipientId, senderId);
}

/**
 * Gates starting a conversation, not continuing one: a thread that already exists stays open even if
 * the recipient tightens the setting afterwards.
 */
export async function assertCanMessage(senderId, recipientId) {
  if (await canMessage(senderId, recipientId)) return;
  const { allowMessagesFrom } = await settingsService.get(recipientId);
  const user = await prisma.user.findUnique({ where: { id: recipientId }, select: { username: true } });
  throw new AppError(
    403,
    "MESSAGES_NOT_ALLOWED",
    `${user?.username ?? "This account"} ${REASONS[allowMessagesFrom] ?? "is not accepting messages"}.`,
  );
}
