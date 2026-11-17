#!/usr/bin/env bash
# Build and run background-office on VPS (O2).
# Usage (from repo root on server):
#   ./deploy/office-stack.sh build
#   ./deploy/office-stack.sh up
#   ./deploy/office-stack.sh down
#   ./deploy/office-stack.sh ps
#   ./deploy/office-stack.sh logs
#   ./deploy/office-stack.sh smoke
#   ./deploy/office-stack.sh probe   # сбор пробы хранилищ (#2580); вердикт — scripts/lib/office-store-probe.mjs
#
# Requires: /etc/membrana/office.env (see docs/deploy/BACKGROUND_OFFICE_DEPLOY.md)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${OFFICE_ENV_FILE:-/etc/membrana/office.env}"
# Крючья для зуба scripts/office-store-probe.test.mjs (подставные docker/curl); на VPS не заданы.
DOCKER="${OFFICE_STACK_DOCKER:-docker}"
CURL="${OFFICE_STACK_CURL:-curl}"
COMPOSE=(
  "$DOCKER" compose
  -f "$ROOT/packages/background-office/docker-compose.yml"
  -f "$ROOT/deploy/background-office.prod.compose.yml"
  --env-file "$ENV_FILE"
)

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  echo "Create it from docs/deploy/BACKGROUND_OFFICE_DEPLOY.md §3" >&2
  exit 1
fi

# Значение ключа env без печати: последнее вхождение (как у compose --env-file), кавычки сняты.
# Имя ключа идёт в regex grep — допускается только ^[A-Z0-9_]+$, иначе отказ (exit 2, ревью #2583):
# имя вида `A.*` совпало бы с чужой строкой env и выдало бы её форму за форму искомого ключа.
env_value() {
  if [[ ! "$1" =~ ^[A-Z0-9_]+$ ]]; then
    echo "office-stack: недопустимое имя переменной env (ожидается ^[A-Z0-9_]+\$)" >&2
    return 2
  fi
  local v
  v="$(grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2- || true)"
  v="${v%\"}"; v="${v#\"}"; v="${v%\'}"; v="${v#\'}"
  printf '%s' "$v"
}
# Форма URI: credentials | no-credentials | missing. Ловушка памяти: без URI office молча
# берёт in-memory хранилище, и двери на памяти зелёные — поэтому форма судится отдельно.
uri_form() {
  local v
  v="$(env_value "$1")" || return 2
  if [[ -z "$v" ]]; then echo missing
  elif [[ "$v" =~ ^mongodb(\+srv)?://[^:/@]+:[^@/]+@ ]]; then echo credentials
  else echo no-credentials
  fi
}

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
  probe)
    # Проба хранилищ office (#2580, блок b2). Запускается НА VPS, после `up`: её зовут
    # scripts/_ssh-office-prod-up.mjs и scripts/_ssh-office-smoke.mjs [7] по ssh. Это СБОР, не суд:
    # печатает только машинные строки `probe <вид> <предмет> <значение>` (имена, статусы,
    # HTTP-коды) и выходит 0; вердикт выносит scripts/lib/office-store-probe.mjs — один
    # предикат на оба входа. Значения env, тела ответов и токен не печатаются никогда.
    #
    # Что читает: ENV_FILE (форма двух URI и токен), `docker inspect` health двух сервисов,
    # три двери-ЧТЕНИЯ через хранилища записи на 127.0.0.1:OFFICE_PORT. Побочных эффектов нет:
    # ключи проб заведомо несуществующие, ответы ожидаются 200 (пустой список) / 404.
    # Почему чтения, а не запись — шапка office-store-probe.mjs.
    #
    # Ожидание healthy: unhealthy у docker наступает лишь после start_period + retries×interval
    # (у базы 20s + 3×30s), до того статус `starting`. Отсюда таймаут по умолчанию 180 с.
    PROBE_TIMEOUT_SEC="${PROBE_TIMEOUT_SEC:-180}"
    PROBE_POLL_SEC="${PROBE_POLL_SEC:-5}"
    PROBE_KEY="__deploy-probe-2580__"

    health_of() {
      local id
      id="$("${COMPOSE[@]}" ps -q "$1" 2>/dev/null | head -1 || true)"
      if [[ -z "$id" ]]; then echo missing; return; fi
      "$DOCKER" inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$id" 2>/dev/null || echo missing
    }
    # Токен уходит curl КОНФИГОМ через stdin (-K -), а не аргументом: argv виден в ps.
    probe_door() {
      local name="$1" path="$2" code
      if [[ -z "$token" ]]; then echo "probe door $name no-token"; return; fi
      code="$(printf 'header = "x-membrana-token: %s"\n' "$token" \
        | "$CURL" -s -o /dev/null -w '%{http_code}' --max-time 15 -K - "http://127.0.0.1:${port}${path}" 2>/dev/null || true)"
      echo "probe door $name ${code:-000}"
    }

    echo "probe version 1"
    for key in ARCHIVARIUS_MONGO_URI TASK_ARCHIVE_MONGO_URI; do
      echo "probe env $key $(uri_form "$key")"
    done

    db="starting"; office="starting"
    while (( SECONDS < PROBE_TIMEOUT_SEC )); do
      db="$(health_of archivarius-mongo)"
      office="$(health_of office-api)"
      [[ "$db" != "starting" && "$office" != "starting" ]] && break
      sleep "$PROBE_POLL_SEC"
    done
    [[ "$db" == "starting" ]] && db="timeout"
    [[ "$office" == "starting" ]] && office="timeout"
    echo "probe health archivarius-mongo $db"
    echo "probe health office-api $office"

    token="$(env_value API_INTERNAL_TOKEN)"
    port="$(env_value OFFICE_PORT)"; port="${port:-3000}"
    probe_door plugin-results-runs "/plugin-results/runs?collectionId=${PROBE_KEY}&limit=1"
    probe_door archivarius-span "/v1/archivarius/span/${PROBE_KEY}/${PROBE_KEY}"
    probe_door task-archive-closure "/v1/task-archive/closures/${PROBE_KEY}"
    echo "probe end"
    ;;
  probe-uri-form)
    # Форма одного URI из env без значения (credentials|no-credentials|missing) — для ручной
    # проверки на VPS и для зуба office-store-probe.test.mjs; недопустимое имя → exit 2.
    uri_form "${1:-}"
    ;;
  *)
    echo "Usage: $0 {build|up|down|ps|logs|smoke|probe|probe-uri-form <KEY>}" >&2
    exit 1
    ;;
esac
