#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# ORGFLOW SETUP SCRIPT
# ═══════════════════════════════════════════════════════════════════════════════
# This script automates the setup process for the OrgFlow development environment.
# It checks prerequisites, installs dependencies, and starts the development servers.
# ═══════════════════════════════════════════════════════════════════════════════

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}\n"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Node.js version
check_node_version() {
    print_header "CHECKING NODE.JS VERSION"
    
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 20 or higher."
        print_info "Visit https://nodejs.org/ to download and install Node.js"
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        print_error "Node.js version 20 or higher is required. Current version: $(node -v)"
        print_info "Visit https://nodejs.org/ to download and install Node.js 20+"
        exit 1
    fi

    print_success "Node.js version $(node -v) is compatible"
}

# Check if Docker is running
check_docker() {
    print_header "CHECKING DOCKER"
    
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker Desktop."
        print_info "Visit https://www.docker.com/products/docker-desktop to download and install Docker"
        exit 1
    fi

    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi

    print_success "Docker is running"
}

# Check if pnpm is installed
check_pnpm() {
    print_header "CHECKING PACKAGE MANAGER"
    
    if command_exists pnpm; then
        print_success "pnpm is installed ($(pnpm -v))"
        PACKAGE_MANAGER="pnpm"
    elif command_exists npm; then
        print_success "npm is installed ($(npm -v))"
        PACKAGE_MANAGER="npm"
    else
        print_error "Neither pnpm nor npm is installed. Please install Node.js which includes npm."
        exit 1
    fi
}

# Copy environment files
setup_env_files() {
    print_header "SETTING UP ENVIRONMENT FILES"
    
    # API .env.local
    if [ ! -f "apps/api/.env.local" ]; then
        if [ -f "apps/api/.env.example" ]; then
            cp apps/api/.env.example apps/api/.env.local
            print_success "Created apps/api/.env.local from .env.example"
        else
            print_warning "apps/api/.env.example not found. Creating .env.local with placeholder values."
            cat > apps/api/.env.local << 'EOF'
DATABASE_URL="postgresql://postgres:password@localhost:5432/orgflow_dev"
REDIS_URL="redis://localhost:6379"
NODE_ENV="development"
PORT=4000
APP_URL="http://localhost:4000"
CORS_ORIGINS="http://localhost:3000,http://localhost:3001"
JWT_SECRET="CHANGE_THIS_TO_A_SECURE_RANDOM_STRING"
JWT_EXPIRES_IN="7d"
CLERK_SECRET_KEY=""
CLERK_PUBLISHABLE_KEY=""
CLERK_WEBHOOK_SECRET=""
STRIPE_SECRET_KEY=""
STRIPE_PUBLISHABLE_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_CONNECT_WEBHOOK_SECRET=""
PLATFORM_FEE_PERCENTAGE=2
RESEND_API_KEY=""
EMAIL_FROM="noreply@orgflow.app"
EMAIL_FROM_NAME="OrgFlow"
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
SENTRY_DSN=""
THROTTLE_TTL=60
THROTTLE_LIMIT=100
EOF
            print_success "Created apps/api/.env.local with placeholder values"
        fi
    else
        print_success "apps/api/.env.local already exists"
    fi

    # Web .env.local
    if [ ! -f "apps/web/.env.local" ]; then
        if [ -f "apps/web/.env.example" ]; then
            cp apps/web/.env.example apps/web/.env.local
            print_success "Created apps/web/.env.local from .env.example"
        else
            print_warning "apps/web/.env.example not found. Creating .env.local with placeholder values."
            cat > apps/web/.env.local << 'EOF'
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/onboarding"
NEXT_PUBLIC_API_URL="http://localhost:4000/api/v1"
API_URL="http://localhost:4000/api/v1"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_DOMAIN="localhost:3000"
NEXT_PUBLIC_APP_NAME="OrgFlow"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=""
SENTRY_DSN=""
NEXT_PUBLIC_SENTRY_DSN=""
SENTRY_AUTH_TOKEN=""
NEXT_PUBLIC_ENABLE_ANALYTICS=true
EOF
            print_success "Created apps/web/.env.local with placeholder values"
        fi
    else
        print_success "apps/web/.env.local already exists"
    fi

    print_warning "Please fill in the required values in the .env.local files before proceeding."
    print_info "See docs/SETUP.md for detailed instructions on where to get each value."
    
    read -p "Press Enter to continue once you've filled in the environment variables..."
}

# Install dependencies
install_dependencies() {
    print_header "INSTALLING DEPENDENCIES"
    
    print_info "Installing dependencies using $PACKAGE_MANAGER..."
    $PACKAGE_MANAGER install
    print_success "Dependencies installed"
}

# Start Docker containers
start_docker() {
    print_header "STARTING DOCKER CONTAINERS"
    
    if [ -f "docker-compose.yml" ] || [ -f "docker-compose.dev.yml" ]; then
        print_info "Starting Docker containers..."
        docker compose -f docker-compose.dev.yml up -d || docker compose up -d
        print_success "Docker containers started"
    else
        print_warning "No docker-compose file found. Skipping Docker startup."
        print_info "Make sure PostgreSQL and Redis are running manually."
    fi
}

# Run database migrations
run_migrations() {
    print_header "RUNNING DATABASE MIGRATIONS"
    
    if [ -d "packages/database" ]; then
        cd packages/database
        print_info "Running Prisma migrations..."
        npx prisma migrate dev
        cd ../..
        print_success "Database migrations completed"
    else
        print_warning "packages/database directory not found. Skipping migrations."
    fi
}

# Seed database
seed_database() {
    print_header "SEEDING DATABASE"
    
    if [ -d "packages/database" ]; then
        cd packages/database
        print_info "Seeding database with sample data..."
        npx prisma db seed || print_warning "Seed script not found or failed. Skipping."
        cd ../..
        print_success "Database seeding completed"
    else
        print_warning "packages/database directory not found. Skipping seeding."
    fi
}

# Print success message
print_success_message() {
    print_header "SETUP COMPLETE"
    
    echo -e "${GREEN}✓ OrgFlow development environment is ready!${NC}\n"
    
    echo -e "${BLUE}🚀 To start the development servers:${NC}"
    echo -e "   API:     ${YELLOW}cd apps/api && npm run dev${NC}"
    echo -e "   Web:     ${YELLOW}cd apps/web && npm run dev${NC}\n"
    
    echo -e "${BLUE}📚 Documentation:${NC}"
    echo -e "   Setup Guide:     ${YELLOW}docs/SETUP.md${NC}"
    echo -e "   API Docs:       ${YELLOW}http://localhost:4000/api/docs${NC}\n"
    
    echo -e "${BLUE}🔗 URLs:${NC}"
    echo -e "   API:     ${YELLOW}http://localhost:4000${NC}"
    echo -e "   Web:     ${YELLOW}http://localhost:3000${NC}\n"
    
    echo -e "${BLUE}⚠️  Important:${NC}"
    echo -e "   Make sure to fill in all required environment variables in:"
    echo -e "   - apps/api/.env.local"
    echo -e "   - apps/web/.env.local\n"
}

# Main setup flow
main() {
    print_header "ORGFLOW DEVELOPMENT SETUP"
    
    check_node_version
    check_docker
    check_pnpm
    setup_env_files
    install_dependencies
    start_docker
    run_migrations
    seed_database
    print_success_message
}

# Run main function
main
