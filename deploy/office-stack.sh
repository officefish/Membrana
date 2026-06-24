#!/usr/bin/env bash
# Build and run background-office on VPS (O2).
# Usage (from repo root on server):
#   ./deploy/office-stack.sh build
#   ./deploy/office-stack.sh up
#   ./deploy/office-stack.sh down
#   ./deploy/office-stack.sh ps
#   ./deploy/office-stack.sh logs
#
# Requires: /etc/membrana/office.env (see docs/deploy/BACKGROUND_OFFICE_DEPLOY.md)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${OFFICE_ENV_FILE:-/etc/membrana/office.env}"
COMPOSE=(
  docker compose
  -f "$ROOT/packages/background-office/docker-compose.yml"
  -f "$ROOT/deploy/background-office.prod.compose.yml"
  --env-file "$ENV_FILE"
)

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  echo "Create it from docs/deploy/BACKGROUND_OFFICE_DEPLOY.md §3" >&2
  exit 1
fi

cmd="${1:-up}"
shift || true

case "$cmd" in
  build) "${COMPOSE[@]}" build "$@" ;;
  up) "${COMPOSE[@]}" up -d "$@" ;;
  down) "${COMPOSE[@]}" down "$@" ;;
  ps) "${COMPOSE[@]}" ps "$@" ;;
  logs) "${COMPOSE[@]}" logs -f office-api "$@" ;;
  *)
    echo "Usage: $0 {build|up|down|ps|logs}" >&2
    exit 1
    ;;
esac
