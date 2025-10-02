// Shared types across frontend and backend

export type UserRole = "admin" | "editor" | "viewer";

export type CellType = "python" | "sql" | "markdown" | "chart";

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: UserRole;
  createdAt: Date;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Cell {
  id: string;
  projectId: string;
  type: CellType;
  code?: string;
  outputs?: CellOutput[];
  metadata?: Record<string, any>;
  order: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CellOutput {
  type: "text" | "table" | "image" | "error";
  data: any;
}

export interface CellComment {
  id: string;
  cellId: string;
  userId: string;
  content: string;
  resolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  snapshot: any;
  createdBy: string;
  createdAt: Date;
}

export interface DataConnection {
  id: string;
  workspaceId: string;
  name: string;
  type: "snowflake" | "bigquery" | "redshift" | "postgres" | "duckdb";
  config: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Execution types
export interface ExecuteCodeRequest {
  code: string;
  language: "python" | "sql";
  sessionId?: string;
  connectionId?: string;
}

export interface ExecuteCodeResponse {
  success: boolean;
  outputs: CellOutput[];
  error?: string;
  sessionId: string;
}
