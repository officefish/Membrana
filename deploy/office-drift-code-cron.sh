#!/bin/sh
# scheduled-code-anchor (DA4, #404): ежесуточная пересборка детекторов из main
# + прогон эталонного корпуса free-v1 → DriftAnchorRecord(source=schedule).
# Ловит «Прод ≠ main» в паре с CI-записью (evaluateProdMainDivergence).
# Плюс data-anchor (ADR 0004, владелец 2026-07-13): та же пересборка + прогон
# __tariff_dataset__ с background-media (провизионинг-целостность, warning-only,
# честно НЕ ловит реальный акустический дрейф поля — только курируемый корпус).
#
# Субстрат: office VDS (server-first, решение владельца 2026-07-12), НЕ docker-образ
# office-приложения — джоб гоняется в отдельном полном клоне монорепы на хосте.
#
# Установка (crontab -e на office, после установки node20+corepack на хост):
#   15 0 * * * /opt/membrana-drift/deploy/office-drift-code-cron.sh >> /var/log/membrana-drift-code.log 2>&1
# 00:15 UTC = 03:15 МСК — после night-triage (02:30), ресурсный бюджет Kuryokhin:
# раз в сутки, не чаще. code-anchor и data-anchor в ОДНОМ прогоне — переиспользуют
# один yarn install/detectors:build (экономия ресурса), а не два отдельных крона.
#
# Требования на хосте: git, node >= 20, corepack (yarn 4), клон в $REPO_DIR,
# сетевые обходы фильтра — как в OFFICE_VDS_FILTERED_NETWORK_RUNBOOK.md.
# MEDIA_API_TOKEN для data-anchor — читается из того же $OFFICE_TOKEN_FILE (см. ниже).

set -eu

REPO_DIR="${MEMBRANA_DRIFT_REPO:-/opt/membrana-drift/Membrana}"
OFFICE_TOKEN_FILE="${MEMBRANA_OFFICE_ENV_FILE:-/etc/membrana/office.env}"
OFFICE_URL="${MEMBRANA_OFFICE_URL:-http://127.0.0.1:3000}"

cd "$REPO_DIR"

# Snip кавычки (KEY="value") и обрежь пробелы вокруг значения (KEY = value).
env_value() {
  key="$1"
  file="$2"
  grep -m1 "^${key}=" "$file" 2>/dev/null | cut -d= -f2- \
    | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' \
          -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

# POST record-файл в background-office (ADR 0004, наблюдаемость — не гейт).
# Loopback (127.0.0.1:3000, тот же хост, что office-api контейнер), не публичный
# office.mmbrn.tech. Токен читается на месте, НЕ копируется в git-клон.
push_record() {
  label="$1"
  record="$2"
  if [ ! -f "$OFFICE_TOKEN_FILE" ]; then
    echo "[drift-code] нет $OFFICE_TOKEN_FILE — push $label пропущен (optional)"
    return 0
  fi
  if [ ! -f "$record" ]; then
    echo "[drift-code] нет $record — push $label пропущен (optional)"
    return 0
  fi
  token=$(env_value API_INTERNAL_TOKEN "$OFFICE_TOKEN_FILE")
  if [ -z "$token" ]; then
    echo "[drift-code] API_INTERNAL_TOKEN пуст в $OFFICE_TOKEN_FILE — push $label пропущен (optional)"
    return 0
  fi
  curl -fsS -X POST "${OFFICE_URL%/}/v1/drift-anchor/records" \
    -H "X-Membrana-Token: ${token}" -H "Content-Type: application/json" \
    --data-binary "@${record}" --max-time 15 \
    && echo "[drift-code] push $label OK" \
    || echo "[drift-code] push $label failed (optional, non-blocking)"
}

echo "[drift-code] $(date -u +%FT%TZ) sync main"
git fetch origin main --quiet
git checkout --force --quiet main
git reset --hard --quiet origin/main

echo "[drift-code] yarn install"
corepack yarn install --immutable

echo "[drift-code] rebuild detectors + corpus run (source=schedule)"
# Exit-семантика (#404): ok/drift → 0 (drift виден в логе, джоб зелёный);
# broken или «Прод ≠ main» → 2 — джоб осознанно завершается ненулевым кодом,
# чтобы cron-лог/алертинг это увидел. set -e обходим явным отловом кода.
set +e
corepack yarn drift:code:schedule
code=$?
set -e
if [ "$code" -ne 0 ]; then
  echo "[drift-code] ALERT: exit $code (2 = broken / «Прод ≠ main», см. лог выше)"
fi

# Push ПЕРЕД финальным exit — особенно на broken запись должна долететь до office
# (иначе digest молчит о самом важном событии).
push_record "code-anchor" "$REPO_DIR/docs/reports/drift-anchor/records/code-schedule-latest.json"

echo "[drift-code] data-anchor: __tariff_dataset__ на background-media (warning-only)"
MEDIA_TOKEN=$(env_value MEDIA_API_TOKEN "$OFFICE_TOKEN_FILE")
if [ -z "$MEDIA_TOKEN" ]; then
  echo "[drift-code] MEDIA_API_TOKEN пуст/нет в $OFFICE_TOKEN_FILE — data-anchor пропущен (optional)"
else
  set +e
  MEDIA_API_TOKEN="$MEDIA_TOKEN" corepack yarn drift:data
  data_code=$?
  set -e
  if [ "$data_code" -ne 0 ]; then
    echo "[drift-code] data-anchor завершился с кодом $data_code (не гейт, только лог)"
  fi
  push_record "data-anchor" "$REPO_DIR/docs/reports/drift-anchor/records/data-schedule-latest.json"
fi

echo "[drift-code] $(date -u +%FT%TZ) done"
exit "$code"
