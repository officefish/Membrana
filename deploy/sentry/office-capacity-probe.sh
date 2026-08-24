#!/usr/bin/env bash
# Замер мощностей офиса под контейнер Сентри (кусок E #2122, первый шаг по EPIC).
# READ-ONLY: только смотрит, ничего не ставит и не меняет.
# Запускает ВЛАДЕЛЕЦ на office-VDS:  ssh root@<office> 'bash -s' < deploy/sentry/office-capacity-probe.sh

set -u
echo "[probe] host: $(hostname) | $(date -u +%FT%TZ)"
echo "[probe] cpu:"
nproc
grep -m1 'model name' /proc/cpuinfo || true
echo "[probe] память:"
free -h
echo "[probe] диск:"
df -h | sed -n '1p;/\/dev\//p'
echo "[probe] загрузка (1/5/15 мин):"
cat /proc/loadavg
echo "[probe] docker-контейнеры (имя · образ · память):"
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}' 2>/dev/null || echo "  docker stats недоступен"
echo "[probe] docker disk:"
docker system df 2>/dev/null || true
echo "[probe] итог для сверки с требованиями self-hosted Sentry: CPU ≥ 4 · RAM ≥ 16 GiB (мин. ~8 с ужиманием) · диск ≥ 20 GiB свободных"
