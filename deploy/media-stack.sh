#!/usr/bin/env bash
# Build and run background-media on VPS (A5c).
# Usage (from repo root on server):
#   ./deploy/media-stack.sh build
#   ./deploy/media-stack.sh up
#   ./deploy/media-stack.sh down
#   ./deploy/media-stack.sh ps
#   ./deploy/media-stack.sh logs
#
# Requires: /etc/membrana/media.env (see docs/deploy/BACKGROUND_MEDIA_DEPLOY.md)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${MEDIA_ENV_FILE:-/etc/membrana/media.env}"
COMPOSE=(
  docker compose
  -f "$ROOT/packages/background-media/docker-compose.yml"
  -f "$ROOT/deploy/background-media.prod.compose.yml"
  --env-file "$ENV_FILE"
)

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  echo "Create it from docs/deploy/BACKGROUND_MEDIA_DEPLOY.md §3" >&2
  exit 1
fi

cmd="${1:-up}"
shift || true

case "$cmd" in
  build) "${COMPOSE[@]}" build "$@" ;;
  up) "${COMPOSE[@]}" up -d "$@" ;;
  down) "${COMPOSE[@]}" down "$@" ;;
  ps) "${COMPOSE[@]}" ps "$@" ;;
  logs) "${COMPOSE[@]}" logs -f media-api "$@" ;;
  *)
    echo "Usage: $0 {build|up|down|ps|logs}" >&2
    exit 1
    ;;
esac
