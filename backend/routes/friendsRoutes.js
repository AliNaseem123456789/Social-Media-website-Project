import express from "express";
import {
  sendFriendRequest,
  getPendingRequests,
  respondToRequest,
  getFriendsList,
} from "../controllers/friends.controller.js";
import { requireAuth } from "../middleware/session.middleware.js";

const router = express.Router();
router.post("/request", requireAuth, sendFriendRequest);
router.get("/pending", requireAuth, getPendingRequests);
router.post("/respond", requireAuth, respondToRequest);
router.get("/", requireAuth, getFriendsList);

export default router;