#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# JanaGana — Baseline Reset Script
#
# Use when the current database has a mismatched or stale Prisma migration
# history and needs to be wiped and re-initialized from the new baseline.
#
# Assumes the database is DISPOSABLE TEST DATA.
# Will backup, reset, apply migrations, and optionally seed.
#
# Usage:
#   ./scripts/reset-baseline.sh [--env-file=.env.local] [--seed] [--skip-backup] [--yes]
#
# Options:
#   --env-file=FILE   Path to env file (default: .env.local, then .env)
#   --seed            Run prisma/seed.ts after applying migrations
#   --skip-backup     Skip pg_dump backup (only for ephemeral CI/sandbox DBs)
#   --yes             Skip all confirmation prompts (use in automation)
#
# Examples:
#   ./scripts/reset-baseline.sh
#   ./scripts/reset-baseline.sh --seed --yes
#   ./scripts/reset-baseline.sh --env-file=.env.staging --skip-backup --yes
#   SEED_CLERK_ORG_ID=org_xxx ./scripts/reset-baseline.sh --seed
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${CYAN}[reset-baseline]${NC} $*"; }
ok()   { echo -e "${GREEN}[reset-baseline] ✓${NC} $*"; }
warn() { echo -e "${YELLOW}[reset-baseline] ⚠${NC} $*"; }
fail() { echo -e "${RED}[reset-baseline] ✗${NC} $*"; exit 1; }
step() { echo -e "\n${BOLD}${CYAN}── $* ──${NC}"; }

# ── Parse args ────────────────────────────────────────────────────────────────
ENV_FILE=""
DO_SEED=false
SKIP_BACKUP=false
AUTO_YES=false

for arg in "$@"; do
  case $arg in
    --env-file=*)   ENV_FILE="${arg#*=}" ;;
    --seed)         DO_SEED=true ;;
    --skip-backup)  SKIP_BACKUP=true ;;
    --yes)          AUTO_YES=true ;;
    *)              warn "Unknown argument: $arg" ;;
  esac
done

# ── Confirm function ──────────────────────────────────────────────────────────
confirm() {
  local msg="$1"
  if [[ "$AUTO_YES" == true ]]; then
    log "$msg — auto-confirmed (--yes)"
    return 0
  fi
  read -r -p "$(echo -e "${YELLOW}  $msg [y/N]:${NC} ")" answer
  [[ "$answer" =~ ^[Yy]$ ]] || return 1
}

# ── Resolve env file ──────────────────────────────────────────────────────────
load_env_file() {
  local file="$1"
  [[ -f "$file" ]] || return 1
  log "Loading env from: $file"
  # Export key=value pairs, skip comments and blank lines
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// }" ]] && continue
    local stripped="${line#export }"
    local key="${stripped%%=*}"
    local val="${stripped#*=}"
    val="${val%\"}"
    val="${val#\"}"
    val="${val%\'}"
    val="${val#\'}"
    export "$key=$val" 2>/dev/null || true
  done < "$file"
  return 0
}

if [[ -n "$ENV_FILE" ]]; then
  load_env_file "$ENV_FILE" || fail "env file not found: $ENV_FILE"
elif [[ -f ".env.local" ]]; then
  load_env_file ".env.local"
elif [[ -f ".env" ]]; then
  load_env_file ".env"
else
  warn "No .env.local or .env found — relying on pre-set environment variables"
fi

# ── Validate environment ──────────────────────────────────────────────────────
step "Validating environment"

[[ -z "${DATABASE_URL:-}" ]] && fail "DATABASE_URL is not set"
ok "DATABASE_URL is set"

# Refuse to run against known production domains unless --yes was explicitly passed
if echo "$DATABASE_URL" | grep -qiE '(prod|production|live)' && [[ "$AUTO_YES" == false ]]; then
  warn "DATABASE_URL appears to reference a production database: $DATABASE_URL"
  confirm "This script will DESTROY data. Are you absolutely sure?" || fail "Aborted"
fi

command -v npx >/dev/null 2>&1 || fail "npx not found — install Node.js"

# ── Backup ────────────────────────────────────────────────────────────────────
BACKUP_DIR="backups"
BACKUP_FILE="$BACKUP_DIR/db-backup-$(date +%Y%m%d-%H%M%S).dump"

if [[ "$SKIP_BACKUP" == false ]]; then
  step "Backing up database"
  if command -v pg_dump >/dev/null 2>&1; then
    mkdir -p "$BACKUP_DIR"
    log "Running pg_dump → $BACKUP_FILE"
    if pg_dump --format=custom --file="$BACKUP_FILE" "$DATABASE_URL" 2>/dev/null; then
      ok "Backup saved: $BACKUP_FILE"
    else
      warn "pg_dump failed (connection issue or unsupported DB). Proceeding without backup."
      warn "If this is important data, abort now and back up manually."
      confirm "Continue without backup?" || fail "Aborted"
    fi
  else
    warn "pg_dump not found — skipping backup. Install PostgreSQL client tools to enable backups."
    confirm "Continue without backup?" || fail "Aborted"
  fi
else
  log "Backup skipped (--skip-backup)"
fi

# ── Check for stale migration history ────────────────────────────────────────
step "Checking migration state"

MIGRATION_DIR="prisma/migrations"
if [[ ! -d "$MIGRATION_DIR" ]] || [[ -z "$(ls -A $MIGRATION_DIR 2>/dev/null)" ]]; then
  warn "No migration files found in $MIGRATION_DIR"
  warn "Ensure prisma/migrations/ contains the new baseline before proceeding"
  confirm "Continue anyway?" || fail "Aborted"
fi

BASELINE_COUNT=$(find "$MIGRATION_DIR" -name "migration.sql" 2>/dev/null | wc -l | tr -d ' ')
ok "Found $BASELINE_COUNT migration file(s) in $MIGRATION_DIR"

# ── Confirm destructive reset ─────────────────────────────────────────────────
step "Confirming destructive reset"

echo ""
echo -e "${RED}${BOLD}  !! WARNING !!${NC}"
echo -e "${RED}  This will:${NC}"
echo -e "${RED}    1. DROP all tables in the database${NC}"
echo -e "${RED}    2. Remove the Prisma migration history (_prisma_migrations table)${NC}"
echo -e "${RED}    3. Re-apply all migrations from scratch${NC}"
[[ "$DO_SEED" == true ]] && echo -e "${RED}    4. Run prisma/seed.ts${NC}"
echo ""

confirm "Proceed with database reset?" || fail "Aborted"

# ── Generate Prisma client ────────────────────────────────────────────────────
step "Generating Prisma client"
npx prisma generate
ok "Prisma client generated"

# ── Reset and apply migrations ────────────────────────────────────────────────
step "Resetting database and applying new baseline"

log "Running: prisma migrate reset --force"
npx prisma migrate reset --force
ok "Database reset and all migrations applied"

# ── Seed ──────────────────────────────────────────────────────────────────────
if [[ "$DO_SEED" == true ]]; then
  step "Seeding database"
  if [[ -z "${SEED_CLERK_ORG_ID:-}" ]]; then
    warn "SEED_CLERK_ORG_ID is not set — seed script will print usage and exit"
    warn "Complete onboarding first, then re-run with:"
    warn "  SEED_CLERK_ORG_ID=org_xxx ./scripts/reset-baseline.sh --seed --skip-backup --yes"
  fi
  npm run db:seed
  ok "Seed complete"
fi

# ── Pre-onboarding preflight ──────────────────────────────────────────────────
step "Running pre-onboarding preflight"
if npx tsx scripts/bootstrap-preflight.ts --phase=pre-onboarding; then
  ok "Pre-onboarding preflight passed"
else
  warn "Pre-onboarding preflight reported issues — review above before deploying"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${GREEN}  Baseline reset complete${NC}"
echo ""
[[ "$SKIP_BACKUP" == false && -f "$BACKUP_FILE" ]] && \
  echo -e "${GREEN}  Backup:   $BACKUP_FILE${NC}"
echo -e "${GREEN}  Schema:   applied from prisma/migrations/${NC}"
echo ""
echo -e "${CYAN}  Next steps:${NC}"
echo -e "${CYAN}    1. Start app:          npm run dev${NC}"
echo -e "${CYAN}    2. Complete onboarding: http://localhost:3000/onboarding${NC}"
echo -e "${CYAN}    3. Seed demo data:     SEED_CLERK_ORG_ID=org_xxx npm run db:seed${NC}"
echo -e "${CYAN}    4. Post preflight:     npm run bootstrap:preflight:post-onboarding${NC}"
echo -e "${CYAN}    5. Vercel deploy:      push branch → Vercel runs 'npm run db:migrate:deploy'${NC}"
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
