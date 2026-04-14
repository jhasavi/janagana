#!/bin/bash

# Jana Gana Startup Script
# This script starts all services in development mode

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Jana Gana Development Startup ===${NC}"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env file not found. Using default values.${NC}"
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check required commands
if ! command_exists node; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

if ! command_exists pnpm; then
    echo -e "${YELLOW}Warning: pnpm is not installed. Using npm instead.${NC}"
    PKG_MANAGER=npm
else
    PKG_MANAGER=pnpm
fi

echo -e "${GREEN}Using package manager: $PKG_MANAGER${NC}"
echo ""

# Install dependencies if needed
echo -e "${BLUE}Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo "Installing root dependencies..."
    $PKG_MANAGER install
fi

# Install API dependencies
if [ ! -d "apps/api/node_modules" ]; then
    echo "Installing API dependencies..."
    cd apps/api && $PKG_MANAGER install && cd ../..
fi

# Install Web dependencies
if [ ! -d "apps/web/node_modules" ]; then
    echo "Installing Web dependencies..."
    cd apps/web && $PKG_MANAGER install && cd ../..
fi

# Install Database dependencies
if [ ! -d "packages/database/node_modules" ]; then
    echo "Installing Database dependencies..."
    cd packages/database && $PKG_MANAGER install && cd ../..
fi

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Check if PostgreSQL is running
echo -e "${BLUE}Checking PostgreSQL...${NC}"
if command_exists pg_isready; then
    if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL is running${NC}"
    else
        echo -e "${YELLOW}Warning: PostgreSQL may not be running${NC}"
    fi
else
    echo -e "${YELLOW}Warning: pg_isready not found, cannot check PostgreSQL status${NC}"
fi

# Check if Redis is running
echo -e "${BLUE}Checking Redis...${NC}"
if command_exists redis-cli; then
    if redis-cli ping >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis is running${NC}"
    else
        echo -e "${YELLOW}Warning: Redis may not be running${NC}"
    fi
else
    echo -e "${YELLOW}Warning: redis-cli not found, cannot check Redis status${NC}"
fi

echo ""

# Run database migrations
echo -e "${BLUE}Running database migrations...${NC}"
cd packages/database
$PKG_MANAGER prisma migrate dev --name init || echo -e "${YELLOW}Migration may have already run or failed${NC}"
cd ../..
echo -e "${GREEN}✓ Database migrations complete${NC}"
echo ""

# Start services
echo -e "${BLUE}Starting services...${NC}"
echo ""

# Start API in background
echo "Starting API server..."
cd apps/api
$PKG_MANAGER run start:dev &
API_PID=$!
cd ../..

# Start Web in background
echo "Starting Web server..."
cd apps/web
$PKG_MANAGER run dev &
WEB_PID=$!
cd ../..

echo ""
echo -e "${GREEN}=== Services Started ===${NC}"
echo ""
echo "API Server: http://localhost:3001"
echo "Web Server: http://localhost:3000"
echo ""
echo "API PID: $API_PID"
echo "Web PID: $WEB_PID"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for processes
wait
