import express from "express";
const router = express.Router();
import bcrypt from "bcrypt";
import supabase from "../supabaseClient.js";

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
  const { username, email, password, } = req.body;

  if (password.match(/^[A-Za-z]\w{7,14}$/)) {
    res.json({ success: true, message: "Login successful " });
  } else {
    res.status(401).json({ success: false, message: "Password Must Begin with a letter and contain 7 to 14 letters " });
  }
  try{
    
    const hashedPassword =await bcrypt.hash(password, 10)
    const { data, error } = await supabase
      .from("users")
      .insert([{ username, email, password: hashedPassword }])
      .select("id, username, email")
      .single();

    if (error) throw error;
    res.json({ success: true, message: "User registered successfully " });
  }
  catch(err){ res.status(500).json({ success: false, message: "Database error " });}
});

export default router;
