#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# PRE-COMMIT SECURITY CHECK
# ═══════════════════════════════════════════════════════════════════════════════
# This script runs before every commit to ensure:
# 1. No .env files with real values are committed
# 2. No hardcoded secrets are committed
# 3. TypeScript compiles successfully
# 4. No TODO: REPLACE_ME comments remain
# ═══════════════════════════════════════════════════════════════════════════════

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔒 Running pre-commit security checks..."

# ─── CHECK 1: No .env files with real values ────────────────────────────────────────
echo ""
echo "📋 Checking for .env files in commit..."

STAGED_ENV_FILES=$(git diff --cached --name-only | grep -E '^\.env' || true)

if [ -n "$STAGED_ENV_FILES" ]; then
  echo -e "${RED}❌ ERROR: .env files should not be committed${NC}"
  echo "Staged .env files:"
  echo "$STAGED_ENV_FILES"
  echo ""
  echo "Please unstage these files:"
  echo "  git restore --staged <file>"
  exit 1
fi

# Check if any .env files (except .env.example) are being committed
if git diff --cached --name-only | grep -qE '\.env$|\.env\.local$|\.env\.development$|\.env\.production$|\.env\.test$'; then
  echo -e "${RED}❌ ERROR: .env files (except .env.example) should not be committed${NC}"
  echo "Please unstage .env files:"
  echo "  git restore --staged <file>"
  exit 1
fi

echo -e "${GREEN}✅ No .env files in commit${NC}"

# ─── CHECK 2: No hardcoded secrets ───────────────────────────────────────────────────
echo ""
echo "🔍 Checking for hardcoded secrets..."

# Get staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

# Check for Stripe test keys
if echo "$STAGED_FILES" | xargs grep -l "sk_test_" 2>/dev/null | grep -v "\.env\.example" | grep -v "node_modules" | grep -v "\.next" | grep -v "dist" | grep -v "docs/" > /dev/null 2>&1; then
  echo -e "${RED}❌ ERROR: Stripe test keys (sk_test_) found in staged files${NC}"
  echo "Files containing sk_test_:"
  echo "$STAGED_FILES" | xargs grep -l "sk_test_" 2>/dev/null | grep -v "\.env\.example" | grep -v "node_modules" | grep -v "\.next" | grep -v "dist" | grep -v "docs/"
  echo ""
  echo "Please replace with environment variable references or remove the keys."
  exit 1
fi

# Check for Stripe live keys
if echo "$STAGED_FILES" | xargs grep -l "sk_live_" 2>/dev/null | grep -v "\.env\.example" | grep -v "node_modules" | grep -v "\.next" | grep -v "dist" | grep -v "docs/" > /dev/null 2>&1; then
  echo -e "${RED}❌ ERROR: Stripe live keys (sk_live_) found in staged files${NC}"
  echo "Files containing sk_live_:"
  echo "$STAGED_FILES" | xargs grep -l "sk_live_" 2>/dev/null | grep -v "\.env\.example" | grep -v "node_modules" | grep -v "\.next" | grep -v "dist" | grep -v "docs/"
  echo ""
  echo "Please replace with environment variable references or remove the keys."
  exit 1
fi

# Check for Stripe publishable keys
if echo "$STAGED_FILES" | xargs grep -l "pk_test_" 2>/dev/null | grep -v "\.env\.example" | grep -v "node_modules" | grep -v "\.next" | grep -v "dist" | grep -v "docs/" > /dev/null 2>&1; then
  echo -e "${RED}❌ ERROR: Stripe publishable keys (pk_test_) found in staged files${NC}"
  echo "Files containing pk_test_:"
  echo "$STAGED_FILES" | xargs grep -l "pk_test_" 2>/dev/null | grep -v "\.env\.example" | grep -v "node_modules" | grep -v "\.next" | grep -v "dist" | grep -v "docs/"
  echo ""
  echo "Please replace with environment variable references or remove the keys."
  exit 1
fi

# Check for webhook secrets
if echo "$STAGED_FILES" | xargs grep -l "whsec_" 2>/dev/null | grep -v "\.env\.example" | grep -v "node_modules" | grep -v "\.next" | grep -v "dist" | grep -v "docs/" > /dev/null 2>&1; then
  echo -e "${RED}❌ ERROR: Webhook secrets (whsec_) found in staged files${NC}"
  echo "Files containing whsec_:"
  echo "$STAGED_FILES" | xargs grep -l "whsec_" 2>/dev/null | grep -v "\.env\.example" | grep -v "node_modules" | grep -v "\.next" | grep -v "dist" | grep -v "docs/"
  echo ""
  echo "Please replace with environment variable references or remove the secrets."
  exit 1
fi

# Check for Resend API keys (but allow documentation with placeholder format)
if echo "$STAGED_FILES" | xargs grep -E "re_[a-zA-Z0-9]{20,}" 2>/dev/null | grep -v "\.env\.example" | grep -v "node_modules" | grep -v "\.next" | grep -v "dist" | grep -v "docs/" > /dev/null 2>&1; then
  echo -e "${RED}❌ ERROR: Resend API keys (re_...) found in staged files${NC}"
  echo "Files containing re_ keys:"
  echo "$STAGED_FILES" | xargs grep -E "re_[a-zA-Z0-9]{20,}" 2>/dev/null | grep -v "\.env\.example" | grep -v "node_modules" | grep -v "\.next" | grep -v "dist" | grep -v "docs/"
  echo ""
  echo "Please replace with environment variable references or remove the keys."
  exit 1
fi

echo -e "${GREEN}✅ No hardcoded secrets found${NC}"

# ─── CHECK 3: TypeScript compilation ───────────────────────────────────────────────────
echo ""
echo "🔨 Checking TypeScript compilation..."

cd apps/api
if ! npm run typecheck > /dev/null 2>&1; then
  echo -e "${RED}❌ ERROR: TypeScript compilation failed${NC}"
  echo "Run 'cd apps/api && npm run typecheck' to see errors."
  cd ../..
  exit 1
fi
cd ../..

cd apps/web
if ! npm run typecheck > /dev/null 2>&1; then
  echo -e "${RED}❌ ERROR: TypeScript compilation failed${NC}"
  echo "Run 'cd apps/web && npm run typecheck' to see errors."
  cd ../..
  exit 1
fi
cd ../..

echo -e "${GREEN}✅ TypeScript compilation successful${NC}"

# ─── CHECK 4: No TODO: REPLACE_ME comments ──────────────────────────────────────────
echo ""
echo "📝 Checking for TODO: REPLACE_ME comments..."

if echo "$STAGED_FILES" | xargs grep -i "TODO.*REPLACE_ME\|FIXME.*REPLACE_ME\|XXX.*REPLACE_ME" 2>/dev/null > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  WARNING: TODO: REPLACE_ME comments found${NC}"
  echo "Files containing TODO: REPLACE_ME:"
  echo "$STAGED_FILES" | xargs grep -i "TODO.*REPLACE_ME\|FIXME.*REPLACE_ME\|XXX.*REPLACE_ME" 2>/dev/null
  echo ""
  echo "Please resolve these TODOs before committing."
  exit 1
fi

echo -e "${GREEN}✅ No TODO: REPLACE_ME comments found${NC}"

# ─── ALL CHECKS PASSED ───────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ All pre-commit checks passed!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

exit 0
