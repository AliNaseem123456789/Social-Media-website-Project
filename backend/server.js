import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import supabase from "./supabaseClient.js";
import authRoutes from "./routes/authRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import friendsRoutes from "./routes/friendsRoutes.js";
import chatsRoutes from "./routes/chatsRoutes.js";
import redisRoutes from "./routes/redisRoutes.js";

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
import cookieParser from "cookie-parser";
import { sessionMiddleware } from "./middleware/session.middleware.js";
import notificationConsumer from "./consumers/NotificationConsumer.js";
const isProduction = false;
const redis = new Redis("rediss://default:gQAAAAAAAffMAAIgcDJlNzNmNzUxZDVhNDk0MGJlYjdkNDVhNjQ1MDU5Y2U4ZQ@humorous-troll-128972.upstash.io:6379");
// const redis = new Redis("redis://localhost:6379");
import { 
    securityHeaders, 
    corsConfig, 
    rateLimiters, 
    customSecurityHeaders,
    preventParameterPollution,
    sessionSecurityHeaders
} from "./middleware/security.middleware.js";
const app = express();
app.use(securityHeaders(isProduction));
const httpServer = createServer(app);
const createContext = async ({ req }) => {
  let currentUser = null;
  if (req.session && req.session.userId) {
    currentUser = {
      user_id: req.session.userId,
      username: req.session.username,
      email: req.session.email,
      role: req.session.role
    };
  }
  
  return {
    supabase,
    redis,
    currentUser,  
    loaders: {
      comment: createCommentLoader(),
      user: createUserLoader(),
      likeStatus: currentUser ? createLikeStatusLoader(currentUser.user_id) : null
    }
  };
};
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});
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
app.use('/api/login', rateLimiters.auth);
app.use('/api/signup', rateLimiters.auth);
app.use('/api/google', rateLimiters.auth);
app.use('/api', rateLimiters.general);
app.use(customSecurityHeaders);
app.use(sessionSecurityHeaders);

app.use(preventParameterPollution);
app.use(express.json());
app.use(requestLogger);
app.use(cookieParser());
app.use(sessionMiddleware);
app.use(
  "/api/graphql",
  expressMiddleware(apolloServer, {
    context: createContext,  // DataLoaders are available in resolvers
  }),
);
app.use("/api", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api", chatsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/redis", redisRoutes);
import notificationRoutes from "./routes/notificationRoutes.js";
app.use("/api", notificationRoutes);
import analyticsRoutes from "./routes/analyticsRoutes.js";
app.use("/api", analyticsRoutes);
const io = new Server(httpServer, {
  cors: {
    origin: [
      "https://social-media-project-one.vercel.app",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST"],
    credentials: true,
     pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  },
});
io.use(async (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) return next(new Error("No session cookie"));
    
    const cookies = {};
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) cookies[name] = value;
    });
    
    const sessionId = cookies.sessionId;
    if (!sessionId) return next(new Error("No session ID"));
    
    // Get session from Redis
    const sessionData = await redis.get(`session:${sessionId}`);
    if (!sessionData) return next(new Error("Invalid session"));
    
    const session = JSON.parse(sessionData);
    if (!session.userId) return next(new Error("User not authenticated"));
    
    // Attach user to socket
    socket.userId = session.userId;
    socket.username = session.username;
    
    next();
  } catch (error) {
    next(new Error("Authentication failed"));
  }
});
io.on("connection", (socket) => {
  handleConnection(io, socket);
});
async function startServer() {
  const redisConnected = await redisClient.connect();

  const PORT = process.env.PORT || 5000;

  // Wait for the server to actually be listening before touching IO
  await new Promise((resolve) => {
    httpServer.listen(PORT, () => {
      console.log(`API & Sockets running on port ${PORT}`);
      console.log(`GraphQL ready at http://localhost:${PORT}/api/graphql`);
      console.log(`Redis caching: ${redisConnected ? 'ENABLED' : 'DISABLED'}`);
      resolve();
    });
  });
  notificationConsumer.setIO(io);

  try {
    await notificationConsumer.start();
  } catch (error) {
    console.error('Failed to start notification consumer:', error);
  }
}
// try {
//     await analyticsConsumer.start();
//     console.log('✅ Analytics Consumer started successfully');
//   } catch (error) {
//     console.error('❌ Failed to start analytics consumer:', error);  
//   }

startServer().catch(console.error);
