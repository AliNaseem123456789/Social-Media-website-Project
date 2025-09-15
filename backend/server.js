import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import supabase from "./supabaseClient.js";
import authRoutes from "./routes/authRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import friendsRoutes from "./routes/friendsRoutes.js";
import chatsRoutes from "./routes/chatsRoutes.js";
import client from "./elasticsearch.js";
const app = express();
app.use(
  cors({
    origin: ["https://social-media-project-one.vercel.app"], 
    credentials: true,
  })
);



app.use(express.json());

app.use("/api", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api", friendsRoutes);
app.use("/api",chatsRoutes)

// Socket.IO Setup
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://social-media-project-one.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Track online users: userId -> socketId
const users = {};

io.on("connection", (socket) => {
  console.log("✅ New client connected", socket.id);

  // Register user
  socket.on("register", (userId) => {
    if (!userId) return;
    users[userId] = socket.id;
    console.log("Registered user", userId);
  });

  // Private messaging
  socket.on("private_message", async ({ from, username, to, message }) => {
    if (!from || !to || !message || !username) return;

    try {
    
      await supabase.from("messages").insert([
        {
          from_user: from,
          to_user: to,
          username,   
          message,
        },
      ]);

      // Send to recipient if online
      const targetSocket = users[to];
      if (targetSocket) {
        io.to(targetSocket).emit("private_message", { from, username, message });
      }

      // Echo back to sender
      socket.emit("private_message", { from, username, message });
    } catch (err) {
      console.error("Failed to save message:", err.message);
    }
  });
  socket.on("disconnect", () => {
    for (let id in users) {
      if (users[id] === socket.id) delete users[id];
    }
  });
});

// -------------------- SEARCH USERS --------------------
app.get("/search-users", async (req, res) => {
  try {
    const q = req.query.q;

    const result = await client.search({
      index: "users",
      query: {
        multi_match: {
          query: q,
          fields: ["username", "email"],
        },
      },
    });

    res.json(
      result.hits.hits.map((hit) => ({
        id: hit._source.id,     // ✅ users table id
        ...hit._source,
      }))
    );
  } catch (err) {
    console.error("❌ Search error:", err);
    res.status(500).json({ error: "User search failed" });
  }
});

// -------------------- CREATE USER --------------------
app.post("/create-user", async (req, res) => {
  const { username, email, password } = req.body;

  // Insert into Supabase
  const { data, error } = await supabase
    .from("users")
    .insert([{ username, email, password }])
    .select()
    .single();

  if (error) return res.status(500).json({ error });

  // Index into Elasticsearch
  await client.index({
    index: "users",
    id: data.id,
    document: {
      username: data.username,
      email: data.email,
      created_at: data.created_at,
    },
  });

  res.json({ message: "✅ User created and indexed", user: data });
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

