#!/usr/bin/env bash
# Сторож сторожа (sibling, тот же хост — вердикт M1c): читает last_ok_ts главного
# сторожа; тишина дольше T_silence → [disk-watchdog-stale] в телеграм.
# Тишина сторожа — ОТДЕЛЬНЫЙ сигнал: отсутствие [disk-alarm] не означает «всё хорошо».
# last_ok_ts этот скрипт НЕ пишет никогда — иначе он замаскирует ту тишину, которую ловит.

set -euo pipefail
LC_ALL=C

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=deploy/disk-watchdog/disk-watchdog-lib.sh
. "$HERE/disk-watchdog-lib.sh"

ENV_FILE="${DW_ENV_FILE:-/etc/membrana/disk-watchdog.env}"
# shellcheck disable=SC1090
[ -f "$ENV_FILE" ] && . "$ENV_FILE"

STATE_DIR="${DW_STATE_DIR:-/var/lib/membrana-disk-watchdog}"
T_SILENCE_MIN="${DW_T_SILENCE_MIN:-15}"
REALARM_MIN="${DW_REALARM_MIN:-30}"

mkdir -p "$STATE_DIR"
now=$(dw_now)

last_ok_file="$STATE_DIR/last_ok_ts"
if [ -f "$last_ok_file" ]; then
  last_ok=$(cat "$last_ok_file")
  age_min=$(( (now - last_ok) / 60 ))
  last_h="epoch:$last_ok"
else
  last_ok=""
  age_min=99999
  last_h="никогда (last_ok_ts отсутствует)"
fi

outcome=ok_fresh
deliver_failed=0
if [ "$age_min" -gt "$T_SILENCE_MIN" ]; then
  throttle_file="$STATE_DIR/last_stale_alarm"
  if dw_throttled "$throttle_file" "$now" "$REALARM_MIN"; then
    outcome=skipped_throttled
  else
    payload="[disk-watchdog-stale] host=$(dw_host) last_ok=$last_h age=${age_min}м — сторож диска молчит; тишина не означает «всё хорошо», место на диске сейчас НЕ сторожится"
    outcome=$(dw_deliver "$payload") || deliver_failed=1
    case "$outcome" in sent_*) echo "$now" > "$throttle_file" ;; esac
  fi
fi

printf '%s age_min=%s outcome=%s\n' "$now" "$age_min" "$outcome" \
  >> "$STATE_DIR/journal-sentinel.log"

echo "age_min=$age_min outcome=$outcome"
[ "$deliver_failed" = 1 ] && exit 1
exit 0
