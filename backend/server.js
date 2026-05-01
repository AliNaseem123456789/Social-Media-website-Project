import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import supabase from "./supabaseClient.js";
import authRoutes from "./routes/authRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import friendsRoutes from "./routes/friendsRoutes.js";
import chatsRoutes from "./routes/chatsRoutes.js";
import { requestLogger } from "./middleware/logger.js"; // Import here
import profileRoutes from "./routes/profileRoutes.js";
import searchRoutes from "./routes/search.routes.js";
import client from "./elasticsearch.js";

import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { typeDefs } from "./graphql/schema.js";
import { resolvers } from "./graphql/resolvers.js";
const app = express();
const httpServer = createServer(app);
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

// 2. Start Apollo before applying middleware
await apolloServer.start();

app.use(
  cors({
    origin: [
      "https://social-media-project-one.vercel.app",
      "http://localhost:3000",
    ],
    credentials: true,
  }),
);
app.use(express.json());
app.use(requestLogger);
// 3. Apply GraphQL Middleware
app.use(
  "/api/graphql",
  expressMiddleware(apolloServer, {
    // This context makes 'supabase' available in your resolvers.js
    context: async () => ({ supabase }),
  }),
);

app.use("/api", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api", chatsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/search", searchRoutes);
// const server = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      "https://social-media-project-one.vercel.app",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const users = {};

io.on("connection", (socket) => {
  console.log("New client connected", socket.id);

  // 1. User Registration for Private Messaging
  socket.on("register", (userId) => {
    if (!userId) return;
    users[userId] = socket.id;
  });

  // 2. Room Management for Video Calls
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room: ${roomId}`);
  });

  // 3. WebRTC Signaling (Handled outside of disconnect)
  socket.on("offer", ({ offer, roomId }) => {
    // We use socket.to(roomId) to send to EVERYONE in the room EXCEPT the sender
    socket.to(roomId).emit("offer", offer);
  });

  socket.on("answer", ({ answer, roomId }) => {
    socket.to(roomId).emit("answer", answer);
  });

  socket.on("ice-candidate", ({ candidate, roomId }) => {
    socket.to(roomId).emit("ice-candidate", candidate);
  });

  // 4. Cleanup on Disconnect
  socket.on("disconnect", () => {
    for (let id in users) {
      if (users[id] === socket.id) delete users[id];
    }
    console.log("Client disconnected", socket.id);
  });
});

// io.on("connection", (socket) => {
//   console.log("New client connected", socket.id);

//   socket.on("register", (userId) => {
//     if (!userId) return;
//     users[userId] = socket.id;
//     console.log("Registered user", userId);
//   });

//   socket.on("private_message", async ({ from, username, to, message }) => {
//     if (!from || !to || !message || !username) return;

//     try {
//       await supabase.from("messages").insert([
//         {
//           from_user: from,
//           to_user: to,
//           username,
//           message,
//         },
//       ]);

//       const targetSocket = users[to];
//       if (targetSocket) {
//         io.to(targetSocket).emit("private_message", {
//           from,
//           username,
//           message,
//         });
//       }

//       socket.emit("private_message", { from, username, message });
//     } catch (err) {
//       console.error("Failed to save message:", err.message);
//     }
//   });
//   socket.on("disconnect", () => {
//     for (let id in users) {
//       if (users[id] === socket.id) delete users[id];
//     }
//     // Add inside your io.on("connection", (socket) => { ... })
//     socket.on("join-room", (roomId) => {
//       socket.join(roomId);
//       console.log(`User joined room: ${roomId}`);
//     });

//     socket.on("offer", ({ offer, roomId }) => {
//       socket.to(roomId).emit("offer", offer);
//     });

//     socket.on("answer", ({ answer, roomId }) => {
//       socket.to(roomId).emit("answer", answer);
//     });

//     socket.on("ice-candidate", ({ candidate, roomId }) => {
//       socket.to(roomId).emit("ice-candidate", candidate);
//     });
//   });
// });
// app.get("/search-users", async (req, res) => {
//   try {
//     const q = req.query.q;

//     // Handle empty, undefined, or too short queries
//     if (!q || q.trim().length < 2) {
//       return res.json([]); // Return empty array instead of error
//     }

//     console.log(`🔍 Searching for: ${q}`);

//     const { data, error } = await supabase
//       .from("users")
//       .select("id, username, email")
//       .ilike("username", `%${q}%`)
//       .limit(10);

//     if (error) {
//       console.error("Supabase error:", error);
//       return res.status(500).json({ error: "Search failed" });
//     }

//     res.json(data);
//   } catch (err) {
//     console.error("Search error:", err);
//     res.status(500).json({ error: "User search failed" });
//   }
// });

// app.get("/search-posts", async (req, res) => {
//   try {
//     const q = req.query.q;
//     console.log("🔍 Search-posts called with q:", q);

//     if (!q || q.trim().length < 2) {
//       return res.json([]);
//     }

//     // Remove avatar_url from the select
//     const { data, error } = await supabase
//       .from("posts")
//       .select(
//         `
//         *,
//         users:user_id (id, username, email)
//       `,
//       ) // ← Removed avatar_url
//       .ilike("content", `%${q}%`)
//       .order("created_at", { ascending: false })
//       .limit(20);

//     if (error) throw error;

//     const postsWithCounts = await Promise.all(
//       (data || []).map(async (post) => {
//         const { count, error: countError } = await supabase
//           .from("comments")
//           .select("*", { count: "exact", head: true })
//           .eq("post_id", post.id);

//         return {
//           ...post,
//           username: post.users?.username || "Unknown",
//           comment_count: count || 0,
//           // Remove avatar_url from response too
//         };
//       }),
//     );

//     res.json(postsWithCounts);
//   } catch (err) {
//     console.error("💥 Post search error:", err);
//     res.status(500).json({ error: "Post search failed", details: err.message });
//   }
// });
// app.post("/create-user", async (req, res) => {
//   const { username, email, password } = req.body;

//   const { data, error } = await supabase
//     .from("users")
//     .insert([{ username, email, password }])
//     .select()
//     .single();

//   if (error) return res.status(500).json({ error });

//   await client.index({
//     index: "users",
//     id: data.id,
//     document: {
//       username: data.username,
//       email: data.email,
//       created_at: data.created_at,
//     },
//   });

//   res.json({ message: "User created and indexed", user: data });
// });

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 API & Sockets running on port ${PORT}`);
  console.log(`🚀 GraphQL ready at http://localhost:${PORT}/graphql`);
});
