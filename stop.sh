#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-3020}"

if ! command -v lsof >/dev/null 2>&1; then
  echo "Required command not found: lsof"
  exit 1
fi

pids="$(lsof -ti tcp:"$PORT" -sTCP:LISTEN || true)"
if [[ -z "${pids}" ]]; then
  echo "No listening process found on port $PORT."
  exit 0
fi

echo "Found process(es) on port $PORT: ${pids}"
lsof -nP -iTCP:"$PORT" -sTCP:LISTEN

auto_confirm="${FORCE_STOP:-false}"
if [[ "$auto_confirm" != "true" ]]; then
  read -r -p "Stop these process(es)? [y/N] " answer
  case "$answer" in
    [yY]|[yY][eE][sS]) ;;
    *)
      echo "Aborted."
      exit 1
      ;;
  esac
fi

for pid in $pids; do
  kill "$pid"
done

echo "Stopped process(es) on port $PORT."
