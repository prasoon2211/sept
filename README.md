# Sept - Open Source Analytics Platform

A Hex-like collaborative data science and analytics platform built with modern open-source technologies.

## Project Structure

```
sept/
├── apps/
│   ├── web/              # Next.js frontend
│   └── api/              # Bun + GraphQL API
├── services/
│   └── compute/          # Python FastAPI compute service
├── packages/
│   ├── types/            # Shared TypeScript types
│   └── config/           # Shared configuration
├── docker/               # Docker configurations
└── docker-compose.yml    # Local development setup
```

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS
- **Backend API**: Bun, Apollo Server (GraphQL), TypeScript
- **Compute**: Python 3.11, FastAPI, Jupyter
- **Database**: PostgreSQL 15, Drizzle ORM
- **Auth**: better-auth
- **Visualization**: Plotly.js
- **Cache**: Redis (Phase 2)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Python](https://python.org) >= 3.11
- [Docker](https://docker.com) and Docker Compose
- PostgreSQL 15+ (or use Docker)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd sept
   ```

2. **Install dependencies**

   ```bash
   # Install Bun dependencies
   bun install

   # Setup Python virtual environment
   cd services/compute
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cd ../..
   ```

3. **Start development environment**
   ```bash
   bun run dev
   ```

That's it! The `bun run dev` command will:

- Start PostgreSQL (port 5433) and Redis (port 6380) in Docker
- Setup database schema automatically
- Start the GraphQL API server (port 4000)
- Start the Next.js frontend (port 3000)
- Start the Python compute service (port 8000) if Python venv is set up

**Optional: Setup Python compute service**

```bash
cd services/compute
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ../..
```

### Development

Services will be available at:

- Frontend: http://localhost:3000
- GraphQL API: http://localhost:4000/graphql
- Compute API: http://localhost:8000
- PostgreSQL: localhost:5433
- Redis: localhost:6380

**Other useful commands:**

```bash
bun run docker:up      # Start only Docker services (Postgres & Redis)
bun run docker:down    # Stop Docker services
bun run db:push        # Push schema changes to database
bun run db:studio      # Open Drizzle Studio (database GUI)
bun run dev:web        # Run only web frontend
bun run dev:api        # Run only API server
```

## Development Workflow

### Database Migrations

```bash
cd apps/api

# Generate migration from schema changes
bun run db:generate

# Apply migrations
bun run db:migrate

# Push schema directly (development only)
bun run db:push

# Open Drizzle Studio
bun run db:studio
```

### Type Checking

```bash
bun run typecheck
```

### Linting & Formatting

```bash
bun run lint
bun run format
```

## Project Phase

Currently in **Phase 1: Foundation & Setup** (Weeks 1-2)

See [build-docs/plan.md](build-docs/plan.md) for the full roadmap.

## Contributing

This is an open-source project. Contributions are welcome!

## License

TBD
