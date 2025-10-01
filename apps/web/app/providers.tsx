"use client";

import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client/core";
import { ApolloProvider } from "@apollo/client/react";

// Create Apollo Client in the component to avoid SSR issues
function makeClient() {
  return new ApolloClient({
    link: new HttpLink({
      uri: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/graphql",
    }),
    cache: new InMemoryCache(),
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const client = makeClient();
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
