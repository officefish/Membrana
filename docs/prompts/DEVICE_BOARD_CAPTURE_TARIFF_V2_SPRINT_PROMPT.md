# Sprint prompt: Device-board capture tariff v2 (CT0–CT9)

| Поле | Значение |
|------|----------|
| **Sprint** | `db-capture-tariff-v2-2026-07-02` |
| **Registry epic** | `device-board-capture-tariff-v2` |
| **Канон** | [`DEVICE_BOARD_SERVER_FIRST.md`](../DEVICE_BOARD_SERVER_FIRST.md) v2.0 |
| **Консилиум** | [`device-board-capture-tariff-v2-2026-07-02.md`](../seanses/device-board-capture-tariff-v2-2026-07-02.md) |
| **Скоуп** | cabinet ↔ `apps/client`. **Studio — отдельный спринт** |
| **Size** | L |

## Цель

Явный захват устройства с сервера (тариф v2): двухшаговый capture → select+play+stop существующего сценария; мягкий/жёсткий режимы; вытеснение с fade-out и alert; TTL auto-release; enforcement в gateway. Удалить из wire v1-superset (edit-lease, pause, setMode → тариф v3).

> Примечание к консилиуму: секретарь использовал вымышленные имена (`background-office`, `device-runtime`, `useMembranaStore`) — во всех фазах ниже они замаплены на реальные пакеты: `packages/background-cabinet`, `packages/core`, стор клиента в `apps/client`.

## Фазы

### CT0 — Canon + бриф (✅ выполнено вне спринта)

- Консилиум 2026-07-02, канон v2.0, регистрация спринта.

### CT1 — Core wire contracts (`packages/core`)

- [ ] `board.event`: `capture` / `heartbeat` / `release` (+payload, +parse-функции).
- [ ] `runtime`: `stop { fadeOutMs?: number }`; тип capability-set тарифа.
- [ ] Удалить из wire-типов `pause`, `resume`, `setMode`, `followerMode` (см. CT7).
- [ ] Unit: parse/serialize round-trip.

### CT2 — Gateway capture lifecycle (`packages/background-cabinet`)

- [ ] `capture(nodeId, mode)`, `release(nodeId, reason)`, heartbeat loop (2 мин, TTL 5 мин), персист capture-состояния.
- [ ] **Whitelist команд по тарифу** (канон §4.1): вне whitelist → 403. Единственная точка enforcement.
- [ ] TTL-expiry на сервере: mark expired → broadcast `release { reason: 'ttl-expired' }`.
- [ ] Tests: mock WS, интервалы heartbeat, expiry, reject недопустимых команд.

### CT3 — Cabinet UI: захват + выбор сценария (`apps/cabinet`)

- [ ] NodesPage + board: кнопки «Захватить (мягкий/жёсткий)» / «Отпустить»; badge состояния.
- [ ] Scenario selector: read-only `getScenarios()` → dropdown → `selectScenario(id)` + `run(id)`; кнопка Стоп.
- [ ] Никаких pause/setMode/edit-контролов в v2.

### CT4 — Client follower enforcement (`apps/client`)

- [ ] Store: `device.capture { holder, mode, sessionId, expiresAt }`; WS-listener `board.event`.
- [ ] Enforcement: soft → edit/пауза заблокированы, run/stop разрешены; hard → всё disabled кроме emergency stop.
- [ ] TTL-таймер на клиенте: 5 мин без heartbeat → auto-release → автономия.
- [ ] Optimistic-блокировка кнопок + обработка 403 от gateway (двойная защита).

### CT5 — Индикация + alert (`apps/client`, `packages/device-board`)

- [ ] Badges: Отпущено (серый) / Захват: мягкий (`badge-info`) / Захват: жёсткий (`badge-warning`) / Соединение потеряно (`badge-warning`, временный).
- [ ] Alert вытеснения: toast `alert-warning`, ручное закрытие, `aria-live="polite"`.
- [ ] Toast info на release: «Управление устройством отпущено».
- [ ] Ревизия `resolveServerFirstFlags()` под оси v2.

### CT6 — Runtime: fade-out + last-write-win

- [ ] `audio-engine`: `stop(fadeOutMs)` — затухание громкости перед остановкой; `fadeOutMs=0` = hard-cut. **Без permission-проверок в engine** (инвариант канона §3.3).
- [ ] Вытеснение: `stop { fadeOutMs: 200 }` перед переходом в ведомость.
- [ ] Last-write-win конкуренции `run` при мягком захвате (timestamp, loser → stop).
- [ ] Tests: fade ramp, race run/run.

### CT7 — Cleanup v1 superset

- [ ] Gateway: удалить `pause`, `resume`, `setMode` обработчики; отключить edit-lease endpoints.
- [ ] `apps/client` NodesPage-follower: скрыть pause; кабинет: убрать pause/mode кнопки.
- [ ] Оставшийся код закомментировать `// Tariff v3: edit-lease, pause/resume, setMode`; тесты pause → skip `tariff=v3`.
- [ ] Коммит-нота: «Tariff v3 surface removed from v2 gate».

### CT8 — Tests + smoke

- [ ] Unit + gateway mock по smoke-чеклисту канона §11.
- [ ] Runbook smoke (по образцу `DEVICE_BOARD_SERVER_FIRST_SMOKE.md`), пометка «prod E2E после деплоя cabinet».

### CT9 — Docs sync

- [ ] `DESIGN.md`: Device Capture State (badges), Alert on pre-emption.
- [ ] `ARCHITECTURE.md`: оси v2, emergency-stop инвариант, tariff whitelist.
- [ ] `CONCEPT`/catalog при затронутых узлах; `WHITE_PAPER.md` — описание тарифов v2/v3.

## Не в спринте

- **Настольная Studio** (host bridge, follower на Electron) — отдельный спринт после v2.
- Тариф v3 (edit/pause/debug/setMode с сервера).
- Strict monitoring window, детекторы DB3H-S4.

## DoD

- Smoke-чеклист канона §11 зелёный локально (unit + gateway mock + `yarn turbo lint typecheck test build`).
- Prod E2E — после окна деплоя cabinet (вместе с зависшим prod-gate v1).
