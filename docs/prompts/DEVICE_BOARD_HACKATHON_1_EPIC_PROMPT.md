# Промпт (эпик): device-board хакатон 1

> **Task-промпт для координатора и постановщика** (не для одного PR).
> Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Регламент: [`HACKATHON_REGULATION.md`](../HACKATHON_REGULATION.md).
> Размер эпика: **L** (много-дневный хакатон).
> Реестр: `id` = `device-board-hackathon-1` в [`docs/tasks/registry.json`](../tasks/registry.json).
> Бриф: [`DEVICE_BOARD_HACKATHON_BRIEF.md`](./DEVICE_BOARD_HACKATHON_BRIEF.md) v0.5.
> Интервью: [`seanses/hackathon-brief-interview-2026-06-17.md`](../seanses/hackathon-brief-interview-2026-06-17.md).

---

## Контекст

Внедрение `@membrana/device-board` как **редактора сценариев** (visual scripting): signal graph + scenario graph (вкладки), runtime initial/main/alarm loops, журнал, триггеры, cabinet edit + sync.

**Ветка:** `vesnin` (core) / `hackathon/device-board-1-2026-06-17` от `vesnin`.

**Подзадачи (строгий порядок):**

| Фаза | Реестр `id` | Содержание | Lead |
|------|-------------|------------|------|
| H0 | `db-h0-concept-interview` | Концепт v0.3, закрытие интервью, реестр | Vesnin |
| H1a | `db-h1a-core-contracts` | `SocketType`, `ScenarioGraph` v1 в core | Vesnin |
| H1b | `db-h1b-board-shell` | XYFlow, board mode, split UI | Ozhegov / Rodchenko |
| H1c | `db-h1c-graph-serialize` | `isValidConnection`, export, pre-run validation | Ozhegov |
| H2a | `db-h2a-json-import` | Import JSON, round-trip (stretch) | Ozhegov |
| H2b | `db-h2b-scenario-runtime` | Runtime: initial + main loop | Ozhegov |
| H2c | `db-h2c-mic-journal` | Mic → chunks → trends FFT → journal | Музыкант |
| H2d | `db-h2d-cabinet-sync` | Cabinet board edit + bidirectional sync | Ozhegov |
| H3a | `db-h3a-trigger-stop` | Stop: UI + system event | Ozhegov |
| H3b | `db-h3b-trigger-disconnect` | Disconnect → stop; reconnect → initial | Ozhegov |
| H3c | `db-h3c-subgraph` | Subgraph v1, depth ≤ 1 | Ozhegov |
| H4 | `db-h4-alarm-close` | **Alarm loop** (обязателен), smoke, hackathon close | Vesnin / Музыкант |

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`packages/device-board/DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) | Канон пакета (обновить в H0) |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) §1f | Границы device-board |
| [`MODULE_AND_PLUGIN_UI.md`](../MODULE_AND_PLUGIN_UI.md) | Registry, lifecycle |
| [`MEMBRANE_PLATFORM.md`](../MEMBRANE_PLATFORM.md) | Cabinet, deviceId |
| [`DESIGN.md`](../DESIGN.md) | DaisyUI, board mode |

**GitHub Issue:** _(создать при triage)_.

---

## Definition of Done (эпик целиком)

- [ ] Все подзадачи `db-h*` в реестре `archived` с отчётами.
- [ ] Эталонный сценарий end-to-end: initial → main → **alarm** → journal на реальном микрофоне.
- [ ] Triggers: stop + disconnect; reconnect через initial.
- [ ] `DEVICE_BOARD_CONCEPT.md` v0.3; `CLOSURE.md` в `docs/archive/hackathon/`.
- [ ] README + demo для оператора (D3).

---

## Out of scope (эпик)

- Round-trip JSON / import — **stretch** (хакатон 1.5 при нехватке времени).
- Statistics UI, scheduled analyzer implementation.
- D2–D4 (mic-array, RF, thermal).
- Native desktop installer.

---

## Stop rules

См. [`DEVICE_BOARD_HACKATHON_BRIEF.md`](./DEVICE_BOARD_HACKATHON_BRIEF.md) §7. **Alarm loop не переносится** (D1).

---

## Заметки для постановщика

1. Пока `HACKATHON_ACTIVE.md` открыт — не запускать `yarn ritual:day` / `yarn ritual:evening`.
2. Закрывать подзадачи: `yarn task:archive db-h1a-core-contracts` и т.д.
3. Эпик архивировать после `db-h4-alarm-close` и `hackathon:close`.
