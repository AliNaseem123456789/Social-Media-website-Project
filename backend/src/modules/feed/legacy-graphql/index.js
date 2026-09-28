// DEPRECATED: mounts the legacy GraphQL feed at /api/graphql when ENABLE_LEGACY_GRAPHQL=true.
// The frontend uses GET /api/v1/feed; remove this folder once no client depends on GraphQL.
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { config } from "#config";
import { typeDefs } from "./schema.js";
import { resolvers } from "./resolvers.js";

export async function mountLegacyGraphql(app, httpServer) {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: !config.isProduction,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });
  await server.start();
  app.use("/api/graphql", expressMiddleware(server, { context: async ({ req }) => ({ user: req.user ?? null }) }));
  return server;
}
