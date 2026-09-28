import { Router } from "express";
import { validate } from "#core/http/validate.js";
import { requireAuth } from "#core/http/authenticate.js";
import { imageUpload } from "#core/http/upload.js";
import { usersController as c } from "./users.controller.js";
import { userIdParams, usernameParams, updateProfileSchema, deleteAccountSchema } from "./users.schemas.js";

const router = Router();

const profileImages = imageUpload.fields([
  { name: "avatar", maxCount: 1 },
  { name: "cover", maxCount: 1 },
]);

router.get("/me", requireAuth, c.getMe);
router.patch("/me", requireAuth, profileImages, validate({ body: updateProfileSchema }), c.updateMe);
router.post("/me/onboarding/complete", requireAuth, c.completeOnboarding);
router.delete("/me", requireAuth, validate({ body: deleteAccountSchema }), c.deleteMe);
router.get("/by-username/:username", requireAuth, validate({ params: usernameParams }), c.getByUsername);
router.get("/:id", requireAuth, validate({ params: userIdParams }), c.getById);

export default router;
