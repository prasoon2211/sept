import { db } from '../models/db.js';
import { cells } from '../models/schema.js';
import { eq } from 'drizzle-orm';

interface CreateCellInput {
  type: 'python' | 'sql' | 'markdown' | 'chart';
  code?: string;
  order: string;
}

interface UpdateCellInput {
  type?: 'python' | 'sql' | 'markdown' | 'chart';
  code?: string;
  order?: string;
  outputs?: any;
  reads?: string[];
  writes?: string[];
  executionState?: string;
  lastExecutedAt?: Date;
}

export const cellService = {
  async create(projectId: string, input: CreateCellInput) {
    const result = await db
      .insert(cells)
      .values({
        projectId,
        type: input.type,
        code: input.code || '',
        order: input.order,
        outputs: null,
      })
      .returning();

    return result[0];
  },

  async update(id: string, input: UpdateCellInput) {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (input.type) updateData.type = input.type;
    if (input.code !== undefined) updateData.code = input.code;
    if (input.order) updateData.order = input.order;
    if (input.outputs !== undefined) updateData.outputs = input.outputs;
    if (input.reads !== undefined) updateData.reads = input.reads;
    if (input.writes !== undefined) updateData.writes = input.writes;
    if (input.executionState) updateData.executionState = input.executionState;
    if (input.lastExecutedAt) updateData.lastExecutedAt = input.lastExecutedAt;

    const result = await db
      .update(cells)
      .set(updateData)
      .where(eq(cells.id, id))
      .returning();

    return result[0] || null;
  },

  async delete(id: string) {
    await db.delete(cells).where(eq(cells.id, id));
    return true;
  },

  async getById(id: string) {
    const result = await db.select().from(cells).where(eq(cells.id, id));
    return result[0] || null;
  },
};
