import express from "express";
import {
  sendFriendRequest,
  getPendingRequests,
  respondToRequest,
  getFriendsList,
} from "../controllers/friends.controller.js";
const router = express.Router();
router.post("/request", sendFriendRequest);
router.get("/pending/:userId", getPendingRequests);
router.post("/respond", respondToRequest);
router.get("/:userId", getFriendsList);
export default router;
