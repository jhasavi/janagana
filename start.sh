#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# JanaGana — Local Development Startup Script
# Usage: ./start.sh [--reset] [--seed] [--skip-install]
#
#   --reset          Drop & recreate the local DB, run seed
#   --seed           Run seed without resetting (add demo data)
#   --skip-install   Skip npm install (faster if deps are up to date)
# ─────────────────────────────────────────────────────────────────────────────

set -e

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Colour

log()  { echo -e "${CYAN}[start.sh]${NC} $*"; }
ok()   { echo -e "${GREEN}[start.sh] ✓${NC} $*"; }
warn() { echo -e "${YELLOW}[start.sh] ⚠${NC} $*"; }
fail() { echo -e "${RED}[start.sh] ✗${NC} $*"; exit 1; }

# ── Parse args ────────────────────────────────────────────────────────────────
RESET=false
SEED=false
SKIP_INSTALL=false

for arg in "$@"; do
  case $arg in
    --reset)        RESET=true ;;
    --seed)         SEED=true ;;
    --skip-install) SKIP_INSTALL=true ;;
    *)              warn "Unknown argument: $arg" ;;
  esac
done

# ── Check required tools ──────────────────────────────────────────────────────
log "Checking required tools..."
command -v node  >/dev/null 2>&1 || fail "node is not installed. Install via https://nodejs.org"
command -v npm   >/dev/null 2>&1 || fail "npm is not installed."
command -v npx   >/dev/null 2>&1 || fail "npx is not installed."

NODE_VERSION=$(node --version | cut -d. -f1 | tr -d 'v')
if [[ "$NODE_VERSION" -lt 18 ]]; then
  fail "Node.js 18+ required. Current: $(node --version)"
fi
ok "Node.js $(node --version)"

# ── Check env files ───────────────────────────────────────────────────────────
log "Checking environment variables..."

load_env_file() {
  local file="$1"
  local allow_empty="$2"

  # Simple key=value parser (ignores comments and export prefixes)
  while IFS='=' read -r raw_key raw_value; do
    [[ "$raw_key" =~ ^#.*$ || -z "$raw_key" ]] && continue
    local key
    local value
    key=$(echo "$raw_key" | sed 's/^export //' | xargs)
    value=$(echo "$raw_value" | sed 's/^"//;s/"$//' | xargs)

    if [[ -z "$value" && "$allow_empty" != "true" && -n "${!key:-}" ]]; then
      continue
    fi

    export "$key=$value" 2>/dev/null || true
  done < "$file"
}

test_database_url() {
  if ! command -v psql >/dev/null 2>&1; then
    return 1
  fi

  if [[ -z "${DATABASE_URL:-}" ]]; then
    return 1
  fi

  PGPASSWORD="${PGPASSWORD:-}" psql "$DATABASE_URL" -c '\q' >/dev/null 2>&1
}

if [[ -f ".env.local" ]]; then
  if [[ -f ".env" ]]; then
    warn "Using both .env and .env.local. .env.local values override .env, but blank vars will fall back to .env."
    load_env_file ".env" true
    load_env_file ".env.local" false
  else
    warn "Using .env.local."
    load_env_file ".env.local" true
  fi
elif [[ -f ".env" ]]; then
  warn ".env.local not found. Using .env instead."
  load_env_file ".env" true
else
  warn ".env.local not found. Creating from .env.example..."
  if [[ -f ".env.example" ]]; then
    cp .env.example .env.local
    warn "Copied .env.example → .env.local. Fill in your secrets before continuing."
    echo ""
    echo "  Required vars to set in .env.local:"
    echo "    TENANT_SLUG"
    echo "    TENANT_BRAND_NAME"
    echo "    TENANT_APP_BASE_URL (or NEXT_PUBLIC_APP_URL)"
    echo "    DATABASE_URL"
    echo "    CLERK_SECRET_KEY"
    echo "    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
    echo ""
    read -r -p "  Press ENTER once you have set the required vars, or Ctrl+C to exit..."
    load_env_file ".env.local" true
  else
    fail ".env.example also missing. Create .env.local manually — see docs/SETUP.md"
  fi
fi

if [[ -f ".env.local" && -f ".env" && ("${DATABASE_URL:-}" == *localhost* || "${DATABASE_URL:-}" == *127.0.0.1*) ]] ; then
  if ! test_database_url; then
    warn "Local DATABASE_URL from .env.local is unreachable. Falling back to .env if available."
    export DATABASE_URL=""
    load_env_file ".env" true
  fi
fi

MISSING=()
[[ -z "${TENANT_SLUG:-}" ]]                         && MISSING+=("TENANT_SLUG")
[[ -z "${TENANT_BRAND_NAME:-}" ]]                   && MISSING+=("TENANT_BRAND_NAME")
if [[ -z "${TENANT_APP_BASE_URL:-}" && -z "${NEXT_PUBLIC_APP_URL:-}" ]]; then
  MISSING+=("TENANT_APP_BASE_URL_OR_NEXT_PUBLIC_APP_URL")
fi
[[ -z "${DATABASE_URL:-}" ]]                        && MISSING+=("DATABASE_URL")
[[ -z "${CLERK_SECRET_KEY:-}" ]]                    && MISSING+=("CLERK_SECRET_KEY")
[[ -z "${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}" ]]   && MISSING+=("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")

if [[ ${#MISSING[@]} -gt 0 ]]; then
  fail "Missing required environment variables"
fi
ok "Environment variables present"

# ── Install dependencies ───────────────────────────────────────────────────────
if [[ "$SKIP_INSTALL" == false ]]; then
  log "Installing npm dependencies..."
  npm install
  ok "Dependencies installed"
else
  log "Skipping npm install (--skip-install)"
fi

# ── Prisma setup ──────────────────────────────────────────────────────────────
log "Generating Prisma client..."
npx prisma generate
ok "Prisma client generated"

if [[ "$RESET" == true ]]; then
  warn "Resetting database (--reset flag)"
  read -r -p "  This will DROP and recreate the DB. Continue? [y/N] " confirm
  if [[ "$confirm" =~ ^[Yy]$ ]]; then
    npx prisma migrate reset --force
    ok "Database reset and migrations applied"
    SEED=true  # always seed after reset
  else
    log "Reset cancelled"
  fi
else
  log "Applying pending migrations..."
  npx prisma migrate deploy 2>/dev/null || {
    warn "migrate deploy failed — falling back to db push (dev DB detected)"
    npx prisma db push
  }
  ok "Database schema up to date"
fi

if [[ "$SEED" == true ]]; then
  log "Seeding database with demo data..."
  npm run db:seed
  ok "Database seeded"
fi

# ── TypeScript type-check ──────────────────────────────────────────────────────
log "Running TypeScript type check..."
if npx tsc --noEmit 2>&1; then
  ok "TypeScript: no errors"
else
  warn "TypeScript errors found — review above before proceeding"
fi

check_port_free() {
  if command -v lsof >/dev/null 2>&1 && lsof -iTCP:3000 -sTCP:LISTEN -Pn >/dev/null 2>&1; then
    fail "Port 3000 is already in use. Stop the process using it and rerun ./start.sh."
  fi
}
check_port_free

# ── Start dev server ───────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${GREEN}  JanaGana is ready!${NC}"
echo -e "${GREEN}  App:     http://localhost:3000${NC}"
echo -e "${GREEN}  DB GUI:  run 'npm run db:studio' in another tab${NC}"
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

PORT=3000 npm run dev -- --port 3000
