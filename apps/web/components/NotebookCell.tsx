"use client";

import { memo } from "react";
import { CodeEditor } from "./CodeEditor";

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
  executionState?: string;
  queuedAt?: string;
  executionDuration?: string;
}

interface NotebookCellProps {
  cell: Cell;
  index: number;
  onUpdateCode: (id: string, code: string) => void;
  onRun: (id: string) => void;
  onDelete: (id: string) => void;
}

export const NotebookCell = memo(
  function NotebookCell({
    cell,
    index,
    onUpdateCode,
    onRun,
    onDelete,
  }: NotebookCellProps) {
    const getStateIndicator = () => {
      if (cell.executionState === "queued") {
        return (
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
            Queued
          </span>
        );
      }
      if (cell.executionState === "running") {
        return (
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded animate-pulse">
            Running
          </span>
        );
      }
      if (cell.executionState === "stale") {
        return (
          <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">
            Stale
          </span>
        );
      }
      if (cell.executionState === "error") {
        return (
          <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
            Error
          </span>
        );
      }
      if (cell.executionState === "success") {
        return (
          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
            Success
          </span>
        );
      }
      return null;
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Cell Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              Cell {index + 1} - {cell.type}
            </span>
            {getStateIndicator()}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRun(cell.id)}
              disabled={
                cell.executionState === "queued" ||
                cell.executionState === "running"
              }
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cell.executionState === "queued" ||
              cell.executionState === "running"
                ? "Running..."
                : "Run"}
            </button>
            <button
              onClick={() => onDelete(cell.id)}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Code Editor */}
        <div className="p-4">
          <CodeEditor
            value={cell.code || ""}
            onChange={(value) => onUpdateCode(cell.id, value)}
            language={cell.type.toLowerCase() as "python" | "sql" | "markdown"}
            height="200px"
          />
        </div>

        {/* Output */}
        {cell.outputs && cell.outputs.length > 0 && (
          <div className="px-4 pb-4">
            <div className="bg-gray-900 text-gray-100 font-mono text-sm p-4 rounded">
              <pre className="whitespace-pre-wrap">
                {cell.outputs.map((output, i) => (
                  <div key={i}>{output.data}</div>
                ))}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prevProps.cell.id === nextProps.cell.id &&
      prevProps.cell.code === nextProps.cell.code &&
      prevProps.cell.executionState === nextProps.cell.executionState &&
      prevProps.cell.queuedAt === nextProps.cell.queuedAt &&
      JSON.stringify(prevProps.cell.outputs) ===
        JSON.stringify(nextProps.cell.outputs) &&
      prevProps.index === nextProps.index
    );
  },
);
