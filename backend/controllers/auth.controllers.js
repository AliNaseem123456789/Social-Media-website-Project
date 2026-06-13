// controllers/auth.controller.js - UPDATED WITH SESSIONS

import bcrypt from "bcrypt";
import supabase from "../supabaseClient.js";
import { OAuth2Client } from "google-auth-library";
import EmailPublisher from "../services/EmailPublisher.js";
import { createSession, destroySession } from "../middleware/session.middleware.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
export const login = async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const { data: users, error } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .limit(1);

        if (error) throw error;
        
        if (!users || users.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: "Invalid credentials" 
            });
        }

        const user = users[0];
        
        if (!user.password) {
            return res.status(401).json({
                success: false,
                message: "This account uses Google login",
            });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ 
                success: false, 
                message: "Invalid credentials" 
            });
        }
        createSession(req, {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role || 'user'
        });
        res.json({
            success: true,
            message: "Login successful",
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
        
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
export const signup = async (req, res) => {
    const { username, email, password } = req.body;

    if (!password.match(/^[A-Za-z]\w{7,14}$/)) {
        return res.status(400).json({
            success: false,
            message: "Password must begin with a letter and contain 7 to 14 letters",
        });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const { data: user, error } = await supabase
            .from("users")
            .insert([{ username, email, password: hashedPassword }])
            .select("id, username, email, created_at")
            .single();
            
        if (error) throw error;
            createSession(req, {
            id: user.id,
            username: user.username,
            email: user.email,
            role: 'user'
        });
        
        const verificationToken = Buffer.from(`${email}-${Date.now()}`).toString('base64');
        
        EmailPublisher.sendWelcomeEmail({
            to: email,
            name: username,
            profileSetupLink: `http://localhost:5000/verify?token=${verificationToken}`
        }).catch(err => console.error('Failed to queue email:', err.message));
        
        res.json({ 
            success: true, 
            message: "User registered successfully",
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
        
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ success: false, message: "Database error" });
    }
};
export const googleLogin = async (req, res) => {
    const { token } = req.body;
    
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        
        const payload = ticket.getPayload();
        const { email, name } = payload;

        const { data: users, error } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .limit(1);

        if (error) throw error;

        let user;
        if (users && users.length > 0) {
            user = users[0];
        } else {
            const { data, error: insertError } = await supabase
                .from("users")
                .insert([{ username: name, email, password: null }])
                .select("id, username, email")
                .single();
                
            if (insertError) throw insertError;
            user = data;
        }
        createSession(req, {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role || 'user'
        });
        res.json({
            success: true,
            message: "Google login successful",
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
        
    } catch (err) {
        console.error("Google login error:", err);
        res.status(401).json({ success: false, message: "Google login failed" });
    }
};
export const getCurrentUser = async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            success: false,
            message: "Not logged in"
        });
    }
    
    try {
        const userId = parseInt(req.session.userId);
        
        console.log("🔍 Auth check for user ID:", userId);        
        const { data: user, error } = await supabase
            .from("users")
            .select("id, username, email, created_at")  // ← Only these exist in 'users'
            .eq("id", userId)
            .single();
        
        if (error || !user) {
            console.error("❌ User not found in auth table:", error);
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
            res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                createdAt: user.created_at
            }
        });
        
    } catch (err) {
        console.error("Get current user error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
export const logout = async (req, res) => {
    await destroySession(req, res);
    res.json({ 
        success: true, 
        message: "Logged out successfully" 
    });
};