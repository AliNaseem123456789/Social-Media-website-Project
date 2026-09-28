import { Router } from "express";
import { validate } from "#core/http/validate.js";
import { requireAuth } from "#core/http/authenticate.js";
import { feedController as c } from "./feed.controller.js";
import { feedQuery } from "./feed.schemas.js";

const router = Router();

router.get("/", requireAuth, validate({ query: feedQuery }), c.get);

export default router;
