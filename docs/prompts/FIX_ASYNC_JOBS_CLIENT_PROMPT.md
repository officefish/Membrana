# ФИК-СПРИНТ: Исправление 11 типо-ошибок @membrana/client (async-jobs интеграция)

**Дата:** 2026-07-01  
**Статус:** Активная  
**Приоритет:** КРИТИЧЕСКИЙ (блокирует MAIN_DAY_ISSUE_2026_07_01)  
**Размер:** M  
**Lead:** Vesnin  
**Personas:** Ozhegov (код), Dynin (типы), Rodchenko (тесты)

---

## Описание

Утренний линт обнаружил 11 типо-ошибок в `@membrana/client`, которые указывают на неполную интеграцию async-jobs функционала из `@membrana/device-board`. 

**Корневая причина:** Функционал async-jobs был добавлен в device-board, но экспорты и интерфейсы не полностью синхронизированы с client.

---

## Ошибки (11 типо-ошибок)

### Блок A: Экспорты device-board (5 ошибок)

1. **TS2305** `src/lib/deviceBoardRuntimeController.ts(9,3)`  
   Module `@membrana/device-board` не экспортирует `resolveServerFirstFlags`  
   Также в: `src/lib/runtimeRealtimeBridge.ts(10,10)`, `src/modules/device-board/useServerFirstBoardState.ts(3,10)`

2. **TS2305** `src/modules/device-board/scenarioMicJournalBridge.ts(10,8)`  
   Module `@membrana/device-board` не экспортирует `AsyncJobStore`

3. **TS2305** `src/modules/device-board/useServerFirstBoardState.ts(3,40)`  
   Module `@membrana/device-board` не экспортирует `ServerFirstFlagsInput`

4. **TS2724** `src/modules/device-board/DeviceBoardLauncher.tsx(5,3)`  
   Module `@membrana/device-board` не экспортирует `deviceScenarioExportFilename`  
   (возможно: `branchScenarioExportFilename`)

5. **TS2305** `src/modules/device-board/DeviceBoardLauncher.tsx(6,3)`  
   Module `@membrana/device-board` не экспортирует `downloadDeviceScenarioJson`

### Блок B: Интерфейсы ScenarioRuntime (2 ошибки)

6. **TS2339** `src/lib/deviceBoardRuntimeController.ts(147,29)`  
   Property `subscribeAsyncJobs` не существует на `ScenarioRuntime`

7. **TS2339** `src/lib/deviceBoardRuntimeController.ts(148,29)`  
   Property `listPendingAsyncJobs` не существует на `ScenarioRuntime`

### Блок C: Интерфейсы ScenarioRuntimeHost (1 ошибка)

8. **TS2353** `src/modules/device-board/createScenarioRuntimeHost.ts(301,5)`  
   Property `startAsyncJob` не существует в `ScenarioRuntimeHost`

### Блок D: Props и типы (3 ошибки)

9. **TS2322** `src/App.tsx(47,15)`  
   Property `serverFirstState` не существует на `DeviceBoardShellProps`

10. **TS7006** `src/modules/device-board/createScenarioRuntimeHost.ts(301,21)`  
    Parameter `input` в `startAsyncJob` имеет неявный тип `any`

---

## Definition of Done

- [ ] **Все 11 ошибок typecheck'а исправлены**
- [ ] `yarn workspace @membrana/client typecheck` → GREEN
- [ ] `yarn turbo run test --filter='@membrana/device-board'` → GREEN
- [ ] `yarn workspace @membrana/client test` → GREEN (если есть tests)
- [ ] Никаких новых ошибок lint/typecheck
- [ ] Код-ревью пройден (membrana-code-review)
- [ ] Git коммит с описанием изменений + `Closes #<issue>`

---

## Стратегия исправления

### Этап 1: Диагностика (15 мин)
1. Проверить что экспортируется из `packages/device-board/dist/index.d.ts`
2. Проверить что экспортируется из `packages/device-board/src/index.ts`
3. Пересобрать device-board: `yarn workspace @membrana/device-board build`
4. Очистить TS кеш в client: удалить `.tsbuildinfo*` файлы

### Этап 2: Исправления в device-board (если нужны)
1. Если экспорты отсутствуют в `src/index.ts` — добавить
2. Если методы отсутствуют в типах — добавить в `src/runtime/scenario-runtime.ts`
3. Если props отсутствуют в интерфейсах — добавить в `src/components/device-board-shell.ts`
4. Пересобрать: `yarn workspace @membrana/device-board build --force`

### Этап 3: Исправления в client (если нужны)
1. Обновить импорты если экспорты переименованы
2. Обновить использование API если интерфейсы изменились
3. Добавить недостающие типы если нужны

### Этап 4: Верификация
1. `yarn workspace @membrana/client typecheck` → GREEN
2. `yarn workspace @membrana/client test` (если есть tests)
3. Code-review пройден

---

## Возможные решения

**Сценарий A:** Все экспорты уже есть в device-board, проблема в кеше TypeScript
- Решение: очистить `.tsbuildinfo` файлы в client и device-board, пересобрать

**Сценарий B:** Экспорты отсутствуют в device-board
- Решение: добавить в `src/index.ts` и пересобрать

**Сценарий C:** Методы/props отсутствуют в интерфейсах
- Решение: добавить в соответствующие файлы типов

---

## Нюансы

- `deviceScenarioExportFilename` может быть переименован в `branchScenarioExportFilename` — проверить в device-board
- Async-jobs интеграция может быть неполной — может потребоваться частичная реализация методов
- На момент начала: device-board уже собран и экспорты присутствуют в dist/

---

## GitHub Issue

Свяжи с GitHub Issue если есть, или создай новый для отслеживания.

---

## Регистр

После успешного выполнения:
```bash
yarn task:archive fix-async-jobs-client --notes "PR #XXX; все 11 ошибок исправлены, typecheck GREEN"
```
