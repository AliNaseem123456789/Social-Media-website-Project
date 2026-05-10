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
router.post("/", createPost);
router.post("/like", likePost);
router.post("/comment", addComment);
router.get("/fullpost/:id", getFullPost);
router.get("/myposts/:id", getMyPosts);
router.post('/upload', upload.single('image'), uploadPostImage); 

export default router;