import { Router } from "express";
import { validate } from "#core/http/validate.js";
import { requireAuth } from "#core/http/authenticate.js";
import { friendsController as c } from "./friends.controller.js";
import {
  listFriendsQuery,
  listRequestsQuery,
  sendRequestSchema,
  respondSchema,
  requestParams,
  userParams,
  suggestionsQuery,
} from "./friends.schemas.js";

const router = Router();

router.use(requireAuth);

router.get("/", validate({ query: listFriendsQuery }), c.list);
router.get("/requests", validate({ query: listRequestsQuery }), c.requests);
router.post("/requests", validate({ body: sendRequestSchema }), c.send);
router.patch("/requests/:id", validate({ params: requestParams, body: respondSchema }), c.respond);
router.delete("/requests/:id", validate({ params: requestParams }), c.cancel);
router.get("/suggestions", validate({ query: suggestionsQuery }), c.suggestions);
router.get("/status/:userId", validate({ params: userParams }), c.status);
router.delete("/:userId", validate({ params: userParams }), c.unfriend);

export default router;
