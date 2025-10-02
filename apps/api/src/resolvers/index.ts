import { GraphQLScalarType, Kind } from 'graphql';
import { projectService } from '../services/projects.js';
import { cellService } from '../services/cells.js';
import { dagService } from '../services/dag.js';
import { env } from '../env.js';

// DateTime scalar for proper date serialization
const dateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  serialize(value: any) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  },
  parseValue(value: any) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

export const resolvers = {
  DateTime: dateTimeScalar,

  Query: {
    hello: () => 'Hello from Sept API!',
    projects: async () => {
      return await projectService.getAll();
    },
    project: async (_: any, { id }: { id: string }) => {
      return await projectService.getById(id);
    },
  },

  Mutation: {
    createProject: async (_: any, { input }: { input: { name: string; description?: string } }) => {
      return await projectService.create(input);
    },
    updateProject: async (_: any, { id, input }: { id: string; input: { name?: string; description?: string } }) => {
      return await projectService.update(id, input);
    },
    deleteProject: async (_: any, { id }: { id: string }) => {
      return await projectService.delete(id);
    },

    createCell: async (_: any, { projectId, input }: { projectId: string; input: any }) => {
      return await cellService.create(projectId, input);
    },
    updateCell: async (_: any, { id, input }: { id: string; input: any }) => {
      return await cellService.update(id, input);
    },
    deleteCell: async (_: any, { id }: { id: string }) => {
      return await cellService.delete(id);
    },

    executeCell: async (_: any, { id }: { id: string }) => {
      const cell = await cellService.getById(id);
      if (!cell) {
        throw new Error('Cell not found');
      }

      // Mark cell as running
      await cellService.update(id, {
        executionState: 'running',
      });

      // Call compute service with project ID as session ID for kernel persistence
      const response = await fetch(`${env.COMPUTE_SERVICE_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: cell.code,
          language: cell.type,
          session_id: cell.projectId, // Use project ID as session for persistent kernel
        }),
      });

      const result = await response.json();

      // Update cell with outputs, dependencies, and execution state
      await cellService.update(id, {
        outputs: result.outputs,
        reads: result.dependencies?.reads || [],
        writes: result.dependencies?.writes || [],
        executionState: result.success ? 'success' : 'error',
        lastExecutedAt: new Date(),
      });

      return {
        success: result.success,
        outputs: result.outputs,
        error: result.error,
      };
    },

    markCellDependentsStale: async (_: any, { cellId }: { cellId: string }) => {
      const cell = await cellService.getById(cellId);
      if (!cell) {
        throw new Error('Cell not found');
      }

      const dependents = await dagService.getAllDependents(cellId, cell.projectId);

      if (dependents.length > 0) {
        await dagService.markDependentsAsStale(cellId, cell.projectId);
      }

      return {
        staleCellIds: dependents,
        count: dependents.length,
      };
    },
  },

  Project: {
    cells: async (parent: any) => {
      return await projectService.getCellsByProjectId(parent.id);
    },
  },
};
