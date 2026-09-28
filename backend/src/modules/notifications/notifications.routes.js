import { Router } from "express";
import { validate } from "#core/http/validate.js";
import { requireAuth } from "#core/http/authenticate.js";
import { notificationsController as c } from "./notifications.controller.js";
import { listNotificationsQuery, notificationParams } from "./notifications.schemas.js";

const router = Router();

router.use(requireAuth);

router.get("/", validate({ query: listNotificationsQuery }), c.list);
router.get("/unread-count", c.unreadCount);
router.post("/read-all", c.markAllRead);
router.patch("/:id/read", validate({ params: notificationParams }), c.markRead);

export default router;
