import express from "express";
import {
  getUserById,
  getChatHistory,
  getRecentChats,
} from "../controllers/chats.controller.js";
const router = express.Router();
router.get("/users/:id", getUserById);
router.get("/chat/:user1/:user2", getChatHistory);
router.get("/recentchat/:userId", getRecentChats);
export default router;
