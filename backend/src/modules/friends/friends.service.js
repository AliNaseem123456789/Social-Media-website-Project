import { AppError } from "#core/http/errors.js";
import { eventBus } from "#core/messaging/event-bus.js";
import { EVENTS } from "#core/messaging/topology.js";
import { toUserSummary, withFollowState } from "#shared/user-summary.js";
import { assertNotBlocked, hiddenUserIds } from "#shared/blocks.js";
import { friendsRepository } from "./friends.repository.js";

function statusFor(userId, relation) {
  if (!relation || relation.status === "rejected") return { status: "none", requestId: null };
  if (relation.status === "accepted") return { status: "friends", requestId: relation.id };
  return {
    status: relation.requesterId === userId ? "outgoing" : "incoming",
    requestId: relation.id,
  };
}

export const friendsService = {
  async listFriends(userId) {
    const hidden = new Set(await hiddenUserIds(userId));
    const rows = (await friendsRepository.listFriends(userId)).filter((r) => !hidden.has(r.user.id));
    const people = await withFollowState(rows.map((r) => toUserSummary(r.user)), userId);
    return people.map((person, index) => ({ friendshipId: rows[index].friendshipId, ...person }));
  },

  friendIds(userId) {
    return friendsRepository.friendIds(userId);
  },

  async listRequests(userId, direction) {
    const rows = await friendsRepository.listRequests(userId, direction);
    const people = await withFollowState(
      rows.map((r) => toUserSummary(direction === "incoming" ? r.requester : r.recipient)),
      userId,
    );
    return rows.map((r, index) => ({ id: r.id, user: people[index] }));
  },

  async status(userId, otherId) {
    if (userId === otherId) return { status: "self", requestId: null };
    return statusFor(userId, await friendsRepository.findBetween(userId, otherId));
  },

  async sendRequest(user, recipientId) {
    if (user.id === recipientId) throw AppError.badRequest("You cannot send a friend request to yourself");
    const recipient = await friendsRepository.userExists(recipientId);
    if (!recipient) throw AppError.notFound("User");
    await assertNotBlocked(user.id, recipientId);

    const existing = await friendsRepository.findBetween(user.id, recipientId);
    if (existing?.status === "accepted") throw AppError.conflict("You are already friends", "ALREADY_FRIENDS");
    if (existing?.status === "pending") throw AppError.conflict("A friend request is already pending", "REQUEST_PENDING");

    const request = existing
      ? await friendsRepository.recreate(existing.id, user.id, recipientId)
      : await friendsRepository.create(user.id, recipientId);

    await eventBus.publish(EVENTS.FRIEND_REQUEST_SENT, {
      requestId: request.id,
      requesterId: user.id,
      requesterName: user.username,
      recipientId,
    });
    return { id: request.id, status: "outgoing" };
  },

  async respond(user, requestId, action) {
    const request = await friendsRepository.findById(requestId);
    if (!request || request.recipientId !== user.id || request.status !== "pending") {
      throw AppError.notFound("Friend request");
    }
    const status = action === "accept" ? "accepted" : "rejected";
    await friendsRepository.setStatus(requestId, status);

    if (status === "accepted") {
      await eventBus.publish(EVENTS.FRIEND_REQUEST_ACCEPTED, {
        requestId,
        requesterId: request.requesterId,
        recipientId: user.id,
        recipientName: user.username,
      });
    }
    return { id: requestId, status };
  },

  async cancel(user, requestId) {
    const request = await friendsRepository.findById(requestId);
    if (!request || request.requesterId !== user.id || request.status !== "pending") {
      throw AppError.notFound("Friend request");
    }
    await friendsRepository.delete(requestId);
  },

  async unfriend(user, otherId) {
    const relation = await friendsRepository.findBetween(user.id, otherId);
    if (!relation || relation.status !== "accepted") throw AppError.notFound("Friendship");
    await friendsRepository.delete(relation.id);
    await eventBus.publish(EVENTS.FRIEND_REMOVED, { userId: user.id, friendId: otherId });
  },

  async suggestions(userId, limit) {
    const hidden = new Set(await hiddenUserIds(userId));
    const users = (await friendsRepository.suggestions(userId, limit)).filter((u) => !hidden.has(u.id));
    return withFollowState(users.map(toUserSummary), userId);
  },
};
