#!/usr/bin/env bash
# Сторож диска (Д1, кусок A #2118): свободное место тома записи по расписанию,
# тревога [disk-alarm] прямым Bot API, офис — только fallback. Вердикт M1c.
#
# Режимы:
#   run                              боевой прогон (default; из systemd-таймера)
#   compute <free_b> <rate_b_min>    печатает t_remain (мин) — чистая формула
#   b-floor <rate_ref_b_min>         печатает несгораемый остаток (байт)
#   decide <t_remain> <free_b> <b_floor_b> <t_crit> <t_warn>   печатает ok|warn|crit
#
# Конфиг: /etc/membrana/disk-watchdog.env (или $DW_ENV_FILE); переменные — README.
# Сторож НЕ зависит от сборщиков/докера: голый bash + curl + systemd-таймер (Д1).

set -euo pipefail
LC_ALL=C

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=deploy/disk-watchdog/disk-watchdog-lib.sh
. "$HERE/disk-watchdog-lib.sh"

ENV_FILE="${DW_ENV_FILE:-/etc/membrana/disk-watchdog.env}"
# shellcheck disable=SC1090
[ -f "$ENV_FILE" ] && . "$ENV_FILE"

MODE="${1:-run}"
case "$MODE" in
  compute) dw_t_remain_min "$2" "$3"; exit 0 ;;
  b-floor) dw_b_floor_bytes "$2"; exit 0 ;;
  decide)  dw_decide "$2" "$3" "$4" "$5" "$6"; exit 0 ;;
  run) ;;
  *) echo "unknown mode: $MODE (run|compute|b-floor|decide)" >&2; exit 2 ;;
esac

WATCH_PATH="${DW_WATCH_PATH:-/}"
STATE_DIR="${DW_STATE_DIR:-/var/lib/membrana-disk-watchdog}"
T_CRIT_MIN="${DW_T_CRIT_MIN:-60}"
T_WARN_MIN="${DW_T_WARN_MIN:-180}"
RATE_REF_MB_MIN="${DW_WRITE_RATE_REF_MB_MIN:-10}"   # завышенный default до калибровки ≥30 мин
MIN_OBS_MIN="${DW_MIN_OBS_MIN:-30}"
REALARM_MIN="${DW_REALARM_MIN:-30}"

mkdir -p "$STATE_DIR"
now=$(dw_now)

if [ -n "${DW_FAKE_FREE_BYTES:-}" ]; then
  free_bytes="$DW_FAKE_FREE_BYTES"
else
  free_bytes=$(df -B1 --output=avail "$WATCH_PATH" | tail -1 | tr -d ' ')
fi

# Скользящее окно наблюдений: history.tsv «epoch<TAB>free_bytes», хвост 120 мин.
hist="$STATE_DIR/history.tsv"
printf '%s\t%s\n' "$now" "$free_bytes" >> "$hist"
awk -v n="$now" -F'\t' '(n - $1) <= 7200' "$hist" > "$hist.tmp" && mv "$hist.tmp" "$hist"

oldest_ts=$(head -1 "$hist" | cut -f1)
oldest_free=$(head -1 "$hist" | cut -f2)
span_min=$(( (now - oldest_ts) / 60 ))
rate_ref_bytes=$(awk -v m="$RATE_REF_MB_MIN" 'BEGIN{ printf "%d", m * 1048576 }')

if [ "$span_min" -ge "$MIN_OBS_MIN" ]; then
  rate_used=$(awk -v of="$oldest_free" -v f="$free_bytes" -v s="$span_min" \
    'BEGIN{ d = of - f; if (d < 0) d = 0; r = d / s; if (r < 1) r = 1; printf "%d", r }')
  rate_src=sliding
else
  rate_used="$rate_ref_bytes"
  rate_src=ref-default
fi

t_remain=$(dw_t_remain_min "$free_bytes" "$rate_used")
b_floor=$(dw_b_floor_bytes "$rate_ref_bytes")
level=$(dw_decide "$t_remain" "$free_bytes" "$b_floor" "$T_CRIT_MIN" "$T_WARN_MIN")

outcome=ok_no_alarm
deliver_failed=0
if [ "$level" != ok ]; then
  throttle_file="$STATE_DIR/last_alarm_$level"
  if dw_throttled "$throttle_file" "$now" "$REALARM_MIN"; then
    outcome=skipped_throttled
  else
    payload="[disk-alarm][$level] host=$(dw_host) vol=$WATCH_PATH free=$(dw_human_gib "$free_bytes") t_remain=${t_remain}м rate=$(dw_human_rate "$rate_used") ($rate_src)"
    outcome=$(dw_deliver "$payload") || deliver_failed=1
    case "$outcome" in sent_*) echo "$now" > "$throttle_file" ;; esac
  fi
fi

printf '%s level=%s outcome=%s free=%s t_remain=%s rate=%s src=%s\n' \
  "$now" "$level" "$outcome" "$free_bytes" "$t_remain" "$rate_used" "$rate_src" \
  >> "$STATE_DIR/journal.log"

# Пульс присутствия сторожа: пишется на КАЖДОМ успешном прогоне, независимо от тревог —
# его тишину ловит sibling disk-watchdog-sentinel.sh (тишина ≠ «всё хорошо»).
echo "$now" > "$STATE_DIR/last_ok_ts"

echo "level=$level outcome=$outcome t_remain=$t_remain free=$free_bytes rate=$rate_used src=$rate_src"
[ "$deliver_failed" = 1 ] && exit 1
exit 0
