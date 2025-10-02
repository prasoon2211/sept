/**
 * Custom authentication hooks
 * Implements domain-based auto-join and other auth-related logic
 */

import { db } from "../models/db.js";
import { organization, member } from "../models/schema.js";
import { eq, like, or, and } from "drizzle-orm";

/**
 * Auto-join organizations based on email domain after user signup
 */
export async function autoJoinOrganizationsByDomain(
  userId: string,
  userEmail: string
): Promise<void> {
  const emailDomain = userEmail.split("@")[1];
  if (!emailDomain) return;

  try {
    // Find organizations that allow this domain
    // Check for exact match or comma-separated list containing the domain
    const orgsWithDomain = await db
      .select()
      .from(organization)
      .where(
        or(
          eq(organization.allowedDomains, emailDomain),
          like(organization.allowedDomains, `${emailDomain},%`),
          like(organization.allowedDomains, `%,${emailDomain},%`),
          like(organization.allowedDomains, `%,${emailDomain}`)
        )
      );

    // Auto-add user to matching organizations
    for (const org of orgsWithDomain) {
      if (!org.allowedDomains) continue;

      // Check if domain is in the comma-separated list
      const domains = org.allowedDomains.split(",").map((d) => d.trim());
      if (!domains.includes(emailDomain)) continue;

      // Check if user is not already a member
      const existingMember = await db
        .select()
        .from(member)
        .where(
          and(
            eq(member.userId, userId),
            eq(member.organizationId, org.id)
          )
        )
        .limit(1);

      if (existingMember.length === 0) {
        await db.insert(member).values({
          id: crypto.randomUUID(),
          organizationId: org.id,
          userId: userId,
          role: "member",
          createdAt: new Date(),
        });

        console.log(
          `Auto-joined user ${userEmail} to organization ${org.name} based on domain ${emailDomain}`
        );
      }
    }
  } catch (error) {
    console.error("Error in auto-join organizations:", error);
    // Don't throw - we don't want to block signup if auto-join fails
  }
}
