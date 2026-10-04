#!/usr/bin/env bash
# Generate /etc/membrana/office.env with random API token and archivarius-mongo password
# (run once on VPS). Fill INTEGRATION placeholders before Claude/Linear smoke (O4).
# Usage: sudo ./deploy/generate-office-env.sh
#
# #2580: пароль базы и оба URI пишутся ОДНИМ прогоном и одним паролем. До 04.10 генератор
# писал URI без учётных данных, а compose включал auth с умолчанием `change-me` — прод
# поднимался молча, база 10 дней стояла без пользователя. Значения не печатаются.

set -euo pipefail

OUT="${1:-/etc/membrana/office.env}"

if [[ -f "$OUT" ]]; then
  echo "Refusing to overwrite existing $OUT" >&2
  echo "" >&2
  echo "ВНИМАНИЕ (#2580): ключи базы архивариуса сами в существующий env не появятся." >&2
  echo "Прод-compose без них не поднимется (обязательные значения):" >&2
  echo "  ARCHIVARIUS_MONGO_PASSWORD   — пароль пользователя базы" >&2
  echo "  ARCHIVARIUS_MONGO_URI        — mongodb://<user>:<пароль>@archivarius-mongo:27017/membrana_archivarius?authSource=admin" >&2
  echo "  TASK_ARCHIVE_MONGO_URI       — mongodb://<user>:<пароль>@archivarius-mongo:27017/membrana_task_archive?authSource=admin" >&2
  echo "Пароль в обоих URI — тот же, что в ARCHIVARIUS_MONGO_PASSWORD; пользователь — ARCHIVARIUS_MONGO_USERNAME (умолчание archivarius)." >&2
  echo "На НЕПУСТОМ томе archivarius-mongo новый пароль сам не применится: MONGO_INITDB_ROOT_* действуют" >&2
  echo "только на пустом томе — пользователя завести/сменить руками (runbook: docs/deploy/BACKGROUND_OFFICE_DEPLOY.md §3)." >&2
  echo "Дописывать — решение владельца, не скрипта. Значения в вывод не печатаются." >&2
  exit 1
fi

mkdir -p "$(dirname "$OUT")"
token="$(openssl rand -hex 32)"
# hex — без символов, требующих экранирования в URI.
mongo_user="archivarius"
mongo_password="$(openssl rand -hex 24)"
mongo_host="archivarius-mongo:27017"

# Права 600 — до записи секретов, не после.
umask 077

cat >"$OUT" <<ENV
# @membrana/background-office — generated $(date -u +%Y-%m-%dT%H:%M:%SZ)
OFFICE_PORT=3000
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
API_INTERNAL_TOKEN=${token}
ANTHROPIC_API_KEY=REPLACE_BEFORE_PROD
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
LINEAR_API_KEY=REPLACE_BEFORE_PROD
LINEAR_WEBHOOK_SECRET=REPLACE_BEFORE_PROD
GITHUB_TOKEN=REPLACE_BEFORE_PROD
GITHUB_OWNER=officefish
GITHUB_REPO=Membrana
DREAMS_ENABLED=true
DREAMS_VOLUME_PATH=/var/lib/membrana-dreams
# Archivarius + task archive (#1330, #2580): один пользователь, один пароль, обе формы URI.
# Прод-оверлей требует PASSWORD и оба URI (:?) — без них compose падает громко.
ARCHIVARIUS_MONGO_USERNAME=${mongo_user}
ARCHIVARIUS_MONGO_PASSWORD=${mongo_password}
ARCHIVARIUS_MONGO_URI=mongodb://${mongo_user}:${mongo_password}@${mongo_host}/membrana_archivarius?authSource=admin
ARCHIVARIUS_MONGO_DB=membrana_archivarius
TASK_ARCHIVE_MONGO_URI=mongodb://${mongo_user}:${mongo_password}@${mongo_host}/membrana_task_archive?authSource=admin
TASK_ARCHIVE_MONGO_DB=membrana_task_archive
ENV

chmod 600 "$OUT"
echo "Wrote $OUT (mode 600)."
echo "Replace REPLACE_BEFORE_PROD with real keys before O4 webhook/Claude smoke."
echo "archivarius-mongo: пароль сгенерирован; на НЕПУСТОМ томе он сам не применится (см. BACKGROUND_OFFICE_DEPLOY.md §3)."
