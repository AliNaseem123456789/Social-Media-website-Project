import express from "express";
const router = express.Router();
import bcrypt from "bcrypt";
import supabase from "../supabaseClient.js";
import { OAuth2Client } from "google-auth-library";
import client from "../elasticsearch.js"

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .limit(1);

    if (error) throw error;

    if (!users || users.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    const user = users[0];
    const match = await bcrypt.compare(password, user.password);

    if (match) {
     
      res.json({ success: true, message: "Login successful ", user_id: user.id, username: user.username });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials " });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Database error " });
  }
});
router.post("/signup", async (req, res) => { 
  const { username, email, password } = req.body;

  // Password validation
  if (!password.match(/^[A-Za-z]\w{7,14}$/)) {
    return res.status(401).json({ 
      success: false, 
      message: "Password must begin with a letter and contain 7 to 14 letters" 
    });
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into Supabase
    const { data: user, error } = await supabase
      .from("users")
      .insert([{ username, email, password: hashedPassword }])
      .select("id, username, email, created_at")
      .single();

    if (error) throw error;

    // Index into Elasticsearch
    await client.index({
      index: "users",
      id: user.id,            // use DB id as ES doc id
      document: {
        id: user.id,          // store DB id inside _source
        username: user.username,
        email: user.email,
        created_at: user.created_at,
      },
    });

    res.json({ success: true, message: "User registered and indexed successfully", user });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Database or indexing error" });
  }
});

// Google client setup
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/google", async (req, res) => {
  const { token } = req.body; // token sent by frontend

  try {
    // Verify token with Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    // Extract user info
    const payload = ticket.getPayload();
    const { email, name } = payload;

    // Check if user already exists
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
      // If not, insert new user (password is null since it’s Google)
      const { data, error: insertError } = await supabase
        .from("users")
        .insert([{ username: name, email, password: null }])
        .select("id, username, email")
        .single();

      if (insertError) throw insertError;
      user = data;
    }

    // Send response to frontend
    res.json({
      success: true,
      message: "Google login successful",
      user_id: user.id,
      username: user.username,
    });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(401).json({ success: false, message: "Google login failed" });
  }
});


export default router;
