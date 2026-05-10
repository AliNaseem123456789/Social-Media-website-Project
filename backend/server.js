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

import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { typeDefs } from "./graphql/schema.js";
import { resolvers } from "./graphql/resolvers.js";
import { handleConnection } from "./sockets/socketHandlers.js";
const app = express();
const httpServer = createServer(app);
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
app.use(express.json());
app.use(requestLogger);
app.use(
  "/api/graphql",
  expressMiddleware(apolloServer, {
    context: async () => ({ supabase }),
  }),
);

app.use("/api", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api", chatsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/search", searchRoutes);
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
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`API & Sockets running on port ${PORT}`);
  console.log(`GraphQL ready at http://localhost:${PORT}/graphql`);
});
