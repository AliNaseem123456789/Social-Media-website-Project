import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import supabase from "./supabaseClient.js";
import authRoutes from "./routes/authRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import friendsRoutes from "./routes/friendsRoutes.js";
import chatsRoutes from "./routes/chatsRoutes.js";
import { requestLogger } from "./middleware/logger.js";
import profileRoutes from "./routes/profileRoutes.js";
import searchRoutes from "./routes/search.routes.js";
import client from "./elasticsearch.js";
import Redis from "ioredis"; 
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { typeDefs } from "./graphql/schema.js";
import { resolvers } from "./graphql/resolvers.js";
import { handleConnection } from "./sockets/socketHandlers.js";
import redisClient from "./config/redis.config.js";
import { getRedisStorage, deleteRedisKey, flushRedis } from "./controllers/redis.controller.js";
// Import DataLoaders
import { createCommentLoader, createUserLoader,createLikeStatusLoader } from "./graphql/loaders.js";

const redis = new Redis("redis://localhost:6379");
const app = express();
const httpServer = createServer(app);
const createContext = async ({ req }) => {
  let currentUser = null;
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    try {
      const token = authHeader.split(' ')[1];
      // Decode token logic here if needed
    } catch (error) {
      console.error('Auth error:', error.message);
    }
  }
  
  return {
    supabase,
    redis,  // ✅ Pass direct ioredis instance
    currentUser,
    loaders: {
      comment: createCommentLoader(),
      user: createUserLoader(),
      likeStatus: currentUser ? createLikeStatusLoader(currentUser.user_id) : null
    }
  };
};

// ============ APOLLO SERVER SETUP ============
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

await apolloServer.start();

// ============ MIDDLEWARE ============
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

// ============ GRAPHQL ROUTE (with DataLoaders in context) ============
app.use(
  "/api/graphql",
  expressMiddleware(apolloServer, {
    context: createContext,  // ✅ Now DataLoaders are available in resolvers
  }),
);

// ============ API ROUTES ============
app.use("/api", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api", chatsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/search", searchRoutes);

// ============ SOCKET.IO SETUP ============
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

io.on("connection", (socket) => {
  handleConnection(io, socket);
});

// ============ REDIS ADMIN ENDPOINTS ============
app.get("/admin/cache-stats", async (req, res) => {
  const stats = await redisClient.getStats();
  res.json({
    cache: stats,
    status: redisClient.isConnected ? "connected" : "disconnected",
    message: stats?.hitRate > 70 ? "Excellent cache performance!" : "Cache hit rate can be improved"
  });
});

app.delete('/admin/cache-all', async (req, res) => {
    await redisClient.flushAll();
    res.json({ success: true, message: 'All cache cleared' });
});

// Debug endpoint to inspect Redis cache
app.get('/debug/redis/:key', async (req, res) => {
    const { key } = req.params;
    const rawValue = await redisClient.get(key);
    
    res.json({
        key,
        rawValue: rawValue,
        type: typeof rawValue,
        isNull: rawValue === null,
        parsed: rawValue ? (typeof rawValue === 'object' ? rawValue : 'not an object') : null
    });
});

// Redis management endpoints
app.get('/api/redis/keys', getRedisStorage); // Get all keys
app.get('/api/redis/keys/:key', getRedisStorage); // Get specific key
app.delete('/api/redis/keys/:key', deleteRedisKey); // Delete specific key
app.delete('/api/redis/flush', flushRedis); // DELETE ALL DATA (use with caution!)

// ============ START SERVER ============
async function startServer() {
  const redisConnected = await redisClient.connect();
  
  if (!redisConnected) {
    console.warn('⚠️ Redis not connected - caching disabled, but server will still work');
  }

  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 API & Sockets running on port ${PORT}`);
    console.log(`📡 GraphQL ready at http://localhost:${PORT}/api/graphql`);
    console.log(`🗄️ Redis caching: ${redisConnected ? 'ENABLED ✅' : 'DISABLED ❌'}`);
    console.log(`📊 Cache stats: http://localhost:${PORT}/admin/cache-stats`);
  });
}

startServer().catch(console.error);