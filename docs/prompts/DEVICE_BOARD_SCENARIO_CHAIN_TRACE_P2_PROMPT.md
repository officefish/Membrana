# Промпт: Device-board scenario chain server trace (Phase 2)

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Размер задачи: **S**. Ожидаемый артефакт: **1 PR** — `X-Membrana-Trace-Id` client ↔ media-server.
> Реестр: `id` = `db-scenario-chain-trace-p2` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Phase 0–1 дали client-side chain logs и unblock runtime (`skipRefresh`). Phase 2 связывает browser log с pino на `background-media` по одному id.

**Формат:** `X-Membrana-Trace-Id: {runId}-{tick}` (например `b19f0e03-58`).

---

## Что построить

| Слой | Изменение |
|------|-----------|
| `@membrana/media-library-service` | `setMediaLibraryTraceIdProvider`, header на `ServerStorageBackend` |
| `@membrana/client` | provider из `buildScenarioTraceId()` в `createScenarioRuntimeHost` |
| `@membrana/background-media` | CORS + pino `customProps.traceId` |

## Definition of Done

- [ ] POST `/samples` с scenario run несёт `X-Membrana-Trace-Id`
- [ ] media-server pino log содержит `traceId`
- [ ] Unit-тест server-storage-backend на header
- [ ] Cookbook: grep пример для SSH

## Out of scope

- Phase 3 UX export trace
- Journal server trace (отдельный API)
