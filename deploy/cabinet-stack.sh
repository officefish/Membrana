#!/usr/bin/env bash
# Build and run Membrane cabinet stack on VPS (MP1).
# Usage (from repo root on server):
#   ./deploy/cabinet-stack.sh build
#   ./deploy/cabinet-stack.sh up
#   ./deploy/cabinet-stack.sh down
#   ./deploy/cabinet-stack.sh ps
#   ./deploy/cabinet-stack.sh logs
#   ./deploy/cabinet-stack.sh smoke
#   ./deploy/cabinet-stack.sh pull      # DR2: подтянуть образы registry по тегу
#
# DR2 image-режим (прод тянет готовый образ вместо сборки на VPS):
#   CABINET_DEPLOY_MODE=image            — подключает deploy/background-cabinet.image.compose.yml
#   CABINET_IMAGE_TAG=cabinet-vX.Y.Z     — какой тег образа тянуть (default: latest)
#   В этом режиме `up` идёт с --no-build, а образы предварительно тянутся `pull`.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${CABINET_ENV_FILE:-/etc/membrana/cabinet.env}"
DEPLOY_MODE="${CABINET_DEPLOY_MODE:-build}"

COMPOSE=(
  docker compose
  -f "$ROOT/packages/background-cabinet/docker-compose.yml"
  -f "$ROOT/deploy/background-cabinet.prod.compose.yml"
)
if [[ "$DEPLOY_MODE" == "image" ]]; then
  COMPOSE+=(-f "$ROOT/deploy/background-cabinet.image.compose.yml")
fi
COMPOSE+=(--env-file "$ENV_FILE")

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  echo "Create: sudo ./deploy/generate-cabinet-env.sh" >&2
  exit 1
fi

cmd="${1:-up}"
shift || true

case "$cmd" in
  build)
    if [[ "$DEPLOY_MODE" == "image" ]]; then
      echo "CABINET_DEPLOY_MODE=image: образы собираются в CI, локальный build пропущен." >&2
      exit 0
    fi
    export GIT_SHA="${GIT_SHA:-$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || echo unknown)}"
    "${COMPOSE[@]}" build "$@"
    ;;
  pull) "${COMPOSE[@]}" pull cabinet-api cabinet-web "$@" ;;
  up)
    if [[ "$DEPLOY_MODE" == "image" ]]; then
      "${COMPOSE[@]}" up -d --no-build "$@"
    else
      "${COMPOSE[@]}" up -d "$@"
    fi
    ;;
  down) "${COMPOSE[@]}" down "$@" ;;
  ps) "${COMPOSE[@]}" ps "$@" ;;
  logs) "${COMPOSE[@]}" logs -f cabinet-api cabinet-web "$@" ;;
  smoke)
    curl -fsS "http://127.0.0.1:${CABINET_API_PORT:-3020}/health"
    echo
    curl -fsS -o /dev/null -w "cabinet-web local: %{http_code}\n" "http://127.0.0.1:${CABINET_WEB_PORT:-8080}/"
    ;;
  *)
    echo "Usage: $0 {build|pull|up|down|ps|logs|smoke}" >&2
    exit 1
    ;;
esac
