import express from "express";
const router = express.Router();
import { login, signup, googleLogin } from "../controllers/auth.controllers.js";
router.post("/login", login);
router.post("/signup", signup);
router.post("/google", googleLogin);

export default router;
