// routes/chatsRoutes.js - UPDATE

import express from "express";
import {
  getUserById,
  getChatHistory,
  getRecentChats,
} from "../controllers/chats.controller.js";
import { requireAuth } from "../middleware/session.middleware.js";

const router = express.Router();

router.get("/users/:id", getUserById);
router.get("/chat/:user2", requireAuth, getChatHistory);
router.get("/recentchat", requireAuth, getRecentChats);

export default router;