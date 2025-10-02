"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@apollo/client/react";
import { GET_PROJECT } from "@/lib/graphql/queries";
import { CREATE_CELL, UPDATE_CELL, DELETE_CELL, EXECUTE_CELL, MARK_CELL_DEPENDENTS_STALE } from "@/lib/graphql/mutations";
import { NotebookCell } from "@/components/NotebookCell";

interface Cell {
  id: string;
  type: "PYTHON" | "SQL" | "MARKDOWN";
  code: string;
  outputs: any[] | null;
  order: string;
  reads?: string[];
  writes?: string[];
  executionState?: string;
  lastExecutedAt?: string;
  isRunning?: boolean;
}

export default function NotebookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error, refetch } = useQuery(GET_PROJECT, {
    variables: { id },
  });

  const [createCell] = useMutation(CREATE_CELL);
  const [updateCell] = useMutation(UPDATE_CELL);
  const [deleteCell] = useMutation(DELETE_CELL);
  const [executeCell] = useMutation(EXECUTE_CELL);
  const [markDependentsStale] = useMutation(MARK_CELL_DEPENDENTS_STALE);

  const [cells, setCells] = useState<Cell[]>([]);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);

  // Load cells from GraphQL data only on initial load
  useEffect(() => {
    if (data?.project?.cells && !hasLoadedInitialData) {
      setCells(data.project.cells.map((cell: any) => ({
        ...cell,
        isRunning: false,
      })));
      setHasLoadedInitialData(true);
    }
  }, [data, hasLoadedInitialData]);

  const handleAddCell = async () => {
    try {
      const order = (cells.length + 1).toString();
      const result = await createCell({
        variables: {
          projectId: id,
          input: {
            type: "PYTHON",
            code: "",
            order,
          },
        },
      });

      if (result.data?.createCell) {
        // Add the new cell to local state instead of refetching
        setCells((prevCells) => [...prevCells, {
          ...result.data.createCell,
          isRunning: false,
          outputs: null,
        }]);
      }
    } catch (err) {
      console.error("Error creating cell:", err);
    }
  };

  const handleUpdateCellCode = useCallback(async (id: string, code: string) => {
    // Update locally immediately for responsiveness
    setCells((prevCells) => prevCells.map((cell) => (cell.id === id ? { ...cell, code } : cell)));

    // Debounce the API call (you might want to add proper debouncing)
    try {
      await updateCell({
        variables: {
          id,
          input: { code },
        },
      });

      // Mark dependent cells as stale when code changes
      const result = await markDependentsStale({
        variables: { cellId: id },
      });

      if (result.data?.markCellDependentsStale.staleCellIds.length > 0) {
        // Update local state to mark cells as stale
        const staleCellIds = result.data.markCellDependentsStale.staleCellIds;
        setCells((prevCells) =>
          prevCells.map((cell) =>
            staleCellIds.includes(cell.id) ? { ...cell, executionState: 'stale' } : cell
          )
        );
      }
    } catch (err) {
      console.error("Error updating cell:", err);
    }
  }, [updateCell, markDependentsStale]);

  const handleDeleteCell = useCallback(async (id: string) => {
    try {
      await deleteCell({
        variables: { id },
      });
      // Remove from local state instead of refetching
      setCells((prevCells) => prevCells.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Error deleting cell:", err);
    }
  }, [deleteCell]);

  const handleRunCell = useCallback(async (id: string) => {
    // Set running state
    setCells((prevCells) => prevCells.map((c) => (c.id === id ? { ...c, isRunning: true, outputs: null, executionState: 'running' } : c)));

    try {
      const result = await executeCell({
        variables: { id },
      });

      if (result.data?.executeCell) {
        // Update cell with outputs and execution state
        setCells((prevCells) =>
          prevCells.map((c) =>
            c.id === id
              ? {
                  ...c,
                  outputs: result.data.executeCell.outputs,
                  isRunning: false,
                  executionState: result.data.executeCell.success ? 'success' : 'error'
                }
              : c
          )
        );
      }
    } catch (err) {
      console.error("Error executing cell:", err);
      setCells((prevCells) =>
        prevCells.map((c) =>
          c.id === id ? { ...c, outputs: [{ type: "error", data: String(err) }], isRunning: false, executionState: 'error' } : c
        )
      );
    }
  }, [executeCell]);

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
        <p className="text-red-600">Error loading project: {error?.message || "Not found"}</p>
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
            <h1 className="text-xl font-semibold text-gray-900">{project.name}</h1>
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
            cells.map((cell, index) => (
              <NotebookCell
                key={cell.id}
                cell={cell}
                index={index}
                onUpdateCode={handleUpdateCellCode}
                onRun={handleRunCell}
                onDelete={handleDeleteCell}
              />
            ))
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
