"use client";

import { memo } from "react";
import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: "python" | "sql" | "markdown";
  height?: string;
  readOnly?: boolean;
}

export const CodeEditor = memo(function CodeEditor({
  value,
  onChange,
  language = "python",
  height = "200px",
  readOnly = false,
}: CodeEditorProps) {
  return (
    <Editor
      height={height}
      defaultLanguage={language}
      language={language}
      value={value}
      onChange={(value) => onChange(value || "")}
      theme="vs-dark"
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        wordWrap: "on",
        padding: { top: 10, bottom: 10 },
        suggestOnTriggerCharacters: true,
        quickSuggestions: true,
        folding: true,
        renderLineHighlight: "line",
        scrollbar: {
          vertical: "visible",
          horizontal: "visible",
          useShadows: false,
        },
      }}
    />
  );
});
