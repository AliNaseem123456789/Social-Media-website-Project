import express from "express";
const router = express.Router();
import {
  createPost,
  getPosts,
  likePost,
  getFullPost,
  addComment,
  getMyPosts,
} from "../controllers/post.controller.js";

router.get("/", getPosts);
router.post("/", createPost);
router.post("/like", likePost);
router.post("/comment", addComment);
router.get("/fullpost/:id", getFullPost);
router.get("/myposts/:id", getMyPosts);

export default router;
