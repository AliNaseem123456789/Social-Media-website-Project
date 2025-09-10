import express from "express";
import supabase from "../supabaseClient.js";

const router = express.Router();
router.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("users")
      .select("id, username")
      .eq("id", Number(id))
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});
router.get("/chat/:user1/:user2", async (req, res) => {
  const { user1, user2 } = req.params;

  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(from_user.eq.${user1},to_user.eq.${user2}),and(from_user.eq.${user2},to_user.eq.${user1})`
      )
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Map usernames: sender username is already stored in DB
    const formatted = data.map((msg) => ({
      from_user: msg.from_user,
      to_user: msg.to_user,
      username: msg.username, // sender username
      message: msg.message,
      created_at: msg.created_at,
    }));

    res.json(formatted);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.get("/recentchat/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // fetch all chats where user is either sender or receiver
    const { data, error } = await supabase
      .from("messages")
      .select("from_user, to_user, created_at")
      .or(`from_user.eq.${userId},to_user.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.json([]);
    }

    // get unique partner IDs (other user in the chat)
    const uniquePartners = {};
    data.forEach((msg) => {
      const partnerId =
        msg.from_user === Number(userId) ? msg.to_user : msg.from_user;
      if (!uniquePartners[partnerId]) {
        uniquePartners[partnerId] = msg.created_at; // store last chat time
      }
    });

    const partnerIds = Object.keys(uniquePartners);

    // fetch usernames for these IDs
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, username")
      .in("id", partnerIds);

    if (usersError) throw usersError;

    // merge usernames with recent chat info
    const result = users.map((u) => ({
      id: u.id,
      username: u.username,
      last_chatted: uniquePartners[u.id],
    }));

    // sort by most recent
    result.sort((a, b) => new Date(b.last_chatted) - new Date(a.last_chatted));

    res.json(result);
  } catch (err) {
    console.error("Error fetching recent chats:", err);
    res.status(500).json({ error: "Failed to fetch recent chats" });
  }
});


export default router;