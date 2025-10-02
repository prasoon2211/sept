import { ApolloClient, InMemoryCache, HttpLink, split } from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";

// Use process.env directly for client-side env vars
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/graphql";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000/graphql";

// HTTP link for queries and mutations
const httpLink = new HttpLink({
  uri: API_URL,
});

// WebSocket link for subscriptions (only on client)
const wsLink =
  typeof window !== "undefined"
    ? new GraphQLWsLink(
        createClient({
          url: WS_URL,
        }),
      )
    : null;

// Split based on operation type
const splitLink =
  typeof window !== "undefined" && wsLink
    ? split(
        ({ query }) => {
          const definition = getMainDefinition(query);
          return (
            definition.kind === "OperationDefinition" &&
            definition.operation === "subscription"
          );
        },
        wsLink,
        httpLink,
      )
    : httpLink;

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      Cell: {
        keyFields: ["id"],
      },
      Project: {
        keyFields: ["id"],
      },
    },
  }),
});
