# OPEN: Device-board capture tariff v2 (2026-07-02)

| Поле | Значение |
|------|----------|
| **Sprint** | `db-capture-tariff-v2-2026-07-02` |
| **Registry epic** | `device-board-capture-tariff-v2` |
| **Status** | **open** — CT0 ✅ (канон v2.0), CT1–CT9 next |
| **Size** | L |
| **Скоуп** | cabinet ↔ `apps/client`; **Studio — отдельный спринт** |
| **Ревизует** | `device-board-server-first` v1 (код-комплит, не задеплоен → окно чистой ревизии) |

**Prompt:** [`DEVICE_BOARD_CAPTURE_TARIFF_V2_SPRINT_PROMPT.md`](../../prompts/DEVICE_BOARD_CAPTURE_TARIFF_V2_SPRINT_PROMPT.md)
**Канон:** [`DEVICE_BOARD_SERVER_FIRST.md`](../../DEVICE_BOARD_SERVER_FIRST.md) v2.0
**Консилиум:** [`device-board-capture-tariff-v2-2026-07-02.md`](../../seanses/device-board-capture-tariff-v2-2026-07-02.md)
**Бриф:** [`DEVICE_BOARD_CAPTURE_TARIFF_BRIEF.md`](../../DEVICE_BOARD_CAPTURE_TARIFF_BRIEF.md)

---

## Принцип

**Явный захват:** без захвата у сервера ноль контроля. Захвачено → select+play+stop существующего сценария. Мягкий (клиент start/stop) / жёсткий (полностью ведомый + emergency stop). Enforcement — gateway whitelist. Edit/pause/setMode с сервера — тариф v3, из wire v2 удаляются.

---

## Phases

| Phase | Task id | Deliverable | Status |
|-------|---------|-------------|--------|
| CT0 | `db-ct-0-canon` | Консилиум + канон v2.0 + регистрация | ✅ |
| CT1 | `db-ct-1-core-contracts` | core: `board.capture/heartbeat/release`, `stop{fadeOutMs}` | ⬜ |
| CT2 | `db-ct-2-gateway-capture` | Gateway: capture lifecycle + heartbeat/TTL + whitelist | ⬜ |
| CT3 | `db-ct-3-cabinet-capture-ui` | Cabinet: захват/отпуск + scenario selector | ⬜ |
| CT4 | `db-ct-4-client-follower` | Client: store, enforcement, TTL auto-release | ⬜ |
| CT5 | `db-ct-5-indicators-alert` | Badges + alert вытеснения + a11y | ⬜ |
| CT6 | `db-ct-6-runtime-fade-lww` | fade-out stop + last-write-win | ⬜ |
| CT7 | `db-ct-7-v1-cleanup` | Удаление v1 superset из wire/gateway | ⬜ |
| CT8 | `db-ct-8-tests-smoke` | Tests + smoke runbook | ⬜ |
| CT9 | `db-ct-9-docs-sync` | DESIGN, ARCHITECTURE, WHITE_PAPER | ⬜ |

---

## Не в спринте

- **Настольная Studio** (подгонка follower на Electron) — отдельный спринт после v2
- Тариф v3: edit/pause/debug/setMode с сервера
- Strict monitoring window, `db3h-s4-microphone-detectors`

---

## Команды

```bash
yarn turbo run lint typecheck test build --continue
# smoke: канон §11 (локально unit + gateway mock; prod E2E после деплоя cabinet)
```
