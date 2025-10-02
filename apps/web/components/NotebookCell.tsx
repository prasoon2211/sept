"use client";

import { memo } from "react";
import { CodeEditor } from "./CodeEditor";

interface Cell {
  id: string;
  type: "PYTHON" | "SQL" | "MARKDOWN";
  code: string;
  outputs: any[] | null;
  order: string;
  executionState?: string;
  isRunning?: boolean;
}

interface NotebookCellProps {
  cell: Cell;
  index: number;
  onUpdateCode: (id: string, code: string) => void;
  onRun: (id: string) => void;
  onDelete: (id: string) => void;
}

export const NotebookCell = memo(function NotebookCell({
  cell,
  index,
  onUpdateCode,
  onRun,
  onDelete,
}: NotebookCellProps) {
  const getStateIndicator = () => {
    if (cell.isRunning) {
      return <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Running</span>;
    }
    if (cell.executionState === 'stale') {
      return <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">Stale</span>;
    }
    if (cell.executionState === 'error') {
      return <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Error</span>;
    }
    if (cell.executionState === 'success') {
      return <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Success</span>;
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
            disabled={cell.isRunning}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cell.isRunning ? "Running..." : "Run"}
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
              {cell.outputs.map((output: any, i: number) => (
                <div key={i}>{output.data}</div>
              ))}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
});
