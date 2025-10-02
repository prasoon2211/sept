import { db } from '../models/db.js';
import { cells } from '../models/schema.js';
import { eq } from 'drizzle-orm';

interface CellDependency {
  id: string;
  order: number;
  reads: string[];
  writes: string[];
}

/**
 * DAG Service for managing cell dependencies and reactive execution
 */
export const dagService = {
  /**
   * Build dependency graph for a project's cells
   * Returns a map of cell ID -> dependent cell IDs
   *
   * IMPORTANT: Respects cell order when handling variable redefinition.
   * If Cell 2 writes 'x' and Cell 4 writes 'x', then Cell 5 reading 'x'
   * depends ONLY on Cell 4 (the most recent write).
   */
  async buildDependencyGraph(projectId: string): Promise<Map<string, string[]>> {
    const projectCells = await db
      .select({
        id: cells.id,
        order: cells.order,
        reads: cells.reads,
        writes: cells.writes,
      })
      .from(cells)
      .where(eq(cells.projectId, projectId));

    // Sort cells by order (numeric)
    const sortedCells = projectCells
      .map((cell) => ({
        id: cell.id,
        order: parseInt(cell.order || '0', 10),
        reads: (cell.reads as string[]) || [],
        writes: (cell.writes as string[]) || [],
      }))
      .sort((a, b) => a.order - b.order);

    // Build dependency graph: cellId -> [dependent cell IDs]
    const dependencyGraph = new Map<string, string[]>();

    // Initialize all cells in graph
    sortedCells.forEach((cell) => {
      dependencyGraph.set(cell.id, []);
    });

    // For each cell that reads variables, find its dependencies
    for (let i = 0; i < sortedCells.length; i++) {
      const cell = sortedCells[i];
      if (cell.reads.length === 0) continue;

      // For each variable this cell reads, find the most recent writer
      const dependencies = new Set<string>();

      for (const readVar of cell.reads) {
        // Scan backwards from current cell to find most recent writer
        for (let j = i - 1; j >= 0; j--) {
          const prevCell = sortedCells[j];
          if (prevCell.writes.includes(readVar)) {
            dependencies.add(prevCell.id);
            break; // Found most recent writer, stop scanning
          }
        }
      }

      // Add this cell as a dependent of all its dependencies
      for (const depId of dependencies) {
        const existingDependents = dependencyGraph.get(depId) || [];
        existingDependents.push(cell.id);
        dependencyGraph.set(depId, existingDependents);
      }
    }

    return dependencyGraph;
  },

  /**
   * Get all downstream dependents of a cell (transitive closure)
   */
  async getAllDependents(
    cellId: string,
    projectId: string
  ): Promise<string[]> {
    const graph = await this.buildDependencyGraph(projectId);
    const visited = new Set<string>();
    const result: string[] = [];

    const dfs = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const directDependents = graph.get(id) || [];
      for (const dependentId of directDependents) {
        result.push(dependentId);
        dfs(dependentId);
      }
    };

    dfs(cellId);
    return result;
  },

  /**
   * Detect cycles in the dependency graph
   * Returns array of cell IDs involved in cycle, or empty array if no cycle
   */
  async detectCycles(projectId: string): Promise<string[]> {
    const graph = await this.buildDependencyGraph(projectId);
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycleNodes: string[] = [];

    const dfs = (cellId: string): boolean => {
      visited.add(cellId);
      recursionStack.add(cellId);

      const dependents = graph.get(cellId) || [];
      for (const dependentId of dependents) {
        if (!visited.has(dependentId)) {
          if (dfs(dependentId)) {
            cycleNodes.push(cellId);
            return true;
          }
        } else if (recursionStack.has(dependentId)) {
          // Found a cycle
          cycleNodes.push(cellId, dependentId);
          return true;
        }
      }

      recursionStack.delete(cellId);
      return false;
    };

    // Check all nodes (in case graph is disconnected)
    for (const cellId of graph.keys()) {
      if (!visited.has(cellId)) {
        if (dfs(cellId)) {
          return cycleNodes;
        }
      }
    }

    return [];
  },

  /**
   * Mark all dependent cells as stale when a cell's code changes
   */
  async markDependentsAsStale(cellId: string, projectId: string): Promise<number> {
    const dependents = await this.getAllDependents(cellId, projectId);

    if (dependents.length === 0) {
      return 0;
    }

    // Update all dependent cells to stale state
    const updates = dependents.map((depId) =>
      db
        .update(cells)
        .set({ executionState: 'stale' })
        .where(eq(cells.id, depId))
    );

    await Promise.all(updates);

    return dependents.length;
  },

  /**
   * Get topological sort of cells for "Run All" execution
   * Returns cells in order they should be executed
   */
  async getExecutionOrder(projectId: string): Promise<string[]> {
    const graph = await this.buildDependencyGraph(projectId);
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    // Calculate in-degree for each node
    for (const cellId of graph.keys()) {
      inDegree.set(cellId, 0);
    }

    for (const dependents of graph.values()) {
      for (const dependentId of dependents) {
        inDegree.set(dependentId, (inDegree.get(dependentId) || 0) + 1);
      }
    }

    // Start with nodes that have no dependencies
    for (const [cellId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(cellId);
      }
    }

    // Kahn's algorithm for topological sort
    while (queue.length > 0) {
      const cellId = queue.shift()!;
      result.push(cellId);

      const dependents = graph.get(cellId) || [];
      for (const dependentId of dependents) {
        const newDegree = (inDegree.get(dependentId) || 0) - 1;
        inDegree.set(dependentId, newDegree);

        if (newDegree === 0) {
          queue.push(dependentId);
        }
      }
    }

    // If result doesn't include all nodes, there's a cycle
    if (result.length !== graph.size) {
      throw new Error('Cannot compute execution order: circular dependency detected');
    }

    return result;
  },
};
