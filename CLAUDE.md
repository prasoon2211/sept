# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sept is an open-source Hex-like collaborative data science and analytics platform. The goal is to capture 80% of Hex's value by building a polyglot notebook interface (SQL + Python), interactive visualizations, data warehouse integrations, and team collaboration features.

Currently in **Phase 1: Foundation & Setup** - basic notebook functionality with Python/SQL cells, code execution via Jupyter kernels, and GraphQL API.

## Tech Stack

- **Frontend**: Next.js 15 (Turbopack), React 19, TypeScript, TailwindCSS, Apollo Client
- **Backend API**: Bun runtime, Apollo Server (GraphQL), TypeScript, Drizzle ORM
- **Compute Service**: Python 3.11, FastAPI, Jupyter kernels for persistent execution
- **Database**: PostgreSQL 15 (port 5433)
- **Cache**: Redis (port 6380)

## Development Commands

### Starting the Environment

```bash
bun run dev                 # Start everything (Docker + API + Web + Compute)
bun run docker:up           # Start only PostgreSQL and Redis
bun run docker:down         # Stop Docker services
```

The main `bun run dev` command executes `./dev.sh` which:
1. Starts PostgreSQL (5433) and Redis (6380) in Docker
2. Runs database schema migrations automatically
3. Starts GraphQL API (port 4000)
4. Starts Next.js frontend (port 3000)
5. Starts Python compute service (port 8000) if venv exists

### Individual Services

```bash
bun run dev:web             # Next.js frontend only
bun run dev:api             # GraphQL API only
```

### Database Operations

```bash
# From root directory:
bun run db:push             # Push schema changes (development)
bun run db:studio           # Open Drizzle Studio GUI

# From apps/api directory:
cd apps/api
bun run db:generate         # Generate migrations from schema
bun run db:migrate          # Apply migrations to database
```

### Code Quality

```bash
bun run typecheck           # TypeScript type checking
bun run lint                # ESLint on all apps
bun run format              # Prettier formatting
bun run build               # Build all apps
```

### Python Compute Service Setup

```bash
cd services/compute
python -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Architecture Overview

### Monorepo Structure

```
sept/
├── apps/
│   ├── api/              # Bun + GraphQL API (port 4000)
│   └── web/              # Next.js frontend (port 3000)
├── services/
│   └── compute/          # Python FastAPI compute service (port 8000)
├── packages/             # Shared types and config (future)
└── docker/               # Docker configurations
```

### Core Data Model

Schema is defined in `apps/api/src/models/schema.ts` using Drizzle ORM:

- **users**: User accounts
- **workspaces**: Organizations with slug-based routing
- **workspace_members**: User-workspace relationships with roles (admin/editor/viewer)
- **projects**: Notebooks containing cells
- **cells**: Individual code/markdown/chart cells with execution state
  - Stores: type, code, outputs, metadata, execution_state, reads/writes for DAG
  - Order managed via `order` field (fractional indexing for reordering)
- **cell_comments**: Comments on cells for collaboration
- **project_versions**: Version history snapshots
- **data_connections**: Warehouse connection configs (Snowflake, BigQuery, Redshift, etc.)

### Cell Dependency System

Cells track variable dependencies:
- `reads`: Variables this cell reads (e.g., `['df', 'x']`)
- `writes`: Variables this cell writes (e.g., `['result']`)
- `executionState`: idle, running, success, error, stale

When a cell's code changes:
1. Cell is marked as modified
2. `markCellDependentsStale` mutation marks downstream cells as `stale`
3. DAG service (in `apps/api/src/services/dag.ts`) traverses dependency graph

### Code Execution Flow

1. **Frontend** (`apps/web`): Monaco editor in notebook cells
2. **GraphQL API** (`apps/api`): Receives `executeCell` mutation
3. **Compute Service** (`services/compute`):
   - FastAPI receives POST to `/execute` endpoint
   - Uses Jupyter kernel manager for persistent Python sessions
   - Each project gets its own kernel (session_id = project_id)
   - Dependency analyzer extracts reads/writes via AST parsing
4. **API** updates cell with outputs, dependencies, execution state
5. **Frontend** polls or receives updates to display results

Key files:
- `apps/api/src/resolvers/index.ts`: GraphQL resolvers, `executeCell` mutation
- `services/compute/main.py`: FastAPI endpoints
- `services/compute/kernel_manager.py`: Jupyter kernel lifecycle
- `services/compute/dependency_analyzer.py`: Python AST-based dependency extraction

### Service Communication

- API calls compute service at `COMPUTE_SERVICE_URL` (from env, default: http://localhost:8000)
- Uses project ID as session_id to maintain kernel state across cell executions
- Results include success status, outputs array, error messages, and dependency info

## Key Implementation Patterns

### Persistent Kernel Sessions

Unlike typical notebook systems that use one kernel per notebook, Sept maintains persistent Jupyter kernels per project. Variables defined in one cell persist across all cells in the project:

```typescript
// In executeCell mutation (apps/api/src/resolvers/index.ts)
session_id: cell.projectId  // All cells in project share same kernel
```

### Dependency Tracking

Python code is analyzed via AST to extract variable dependencies before execution:

```python
# services/compute/dependency_analyzer.py
reads, writes, error = analyze_dependencies(code)
# Returns: reads=['df', 'x'], writes=['result'], error=None
```

This enables:
- Reactive execution (future): Auto-run dependent cells when upstream changes
- Stale detection: Mark downstream cells when dependencies change
- Execution ordering: Topological sort for "Run All"

### Cell Ordering

Cells use a string-based `order` field (not integer) to enable efficient reordering without database updates. Use fractional indexing (e.g., "a", "b", "c" or "0.5", "0.75") to insert cells between existing ones.

### GraphQL Schema

Schema defined in `apps/api/src/schema/index.ts`:
- Queries: `projects`, `project(id)`
- Mutations: `createProject`, `createCell`, `executeCell`, `markCellDependentsStale`
- Custom scalar: `DateTime` for timestamp serialization

## Environment Variables

### API (`apps/api`)
- `DATABASE_URL`: Postgres connection (default: postgres://sept:sept@localhost:5433/sept)
- `PORT`: API port (default: 4000)
- `COMPUTE_SERVICE_URL`: Compute service endpoint (default: http://localhost:8000)

### Web (`apps/web`)
- `NEXT_PUBLIC_API_URL`: GraphQL endpoint (default: http://localhost:4000/graphql)

### Compute (`services/compute`)
- Configured via Python env or defaults to port 8000

## Testing Notes

- PostgreSQL runs in Docker on port 5433 (not default 5432) to avoid conflicts
- Redis runs on port 6380 (not default 6379)
- Default credentials: user=sept, password=sept, database=sept
- Test queries: `PGPASSWORD=sept psql -h localhost -p 5433 -U sept -d sept`

## Future Phases

**Phase 2 (Weeks 8-16)**: Multi-user workspaces, cell commenting/locking, Snowflake/BigQuery connectors, chart widgets, scheduling

**Phase 3 (Weeks 16+)**: Kubernetes-based compute scaling, real-time collaboration via WebSockets, semantic layers, AI-assisted query generation

## Common Workflows

### Adding a New Cell Type

1. Update `CellType` enum in `apps/api/src/models/schema.ts`
2. Add resolver logic in `apps/api/src/resolvers/index.ts`
3. Update compute service if execution differs (e.g., SQL cells)
4. Add UI component in `apps/web/components/`

### Adding a Data Warehouse Connector

1. Add connector implementation in `services/compute/connectors/`
2. Update `execute_code` in `services/compute/main.py` to route SQL queries
3. Store connection config in `data_connections` table
4. Add UI for connection management in frontend

### Running a Single Test Query

```bash
# Check recent cells in database
PGPASSWORD=sept psql -h localhost -p 5433 -U sept -d sept -c \
  "SELECT code, reads, writes, execution_state FROM cells WHERE code IS NOT NULL ORDER BY \"order\"::int LIMIT 5;"
```
