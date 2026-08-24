#!/usr/bin/env bash
# Установка сторожа диска на хост media/кабинета. ЗАПУСКАЕТ ВЛАДЕЛЕЦ на VPS —
# агент прод не трогает (граница задания logging-observability-cut).
# Идемпотентен: повторный запуск обновляет файлы и перезапускает таймеры.
#
# До запуска: создать /etc/membrana/disk-watchdog.env (см. README, секреты руками).

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
DEST=/opt/membrana/disk-watchdog

if [ ! -f /etc/membrana/disk-watchdog.env ]; then
  echo "СТОП: нет /etc/membrana/disk-watchdog.env — создать по README (секреты руками)" >&2
  exit 1
fi

mkdir -p "$DEST"
install -m 0755 "$HERE/disk-watchdog.sh" "$HERE/disk-watchdog-sentinel.sh" "$HERE/disk-watchdog-lib.sh" "$DEST/"
install -m 0644 "$HERE"/systemd/*.service "$HERE"/systemd/*.timer /etc/systemd/system/

systemctl daemon-reload
systemctl enable --now membrana-disk-watchdog.timer membrana-disk-watchdog-sentinel.timer

echo "OK: таймеры активны"
systemctl list-timers --no-pager | grep membrana-disk-watchdog || true
echo "Проверка руками: $DEST/disk-watchdog.sh run && cat /var/lib/membrana-disk-watchdog/journal.log | tail -3"
