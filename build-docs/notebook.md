# Sept Notebook Architecture
**Version:** 1.0
**Last Updated:** 2025-10-01

## Vision

Build an exceptional data notebook that solves Jupyter's fundamental problems while matching Hex's capabilities. The notebook must be reproducible, reactive, collaborative, and production-ready.

---

## Core Principles

1. **Reactive Execution**: Cells automatically re-run when dependencies change
2. **DAG-Based Computation**: Model projects as directed acyclic graphs, not linear sequences
3. **No Out-of-Order Execution**: Eliminate hidden state and reproducibility issues
4. **80/20 Implementation**: Focus on high-impact features that provide maximum value
5. **AI-First**: Architecture supports AI chat that can reference and modify individual cells

---

## 1. Execution Model

### 1.1 Reactive Compute Engine

**Problem with Jupyter:**
- Linear execution order creates hidden state
- Out-of-order execution causes reproducibility issues
- No way to know if notebook is in valid state
- Requires "Restart & Run All" to verify correctness

**Our Solution:**
- **Dependency Graph**: Parse each cell's code to extract variable reads/writes
- **Automatic Re-execution**: When cell X changes, automatically re-run all cells that depend on X's outputs
- **Smart Caching**: Only re-run cells whose inputs have changed
- **Visual Feedback**: Show dependency relationships and execution state

**Data Structure:**
```
Cell {
  id: uuid
  code: string
  type: "python" | "sql" | "markdown" | "input" | "chart"
  order: number

  // Execution metadata
  executionState: "idle" | "running" | "success" | "error" | "stale"
  lastExecutedAt: timestamp
  executionDuration: milliseconds

  // Dependency tracking
  reads: string[]        // Variables this cell reads
  writes: string[]       // Variables this cell writes
  dependencies: uuid[]   // Cell IDs this cell depends on
  dependents: uuid[]     // Cell IDs that depend on this cell

  // Outputs
  outputs: CellOutput[]

  // Metadata
  collapsed: boolean
  hidden: boolean
  title: string?
}

CellOutput {
  type: "text" | "table" | "chart" | "image" | "html" | "error"
  data: any
  timestamp: timestamp
}
```

**Implementation Approach:**
1. **Phase 1**: Static analysis of Python AST to extract variable dependencies
2. **Phase 2**: Build dependency DAG and detect cycles
3. **Phase 3**: Implement reactive execution scheduler
4. **Phase 4**: Add smart invalidation (only re-run when actual values change, not just code)

### 1.2 Execution Modes

**Run All**
- Execute entire DAG in topological order
- Guarantees fresh, reproducible state
- Used for: Publishing, scheduling, initial load

**Reactive Run**
- Execute only invalidated cells and their dependents
- Triggered by: Cell code change, input widget change, SQL query change
- Performance optimization: Skip cells with unchanged inputs

**Manual Run**
- User explicitly runs one cell
- Shows warning if dependencies are stale
- Option to "Run with dependencies" - executes upstream cells first

### 1.3 Kernel Session Management

**Per-Project Kernels:**
- Each project gets one persistent Jupyter kernel
- Kernel lifetime matches project editing session
- Idle kernels shut down after 30 minutes

**State Management:**
- Kernel state is the source of truth for variable values
- On project load: Execute all cells in DAG order to rebuild state
- On cell edit: Invalidate dependent cells but keep kernel state
- "Restart Kernel" button: Clear all state and re-run

---

## 2. Cell Types

### 2.1 Python Cell
- Standard code execution in Jupyter kernel
- Syntax highlighting via Monaco
- Variable inspector integration
- Automatic dependency detection via AST parsing

### 2.2 SQL Cell
- Query databases via data connections
- Result preview with pagination
- Automatic schema detection and autocomplete
- Results stored as pandas DataFrame in kernel
- Variable binding: `WHERE user_id = {{user_id_input}}`

### 2.3 Markdown Cell
- Rich text editing
- LaTeX math support
- Variable interpolation: `The count is {{count}}`
- Collapsible sections

### 2.4 Input Cell (Interactive Widgets)
- Text input, number input, date picker
- Dropdown, multi-select
- Slider (single value, range)
- Checkbox, radio buttons
- File upload

**Behavior:**
- Creates a variable in kernel (e.g., `user_input = "value"`)
- Widget value changes trigger reactive re-execution
- Persisted with project state

### 2.5 Chart Cell
- Plotly-based visualization
- Configuration UI for chart type, axes, styling
- Binds to DataFrames in kernel
- Reactive: Updates when source data changes
- Interactive: Brush/zoom triggers downstream cells

---

## 3. Data Connections

### 3.1 Connection Types
- PostgreSQL, MySQL
- Snowflake, BigQuery, Redshift
- DuckDB (local files)
- CSV/Parquet file upload

### 3.2 Connection Architecture

**Database Schema:**
```
data_connections {
  id: uuid
  project_id: uuid
  name: string
  type: "postgres" | "snowflake" | "bigquery" | "duckdb"
  credentials: encrypted_json
  schema_cache: json (tables, columns, types)
  last_refreshed: timestamp
}
```

**Connection Pooling:**
- Shared connection pool per workspace
- Lazy initialization on first query
- Connection kept alive during project session
- Timeout and retry logic

**Schema Introspection:**
- On connection create: Fetch all tables/columns
- Cache schema for autocomplete
- Background refresh every 24 hours
- Manual refresh button

### 3.3 SQL Cell Integration
- Dropdown to select data connection
- Autocomplete for table/column names
- Query results stored as variable: `df = sql_cell_1`
- Result preview with sorting/filtering
- Export to CSV/Parquet

---

## 4. File Management

### 4.1 Project Files

**Storage:**
- Files stored in S3/object storage
- Database stores metadata and file pointers
- Max file size: 100MB per file

**Database Schema:**
```
project_files {
  id: uuid
  project_id: uuid
  name: string
  path: string (S3 key)
  size_bytes: number
  mime_type: string
  uploaded_at: timestamp
  uploaded_by: user_id
}
```

**Access from Code:**
- Files mounted at `/project/files/` in kernel environment
- Python: `pd.read_csv('/project/files/data.csv')`
- Automatic file sync when kernel starts

### 4.2 File Upload Cell
- Drag-and-drop interface
- Upload progress indicator
- Immediately available to downstream cells
- Version history (future)

---

## 5. Output Rendering

### 5.1 Rich Output Types

**Text Output:**
- Stdout/stderr with ANSI color support
- Truncation with "Show more" for long outputs

**Tables:**
- Dataframe renderer with column sorting
- Pagination (show 50 rows, load more)
- Export to CSV
- Column type detection and formatting

**Charts:**
- Plotly interactive charts
- PNG/SVG static images
- Matplotlib figures converted to PNG

**HTML:**
- Sandboxed iframe for HTML output
- Support for interactive widgets (ipywidgets)

**Errors:**
- Syntax highlighting for tracebacks
- Click to jump to error line
- Suggested fixes from AI

### 5.2 Output Caching
- All outputs persisted to database
- Loaded on project open (no re-execution needed)
- Marked as "stale" if cell code changed
- LRU eviction for large outputs (> 10MB)

---

## 6. AI Integration Architecture

### 6.1 Right Sidebar Chat

**Features:**
- Context-aware: Knows entire project state
- Cell references: Click cell to add to chat context
- Code generation: AI writes code directly into cells
- Debugging: AI analyzes errors and suggests fixes
- Data exploration: "Show me the distribution of X"

**Data Structure:**
```
ChatMessage {
  id: uuid
  project_id: uuid
  role: "user" | "assistant"
  content: string
  cell_references: uuid[]
  created_at: timestamp
}

ChatContext {
  project_schema: {
    cells: Cell[]
    variables: { name: string, type: string, shape?: string }[]
    dataConnections: DataConnection[]
  }
  referenced_cells: Cell[]
  conversation_history: ChatMessage[]
}
```

### 6.2 AI Actions
- **Generate Cell**: AI creates new cell with code
- **Edit Cell**: AI modifies existing cell
- **Explain Cell**: AI adds markdown explanation above cell
- **Fix Error**: AI debugs and updates failing cell
- **Suggest Visualization**: AI creates chart cell for DataFrame

---

## 7. Collaboration Features

### 7.1 Real-Time Editing

**Not in Phase 1** - Focus on single-user first, but architecture should support:
- WebSocket connection for live updates
- Operational Transform for concurrent edits
- Cursor positions and selections
- Cell-level locking

### 7.2 Comments

**Cell-Level Comments:**
- Attach comments to specific cells
- Reply threads
- Resolve/unresolve status
- @mentions for notifications

**Database Schema:**
```
cell_comments {
  id: uuid
  cell_id: uuid
  author_id: uuid
  content: string
  resolved: boolean
  created_at: timestamp
  updated_at: timestamp
  parent_id: uuid? (for replies)
}
```

---

## 8. Version History

### 8.1 Auto-Save Strategy

**Debounced Save:**
- Save cell changes after 2 seconds of inactivity
- Save execution outputs immediately after run
- Save input widget values on change

**No Manual Save Button:**
- Everything auto-saves (like Google Docs)
- Version history for undo/rollback

### 8.2 Snapshots

**Automatic Snapshots:**
- Every 30 minutes during active editing
- Before "Run All"
- Before publishing to app

**Database Schema:**
```
project_versions {
  id: uuid
  project_id: uuid
  snapshot: json (entire project state)
  created_at: timestamp
  created_by: uuid
  label: string? ("Before major refactor")
}
```

**Restore Workflow:**
- Browse version history
- Compare with current version (diff view)
- Restore to snapshot (creates new version)

---

## 9. Publishing to Apps

### 9.1 App Mode

**Read-Only View:**
- Hide code cells by default (toggle to show)
- Show only markdown, charts, and input widgets
- Interactive: Input widgets trigger re-execution
- Shareable URL: `/apps/:project_id`

**App Configuration:**
```
AppConfig {
  project_id: uuid
  show_code: boolean
  layout: "vertical" | "dashboard"
  allowed_inputs: uuid[] (which input cells are editable)
}
```

### 9.2 Scheduled Execution

**Not Phase 1** - Architecture considerations:
- Cron-like scheduling
- Email results or save to database
- Execution logs and error notifications

---

## 10. Performance Optimizations

### 10.1 Smart Execution

**Skip Unchanged Cells:**
- Hash cell code + input values
- If hash matches last execution, use cached output
- Requires deterministic execution

**Parallel Execution:**
- Independent branches of DAG run in parallel
- Multiple kernels per project (future)

### 10.2 Large Data Handling

**Lazy Loading:**
- Don't load full DataFrames into memory
- Use DuckDB for out-of-core processing
- Stream large query results

**Output Limits:**
- Truncate stdout after 10,000 lines
- Sample large DataFrames (show first 1000 rows)
- Warn when creating large outputs

---

## 11. Implementation Phases

### Phase 1: Reactive Execution MVP (Current → Week 8)
- [x] Monaco editor integration
- [x] Jupyter kernel with variable persistence
- [ ] Python AST parser for dependency extraction
- [ ] DAG builder and cycle detection
- [ ] Reactive execution scheduler
- [ ] Stale cell indicators
- [ ] "Run with dependencies" option

### Phase 2: SQL & Data Connections (Weeks 9-10)
- [ ] SQL cell type
- [ ] Data connection CRUD UI
- [ ] PostgreSQL connector
- [ ] Query result rendering
- [ ] Schema autocomplete

### Phase 3: Input Widgets (Weeks 11-12)
- [ ] Input cell types (text, number, dropdown, slider)
- [ ] Widget → variable binding
- [ ] Reactive execution on widget change
- [ ] Widget persistence

### Phase 4: Charts & Visualization (Weeks 13-14)
- [ ] Plotly integration
- [ ] Chart configuration UI
- [ ] Chart cell type
- [ ] Reactive chart updates

### Phase 5: File Management (Week 15)
- [ ] File upload/download
- [ ] S3 integration
- [ ] Kernel file mounting
- [ ] File browser UI

### Phase 6: Rich Output Rendering (Week 16)
- [ ] Table renderer with sorting/pagination
- [ ] Error rendering with syntax highlighting
- [ ] HTML output sandboxing
- [ ] Output caching

### Phase 7: AI Integration (Weeks 17-20)
- [ ] Right sidebar chat UI
- [ ] LLM integration (OpenAI/Anthropic)
- [ ] Cell reference system
- [ ] Code generation actions
- [ ] Error debugging

### Phase 8: Collaboration (Weeks 21-24)
- [ ] Cell comments
- [ ] Version history browser
- [ ] Snapshot management
- [ ] Real-time editing (if time permits)

### Phase 9: App Publishing (Weeks 25-26)
- [ ] App mode view
- [ ] Code hiding toggle
- [ ] Public sharing URLs
- [ ] App configuration UI

---

## 12. Technical Architecture

### 12.1 Frontend Stack
- Next.js 15 (App Router)
- Monaco Editor for code cells
- Plotly.js for charts
- React DnD for cell reordering
- Apollo Client for GraphQL
- WebSocket for AI streaming

### 12.2 Backend Stack
- Bun + Apollo Server (GraphQL API)
- PostgreSQL (metadata, project state)
- Redis (session cache, kernel metadata)
- S3 (file storage, large outputs)
- Python FastAPI (compute service)

### 12.3 Compute Service
- Jupyter kernel manager (1 kernel per project)
- Python AST parser for dependencies
- DAG scheduler for reactive execution
- Database connectors (Snowflake, BigQuery, etc.)

### 12.4 Data Flow

**Cell Execution Flow:**
1. User edits cell → Frontend sends `updateCell` mutation
2. GraphQL API updates database
3. Frontend triggers `executeCell` mutation
4. API sends code to compute service with session_id
5. Compute service:
   - Parses code for dependencies
   - Updates DAG
   - Executes cell in Jupyter kernel
   - Returns outputs
6. API stores outputs in database
7. Frontend displays outputs
8. Frontend marks dependent cells as "stale"
9. User can trigger reactive re-execution

---

## 13. Open Questions

1. **Dependency Detection:**
   - How to handle dynamic imports? (`from foo import *`)
   - How to detect SQL table dependencies?
   - How to handle side effects (file writes, API calls)?

2. **Kernel State:**
   - Should we serialize kernel state for faster restore?
   - How to handle kernel crashes gracefully?
   - Memory limits per kernel?

3. **Reactive Execution:**
   - Should we auto-run stale cells or require manual trigger?
   - How to prevent infinite loops in reactive dependencies?
   - Should we have a "pause reactive execution" mode?

4. **Output Storage:**
   - Store all outputs in DB or just metadata?
   - How to handle multi-GB DataFrames?
   - Expiration policy for old outputs?

5. **AI Integration:**
   - Streaming responses vs. batch?
   - How to handle long AI generations (cancel/resume)?
   - Privacy: Which data is sent to LLM?

---

## 14. Differentiation from Hex

**Our Advantages:**
- Open source (self-hostable)
- More flexible data connections (bring your own)
- Tighter AI integration (native to notebook, not add-on)
- Simpler pricing model

**Features to Match:**
- Reactive execution with DAG
- Input widgets
- SQL cells with autocomplete
- App publishing
- Version history

**Not Building (Yet):**
- Hex's Magic (AI chart generation)
- Hex's database browser
- Admin features (SSO, audit logs)
- Enterprise features (on-prem deployment)

---

## 15. Success Metrics

**Phase 1 Success:**
- Can execute Python cells with variable persistence ✅
- Cells show stale state when dependencies change
- Can "Run with dependencies" to re-execute DAG

**End Goal:**
- Notebook reproducible 100% of time (no hidden state)
- Reactive execution feels instant (< 100ms to trigger)
- Users prefer Sept over Jupyter for data exploration
- Can publish working apps from notebooks
