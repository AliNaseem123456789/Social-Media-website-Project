import express from "express";
import multer from "multer"; 
import { uploadPostImage } from '../controllers/upload.controller.js';
import {
  createPost,
  getPosts,
  likePost,
  getFullPost,
  addComment,
  getMyPosts,
} from "../controllers/post.controller.js";
import { requireAuth } from "../middleware/session.middleware.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

router.get("/", getPosts);
router.get("/fullpost/:id", getFullPost);
router.post("/", requireAuth, createPost);
router.post("/like", requireAuth, likePost);
router.post("/comment", requireAuth, addComment);
router.get("/myposts", requireAuth, getMyPosts);  
router.post('/upload', requireAuth, upload.single('image'), uploadPostImage);

export default router;