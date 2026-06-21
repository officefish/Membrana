# Промпт: Device-board scenario chain trace logging (Phase 0)

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер задачи: **M**. Ожидаемый артефакт: **1 PR** — сквозные INFO-логи цепочки scenario runtime.
> Реестр: `id` = `db-scenario-chain-trace-p0` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

MVP-сценарий microphone (`device-scenario-microphone-main-mvp.json`) проходит capture → collect → MakeTrack,
но отладка обрывается на `[media] upload-start`: сервер возвращает 201, клиент зависает внутри
`MediaLibraryService.importBlob()` → `refresh()` без логов. Journal/report не вызываются.

Phase 0 — **наблюдаемость** (correlation id, media-library trace, event-branch completion, cookbook).
Phase 1 (отдельная задача) — unblock runtime (`skipRefresh`, incremental snapshot).

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, порядок работы |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Границы пакетов |
| [`DEVICE_BOARD_JOURNAL_REPORTER_V06_EPIC_PROMPT.md`](./DEVICE_BOARD_JOURNAL_REPORTER_V06_EPIC_PROMPT.md) | Journal/report chain |
| [`docs/device-board-scripts/device-scenario-microphone-main-mvp.json`](../device-board-scripts/device-scenario-microphone-main-mvp.json) | Эталонный сценарий |
| [`docs/device-board-scripts/logs/info.txt`](../device-board-scripts/logs/info.txt) | Baseline лог зависания |

**GitHub Issue:** null (создать при triage).

---

## Промпт целиком (для вставки агенту)

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead).
Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md).

### Что построить

1. **Correlation id** — `runId` на каждый прогон scenario; `tick`, `branch` в runtime-логах.
2. **Media-library trace** — события putSample/refresh/ensure-reserved/listSamples с `elapsedMs`.
3. **Event branch completion** — `collect-event-dispatch-done`, `event-branch-done`.
4. **Cookbook** — ожидаемая последовательность логов для MVP flush → publish.

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Runtime | `packages/device-board` | `runId` в scenario-runtime; event-dispatch done logs |
| Client bridge | `apps/client/.../scenarioMicJournalBridge.ts` | `scenarioChainLog` stages |
| Client gate | `apps/client/.../scenarioRuntimeInfoGate.ts` | trace context merge |
| Media library | `packages/services/media-library` | optional trace hook, no React |
| Docs | `docs/device-board-scripts/` | expected log sequence |

**Запрещено:**

- Phase 1 fixes (`skipRefresh`) в этом PR
- Зависимости media-library от device-board / client
- `console.log` — только `@membrana/core` logger / trace hook

### Definition of Done

- [ ] Лог MVP с INFO показывает цепочку до последнего await или `publish-done`
- [ ] Между `upload-start` и `upload-ok` есть media-lib trace (putSample-done, refresh-*)
- [ ] Unit-тест trace hook в media-library
- [ ] Cookbook MD с expected events
- [ ] `yarn workspace @membrana/media-library-service test` + device-board tests green

### Out of scope

- Phase 1 unblock (`skipRefresh`, server trace header)
- UI export trace button
- Изменения background-media API

### Порядок работы ролей

1. **Vesnin** — LGTM, cookbook, реестр
2. **Ozhegov** — media-library trace + event-dispatch + runId
3. **Музыкант** — capture `durationMs` в chain log
4. **Rodchenko** — —

---

## Заметки для человека-постановщика

1. GitHub Issue `imperfection`: «Device-board scenario chain logging gaps».
2. `yarn task:sync-readme` после registry.
3. Phase 1: `db-scenario-chain-unblock-p1` (отдельная запись).

### Проверка после PR

```bash
yarn workspace @membrana/media-library-service test
yarn workspace @membrana/device-board test
# Browser: INFO on, run MVP, save console → docs/device-board-scripts/logs/info.txt
```

---

## Связь с дорожной картой

- Parent: `device-board-hackathon-1` / `device-board-journal-reporter-v06`
- Follow-up: Phase 1 unblock, Phase 2 server trace-id
