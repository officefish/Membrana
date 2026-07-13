#!/bin/sh
# scheduled-code-anchor (DA4, #404): ежесуточная пересборка детекторов из main
# + прогон эталонного корпуса free-v1 → DriftAnchorRecord(source=schedule).
# Ловит «Прод ≠ main» в паре с CI-записью (evaluateProdMainDivergence).
#
# Субстрат: office VDS (server-first, решение владельца 2026-07-12), НЕ docker-образ
# office-приложения — джоб гоняется в отдельном полном клоне монорепы на хосте.
#
# Установка (crontab -e на office, после установки node20+corepack на хост):
#   15 0 * * * /opt/membrana-drift/deploy/office-drift-code-cron.sh >> /var/log/membrana-drift-code.log 2>&1
# 00:15 UTC = 03:15 МСК — после night-triage (02:30), ресурсный бюджет Kuryokhin:
# раз в сутки, не чаще.
#
# Требования на хосте: git, node >= 20, corepack (yarn 4), клон в $REPO_DIR,
# сетевые обходы фильтра — как в OFFICE_VDS_FILTERED_NETWORK_RUNBOOK.md.

set -eu

REPO_DIR="${MEMBRANA_DRIFT_REPO:-/opt/membrana-drift/Membrana}"

cd "$REPO_DIR"

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
# (иначе digest молчит о самом важном событии). Скрипт всё равно завершится кодом
# исходного verdict ниже.
echo "[drift-code] push запись в background-office (ADR 0004, наблюдаемость — не гейт)"
# Тот же хост, что office-api контейнер (bind 127.0.0.1:3000, deploy/background-office.prod.compose.yml)
# → loopback, не публичный office.mmbrn.tech. Токен — из /etc/membrana/office.env (тот же
# root, что деплоит office-api; НЕ копируем секрет в git-клон, читаем на месте).
OFFICE_TOKEN_FILE="${MEMBRANA_OFFICE_ENV_FILE:-/etc/membrana/office.env}"
OFFICE_URL="${MEMBRANA_OFFICE_URL:-http://127.0.0.1:3000}"
RECORD="$REPO_DIR/docs/reports/drift-anchor/records/code-schedule-latest.json"
if [ ! -f "$OFFICE_TOKEN_FILE" ]; then
  echo "[drift-code] нет $OFFICE_TOKEN_FILE — push пропущен (optional)"
elif [ ! -f "$RECORD" ]; then
  echo "[drift-code] нет $RECORD — push пропущен (optional)"
else
  # Snip возможные кавычки вокруг значения (KEY="value" / KEY='value' в .env-файлах).
  TOKEN=$(grep -m1 '^API_INTERNAL_TOKEN=' "$OFFICE_TOKEN_FILE" | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
  if [ -z "$TOKEN" ]; then
    echo "[drift-code] API_INTERNAL_TOKEN пуст в $OFFICE_TOKEN_FILE — push пропущен (optional)"
  else
    curl -fsS -X POST "${OFFICE_URL%/}/v1/drift-anchor/records" \
      -H "X-Membrana-Token: ${TOKEN}" -H "Content-Type: application/json" \
      --data-binary "@${RECORD}" --max-time 15 \
      && echo "[drift-code] push OK" \
      || echo "[drift-code] push failed (optional, non-blocking)"
  fi
fi

echo "[drift-code] $(date -u +%FT%TZ) done"
exit "$code"
