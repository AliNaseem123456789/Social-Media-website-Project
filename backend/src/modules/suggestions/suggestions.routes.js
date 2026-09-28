import { Router } from "express";
import { z } from "zod";
import { validate } from "#core/http/validate.js";
import { requireAuth } from "#core/http/authenticate.js";
import { ok } from "#core/http/respond.js";
import { suggestionsService } from "./suggestions.service.js";

const router = Router();
const listQuery = z.object({ limit: z.coerce.number().int().min(1).max(30).default(10) });
const query = validate({ query: listQuery });

router.use(requireAuth);

router.get("/people", query, async (req, res) => {
  ok(res, await suggestionsService.people(req.user.id, req.validated.query));
});

router.get("/hashtags", query, async (req, res) => {
  ok(res, await suggestionsService.hashtags(req.user.id, req.validated.query));
});

export default router;
