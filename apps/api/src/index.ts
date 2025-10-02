import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import express from "express";
import { createServer } from "http";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/use/ws";
import bodyParser from "body-parser";
import cors from "cors";
import { typeDefs } from "./schema/index.js";
import { resolvers } from "./resolvers/index.js";
import { pubsub } from "./services/pubsub.js";
import { env } from "./env.js";
import { auth } from "./lib/auth.js";

// Create executable schema
const schema = makeExecutableSchema({ typeDefs, resolvers });

// Create Express app and HTTP server
const app = express();
const httpServer = createServer(app);

// Create WebSocket server
const wsServer = new WebSocketServer({
  server: httpServer,
  path: "/graphql",
});

// Set up WebSocket server for subscriptions
const serverCleanup = useServer({ schema }, wsServer);

// Create Apollo Server
const server = new ApolloServer({
  schema,
  plugins: [
    // Proper shutdown for HTTP server
    ApolloServerPluginDrainHttpServer({ httpServer }),
    // Proper shutdown for WebSocket server
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

// Start Apollo Server
await server.start();

// Mount better-auth routes BEFORE other middleware
// Better-auth handles its own routes at /api/auth/*
app.use("/api/auth", (req, res) => {
  return auth.handler(req as any);
});

// Apply GraphQL middleware
app.use(
  "/graphql",
  cors<cors.CorsRequest>(),
  bodyParser.json(),
  expressMiddleware(server, {
    context: async ({ req }) => {
      // Get session from better-auth
      const session = await auth.api.getSession({
        headers: req.headers as any,
      });

      return {
        pubsub,
        session: session?.session || null,
        user: session?.user || null,
      };
    },
  }) as any // Type conflict between Express v5 and Apollo Server - safe to ignore
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Start HTTP server (which also starts WebSocket)
httpServer.listen(env.PORT, () => {
  console.log(`GraphQL server ready at http://localhost:${env.PORT}/graphql`);
  console.log(`Auth endpoints ready at http://localhost:${env.PORT}/api/auth/*`);
  console.log(`WebSocket server ready at ws://localhost:${env.PORT}/graphql`);
});
