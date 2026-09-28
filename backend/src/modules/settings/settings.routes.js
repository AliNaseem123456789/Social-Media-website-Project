import { Router } from "express";
import { validate } from "#core/http/validate.js";
import { requireAuth } from "#core/http/authenticate.js";
import { ok } from "#core/http/respond.js";
import { settingsService } from "./settings.service.js";
import { updateSettingsSchema } from "./settings.schemas.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  ok(res, await settingsService.get(req.user.id));
});

router.patch("/", validate({ body: updateSettingsSchema }), async (req, res) => {
  ok(res, await settingsService.update(req.user.id, req.body));
});

export default router;
