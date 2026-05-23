import supabase from "../supabaseClient.js";
import Redis from "ioredis";
const redis = new Redis("rediss://default:gQAAAAAAAffMAAIgcDJlNzNmNzUxZDVhNDk0MGJlYjdkNDVhNjQ1MDU5Y2U4ZQ@humorous-troll-128972.upstash.io:6379");
// const redis = new Redis("redis://localhost:6379");
export const getUserById = async (req, res) => {
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
};

export const getChatHistory = async (req, res) => {
  const { user1, user2 } = req.params;
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(from_user.eq.${user1},to_user.eq.${user2}),and(from_user.eq.${user2},to_user.eq.${user1})`,
      )
      .order("created_at", { ascending: true });

    if (error) throw error;

    const formatted = data.map((msg) => ({
      from_user: msg.from_user,
      to_user: msg.to_user,
      username: msg.username,
      message: msg.message,
      created_at: msg.created_at,
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching messages:", err.message);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

export const getRecentChats = async (req, res) => {
  const { userId } = req.params;
  const cacheKey = `recentchats:user:${userId}`;
  
  try {
    // 🟢 STEP 1: Try Redis cache
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      console.log(`⚡ RECENT CHATS CACHE HIT - User ${userId}`);
      return res.json(JSON.parse(cached));
    }
    
    console.log(`🐌 RECENT CHATS CACHE MISS - User ${userId}`);
    
    // 🔴 STEP 2: Cache miss - query database
    const { data, error } = await supabase
      .from("messages")
      .select("from_user, to_user, created_at")
      .or(`from_user.eq.${userId},to_user.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    if (!data || data.length === 0) {
      return res.json([]);
    }

    // Get unique chat partners (most recent message per person)
    const uniquePartners = {};
    data.forEach((msg) => {
      const partnerId = msg.from_user === Number(userId) ? msg.to_user : msg.from_user;
      if (!uniquePartners[partnerId]) {
        uniquePartners[partnerId] = msg.created_at;
      }
    });

    const partnerIds = Object.keys(uniquePartners);

    // Fetch usernames for all partners
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, username")
      .in("id", partnerIds);

    if (usersError) throw usersError;

    // Build result
    let result = users.map((u) => ({
      id: u.id,
      username: u.username,
      last_chatted: uniquePartners[u.id],
    }));

    // Sort by most recent
    result.sort((a, b) => new Date(b.last_chatted) - new Date(a.last_chatted));

    // 🟢 STEP 3: Store in Redis (60 seconds TTL - chats update frequently)
    await redis.setex(cacheKey, 60, JSON.stringify(result));
    console.log(`💾 Recent chats cached for user ${userId} (60 sec TTL)`);
    
    res.json(result);
    
  } catch (err) {
    console.error("Error fetching recent chats:", err);
    res.status(500).json({ error: "Failed to fetch recent chats" });
  }
};