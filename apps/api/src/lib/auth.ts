import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { db } from "../models/db.js";
import { env } from "../env.js";
import { autoJoinOrganizationsByDomain } from "./auth-hooks.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  secret: env.AUTH_SECRET || "super-secret-key-change-in-production-min-32-chars-required",
  baseURL: env.NODE_ENV === "production"
    ? env.BASE_URL || `http://localhost:${env.PORT}`
    : `http://localhost:${env.PORT}`,
  trustedOrigins: [
    "http://localhost:3000",
    env.NODE_ENV === "production" && env.BASE_URL ? env.BASE_URL : "",
  ].filter(Boolean),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production with email service
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day (update session if older than this)
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      // Organization hooks
      async sendInvitationEmail(data) {
        // TODO: Implement email service in production (SendGrid, Resend, etc.)
        console.log("📧 Send invitation email to:", data.email);
        console.log("   Organization:", data.organization.name);
        console.log("   Role:", data.invitation.role);
        console.log("   Invitation ID:", data.invitation.id);
        console.log("   Expires:", data.invitation.expiresAt);
      },
    }),
  ],
  // Global hooks for auth lifecycle
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // Auto-join organizations after user signs up
      if (ctx.path === "/sign-up/email") {
        // User was just created via email signup
        const user = ctx.context?.user;
        if (user && user.email) {
          console.log("🎉 New user signed up:", user.email);

          // Auto-join organizations based on email domain
          await autoJoinOrganizationsByDomain(user.id, user.email);
        }
      }
    }),
  },
});

export type Auth = typeof auth;
