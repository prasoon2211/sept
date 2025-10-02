# Authentication & Authorization Guide

This document describes the authentication and authorization system in Sept using [better-auth](https://better-auth.com).

## Overview

Sept uses better-auth with the organization plugin to provide:

- **Email/password authentication**: Secure credential-based login
- **Organization management**: Multi-tenant B2B support with roles
- **Invitation system**: Invite users to organizations via email
- **Domain-based auto-join**: Automatically add users to organizations based on email domain
- **Session management**: Secure, token-based sessions with 7-day expiry

## Architecture

### Backend (API)

The authentication server is configured in `apps/api/src/lib/auth.ts`:

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: env.AUTH_SECRET,
  emailAndPassword: { enabled: true },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      roles: ["owner", "admin", "member"],
    }),
  ],
});
```

Auth endpoints are mounted at `/api/auth/*` in the API server (apps/api/src/index.ts).

### Frontend (Web)

The auth client is configured in `apps/web/lib/auth-client.ts`:

```typescript
import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

export const auth = createAuthClient({
  baseURL: "http://localhost:4000",
  plugins: [organizationClient()],
});
```

## Database Schema

Better-auth manages the following tables:

### Authentication Tables

- **user**: Core user table
  - `id` (text): Primary key
  - `email` (text): Unique email address
  - `name` (text): User's display name
  - `emailVerified` (boolean): Email verification status
  - `createdAt`, `updatedAt`: Timestamps

- **account**: Authentication credentials
  - `id` (text): Primary key
  - `userId` (text): Foreign key to user
  - `providerId` (text): "credential" for password auth
  - `password` (text): Hashed password
  - OAuth fields: `accessToken`, `refreshToken`, etc.

- **session**: User sessions
  - `id` (text): Primary key
  - `userId` (text): Foreign key to user
  - `token` (text): Session token
  - `expiresAt` (timestamp): Session expiry
  - `ipAddress`, `userAgent`: Security metadata

- **verification**: Email verification tokens
  - `id` (text): Primary key
  - `identifier` (text): Email or phone
  - `value` (text): Verification code
  - `expiresAt` (timestamp): Token expiry

### Organization Tables

- **organization**: Organizations/workspaces
  - `id` (text): Primary key
  - `name` (text): Organization name
  - `slug` (text): Unique URL slug
  - `logo` (text): Logo URL
  - `allowedDomains` (text): Comma-separated email domains for auto-join

- **member**: Organization members
  - `id` (text): Primary key
  - `organizationId` (text): Foreign key to organization
  - `userId` (text): Foreign key to user
  - `role` (text): owner | admin | member
  - `createdAt` (timestamp): Join date

- **invitation**: Organization invitations
  - `id` (text): Primary key
  - `organizationId` (text): Foreign key to organization
  - `email` (text): Invitee email
  - `role` (text): Role to assign
  - `status` (text): pending | accepted | rejected | cancelled
  - `expiresAt` (timestamp): Invitation expiry
  - `inviterId` (text): User who sent invitation

## Usage Examples

### Sign Up

```typescript
await auth.signUp.email({
  email: "user@example.com",
  password: "secure-password",
  name: "John Doe",
});
```

### Sign In

```typescript
await auth.signIn.email({
  email: "user@example.com",
  password: "secure-password",
});
```

### Sign Out

```typescript
await auth.signOut();
```

### Get Current Session

```typescript
const { data: session } = auth.useSession();
// session.user - current user
// session.session - session info
```

### Create Organization

```typescript
await auth.organization.create({
  name: "Acme Corp",
  slug: "acme",
  metadata: { allowedDomains: "acme.com,acme.io" },
});
```

### Invite Member

```typescript
await auth.organization.inviteMember({
  organizationId: "org-id",
  email: "colleague@acme.com",
  role: "admin",
});
```

### List Organizations

```typescript
const { data: orgs } = auth.organization.list();
```

### Set Active Organization

```typescript
await auth.organization.setActive({
  organizationId: "org-id",
});
```

## Domain-Based Auto-Join

When a user signs up, the system automatically checks if their email domain matches any organization's `allowedDomains`:

1. User signs up with email `alice@acme.com`
2. System finds organization with `allowedDomains: "acme.com"`
3. User is automatically added as a `member` of that organization

This is implemented in the after hook in `apps/api/src/lib/auth.ts`:

```typescript
hooks: {
  after: [
    {
      matcher() { return true; },
      async handler(ctx) {
        if (ctx.context?.user && ctx.path === "/sign-up/email") {
          const user = ctx.context.user;
          const emailDomain = user.email.split("@")[1];

          // Find and join matching organizations
          const orgsWithDomain = await db
            .select()
            .from(organizationTable)
            .where(eq(organizationTable.allowedDomains, emailDomain));

          for (const org of orgsWithDomain) {
            await db.insert(member).values({
              organizationId: org.id,
              userId: user.id,
              role: "member",
            });
          }
        }
      },
    },
  ],
},
```

## GraphQL Integration

The GraphQL context includes authentication information:

```typescript
app.use("/graphql", expressMiddleware(server, {
  context: async ({ req }) => {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    return {
      user: session?.user || null,
      session: session?.session || null,
    };
  },
}));
```

Use in resolvers:

```typescript
const resolvers = {
  Query: {
    me: (parent, args, context) => {
      if (!context.user) {
        throw new Error("Not authenticated");
      }
      return context.user;
    },
  },
};
```

## Security Best Practices

### Production Checklist

1. **Set AUTH_SECRET**: Generate a secure 32+ character secret
   ```bash
   openssl rand -base64 32
   ```

2. **Enable email verification**: Set `requireEmailVerification: true`

3. **Configure email service**: Implement `sendInvitationEmail` hook

4. **Use HTTPS**: Set `BASE_URL` to HTTPS endpoint

5. **Set secure session settings**:
   - Use shorter expiry for sensitive apps
   - Enable `sameSite: "strict"` for cookies
   - Enable `secure: true` for production

6. **Rate limiting**: Better-auth includes built-in rate limiting

7. **Monitor sessions**: Track active sessions and allow users to revoke

### Password Requirements

- Minimum 8 characters (configurable via `minPasswordLength`)
- Maximum 128 characters (configurable via `maxPasswordLength`)
- Passwords are hashed using bcrypt

## Troubleshooting

### "No session found"

- Check that the session token cookie is being sent
- Verify `baseURL` in auth client matches API URL
- Check `trustedOrigins` in auth server config

### "User not found"

- Ensure user table is properly seeded
- Check database connection
- Verify foreign key constraints

### Email invitations not sending

- Implement `sendInvitationEmail` hook in auth config
- Configure email service (SendGrid, Resend, etc.)
- Check invitation expiry settings

## Migration from Old System

If you have existing users in the legacy `users` table:

1. Use the migration script at `apps/api/src/scripts/migrate-to-auth.sql`
2. This migrates UUID-based users to text-based better-auth format
3. Updates all foreign keys to reference new user table
4. Preserves password hashes in `account` table

## Additional Resources

- [Better-auth Documentation](https://better-auth.com/docs)
- [Organization Plugin](https://better-auth.com/docs/plugins/organization)
- [Drizzle Adapter](https://better-auth.com/docs/adapters/drizzle)
