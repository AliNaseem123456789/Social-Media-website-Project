import { prisma } from "#core/db/prisma.js";
import { childLogger } from "#core/logger/index.js";
import { assistantClient } from "#shared/assistant-client.js";
import { moderationRepository } from "./moderation.repository.js";

const log = childLogger("moderation:triage");

/**
 * Puts a model's opinion of urgency on a report, so the queue can be worked most-urgent-first instead of
 * oldest-first.
 *
 * Three things this deliberately does not do:
 *
 *  - It never changes a report's status, hides content, or acts on anyone. `remove` means "a human should
 *    look at this one first". Every actual decision still goes through a moderator, which is the only
 *    version of this worth shipping: a model that removes posts by itself will eventually remove the
 *    wrong one, and nobody will be able to say why.
 *  - It never blocks the person reporting. They get their "thanks, we'll take a look" immediately; the
 *    triage happens after. Making someone wait on a model call to file a report is a good way to stop
 *    people reporting things.
 *  - It never fails a request. Anything that goes wrong leaves the report untriaged, which the queue
 *    shows as unsorted rather than as safe.
 */

const ORDER = { remove: 0, review: 1, allow: 3 };
/** Untriaged sits above `allow` but below anything a model flagged: unknown is not the same as fine. */
const UNTRIAGED_RANK = 2;

export const triageRank = (verdict) => ORDER[verdict] ?? UNTRIAGED_RANK;

/** The text a model can actually judge. A reported image or account has none, and says so. */
function subjectText(subject) {
  if (!subject) return "";
  if (subject.kind === "user") return [subject.username, subject.bio].filter(Boolean).join(" — ");
  return subject.text ?? "";
}

async function store(reportId, verdict) {
  await prisma.report.update({
    where: { id: BigInt(reportId) },
    data: {
      triageVerdict: verdict.verdict,
      triageConfidence: verdict.confidence ?? null,
      triageReason: verdict.reason ?? null,
      triageSource: verdict.source ?? null,
      triagedAt: new Date(),
    },
  });
}

/**
 * Triage one report. Safe to call and forget — it catches everything.
 */
export async function triageReport(reportId, { subjectType, subjectId, reason }) {
  if (!assistantClient.available) return null;

  try {
    const subject = await moderationRepository.subject(subjectType, subjectId);
    const text = subjectText(subject);

    if (!text.trim()) {
      // An image or an account with nothing written on it. Recording that as `review` is honest — a
      // person has to look — and stops the catch-up pass retrying it forever.
      await store(reportId, {
        verdict: "review",
        confidence: 0,
        reason: "nothing written to read; needs a person to look",
        source: "rules",
      });
      return null;
    }

    const verdict = await assistantClient.moderate({ text, reason });
    if (!verdict) return null; // service down; the catch-up pass will get it

    await store(reportId, verdict);
    log.info({ reportId, verdict: verdict.verdict, source: verdict.source }, "report triaged");
    return verdict;
  } catch (err) {
    log.warn({ reportId, err: err.message }, "could not triage a report");
    return null;
  }
}

/**
 * Triages reports filed while the assistant service was unreachable.
 *
 * Runs on the scheduler rather than as a queue consumer for the same reason as the embedding backfill:
 * `triagedAt IS NULL` already answers "what still needs doing", so one mechanism covers both the live
 * path and every report that arrived during an outage.
 */
export function startTriageBackfill({ intervalMs = 120_000, batch = 10 } = {}) {
  let running = false;

  const tick = async () => {
    if (running || !assistantClient.available) return;
    running = true;
    try {
      const pending = await prisma.report.findMany({
        where: { triagedAt: null, status: "open" },
        select: { id: true, subjectType: true, subjectId: true, reason: true },
        orderBy: { createdAt: "asc" },
        take: batch,
      });
      if (!pending.length) return;

      // In series, not in parallel: a free model quota is per-minute, and ten at once is how a backfill
      // spends the whole minute's allowance in one second and then gets nothing for the rest of it.
      for (const report of pending) {
        await triageReport(Number(report.id), {
          subjectType: report.subjectType,
          subjectId: Number(report.subjectId),
          reason: report.reason,
        });
      }
      log.info({ count: pending.length }, "triaged a batch of older reports");
    } catch (err) {
      log.warn({ err: err.message }, "triage backfill pass failed");
    } finally {
      running = false;
    }
  };

  const timer = setInterval(tick, intervalMs);
  timer.unref();
  tick();

  return () => clearInterval(timer);
}
