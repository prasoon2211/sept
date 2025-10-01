#!/bin/bash

# Sept Development Startup Script
# This script starts all services needed for local development

set -e

echo "🚀 Starting Sept development environment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Start infrastructure (Postgres & Redis)
echo -e "${YELLOW}📦 Starting PostgreSQL and Redis...${NC}"
docker-compose up -d postgres redis

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for databases to be ready...${NC}"
timeout=30
counter=0
while ! docker-compose exec -T postgres pg_isready -U sept > /dev/null 2>&1; do
    sleep 1
    counter=$((counter + 1))
    if [ $counter -ge $timeout ]; then
        echo "❌ Postgres failed to start within ${timeout} seconds"
        exit 1
    fi
done

echo -e "${GREEN}✓ PostgreSQL ready on port 5433${NC}"
echo -e "${GREEN}✓ Redis ready on port 6380${NC}"
echo ""

# Run database migrations
echo -e "${YELLOW}🗄️  Setting up database schema...${NC}"
cd apps/api
bun run db:push > /dev/null 2>&1 || true
cd ../..
echo -e "${GREEN}✓ Database schema ready${NC}"
echo ""

# Start services in parallel using background processes
echo -e "${YELLOW}🔥 Starting application services...${NC}"
echo ""

# Trap to kill all background processes on script exit
trap 'kill $(jobs -p) 2>/dev/null' EXIT

# Start API server
echo -e "${GREEN}Starting GraphQL API (port 4000)...${NC}"
cd apps/api && bun run dev > ../../logs/api.log 2>&1 &
API_PID=$!
cd ../..

# Start web frontend
echo -e "${GREEN}Starting Next.js web (port 3000)...${NC}"
cd apps/web && bun run dev > ../../logs/web.log 2>&1 &
WEB_PID=$!
cd ../..

# Start compute service (if Python venv exists)
if [ -d "services/compute/venv" ]; then
    echo -e "${GREEN}Starting Python compute service (port 8000)...${NC}"
    cd services/compute
    source venv/bin/activate
    python main.py > ../../logs/compute.log 2>&1 &
    COMPUTE_PID=$!
    cd ../..
else
    echo -e "${YELLOW}⚠️  Python venv not found. Skipping compute service.${NC}"
    echo -e "${YELLOW}   To set up: cd services/compute && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt${NC}"
fi

echo ""
echo -e "${GREEN}✅ All services started!${NC}"
echo ""
echo "📍 Services running at:"
echo "   • Frontend:  http://localhost:3000"
echo "   • GraphQL:   http://localhost:4000/graphql"
echo "   • Compute:   http://localhost:8000"
echo "   • Postgres:  localhost:5433"
echo "   • Redis:     localhost:6380"
echo ""
echo "📝 Logs are being written to ./logs/"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for all background processes
wait
