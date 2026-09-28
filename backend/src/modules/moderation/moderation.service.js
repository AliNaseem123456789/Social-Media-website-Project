import { z } from "zod";
import { config } from "#config";
import { AppError } from "#core/http/errors.js";
import { decodeCursor, page } from "#core/http/pagination.js";
import { cache } from "#core/cache/cache.service.js";
import { cacheKeys } from "#core/cache/keys.js";
import { childLogger } from "#core/logger/index.js";
import { toUserSummary } from "#shared/user-summary.js";
import { invalidateBlocks, blockDirection } from "#shared/blocks.js";
import { audit } from "#modules/auth/audit.service.js";
import { AUDIT } from "#modules/auth/auth.constants.js";
import { moderationRepository } from "./moderation.repository.js";

const log = childLogger("moderation");
const blockCursor = z.object({ at: z.string(), id: z.number().int() });
const reportCursor = z.object({ id: z.number().int() });

export const isAdmin = (userId) => config.moderation.adminUserIds.includes(userId);

function assertAdmin(user) {
  if (!isAdmin(user.id)) throw AppError.forbidden("This area is for moderators");
}

const toReport = (row) => ({
  id: Number(row.id),
  subjectType: row.subjectType,
  subjectId: Number(row.subjectId),
  subjectUserId: row.subjectUserId,
  reason: row.reason,
  details: row.details,
  status: row.status,
  resolution: row.resolution,
  reviewedBy: row.reviewedBy,
  reviewedAt: row.reviewedAt,
  createdAt: row.createdAt,
  reporter: toUserSummary(row.reporter),
});

async function clearCachesFor(...userIds) {
  await invalidateBlocks(...userIds);
  await cache.del(
    ...userIds.flatMap((id) => [
      cacheKeys.profile(id),
      cacheKeys.userFeed(id),
      cacheKeys.suggestedPeople(id),
      cacheKeys.followCounts(id),
      cacheKeys.recentChats(id),
      cacheKeys.chatUnread(id),
    ]),
  );
  await Promise.all(userIds.map((id) => cache.delPattern(cacheKeys.userPostsPattern(id))));
}

export const moderationService = {
  async block(user, targetId, context) {
    if (user.id === targetId) throw AppError.badRequest("You cannot block yourself");
    const target = await moderationRepository.findUser(targetId);
    if (!target) throw AppError.notFound("User");

    const { created } = await moderationRepository.block(user.id, targetId);
    if (created) {
      await moderationRepository.severConnections(user.id, targetId);
      audit(AUDIT.USER_BLOCKED, { userId: user.id, context, metadata: { targetId } });
    }
    await clearCachesFor(user.id, targetId);
    return { blocked: true, user: { id: target.id, username: target.username } };
  },

  async unblock(user, targetId, context) {
    const { removed } = await moderationRepository.unblock(user.id, targetId);
    if (removed) {
      audit(AUDIT.USER_UNBLOCKED, { userId: user.id, context, metadata: { targetId } });
    }
    await clearCachesFor(user.id, targetId);
    return { blocked: false };
  },

  async listBlocked(userId, query) {
    const cursor = decodeCursor(query.cursor, blockCursor);
    const rows = await moderationRepository.listBlocked(userId, cursor, query.limit);
    const result = page(rows, query.limit, (r) => ({ at: r.createdAt.toISOString(), id: r.blockedId }));
    return {
      items: result.items.map((r) => ({ ...toUserSummary(r.blocked), blockedAt: r.createdAt })),
      pageInfo: result.pageInfo,
    };
  },

  relation(viewerId, otherId) {
    return blockDirection(viewerId, otherId);
  },

  async report(user, { subjectType, subjectId, reason, details }) {
    const subject = await moderationRepository.subject(subjectType, subjectId);
    if (!subject) throw AppError.notFound("That content");
    if (subject.ownerId === user.id) throw AppError.badRequest("You cannot report your own content");

    const { created, id } = await moderationRepository.createReport({
      reporterId: user.id,
      subjectType,
      subjectId: BigInt(subjectId),
      subjectUserId: subject.ownerId ?? null,
      reason,
      details: details || null,
    });

    if (created) log.info({ reportId: Number(id), subjectType, subjectId }, "content reported");
    return {
      reported: true,
      alreadyReported: !created,
      message: created ? "Thanks, our team will take a look." : "You already reported this.",
    };
  },

  async listReports(user, query) {
    assertAdmin(user);
    const cursor = decodeCursor(query.cursor, reportCursor);
    const rows = await moderationRepository.listReports(query, cursor, query.limit);
    const result = page(rows, query.limit, (r) => ({ id: Number(r.id) }));

    const reviewers = await moderationRepository.reviewers(
      result.items.map((row) => row.reviewedBy).filter(Boolean),
    );
    const items = await Promise.all(
      result.items.map(async (row) => ({
        ...toReport(row),
        reviewer: reviewers.get(row.reviewedBy) ?? null,
        subject: await moderationRepository.subject(row.subjectType, row.subjectId),
      })),
    );
    return { items, pageInfo: result.pageInfo, openCount: await moderationRepository.countOpen() };
  },

  /**
   * A moderator decision in one call: record the outcome and, when they chose to remove it, take the
   * content down. Removing a message leaves the tombstone the chat UI already understands.
   */
  async resolveReport(user, reportId, { status, resolution, removeContent }, context) {
    assertAdmin(user);
    const report = await moderationRepository.findReport(reportId);
    if (!report) throw AppError.notFound("Report");

    if (removeContent) {
      if (report.subjectType === "post") await moderationRepository.deletePost(report.subjectId);
      else if (report.subjectType === "comment") await moderationRepository.deleteComment(report.subjectId);
      else if (report.subjectType === "message") await moderationRepository.hideMessage(report.subjectId);
      else throw AppError.badRequest("An account cannot be removed from here");

      if (report.subjectUserId) {
        await cache.delPattern(cacheKeys.userPostsPattern(report.subjectUserId));
        await cache.delPattern(cacheKeys.globalFeedPattern());
        await cache.del(cacheKeys.post(Number(report.subjectId)));
      }
    }

    const updated = await moderationRepository.updateReport(reportId, {
      status,
      resolution: resolution || null,
      reviewedBy: user.id,
      reviewedAt: new Date(),
    });

    audit(AUDIT.REPORT_RESOLVED, {
      userId: user.id,
      context,
      metadata: { reportId: Number(reportId), status, removeContent: Boolean(removeContent) },
    });
    return toReport(updated);
  },
};
