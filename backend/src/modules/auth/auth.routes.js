import { Router } from "express";
import { validate } from "#core/http/validate.js";
import { requireAuth } from "#core/http/authenticate.js";
import { rateLimiters } from "#core/http/rate-limit.js";
import { noStore } from "#core/http/security.js";
import { authController as c } from "./auth.controller.js";
import {
  registerSchema,
  loginSchema,
  googleSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  requestEmailChangeSchema,
  confirmEmailChangeSchema,
  sessionParams,
} from "./auth.schemas.js";

const router = Router();

router.use(noStore);

router.post("/register", rateLimiters.auth, validate({ body: registerSchema }), c.register);
router.post("/login", rateLimiters.login, validate({ body: loginSchema }), c.login);
router.post("/google", rateLimiters.auth, validate({ body: googleSchema }), c.google);
router.post("/refresh", rateLimiters.auth, c.refresh);
router.post("/logout", c.logout);
router.post("/logout-all", requireAuth, c.logoutAll);

router.get("/me", requireAuth, c.me);
router.get("/sessions", requireAuth, c.sessions);
router.delete("/sessions/:id", requireAuth, validate({ params: sessionParams }), c.revokeSession);

router.post("/password/change", requireAuth, rateLimiters.sensitive, validate({ body: changePasswordSchema }), c.changePassword);
router.post("/password/forgot", rateLimiters.sensitive, validate({ body: forgotPasswordSchema }), c.forgotPassword);
router.post("/password/reset", rateLimiters.sensitive, validate({ body: resetPasswordSchema }), c.resetPassword);

router.post("/email/verify", rateLimiters.auth, validate({ body: verifyEmailSchema }), c.verifyEmail);
router.post("/email/resend", requireAuth, rateLimiters.sensitive, c.resendVerification);
router.post(
  "/email/change",
  requireAuth,
  rateLimiters.sensitive,
  validate({ body: requestEmailChangeSchema }),
  c.requestEmailChange,
);
router.post(
  "/email/change/confirm",
  rateLimiters.auth,
  validate({ body: confirmEmailChangeSchema }),
  c.confirmEmailChange,
);

export default router;
