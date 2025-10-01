"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@apollo/client/react";
import { GET_PROJECT } from "@/lib/graphql/queries";
import { CREATE_CELL, UPDATE_CELL, DELETE_CELL, EXECUTE_CELL } from "@/lib/graphql/mutations";

interface Cell {
  id: string;
  type: "PYTHON" | "SQL" | "MARKDOWN";
  code: string;
  outputs: any[] | null;
  order: string;
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

  const [cells, setCells] = useState<Cell[]>([]);

  // Load cells from GraphQL data
  useEffect(() => {
    if (data?.project?.cells) {
      setCells(data.project.cells.map((cell: any) => ({
        ...cell,
        isRunning: false,
      })));
    }
  }, [data]);

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
        await refetch();
      }
    } catch (err) {
      console.error("Error creating cell:", err);
    }
  };

  const handleUpdateCellCode = async (id: string, code: string) => {
    // Update locally immediately for responsiveness
    setCells(cells.map((cell) => (cell.id === id ? { ...cell, code } : cell)));

    // Debounce the API call (you might want to add proper debouncing)
    try {
      await updateCell({
        variables: {
          id,
          input: { code },
        },
      });
    } catch (err) {
      console.error("Error updating cell:", err);
    }
  };

  const handleDeleteCell = async (id: string) => {
    try {
      await deleteCell({
        variables: { id },
      });
      await refetch();
    } catch (err) {
      console.error("Error deleting cell:", err);
    }
  };

  const handleRunCell = async (id: string) => {
    // Set running state
    setCells(cells.map((c) => (c.id === id ? { ...c, isRunning: true, outputs: null } : c)));

    try {
      const result = await executeCell({
        variables: { id },
      });

      if (result.data?.executeCell) {
        // Update cell with outputs
        setCells(
          cells.map((c) =>
            c.id === id
              ? { ...c, outputs: result.data.executeCell.outputs, isRunning: false }
              : c
          )
        );
      }
    } catch (err) {
      console.error("Error executing cell:", err);
      setCells(
        cells.map((c) =>
          c.id === id ? { ...c, outputs: [{ type: "error", data: String(err) }], isRunning: false } : c
        )
      );
    }
  };

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
              <div key={cell.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Cell Header */}
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-700">
                    Cell {index + 1} - {cell.type}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRunCell(cell.id)}
                      disabled={cell.isRunning}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cell.isRunning ? "Running..." : "Run"}
                    </button>
                    <button
                      onClick={() => handleDeleteCell(cell.id)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Code Editor */}
                <div className="p-4">
                  <textarea
                    value={cell.code || ""}
                    onChange={(e) => handleUpdateCellCode(cell.id, e.target.value)}
                    className="w-full h-32 font-mono text-sm border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your code here..."
                  />
                </div>

                {/* Output */}
                {cell.outputs && cell.outputs.length > 0 && (
                  <div className="px-4 pb-4">
                    <div className="bg-gray-900 text-gray-100 font-mono text-sm p-4 rounded">
                      <pre className="whitespace-pre-wrap">
                        {cell.outputs.map((output: any, i: number) => (
                          <div key={i}>{output.data}</div>
                        ))}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
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
