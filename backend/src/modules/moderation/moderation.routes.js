import { Router } from "express";
import { validate } from "#core/http/validate.js";
import { requireAuth } from "#core/http/authenticate.js";
import { ok, created } from "#core/http/respond.js";
import { clientInfo } from "#core/http/request-context.js";
import { moderationService, isAdmin } from "./moderation.service.js";
import {
  userParams,
  reportParams,
  listQuery,
  reportsQuery,
  createReportSchema,
  resolveReportSchema,
  REPORT_REASONS,
} from "./moderation.schemas.js";

const router = Router();

router.use(requireAuth);

router.get("/blocks", validate({ query: listQuery }), async (req, res) => {
  ok(res, await moderationService.listBlocked(req.user.id, req.validated.query));
});

router.put("/blocks/:id", validate({ params: userParams }), async (req, res) => {
  created(res, await moderationService.block(req.user, req.validated.params.id, clientInfo(req)));
});

router.delete("/blocks/:id", validate({ params: userParams }), async (req, res) => {
  ok(res, await moderationService.unblock(req.user, req.validated.params.id, clientInfo(req)));
});

router.get("/reasons", (req, res) => {
  ok(res, { reasons: REPORT_REASONS });
});

router.post("/reports", validate({ body: createReportSchema }), async (req, res) => {
  created(res, await moderationService.report(req.user, req.body));
});

// Moderator queue. ADMIN_USER_IDS decides who gets in, so no column was added to the shared users table.
router.get("/reports", validate({ query: reportsQuery }), async (req, res) => {
  ok(res, await moderationService.listReports(req.user, req.validated.query));
});

router.patch("/reports/:reportId", validate({ params: reportParams, body: resolveReportSchema }), async (req, res) => {
  ok(res, await moderationService.resolveReport(req.user, req.validated.params.reportId, req.body, clientInfo(req)));
});

router.get("/access", (req, res) => {
  ok(res, { moderator: isAdmin(req.user.id) });
});

export default router;
