import { Router } from "express";
import { z } from "zod";
import { validate } from "#core/http/validate.js";
import { requireAuth } from "#core/http/authenticate.js";
import { ok } from "#core/http/respond.js";
import { analyticsService } from "./analytics.service.js";

const router = Router();

router.use(requireAuth);

router.get("/trending", validate({ query: z.object({ limit: z.coerce.number().int().min(1).max(20).default(5) }) }), async (req, res) => {
  ok(res, await analyticsService.trending(req.validated.query.limit));
});

router.get("/users/:id", validate({ params: z.object({ id: z.coerce.number().int().positive() }) }), async (req, res) => {
  ok(res, await analyticsService.userStats(req.validated.params.id));
});

router.post("/me/refresh", async (req, res) => {
  ok(res, await analyticsService.refreshUserStats(req.user.id));
});

export default router;
