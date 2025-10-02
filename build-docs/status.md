# Sept - Project Status

**Last Updated:** 2025-10-02
**Current Phase:** Phase 1 - Reactive Execution Engine with WebSocket Subscriptions ✅ COMPLETE

---

## Project Overview

Sept is an open-source Hex-like collaborative data analytics platform that combines SQL and Python notebooks with interactive visualizations and dashboards. Built with modern web technologies for teams to analyze data together.

### Tech Stack

**Frontend:**

- Next.js 15 (App Router)
- React 19
- TypeScript
- TailwindCSS
- Apollo Client (GraphQL)

**Backend API:**

- Bun runtime
- Apollo Server v4 (GraphQL)
- GraphQL WebSocket subscriptions (graphql-ws)
- TypeScript
- Drizzle ORM
- PostgreSQL 15
- Redis (pub/sub for real-time updates)

**Compute Service:**

- Python 3.11+
- FastAPI
- Jupyter kernel management (planned)
- Database connectors (Snowflake, BigQuery, Redshift, DuckDB)

**Infrastructure:**

- Docker & Docker Compose
- PostgreSQL (port 5433)
- Redis (port 6380)

---

## Project Structure

```
sept/
├── apps/
│   ├── web/              # Next.js frontend (port 3000)
│   │   ├── app/          # App router pages
│   │   ├── components/   # React components
│   │   └── env.ts        # Type-safe environment variables
│   │
│   └── api/              # Bun + GraphQL API (port 4000)
│       ├── src/
│       │   ├── schema/       # GraphQL schema definitions
│       │   ├── resolvers/    # GraphQL resolvers
│       │   ├── models/       # Database models & Drizzle schema
│       │   ├── services/     # Business logic
│       │   ├── middleware/   # Auth, etc.
│       │   ├── env.ts        # Type-safe environment variables
│       │   └── index.ts      # Server entry point
│       └── drizzle.config.ts # Drizzle configuration
│
├── services/
│   └── compute/          # Python FastAPI (port 8000)
│       ├── main.py       # FastAPI server
│       ├── kernel_manager.py
│       ├── connectors/   # Database connectors
│       └── requirements.txt
│
├── packages/
│   ├── types/            # Shared TypeScript types
│   └── config/           # Shared configuration
│
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   └── Dockerfile.compute
│
├── build-docs/
│   ├── plan.md          # Full project roadmap
│   └── status.md        # This file
│
├── docker-compose.yml   # Local development environment
├── dev.sh               # Development startup script
└── package.json         # Root workspace configuration
```

---

## Database Schema

**Implemented tables (via Drizzle ORM):**

1. **users** - User accounts with email/password authentication
2. **workspaces** - Organizations/teams with unique slugs
3. **workspace_members** - User-workspace relationships with roles (admin/editor/viewer)
4. **projects** - Notebooks containing cells
5. **cells** - Individual code/content cells (Python, SQL, Markdown, Chart)
6. **cell_comments** - Collaborative comments on cells with resolved status
7. **project_versions** - Version history snapshots for undo/rollback
8. **data_connections** - External data warehouse connections (Snowflake, BigQuery, etc.)

All tables include:

- UUID primary keys
- Timestamps (created_at, updated_at)
- Foreign key relationships with cascading deletes
- Proper indexes for performance

---

## Environment Variables

Using **t3-env** for type-safe environment variables with Zod validation.

### API Server (`apps/api/src/env.ts`)

- `DATABASE_URL` - PostgreSQL connection (default: `postgresql://sept:sept@localhost:5433/sept`)
- `REDIS_URL` - Redis connection (default: `redis://localhost:6380`)
- `COMPUTE_SERVICE_URL` - Python compute service (default: `http://localhost:8000`)
- `PORT` - API server port (default: `4000`)
- `AUTH_SECRET` - JWT secret (optional in dev, required in production)
- `NODE_ENV` - Environment mode (default: `development`)

### Web Frontend (`apps/web/env.ts`)

- `NEXT_PUBLIC_API_URL` - GraphQL API endpoint (default: `http://localhost:4000/graphql`)
- `NODE_ENV` - Environment mode (default: `development`)

**All defaults are defined in `env.ts` files, not in `.env` files.**

---

## Completed Work

### ✅ Phase 1: Foundation & Setup (Weeks 1-2)

**Week 1: Project Scaffolding**

- [x] Initialize Bun monorepo with workspaces
- [x] Create Next.js 15 app with TypeScript + TailwindCSS
- [x] Create Bun + Apollo GraphQL API server
- [x] Create Python FastAPI compute service structure
- [x] Setup shared packages (types, config)
- [x] Configure Docker Compose with PostgreSQL + Redis
- [x] Resolve port conflicts (5433 for Postgres, 6380 for Redis)

**Week 2: Core Infrastructure**

- [x] Design and implement complete database schema with Drizzle ORM
- [x] Implement type-safe environment variables with t3-env
- [x] Configure CORS for frontend-backend communication
- [x] Create development startup script (`dev.sh`)
- [x] Setup database migrations with Drizzle Kit
- [x] Test all services running together
- [x] Verify GraphQL API with test query

**Week 3-4: Notebook UI & Python Execution** ✅ COMPLETE

- [x] Build dashboard page with project list
- [x] Create notebook editor page with cell UI
- [x] Implement cell management (add/delete cells)
- [x] Build Python cell component with code editor
- [x] Implement Python code execution in compute service
- [x] Connect frontend to compute service
- [x] Display execution output (stdout, stderr, errors)
- [x] Test end-to-end Python execution flow
- [x] Define complete GraphQL schema for projects/cells
- [x] Implement GraphQL resolvers for CRUD operations
- [x] Add cell execution mutations via GraphQL
- [x] Persist projects and cells to database
- [x] Connect dashboard to load/create projects from database
- [x] Connect notebook to load/save cells from database
- [x] Implement date formatting (user-specified format)
- [x] Fix Next.js 15 params Promise handling
- [x] Fix GraphQL query subfield selection
- [x] Fix language case sensitivity in compute service

**Current Status:**

- ✅ All services start successfully
- ✅ GraphQL API responding at `http://localhost:4000/graphql`
- ✅ Next.js frontend at `http://localhost:3000`
- ✅ Python compute service at `http://localhost:8547`
- ✅ Database schema created and accessible
- ✅ Type-safe environment configuration working
- ✅ Docker containers running (Postgres + Redis)
- ✅ **Python code execution working end-to-end!**
- ✅ **Full persistence layer complete - projects and cells save to database**
- ✅ **GraphQL integration complete - all CRUD operations working**
- ✅ **Cell execution routes through GraphQL → Compute service → Database**

---

## How to Run

### Quick Start (One Command)

```bash
bun run dev
```

This automatically:

1. Starts PostgreSQL and Redis in Docker
2. Pushes database schema
3. Starts GraphQL API server
4. Starts Next.js frontend
5. Starts Python compute service (if venv exists)

### Manual Start (Step by Step)

```bash
# 1. Start Docker services
docker-compose up -d postgres redis

# 2. Setup database
cd apps/api
bun run db:push

# 3. Start API (Terminal 1)
cd apps/api
bun run dev

# 4. Start Web (Terminal 2)
cd apps/web
bun run dev

# 5. [Optional] Start Compute (Terminal 3)
cd services/compute
source venv/bin/activate
python main.py
```

### Other Commands

```bash
bun run docker:up      # Start only Docker services
bun run docker:down    # Stop Docker services
bun run db:push        # Push schema changes to database
bun run db:studio      # Open Drizzle Studio (database GUI)
bun run typecheck      # Run TypeScript type checking
bun run format         # Format code with Prettier
```

---

## Service Endpoints

| Service         | URL                           | Status                                |
| --------------- | ----------------------------- | ------------------------------------- |
| Web Frontend    | http://localhost:3000         | ✅ Running                            |
| GraphQL API     | http://localhost:4000/graphql | ✅ Running                            |
| Compute Service | http://localhost:8547         | ✅ Running (Python execution working) |
| PostgreSQL      | localhost:5433                | ✅ Running                            |
| Redis           | localhost:6380                | ✅ Running                            |
| Drizzle Studio  | http://localhost:4983         | ✅ Available via `bun run db:studio`  |

---

## Next Steps

### Phase 1: Core Notebook MVP (Weeks 3-8)

**Week 3-4: Notebook UI & GraphQL API** ✅ COMPLETE

- [x] Build project list/create UI components
- [x] Implement notebook editor with cell container
- [x] Create Python cell component with textarea editor
- [x] Build output rendering components (text, errors)
- [x] Define complete GraphQL schema for projects/cells
- [x] Implement GraphQL resolvers for CRUD operations
- [x] Add cell execution mutations (executeCell)
- [x] Persist projects and cells to database
- [x] Connect frontend to GraphQL API with Apollo Client
- [ ] Integrate Monaco Editor for better code editing
- [ ] Create SQL and Markdown cell components

**Week 5-6: Code Execution** 🚧 IN PROGRESS

- [x] Handle Python code execution with stdout/stderr capture
- [x] Add error handling with traceback display
- [x] Route execution through GraphQL API
- [x] Persist execution outputs to database
- [ ] Implement Jupyter kernel manager for persistent sessions
- [ ] Support variable persistence across cells (requires Jupyter kernel)
- [ ] Implement PostgreSQL SQL executor
- [ ] Add query result formatting and streaming
- [ ] Add execution timeout logic

**Week 7-8: Visualization & Persistence**

- [ ] Integrate Plotly.js for chart rendering
- [ ] Create Chart cell type with configuration UI
- [ ] Build basic table rendering for SQL results
- [ ] Implement auto-save for projects
- [ ] Add version history snapshots
- [ ] Create "App" view for read-only dashboards
- [ ] Polish UI/UX

---

---

## Notebook Implementation Status

### ✅ Completed Features

**Core Notebook Functionality:**

- [x] Monaco Editor integration (syntax highlighting, autocomplete)
- [x] Jupyter kernel manager with persistent sessions
- [x] Variable persistence across cells
- [x] Python code execution with stdout/stderr capture
- [x] Cell management (add, delete, reorder)
- [x] Optimized cell rendering (no flashing on updates)
- [x] GraphQL persistence layer (projects and cells)

**Reactive Execution System:**

- [x] Python AST parser for dependency extraction
- [x] Automatic detection of variable reads/writes
- [x] Database schema for dependency tracking (reads, writes, executionState)
- [x] Execution state tracking (idle, queued, running, success, error, stale)
- [x] Dependencies stored in database on each execution
- [x] DAG builder with order-aware dependency resolution
- [x] Handles variable redefinition correctly (Cell 4's x shadows Cell 2's x)
- [x] Automatic stale detection when upstream cells change
- [x] Visual state indicators (Queued/Running/Success/Error/Stale badges with colors)
- [x] Cycle detection in dependency graph
- [x] Transitive dependency closure calculation
- [x] **Sequential FIFO execution queue** (one cell at a time per project)
- [x] **Real-time UI updates via WebSocket subscriptions** (no polling)
- [x] **Reactive mode with auto-execution** (toggle on/off)
- [x] **Auto-queuing of dependent cells** when upstream cells complete
- [x] **Cell state machine** with proper transitions
- [x] **Redis pub/sub** for scalable real-time updates

**Architecture:**

- Each project gets one persistent Jupyter kernel
- Dependencies automatically extracted via static analysis
- Execution outputs cached in database
- **Backend-driven state**: Database is single source of truth
- **WebSocket subscriptions**: Real-time updates pushed to frontend via GraphQL subscriptions
- **Execution queue**: Sequential FIFO processing, one cell at a time per project
- **Pure reactive frontend**: No local execution state, Apollo cache auto-updates from subscriptions
- **Reactive execution**: Dependent cells automatically execute when upstream cells complete (if enabled)

### 🚧 In Progress

**Nothing currently in progress - ready for next feature!**

### 📋 Next Up (Priority Order)

1. **Debounced Auto-save** - Reduce database writes (currently saves on every keystroke)
2. **SQL Cells** - Query databases via data connections
3. **Input Widgets** - Interactive parameters (sliders, dropdowns, text inputs)
4. **Chart Cells** - Plotly visualization with configuration UI
5. **File Upload** - Attach files to projects
6. **Markdown Cells** - Rich text documentation
7. **Cell Reordering** - Drag and drop to reorder cells
8. **Cell Execution Time Display** - Show duration in UI
9. **Cancel Cell Execution** - Stop running cells
10. **Execution History** - View past outputs and results

---

## Known Issues / Tech Debt

1. **Authentication:** better-auth not yet integrated - no user login/signup
2. **Error Handling:** Minimal error handling - needs comprehensive error boundaries
3. **Testing:** No tests written yet - need to add Jest/Vitest + testing-library
4. **Type Generation:** GraphQL codegen not setup - frontend types manually maintained
5. **Migrations:** Using `drizzle-kit push` directly - should use proper migrations for production
6. **Cell Ordering:** Cells use simple string IDs - should use proper ordering system (fractional indexing)
7. **Auto-save:** Cell code updates save immediately on every keystroke - should implement debouncing
8. **SQL Execution:** Not yet implemented in compute service
9. **Output Limits:** No truncation for large outputs
10. **Kernel Cleanup:** No automatic kernel shutdown for idle sessions
11. **Environment Variables:** Web app removed t3-env, now uses process.env directly (less type safety)

---

## Architecture Decisions

### Why GraphQL over REST?

- Type-safe API with codegen for frontend
- Flexible querying (avoid over-fetching nested notebook data)
- Built-in subscriptions for real-time collaboration (Phase 2)
- Batching support for loading many cells efficiently
- Matches Hex's architecture

### Why Bun over Node?

- Faster TypeScript execution
- Built-in TypeScript support (no ts-node)
- Better package management
- Compatible with existing Node ecosystem

### Why Drizzle over Prisma?

- Lighter weight, closer to SQL
- Better TypeScript inference
- More control over queries
- Excellent migration tooling

### Why t3-env for Environment Variables?

- Type-safe environment variables
- Runtime validation with Zod
- Clear separation of server/client vars
- Defaults defined in code, not in .env files

### Why Separate Python Compute Service?

- Python-native for Jupyter ecosystem
- Async execution support
- Isolated from Node/Bun runtime
- Easier to scale independently
- Matches Jupyter architecture

---

## Resources

- **Project Plan:** [build-docs/plan.md](./plan.md)
- **GraphQL Playground:** http://localhost:4000/graphql
- **Database Studio:** Run `bun run db:studio`
- **Hex Documentation:** https://learn.hex.tech
- **Apollo Server Docs:** https://www.apollographql.com/docs/apollo-server/
- **Drizzle ORM Docs:** https://orm.drizzle.team/
- **t3-env Docs:** https://env.t3.gg/
