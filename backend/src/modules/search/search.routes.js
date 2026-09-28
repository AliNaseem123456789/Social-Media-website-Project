import { Router } from "express";
import { validate } from "#core/http/validate.js";
import { requireAuth } from "#core/http/authenticate.js";
import { ok } from "#core/http/respond.js";
import { searchService } from "./search.service.js";
import { searchQuery } from "./search.schemas.js";

const router = Router();

router.get("/", requireAuth, validate({ query: searchQuery }), async (req, res) => {
  ok(res, await searchService.search(req.validated.query, req.user.id));
});

export default router;
