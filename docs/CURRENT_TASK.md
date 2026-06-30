# CURRENT_TASK

> **Буфер** — при конфликте проигрывает [`MAIN_DAY_ISSUE.md`](./MAIN_DAY_ISSUE.md) и реестру.

## Канон дня (2026-06-30)

**Текущий спринт:** `device-board-server-first` ← **сейчас**  
**Параллельно:** `db3h-s5-desktop-logging` (DL-3 optional) — не блокер

### Фокус

**Device-board server-first** — консилиум ✅, спринт SF0–SF9. **Детекторы S4 не открываем.**

### Очередь

1. ~~`db3h-s3-studio-host`~~ — closed
2. `db3h-s5-desktop-logging` — DL-1/DL-2 ✅; DL-3 optional
3. **`device-board-server-first`** — SF0–SF9 ✅ · **deploy + prod smoke** next ([`DEPLOY.md`](./day-sprint/db-server-first-2026-06-26/DEPLOY.md))
4. ~~`db3h-s4-microphone-detectors`~~ — **deferred** (после server-first)

### Команды

```bash
yarn turbo run lint typecheck test build --continue
# deploy: docs/day-sprint/db-server-first-2026-06-26/DEPLOY.md
# prod E2E: docs/actions/device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE.md
```

**Консилиум:** [`seanses/device-board-server-first-2026-06-26.md`](./seanses/device-board-server-first-2026-06-26.md)  
**Канон:** [`DEVICE_BOARD_SERVER_FIRST.md`](./DEVICE_BOARD_SERVER_FIRST.md)  
**OPEN:** [`db-server-first-2026-06-26/OPEN.md`](./day-sprint/db-server-first-2026-06-26/OPEN.md)
