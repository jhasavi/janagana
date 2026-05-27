#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-3020}"

if ! command -v lsof >/dev/null 2>&1; then
  echo "Required command not found: lsof"
  echo "Install lsof or run on a shell that provides it."
  exit 1
fi

if [[ ! -f ".env" && ! -f ".env.local" ]]; then
  echo "Missing .env/.env.local. Configure environment variables before starting."
  exit 1
fi

existing_pid="$(lsof -ti tcp:"$PORT" -sTCP:LISTEN || true)"
if [[ -n "${existing_pid}" ]]; then
  echo "Port $PORT is already in use by PID ${existing_pid}."
  echo "Stop it before starting a new server to avoid attaching to a stale process."
  if [[ -x "./stop.sh" ]]; then
    echo "Run: ./stop.sh"
  else
    echo "Run: lsof -nP -iTCP:$PORT -sTCP:LISTEN"
    echo "Then stop the process manually."
  fi
  exit 1
fi

echo "Starting JanaGana v3"
echo "- workspace: $ROOT_DIR"
echo "- port: $PORT"
echo "- url: http://localhost:$PORT"

echo "If this is a fresh/non-aligned dev DB, run this once before smoke tests:"
echo "  npx prisma db push"

echo "Launching Next.js dev server..."
npm run dev -- --port "$PORT"
