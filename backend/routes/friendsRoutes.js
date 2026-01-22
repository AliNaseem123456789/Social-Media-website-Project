import express from "express";
import cors from "cors";
import supabase from "../supabaseClient.js";
const router = express.Router();

router.post("/friends/request", async (req, res) => {
  const { requester_id, recipient_id } = req.body;

  if (!requester_id || !recipient_id) {
    return res.status(400).json({ message: "User IDs required" });
  }
  try {
    const { data: existing } = await supabase
      .from("friends")
      .select("*")
      .or(
        `and(requester_id.eq.${requester_id},recipient_id.eq.${recipient_id}),and(requester_id.eq.${recipient_id},recipient_id.eq.${requester_id})`,
      )
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ message: "Friend request already exists" });
    }

    const { data } = await supabase
      .from("friends")
      .insert([{ requester_id, recipient_id, status: "pending" }])
      .select()
      .single();

    res.json({ message: "Request sent", request: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database error" });
  }
});

router.get("/friends/pending/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const { data, error } = await supabase
      .from("friends")
      .select(
        "friendship_id, requester_id, status, users:requester_id(username,email)",
      )
      .eq("recipient_id", userId)
      .eq("status", "pending");

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database error" });
  }
});

router.post("/friends/respond", async (req, res) => {
  const { friendship_id, status } = req.body;

  if (!friendship_id || !["accepted", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid request or status" });
  }

  try {
    const { data, error } = await supabase
      .from("friends")
      .update({ status })
      .eq("friendship_id", friendship_id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: `Friend request ${status}`, request: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database error" });
  }
});

router.get("/friends/:userId", async (req, res) => {
  const userId = Number(req.params.userId);

  try {
    const { data, error } = await supabase
      .from("friends")
      .select(
        `friendship_id, status,
         requester:requester_id(id,username,email),
         recipient:recipient_id(id,username,email)`,
      )
      .or(
        `and(requester_id.eq.${userId},status.eq.accepted),and(recipient_id.eq.${userId},status.eq.accepted)`,
      );

    if (error) throw error;

    const friendsList = data
      .map((f) => {
        if (f.requester.id === userId) return f.recipient;
        if (f.recipient.id === userId) return f.requester;
        return null;
      })
      .filter(Boolean);

    res.json(friendsList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database error" });
  }
});

export default router;
