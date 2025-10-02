import { GraphQLScalarType, Kind } from "graphql";
import { projectService } from "../services/projects.js";
import { cellService } from "../services/cells.js";
import { dagService } from "../services/dag.js";
import { executionQueueService } from "../services/executionQueue.js";
import { pubsub, CELL_UPDATED, publishCellUpdate } from "../services/pubsub.js";
import { env } from "../env.js";

// DateTime scalar for proper date serialization
const dateTimeScalar = new GraphQLScalarType({
  name: "DateTime",
  description: "DateTime custom scalar type",
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
    hello: () => "Hello from Sept API!",
    projects: async () => {
      return await projectService.getAll();
    },
    project: async (_: any, { id }: { id: string }) => {
      return await projectService.getById(id);
    },
  },

  Mutation: {
    createProject: async (
      _: any,
      { input }: { input: { name: string; description?: string } }
    ) => {
      return await projectService.create(input);
    },
    updateProject: async (
      _: any,
      {
        id,
        input,
      }: { id: string; input: { name?: string; description?: string } }
    ) => {
      return await projectService.update(id, input);
    },
    deleteProject: async (_: any, { id }: { id: string }) => {
      return await projectService.delete(id);
    },
    toggleAutoExecute: async (_: any, { projectId }: { projectId: string }) => {
      const project = await projectService.getById(projectId);
      if (!project) {
        throw new Error("Project not found");
      }
      return await projectService.update(projectId, {
        autoExecute: !project.autoExecute,
      });
    },

    createCell: async (
      _: any,
      { projectId, input }: { projectId: string; input: any }
    ) => {
      return await cellService.create(projectId, input);
    },
    updateCell: async (_: any, { id, input }: { id: string; input: any }) => {
      return await cellService.update(id, input);
    },
    deleteCell: async (_: any, { id }: { id: string }) => {
      return await cellService.delete(id);
    },

    executeCell: async (_: any, { id }: { id: string }) => {
      // Just enqueue the cell - execution happens in background queue
      await executionQueueService.enqueue(id);

      // Return immediately - cell is now queued
      const cell = await cellService.getById(id);
      return {
        success: true,
        outputs: [],
        error: null,
        cellId: id,
        executionState: cell?.executionState || "queued",
      };
    },

    markCellDependentsStale: async (_: any, { cellId }: { cellId: string }) => {
      const cell = await cellService.getById(cellId);
      if (!cell) {
        throw new Error("Cell not found");
      }

      const dependents = await dagService.getAllDependents(
        cellId,
        cell.projectId
      );

      if (dependents.length > 0) {
        await dagService.markDependentsAsStale(cellId, cell.projectId);

        // Publish updates for each stale cell so UI updates in real-time
        for (const dependentId of dependents) {
          const staleCell = await cellService.getById(dependentId);
          if (staleCell) {
            publishCellUpdate(cell.projectId, staleCell);
          }
        }
      }

      return {
        staleCellIds: dependents,
        count: dependents.length,
      };
    },
  },

  Subscription: {
    cellUpdated: {
      subscribe: (_: any, { projectId }: { projectId: string }) => {
        return pubsub.asyncIterator(`${CELL_UPDATED}_${projectId}`);
      },
    },
  },

  Project: {
    cells: async (parent: any) => {
      return await projectService.getCellsByProjectId(parent.id);
    },
  },
};
