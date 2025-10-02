import { db } from "../models/db.js";
import { cells, projects } from "../models/schema.js";
import { eq, and, asc } from "drizzle-orm";
import { cellService } from "./cells.js";
import { projectService } from "./projects.js";
import { dagService } from "./dag.js";
import { publishCellUpdate } from "./pubsub.js";
import { env } from "../env.js";

interface ExecutionResult {
  success: boolean;
  outputs: any[];
  error?: string;
  dependencies?: {
    reads: string[];
    writes: string[];
  };
}

class ExecutionQueueService {
  // Map of projectId to worker promise
  private workers: Map<string, Promise<void>> = new Map();
  private stopSignals: Map<string, boolean> = new Map();

  /**
   * Enqueue a cell for execution
   */
  async enqueue(cellId: string): Promise<void> {
    const cell = await cellService.getById(cellId);
    if (!cell) {
      throw new Error("Cell not found");
    }

    // Update cell to queued state
    await cellService.update(cellId, {
      executionState: "queued",
      queuedAt: new Date(),
    });

    // Publish update
    const updatedCell = await cellService.getById(cellId);
    if (updatedCell) {
      publishCellUpdate(cell.projectId, updatedCell);
    }

    console.log(`Cell ${cellId} queued for execution`);

    // Ensure worker is running for this project
    this.ensureWorkerRunning(cell.projectId);
  }

  /**
   * Ensure a queue worker is running for the project
   */
  private ensureWorkerRunning(projectId: string): void {
    if (this.workers.has(projectId)) {
      // Worker already running
      return;
    }

    console.log(`Starting execution queue worker for project ${projectId}`);

    // Start the worker
    const workerPromise = this.processQueue(projectId);
    this.workers.set(projectId, workerPromise);

    // Clean up when worker finishes
    workerPromise.finally(() => {
      this.workers.delete(projectId);
      this.stopSignals.delete(projectId);
      console.log(`Execution queue worker stopped for project ${projectId}`);
    });
  }

  /**
   * Process the execution queue for a project
   */
  private async processQueue(projectId: string): Promise<void> {
    this.stopSignals.set(projectId, false);

    while (!this.stopSignals.get(projectId)) {
      try {
        // Get next queued cell (FIFO by queuedAt)
        const queuedCells = await db
          .select()
          .from(cells)
          .where(
            and(
              eq(cells.projectId, projectId),
              eq(cells.executionState, "queued"),
            ),
          )
          .orderBy(asc(cells.queuedAt))
          .limit(1);

        if (queuedCells.length === 0) {
          // No work to do, wait a bit
          await this.sleep(100);
          continue;
        }

        const cell = queuedCells[0];
        await this.executeCell(cell.id);
      } catch (error) {
        console.error(
          `❌ Error in queue worker for project ${projectId}:`,
          error,
        );
        await this.sleep(1000); // Wait longer on error
      }
    }
  }

  /**
   * Execute a single cell
   */
  private async executeCell(cellId: string): Promise<void> {
    const cell = await cellService.getById(cellId);
    if (!cell) {
      console.error(`Cell ${cellId} not found`);
      return;
    }

    const startTime = Date.now();

    try {
      console.log(`Executing cell ${cellId}...`);

      // 1. Mark as running
      await cellService.update(cellId, {
        executionState: "running",
        queuedAt: null, // Clear queued timestamp
      });

      // Publish running state
      const runningCell = await cellService.getById(cellId);
      if (runningCell) {
        publishCellUpdate(cell.projectId, runningCell);
      }

      // 2. Call compute service
      const response = await fetch(`${env.COMPUTE_SERVICE_URL}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: cell.code,
          language: cell.type,
          session_id: cell.projectId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Compute service error: ${response.statusText}`);
      }

      const result = (await response.json()) as ExecutionResult;
      const duration = Date.now() - startTime;

      // 3. Update cell with results
      await cellService.update(cellId, {
        executionState: result.success ? "success" : "error",
        outputs: result.outputs,
        reads: result.dependencies?.reads || [],
        writes: result.dependencies?.writes || [],
        lastExecutedAt: new Date(),
        executionDuration: `${duration}ms`,
      });

      // Publish success/error state
      const completedCell = await cellService.getById(cellId);
      if (completedCell) {
        publishCellUpdate(cell.projectId, completedCell);
      }

      console.log(`Cell ${cellId} executed successfully in ${duration}ms`);

      // 4. Queue dependent cells if reactive mode enabled and execution succeeded
      if (result.success) {
        await this.queueDependents(cellId, cell.projectId);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Cell ${cellId} execution failed:`, error);

      // Update cell with error
      await cellService.update(cellId, {
        executionState: "error",
        outputs: [
          {
            type: "error",
            data: error instanceof Error ? error.message : String(error),
          },
        ],
        lastExecutedAt: new Date(),
        executionDuration: `${duration}ms`,
      });

      // Publish error state
      const errorCell = await cellService.getById(cellId);
      if (errorCell) {
        publishCellUpdate(cell.projectId, errorCell);
      }
    }
  }

  /**
   * Queue dependent cells if reactive mode is enabled
   */
  private async queueDependents(
    cellId: string,
    projectId: string,
  ): Promise<void> {
    try {
      // Check if reactive mode is enabled
      const project = await projectService.getById(projectId);
      if (!project?.autoExecute) {
        return;
      }

      // Get immediate dependents from DAG
      const graph = await dagService.buildDependencyGraph(projectId);
      const dependents = graph.get(cellId) || [];

      if (dependents.length === 0) {
        return;
      }

      console.log(`🔄 Queueing ${dependents.length} dependent cells...`);

      // Queue each dependent
      for (const dependentId of dependents) {
        await this.enqueue(dependentId);
      }
    } catch (error) {
      console.error(`Error queueing dependents for cell ${cellId}:`, error);
    }
  }

  /**
   * Stop the worker for a project
   */
  stopWorker(projectId: string): void {
    this.stopSignals.set(projectId, true);
  }

  /**
   * Sleep for ms milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get queue status for a project
   */
  async getQueueStatus(projectId: string): Promise<{
    queued: number;
    running: number;
    workerActive: boolean;
  }> {
    const allCells = await db
      .select()
      .from(cells)
      .where(eq(cells.projectId, projectId));

    const queued = allCells.filter((c) => c.executionState === "queued").length;
    const running = allCells.filter(
      (c) => c.executionState === "running",
    ).length;
    const workerActive = this.workers.has(projectId);

    return { queued, running, workerActive };
  }
}

export const executionQueueService = new ExecutionQueueService();
