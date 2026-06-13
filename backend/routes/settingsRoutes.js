// backend/routes/settingsRoutes.js
import express from "express";
import multer from "multer";
import { settingsController } from "../controllers/settingsController.js";
import { requireAuth } from "../middleware/session.middleware.js";

const router = express.Router()
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  }
});

// All routes require authentication
// router.use(requireAuth);

router.get("/profile", settingsController.getProfile);
router.post("/profile/update", upload.fields([
  { name: "profile_image", maxCount: 1 },
  { name: "cover_image", maxCount: 1 }
]), settingsController.updateProfile);
router.post("/change-password", settingsController.changePassword);
router.post("/delete-account", settingsController.deleteAccount);
router.post("/privacy/update", settingsController.updatePrivacy);

export default router;