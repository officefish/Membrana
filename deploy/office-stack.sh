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
  smoke)
    # Smoke архивариуса (спринт archivarius-live-wiring, блок 4): audit по локальному
    # порту с токеном из того же ENV_FILE, что и stack. Зелёный только при ok:true.
    # Приёмка «smoke зелёный → блок принят» — слово владельца (правка резчика №3).
    token="$(grep -E '^API_INTERNAL_TOKEN=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
    port="$(grep -E '^OFFICE_PORT=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
    if [[ -z "$token" ]]; then
      echo "smoke: API_INTERNAL_TOKEN не найден в $ENV_FILE" >&2
      exit 1
    fi
    body="$(curl -fsS -H "x-membrana-token: ${token}" "http://127.0.0.1:${port:-3000}/v1/archivarius/audit")"
    echo "$body"
    if echo "$body" | grep -q '"ok":true'; then
      echo "smoke: archivarius audit ok" >&2
    else
      echo "smoke: audit НЕ ok — findings выше" >&2
      exit 1
    fi
    ;;
  *)
    echo "Usage: $0 {build|up|down|ps|logs|smoke}" >&2
    exit 1
    ;;
esac
