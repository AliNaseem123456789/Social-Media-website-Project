import { Router } from "express";
import { z } from "zod";
import { validate } from "#core/http/validate.js";
import { requireAuth } from "#core/http/authenticate.js";
import { ok } from "#core/http/respond.js";
import { idParam } from "#shared/schemas.js";
import { shareService } from "./share.service.js";
import { renderPreviewPage } from "./share.html.js";

const router = Router();
const usernameParams = z.object({ username: z.string().trim().min(1).max(60) });
const resolveSchema = z.object({ url: z.string().trim().min(1).max(2000) });

const sendPage = (res, card) => {
  res.set("cache-control", "public, max-age=300");
  res.type("html").send(renderPreviewPage(card));
};

// Crawler-facing pages: no authentication, only what a public preview needs.
router.get("/posts/:id", validate({ params: idParam("id") }), async (req, res) => {
  sendPage(res, await shareService.postPreview(req.validated.params.id));
});

router.get("/u/:username", validate({ params: usernameParams }), async (req, res) => {
  sendPage(res, await shareService.profilePreview(req.validated.params.username));
});

// In-app preview cards for links pasted into posts and messages.
router.post("/resolve", requireAuth, validate({ body: resolveSchema }), async (req, res) => {
  ok(res, await shareService.resolve(req.body.url, req.user.id));
});

export default router;
