import express from "express";
import multer from "multer";
import {
  getProfile,
  addProfileInfo,
  uploadFiles,
} from "../controllers/profile.controller.js";
import { requireAuth } from "../middleware/session.middleware.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });
const profileUploadFields = upload.fields([
  { name: "profileImage", maxCount: 1 },
  { name: "coverImage", maxCount: 1 },
]);
router.get("/:user_id", getProfile);
router.post("/add", requireAuth, profileUploadFields, addProfileInfo);
router.post("/upload", requireAuth, profileUploadFields, uploadFiles);

export default router;