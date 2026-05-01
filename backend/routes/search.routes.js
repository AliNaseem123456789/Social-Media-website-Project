import express from "express";
import {
  searchUsers,
  searchPosts,
  combinedSearch,
} from "../controllers/search.controller.js";
const router = express.Router();
router.get("/users", searchUsers);
router.get("/posts", searchPosts);
router.get("/all", combinedSearch);
export default router;
