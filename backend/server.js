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

app.post("/index", async (req, res) => {
  try {
    const { id, title, content, author } = req.body;

    await client.index({
      index: "posts",   // you can choose any index name (like "users", "comments")
      id,               // optional, if you want to control IDs
      document: {
        title,
        content,
        author,
        created_at: new Date(),
      },
    });

    res.json({ message: "Document indexed successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Indexing failed" });
  }
});

// ✅ Search documents
app.get("/search", async (req, res) => {
  try {
    const q = req.query.q;

    const result = await client.search({
      index: "posts",
      query: {
        multi_match: {
          query: q,
          fields: ["title", "content", "author"],
        },
      },
    });

    res.json(result.hits.hits.map(hit => hit._source));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

