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

# Use npm as default (project is configured for npm)
PKG_MANAGER=npm
echo -e "${GREEN}Using package manager: $PKG_MANAGER${NC}"
echo ""

# Install root dependencies if needed
echo -e "${BLUE}Checking dependencies...${NC}"
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo "Installing root dependencies..."
    $PKG_MANAGER install
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
npx prisma migrate dev --name init || echo -e "${YELLOW}Migration may have already run or failed${NC}"
npx prisma generate
echo -e "${GREEN}✓ Database migrations complete${NC}"
echo ""

# Start services
echo -e "${BLUE}Starting services...${NC}"
echo ""

# Kill any existing process on port 3000
echo "Checking for existing process on port 3000..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Found process on port 3000, killing it..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Start Web in background
echo "Starting Web server..."
$PKG_MANAGER run dev > logs/web.log 2>&1 &
WEB_PID=$!

echo ""
echo -e "${GREEN}=== Services Started ===${NC}"
echo ""
echo "Web Server: http://localhost:3000"
echo ""
echo "Web PID: $WEB_PID"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Stopping services...${NC}"
    kill $WEB_PID 2>/dev/null || true
    echo -e "${GREEN}✓ Services stopped${NC}"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Wait for processes
wait
