#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-3020}"

if [[ ! -f ".env" && ! -f ".env.local" ]]; then
  echo "Missing .env/.env.local. Configure environment variables before starting."
  exit 1
fi

echo "Starting JanaGana v3"
echo "- workspace: $ROOT_DIR"
echo "- port: $PORT"

echo "If this is a fresh/non-aligned dev DB, run this once before smoke tests:"
echo "  npx prisma db push"

echo "Launching Next.js dev server..."
npm run dev -- --port "$PORT"
