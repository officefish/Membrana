# Промпт: Device-board scenario trace export UX (Phase 3)

> Реестр: `id` = `db-scenario-chain-trace-p3` в [`docs/tasks/registry.json`](../tasks/registry.json).

## Что построить

1. Ring buffer INFO-логов сценария (client-only).
2. Кнопки **Copy trace** и **Download** в шапке device-board (рядом с INFO).
3. Буфер сбрасывается на `scenario-run-start`.

## Definition of Done

- [ ] Copy trace копирует строки формата `[INFO] [device-board]…`
- [ ] Download сохраняет `.txt`
- [ ] Счётчик строк обновляется во время прогона
- [ ] Unit-тест `scenarioTraceBuffer.test.ts`

## Out of scope

- Авто-save в `docs/device-board-scripts/logs/` (только browser download)
- Фильтр консоли DevTools (документирован в cookbook)
