"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useSubscription } from "@apollo/client/react";
import { GET_PROJECT, CELL_UPDATED_SUBSCRIPTION } from "@/lib/graphql/queries";
import {
  CREATE_CELL,
  UPDATE_CELL,
  DELETE_CELL,
  EXECUTE_CELL,
  MARK_CELL_DEPENDENTS_STALE,
  TOGGLE_AUTO_EXECUTE,
} from "@/lib/graphql/mutations";
import { NotebookCell } from "@/components/NotebookCell";

interface CellOutput {
  type: string;
  data: string;
}

interface Cell {
  id: string;
  type: "PYTHON" | "SQL" | "MARKDOWN";
  code: string;
  outputs: CellOutput[] | null;
  order: string;
  reads?: string[];
  writes?: string[];
  executionState?: string;
  lastExecutedAt?: string;
  queuedAt?: string;
  executionDuration?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  autoExecute: boolean;
  cells: Cell[];
}

export default function NotebookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  // Initial data fetch
  const { data, loading, error } = useQuery<{ project: Project }>(GET_PROJECT, {
    variables: { id },
    fetchPolicy: "cache-and-network",
  });

  // Subscribe to real-time cell updates
  useSubscription(CELL_UPDATED_SUBSCRIPTION, {
    variables: { projectId: id },
    skip: !id,
    shouldResubscribe: false,
    // Apollo automatically merges updates for existing cells by ID
  });

  // Mutations
  const [createCell] = useMutation(CREATE_CELL, {
    refetchQueries: [{ query: GET_PROJECT, variables: { id } }],
  });
  const [updateCell] = useMutation(UPDATE_CELL);
  const [deleteCell] = useMutation(DELETE_CELL, {
    refetchQueries: [{ query: GET_PROJECT, variables: { id } }],
  });
  const [executeCell] = useMutation(EXECUTE_CELL);
  const [markDependentsStale] = useMutation(MARK_CELL_DEPENDENTS_STALE);
  const [toggleAutoExecute] = useMutation(TOGGLE_AUTO_EXECUTE, {
    refetchQueries: [{ query: GET_PROJECT, variables: { id } }],
  });

  // Get cells and autoExecute directly from GraphQL cache (no local state)
  const cells: Cell[] = data?.project?.cells || [];
  const autoExecute = data?.project?.autoExecute ?? true;

  // Local state for optimistic updates (UI responsiveness)
  const [localCellCode, setLocalCellCode] = useState<Record<string, string>>(
    {},
  );

  // Track which cells have unsaved changes
  const [unsavedCells, setUnsavedCells] = useState<Set<string>>(new Set());

  // Debounce timers for auto-save
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      Object.values(timers).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const handleAddCell = useCallback(async () => {
    try {
      const order = (cells.length + 1).toString();
      await createCell({
        variables: {
          projectId: id,
          input: {
            type: "PYTHON",
            code: "",
            order,
          },
        },
      });
      // Refetch will happen automatically via refetchQueries
    } catch (err) {
      console.error("Error creating cell:", err);
    }
  }, [cells.length, id, createCell]);

  const handleUpdateCellCode = useCallback(
    (cellId: string, code: string) => {
      // Update local state immediately for responsive UI
      setLocalCellCode((prev) => ({ ...prev, [cellId]: code }));

      // Mark cell as having unsaved changes
      setUnsavedCells((prev) => new Set(prev).add(cellId));

      // Clear existing timer for this cell
      if (debounceTimers.current[cellId]) {
        clearTimeout(debounceTimers.current[cellId]);
      }

      // Set new timer to save after 1 second of inactivity
      debounceTimers.current[cellId] = setTimeout(async () => {
        try {
          await updateCell({
            variables: {
              id: cellId,
              input: { code },
            },
          });

          // Mark dependent cells as stale when code changes
          await markDependentsStale({
            variables: { cellId },
          });

          // Clear local state after successful save
          setLocalCellCode((prev) => {
            const newState = { ...prev };
            delete newState[cellId];
            return newState;
          });

          // Mark cell as saved
          setUnsavedCells((prev) => {
            const newSet = new Set(prev);
            newSet.delete(cellId);
            return newSet;
          });
        } catch (err) {
          console.error("Error updating cell:", err);
        }
      }, 1000); // 1 second debounce
    },
    [updateCell, markDependentsStale],
  );

  const handleDeleteCell = useCallback(
    async (cellId: string) => {
      try {
        await deleteCell({
          variables: { id: cellId },
        });
        // Refetch will happen automatically via refetchQueries
      } catch (err) {
        console.error("Error deleting cell:", err);
      }
    },
    [deleteCell],
  );

  const handleToggleAutoExecute = useCallback(async () => {
    try {
      await toggleAutoExecute({
        variables: { projectId: id },
      });
      // Refetch will happen automatically via refetchQueries
    } catch (err) {
      console.error("Error toggling auto-execute:", err);
    }
  }, [id, toggleAutoExecute]);

  const handleRunCell = useCallback(
    async (cellId: string) => {
      try {
        // Just call executeCell - it will enqueue the cell
        // Subscription will update UI with queued → running → success/error
        await executeCell({
          variables: { id: cellId },
        });
      } catch (err) {
        console.error("Error executing cell:", err);
      }
    },
    [executeCell],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading notebook...</p>
      </div>
    );
  }

  if (error || !data?.project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-600">
          Error loading project: {error?.message || "Not found"}
        </p>
      </div>
    );
  }

  const project = data.project;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-blue-600 hover:text-blue-700">
              ← Back
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">
              {project.name}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoExecute}
                onChange={handleToggleAutoExecute}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Reactive Mode</span>
            </label>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-4">
          {cells.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No cells yet</p>
              <button
                onClick={handleAddCell}
                className="text-blue-600 hover:text-blue-700"
              >
                Add your first cell
              </button>
            </div>
          ) : (
            cells.map((cell, index) => {
              // Use local code if available (during debounce period), otherwise use saved code
              const cellWithLocalCode = {
                ...cell,
                code: localCellCode[cell.id] ?? cell.code,
              };
              return (
                <NotebookCell
                  key={cell.id}
                  cell={cellWithLocalCode}
                  index={index}
                  onUpdateCode={handleUpdateCellCode}
                  onRun={handleRunCell}
                  onDelete={handleDeleteCell}
                  hasUnsavedChanges={unsavedCells.has(cell.id)}
                />
              );
            })
          )}

          {/* Add Cell Button */}
          <button
            onClick={handleAddCell}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
          >
            + Add Cell
          </button>
        </div>
      </main>
    </div>
  );
}
