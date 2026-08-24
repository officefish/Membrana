#!/usr/bin/env bash
# Общая обвязка сторожа диска (Д1, кусок A #2118, вердикт M1c заседания logging-observability-cut).
#
# Транспорт тревог: primary — ПРЯМОЙ Bot API со своим токеном (офис-first запрещён:
# офис транзиентно таймаутит, тревога через него умирает вместе с ним); fallback —
# офис `/v1/telegram/ally-message`, best-effort и только ПОСЛЕ отказа direct.
#
# Тест-крючья (все безопасны по умолчанию): DW_SEND_MODE=print печатает транспортные
# строки в stderr вместо сети; DW_FORCE_DIRECT_FAIL/DW_FORCE_OFFICE_FAIL=1 имитируют
# отказ канала; DW_FAKE_NOW_EPOCH подменяет часы. Боевой режим — без этих переменных.

dw_now() { echo "${DW_FAKE_NOW_EPOCH:-$(date +%s)}"; }

dw_host() { hostname 2>/dev/null || echo unknown-host; }

# t_remain в целых минутах (floor): free_bytes / max(rate_bytes_per_min, 1)
dw_t_remain_min() { # $1 free_bytes  $2 rate_bytes_per_min
  awk -v f="$1" -v r="$2" 'BEGIN{ if (r < 1) r = 1; printf "%d", f / r }'
}

# Несгораемый остаток: max(1 GiB, 10 мин записи по опорной скорости)
dw_b_floor_bytes() { # $1 rate_ref_bytes_per_min
  awk -v r="$1" 'BEGIN{ g = 1073741824; t = 10 * r; printf "%d", (t > g) ? t : g }'
}

dw_decide() { # $1 t_remain_min  $2 free_bytes  $3 b_floor_bytes  $4 t_crit_min  $5 t_warn_min
  if [ "$2" -lt "$3" ] || [ "$1" -lt "$4" ]; then echo crit
  elif [ "$1" -lt "$5" ]; then echo warn
  else echo ok
  fi
}

dw_send_direct() { # $1 text → 0 доставлено · 1 транспортный отказ · 2 нет токена
  if [ "${DW_SEND_MODE:-real}" = print ]; then
    echo "DIRECT> $1" >&2
    [ "${DW_FORCE_DIRECT_FAIL:-0}" = 1 ] && return 1
    return 0
  fi
  [ -n "${DISK_WATCHDOG_TG_TOKEN:-}" ] && [ -n "${DISK_WATCHDOG_TG_CHAT_ID:-}" ] || return 2
  local i
  for i in 1 2; do
    if curl -fsS --max-time 10 -o /dev/null \
      "https://api.telegram.org/bot${DISK_WATCHDOG_TG_TOKEN}/sendMessage" \
      --data-urlencode "chat_id=${DISK_WATCHDOG_TG_CHAT_ID}" \
      --data-urlencode "text=$1"; then
      return 0
    fi
    sleep 2
  done
  return 1
}

dw_send_office() { # $1 text → 0/1; best-effort, канал офиса один — ally-message
  if [ "${DW_SEND_MODE:-real}" = print ]; then
    echo "OFFICE> $1" >&2
    [ "${DW_FORCE_OFFICE_FAIL:-0}" = 1 ] && return 1
    return 0
  fi
  [ -n "${DW_OFFICE_TOKEN:-}" ] || return 1
  local body
  body=$(awk -v t="$1" 'BEGIN{
    gsub(/\\/, "\\\\", t); gsub(/"/, "\\\"", t); gsub(/\n/, "\\n", t);
    printf "{\"text\":\"%s\"}", t }')
  curl -fsS --max-time 15 -o /dev/null \
    -H "content-type: application/json" -H "x-membrana-token: ${DW_OFFICE_TOKEN}" \
    -X POST "${DW_OFFICE_URL:-https://office.mmbrn.tech/v1/telegram/ally-message}" \
    --data "$body"
}

# Доставка со словарём исходов вердикта M1c:
#   sent_direct | sent_via_office | failed_both | skipped_no_token
# Исход — в stdout; транспортные строки print-режима — в stderr.
dw_deliver() { # $1 text; return 1 только при failed_both
  local rc=0
  dw_send_direct "$1" || rc=$?
  if [ "$rc" = 0 ]; then echo sent_direct; return 0; fi
  if [ "$rc" = 2 ]; then echo skipped_no_token; return 0; fi
  if dw_send_office "$1"; then echo sent_via_office; return 0; fi
  echo failed_both
  return 1
}

dw_throttled() { # $1 state_file  $2 now  $3 realarm_min → 0 = молчать (ре-тревога рано)
  [ -f "$1" ] || return 1
  local last
  last=$(cat "$1" 2>/dev/null || echo 0)
  awk -v n="$2" -v l="$last" -v m="$3" 'BEGIN{ exit !((n - l) < m * 60) }'
}

dw_human_gib() { # $1 bytes → «11.5GiB»
  awk -v b="$1" 'BEGIN{ printf "%.1fGiB", b / 1073741824 }'
}

dw_human_rate() { # $1 bytes_per_min → «12.3MB/мин»
  awk -v r="$1" 'BEGIN{ printf "%.1fMB/мин", r / 1048576 }'
}
