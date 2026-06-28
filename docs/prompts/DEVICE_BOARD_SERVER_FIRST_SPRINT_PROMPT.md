# Промпт (эпик): Device-board server-first — кабинет, lease, capture soft/strict

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Размер:** **L** (фазы SF0–SF9)  
> **Реестр:** `device-board-server-first`  
> **Канон:** [`DEVICE_BOARD_SERVER_FIRST.md`](../DEVICE_BOARD_SERVER_FIRST.md)  
> **Консилиум:** [`seanses/device-board-server-first-2026-06-26.md`](../seanses/device-board-server-first-2026-06-26.md)

**GitHub Issue:** #TBD (создать: «Device-board server-first: lease, capture, Nodes controls»).

---

## Контекст

Оператор управляет полевым узлом из **кабинета** (сервер). Принцип **server-first**:

- Кабинет редактирует device-board → поле **view-only**.
- Кабинет запускает run (**capture**) → поле **follower** (мягкий или строгий режим).
- Управление run/pause/stop/mode — со страницы **Узлы**; прослушивание **последнего трека** журнала с карточки узла.

**Предшественники:** MP7 (`membrane-node-realtime-gateway`), MP7b (`membrane-node-runtime-remote` RT0–RT2 частично), DB-VO view-only UX.

**Не открываем:** `db3h-s4-microphone-detectors`, neural tier, Studio DL-3.

---

## Продуктовые решения (LGTM консилиума)

| Решение | Деталь |
|---------|--------|
| Edit lock | Lease `cabinet` на `(membraneId, deviceId)` → поле view-only структуры |
| Capture | `authority: cabinet \| field`; не mic capture format |
| Soft follower | Поле: pause / stop / setMode; local run запрещён |
| Strict follower | Поле: только просмотр графа; monitor window — backlog |
| Wire | Канал `board` (lease) + расширение `runtime` (pause, isPaused, authority) |
| Co-editing | Lease-based, **не** OT/CRDT |

---

## Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| core (`vesnin`) | `packages/core/src/contracts/node-realtime/` | `board.edit-lease`, `RuntimeCommand` +pause, state +authority |
| cabinet server | `packages/background-cabinet/` | Lease persistence, REST, WS fan-out |
| gateway | `node-realtime.gateway.ts` | Маршрут `board` + `runtime` по deviceId |
| device-board | `scenario-edit-flags.ts`, shell | `resolveServerFirstFlags()` |
| client | `runtimeRealtimeBridge.ts`, `deviceBoardRuntimeController` | Follower enforcement |
| cabinet app | `DeviceBoardPage`, `NodesPage` | acquire lease, controls, last-track player |

**Запрещено:**

- Lease / scenario storage в `background-media`
- Прямой Web Audio вне `audio-engine`
- Импорт gateway из `device-board` / client modules
- Смешивание `capture` (authority) с `captureMode` (mic journal)

---

## Фазы спринта

| Фаза | Task id | Размер | Deliverable | Зависит от |
|------|---------|--------|-------------|------------|
| **SF0** | `db-sf-0-canon` | S | Консилиум LGTM + [`DEVICE_BOARD_SERVER_FIRST.md`](../DEVICE_BOARD_SERVER_FIRST.md) v1.0 | — |
| **SF1** | `db-sf-1-core-contracts` | M | core: `board.*`, runtime pause/authority/followerMode/isPaused | SF0, желательно `mp7b-rt0-contract` |
| **SF2** | `db-sf-2-gateway-board` | M | Gateway: channel `board`, fan-out lease events | SF1 |
| **SF3** | `db-sf-3-cabinet-lease-api` | M | REST acquire/release + Prisma/model; DeviceBoardPage lifecycle | SF2 |
| **SF4** | `db-sf-4-client-follower` | M | Field: WS subscribe, follower soft/strict, block local run | SF2, SF1 |
| **SF5** | `db-sf-5-board-flags-ui` | M | `resolveServerFirstFlags`, badges, run cluster gating | SF4 |
| **SF6** | `db-sf-6-nodes-runtime` | M | NodesPage: pause/resume, state isPaused, run+followerMode | SF1, `useCabinetNodeRuntime` |
| **SF7** | `db-sf-7-last-track-preview` | S | Node card: play last journal track (cabinet live journal) | SF6, journal WS |
| **SF8** | `db-sf-8-tests-smoke` | M | Unit + gateway mock + [`DEVICE_BOARD_SERVER_FIRST_SMOKE.md`](../actions/device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE.md) | SF4–SF7 |
| **SF9** | `db-sf-9-docs-sync` | S | CONCEPT, catalog, ARCHITECTURE §, tasks README | SF8 |

**OPEN:** [`docs/day-sprint/db-server-first-2026-06-26/OPEN.md`](../day-sprint/db-server-first-2026-06-26/OPEN.md)

---

## Промпт целиком (координатору)

### Кто ты

Teamlead + Ozhegov (wire/lease) + Dynin (state machine) + Kuryokhin (audio path) + Rodchenko (Nodes + board UX).

### Что сделать (по фазам)

1. **SF1** — в `@membrana/core`: типы `BoardEditLeasePayload`, `BoardCaptureStatePayload`, расширить `RuntimeCommandPayload` (`pause`, `run` с `authority`/`followerMode`), `RuntimeStatePayload` (`isPaused`, `authority`, `followerMode`). Тесты parse/validate.
2. **SF2** — gateway dispatch `board` channel; cabinet + node roles.
3. **SF3** — `POST/DELETE .../nodes/:id/scenario/edit-lease`; heartbeat renew; DeviceBoardPage acquire on mount, release on unmount.
4. **SF4** — client `boardLeaseBridge` + extend `applyRuntimeCommand` для pause; block `start()` when `authority=cabinet`.
5. **SF5** — device-board flags: `cabinetEditLease`, `followerSoft`, `followerStrict`; reuse DB-VO view-only paths.
6. **SF6** — `useCabinetNodeRuntime`: `pause(deviceId)`, `resume`; Nodes UI; wire `ScenarioRuntime.pause()` on field.
7. **SF7** — last track from `useCabinetLiveJournal` / node journal cache; `<audio controls>` + fetch blob URL.
8. **SF8** — smoke runbook; green CI.
9. **SF9** — docs matrix.

### Definition of Done (эпик)

- [ ] Консилиум + canon v1.0
- [ ] Edit lease: cabinet edit → field view-only
- [ ] Capture soft/strict end-to-end
- [ ] Nodes: run/pause/stop/mode + last track preview
- [ ] `yarn turbo run lint typecheck test build --continue` green
- [ ] Smoke checklist signed
- [ ] LGTM Teamlead

### Out of scope

- DB3H-S4 detectors
- Strict monitoring window UI
- Field-initiated edit lease
- Membrana Studio / Device desktop-specific (browser + cabinet first)
- MP7b RT6 full layout refactor (можно параллельно, не блокер SF)

---

## Проверка

```bash
yarn turbo run lint typecheck test build --continue
# SF3: yarn workspace @membrana/background-cabinet prisma migrate
# SF8: manual — docs/actions/device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE.md
```

---

## Связь с дорожной картой

- **MP7b** — runtime transport (этот эпик расширяет контракт и продуктовую семантику).
- **DB3H-S4** — **заморожен** до закрытия server-first.
- **DB3H-S5** — logging; параллельно, не блокер SF1.
