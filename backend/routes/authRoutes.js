import express from "express";
const router = express.Router();
import { login, signup, googleLogin,getCurrentUser,logout } from "../controllers/auth.controllers.js";
import { requireAuth } from "../middleware/session.middleware.js";

router.post("/login", login);
router.post("/signup", signup);
router.post("/google", googleLogin);
// Protected routes (require authentication)
router.get("/me", requireAuth, getCurrentUser);
router.post("/logout", requireAuth, logout);
router.get("/test", (req, res) => {
    res.json({ message: "Test route works!" });
});
export default router;
