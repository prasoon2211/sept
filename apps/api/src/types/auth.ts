/**
 * Authentication and Authorization Types
 * These types match the better-auth schema and are used in GraphQL context
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug?: string | null;
  logo?: string | null;
  allowedDomains?: string | null;
  metadata?: string | null;
  createdAt: Date;
}

export interface Member {
  id: string;
  organizationId: string;
  userId: string;
  role: "owner" | "admin" | "member";
  createdAt: Date;
}

export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role?: string | null;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  expiresAt: Date;
  inviterId: string;
}

/**
 * GraphQL Context with authentication
 */
export interface GraphQLContext {
  user: AuthUser | null;
  session: AuthSession | null;
  // Add other context properties as needed
  pubsub: any; // Replace with proper PubSub type
}

/**
 * Type guards for authentication
 */
export function isAuthenticated(
  context: GraphQLContext
): context is GraphQLContext & { user: AuthUser; session: AuthSession } {
  return context.user !== null && context.session !== null;
}

/**
 * Authorization helpers
 */
export function requireAuth(context: GraphQLContext): AuthUser {
  if (!context.user) {
    throw new Error("Not authenticated");
  }
  return context.user;
}

export function requireRole(
  member: Member | null | undefined,
  allowedRoles: Array<"owner" | "admin" | "member">
): void {
  if (!member) {
    throw new Error("Not a member of this organization");
  }
  if (!allowedRoles.includes(member.role)) {
    throw new Error(`Insufficient permissions. Required: ${allowedRoles.join(" or ")}`);
  }
}
