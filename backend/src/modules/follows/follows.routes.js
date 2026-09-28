import { Router } from "express";
import { z } from "zod";
import { validate } from "#core/http/validate.js";
import { requireAuth } from "#core/http/authenticate.js";
import { ok, created } from "#core/http/respond.js";
import { cursorQuery } from "#core/http/pagination.js";
import { idParam } from "#shared/schemas.js";
import { followsService } from "./follows.service.js";

const router = Router();
const params = idParam("id");
const listQuery = z.object({ ...cursorQuery });
const byId = validate({ params });
const withList = validate({ params, query: listQuery });

router.use(requireAuth);

router.put("/:id/follow", byId, async (req, res) => {
  created(res, await followsService.follow(req.user, req.validated.params.id));
});

router.delete("/:id/follow", byId, async (req, res) => {
  ok(res, await followsService.unfollow(req.user, req.validated.params.id));
});

router.get("/:id/followers", withList, async (req, res) => {
  ok(res, await followsService.listFollowers(req.user.id, req.validated.params.id, req.validated.query));
});

router.get("/:id/following", withList, async (req, res) => {
  ok(res, await followsService.listFollowing(req.user.id, req.validated.params.id, req.validated.query));
});

export default router;
