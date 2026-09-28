import { Router } from "express";
import { z } from "zod";
import { validate } from "#core/http/validate.js";
import { requireAuth } from "#core/http/authenticate.js";
import { ok } from "#core/http/respond.js";
import { cursorQuery } from "#core/http/pagination.js";
import { callsService } from "./calls.service.js";

const router = Router();
const historyQuery = z.object({ ...cursorQuery });

router.use(requireAuth);

router.get("/", validate({ query: historyQuery }), async (req, res) => {
  ok(res, await callsService.history(req.user.id, req.validated.query));
});

router.get("/ice", (req, res) => {
  ok(res, callsService.iceServers());
});

router.post("/room", (req, res) => {
  ok(res, { roomId: callsService.newRoomId() });
});

export default router;
