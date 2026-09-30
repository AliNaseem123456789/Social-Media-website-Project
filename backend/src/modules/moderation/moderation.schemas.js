import { z } from "zod";
import { cursorQuery } from "#core/http/pagination.js";

const id = z.coerce.number().int().positive();

export const userParams = z.object({ id });
export const reportParams = z.object({ reportId: id });

export const listQuery = z.object({ ...cursorQuery });

export const reportsQuery = z.object({
  ...cursorQuery,
  status: z.enum(["open", "reviewing", "actioned", "dismissed", "all"]).default("open"),
  // Narrows the queue to what triage flagged. "untriaged" is its own answer rather than a synonym for
  // safe: it means nothing has looked at it yet.
  verdict: z.enum(["remove", "review", "allow", "untriaged", "all"]).default("all"),
});

export const REPORT_REASONS = [
  "spam",
  "harassment",
  "hate",
  "violence",
  "nudity",
  "self_harm",
  "impersonation",
  "misinformation",
  "other",
];

export const createReportSchema = z.object({
  subjectType: z.enum(["post", "comment", "user", "message"]),
  subjectId: id,
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(1000).optional(),
});

export const resolveReportSchema = z.object({
  status: z.enum(["reviewing", "actioned", "dismissed"]),
  resolution: z.string().trim().max(500).optional(),
  removeContent: z.boolean().optional(),
});
