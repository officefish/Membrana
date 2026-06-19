# Task: device-board — очистка текущей ветки + защита Event-узлов

**GitHub Issue:** #106  
**Реестр:** `device-board-clear-branch`  
**Пакет:** `@membrana/device-board`  
**Песочница:** `apps/client` (без изменений кабинета)

## Проблема

Кнопка «Очистить борд» сбрасывала все ветки и переменные; системные Event-узлы терялись.

## Решение

1. `clearCurrentBranch(layer)` — очищает только активную ветку (Signal или Scenario).
2. В обработчиках событий (`initial`, `onConnect`, `onStop`, `onDisconnect`) сохраняются locked-узлы (`system:true` / `deletable:false`).
3. `rejectSystemNodeRemovals` расширен на все locked-узлы.

## DoD

- [x] `clear-branch.ts` + unit-тесты
- [x] UI: confirm с именем ветки, кнопка «Очистить ветку»
- [ ] `yarn turbo run lint typecheck test --filter=@membrana/device-board` green
- [ ] Ручная проверка в client dev

## Out of scope

- `apps/cabinet` — тонкий host, без правок
- Deploy prod
