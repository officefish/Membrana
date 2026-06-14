#!/usr/bin/env bash
# Build and run Membrane cabinet stack on VPS (MP1).
# Usage (from repo root on server):
#   ./deploy/cabinet-stack.sh build
#   ./deploy/cabinet-stack.sh up
#   ./deploy/cabinet-stack.sh down
#   ./deploy/cabinet-stack.sh ps
#   ./deploy/cabinet-stack.sh logs
#   ./deploy/cabinet-stack.sh smoke

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${CABINET_ENV_FILE:-/etc/membrana/cabinet.env}"
COMPOSE=(
  docker compose
  -f "$ROOT/packages/background-cabinet/docker-compose.yml"
  -f "$ROOT/deploy/background-cabinet.prod.compose.yml"
  --env-file "$ENV_FILE"
)

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  echo "Create: sudo ./deploy/generate-cabinet-env.sh" >&2
  exit 1
fi

cmd="${1:-up}"
shift || true

case "$cmd" in
  build) "${COMPOSE[@]}" build "$@" ;;
  up) "${COMPOSE[@]}" up -d "$@" ;;
  down) "${COMPOSE[@]}" down "$@" ;;
  ps) "${COMPOSE[@]}" ps "$@" ;;
  logs) "${COMPOSE[@]}" logs -f cabinet-api cabinet-web "$@" ;;
  smoke)
    curl -fsS "http://127.0.0.1:${CABINET_API_PORT:-3020}/health"
    echo
    curl -fsS -o /dev/null -w "cabinet-web local: %{http_code}\n" "http://127.0.0.1:${CABINET_WEB_PORT:-8080}/"
    ;;
  *)
    echo "Usage: $0 {build|up|down|ps|logs|smoke}" >&2
    exit 1
    ;;
esac
