import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

export const auth = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL?.replace("/graphql", "") || "http://localhost:4000",
  plugins: [organizationClient()],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  organization,
} = auth;
