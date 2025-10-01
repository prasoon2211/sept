import { db } from '../models/db.js';
import { projects, cells, users, workspaces } from '../models/schema.js';
import { eq } from 'drizzle-orm';

// Ensure default workspace and user exist
async function ensureDefaultWorkspace() {
  const defaultUserId = '00000000-0000-0000-0000-000000000000';
  const defaultWorkspaceId = '00000000-0000-0000-0000-000000000000';

  // Check if default user exists
  const existingUser = await db.select().from(users).where(eq(users.id, defaultUserId));

  if (existingUser.length === 0) {
    await db.insert(users).values({
      id: defaultUserId,
      email: 'default@sept.dev',
      name: 'Default User',
    });
  }

  // Check if default workspace exists
  const existingWorkspace = await db.select().from(workspaces).where(eq(workspaces.id, defaultWorkspaceId));

  if (existingWorkspace.length === 0) {
    await db.insert(workspaces).values({
      id: defaultWorkspaceId,
      name: 'Default Workspace',
      slug: 'default',
    });
  }

  return { userId: defaultUserId, workspaceId: defaultWorkspaceId };
}

export const projectService = {
  async getAll() {
    return await db.select().from(projects);
  },

  async getById(id: string) {
    const result = await db.select().from(projects).where(eq(projects.id, id));
    return result[0] || null;
  },

  async create(input: { name: string; description?: string }) {
    // Ensure default workspace exists
    const { userId, workspaceId } = await ensureDefaultWorkspace();

    const result = await db
      .insert(projects)
      .values({
        name: input.name,
        description: input.description,
        workspaceId,
        createdBy: userId,
      })
      .returning();

    return result[0];
  },

  async update(id: string, input: { name?: string; description?: string }) {
    const result = await db
      .update(projects)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();

    return result[0] || null;
  },

  async delete(id: string) {
    await db.delete(projects).where(eq(projects.id, id));
    return true;
  },

  async getCellsByProjectId(projectId: string) {
    return await db.select().from(cells).where(eq(cells.projectId, projectId));
  },
};
