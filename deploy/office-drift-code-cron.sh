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
  exit "$code"
fi

echo "[drift-code] $(date -u +%FT%TZ) done"
