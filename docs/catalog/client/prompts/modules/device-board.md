# Модуль: `device-board` — Доска устройства

> **Catalog-спецификация** · статус: **stable** (2026-06-22, sprint `device-board-docs-post-140`)  
> Реестр: `docs/catalog/client/registry.json`  
> Концепт: [`DEVICE_BOARD_CONCEPT.md`](../../../../packages/device-board/DEVICE_BOARD_CONCEPT.md) (v0.10 §22)  
> Runtime: [`SCENARIO_RUNTIME.md`](../../../SCENARIO_RUNTIME.md)  
> **Mintlify:** [`apps/docs/device-board`](../../../../apps/docs/device-board/mvp-overview) · workflow: [`DOCUMENTATION_WORKFLOW.md`](../../../DOCUMENTATION_WORKFLOW.md)

---

## 1. Идентичность

| Поле | Значение |
|------|----------|
| **id** | `device-board` |
| **Версия** | `0.10.x` |
| **Категория** | Устройства |
| **Lead** | Ozhegov (структура) + Vesnin (runtime / edit model) |

---

## 2. Зачем пользователю

1. Визуально собрать **signal**-топологию и **scenario**-граф (ветки onConnect / onStart / loops / onStop).
2. Запустить сценарий (Run/Stop), переключать normal/alarm, смотреть runtime-инспектор портов и **подсветку exec-цепочки**.
3. Объявлять переменные, **пользовательские функции** (pins, collapse), UserCases из каталога; **сохранять до N user workspace** (U10).
4. Сохранять сценарий вручную; откат одного шага редактирования (undo).

Пакет `@membrana/device-board` — UI + scenario runtime; **Web Audio** только через client host (`audio-engine-service`).

---

## 3. UX-состояния

| Состояние | UI |
|-----------|-----|
| **edit** | палитра, переменные, drag/connect; breadcrumbs в header канваса |
| **dirty** | кнопка «Сохранить» активна; handler switch без Save → откат к saved document (F7) |
| **undo pending** | кнопка ↶; Ctrl+Z / Cmd+Z (не в input) |
| **function branch** | inline editor в сайдбаре; pin meter `n/9`; exec-first pins; subgraph **custom** badge + user name |
| **runtime** (`isRunning`) | канвас read-only; exec highlight; инспектор портов по клику |
| **validation errors** | баннер pre-run |
| **launcher** (U10) | выбор system-preview / user-edit до входа в board mode; quota N/max |
| **system-preview** | Save disabled; клон из модуля; pan/zoom/minimap; палитра скрыта; инспектор RO; CRUD vars/fn locked; навигация по веткам OK |
| **user-edit** | Save → active IndexedDB workspace |

Операторская документация: [`user-workspace.mdx`](../../../../apps/docs/device-board/user-workspace.mdx) · [`edit-and-navigation.mdx`](../../../../apps/docs/device-board/editor/edit-and-navigation.mdx) · [`user-functions.mdx`](../../../../apps/docs/device-board/editor/user-functions.mdx).

---

## 4. Архитектура

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Пакет | `packages/device-board` | graph, runtime, shell, persist adapters |
| Graph context | `context/device-board-graph-context.tsx` | state, `navigateScenarioBranch`, undo wiring |
| Navigation | `graph/branch-navigation.ts` | `ScenarioRevertPolicy`, F7 vs keep-dirty |
| Undo | `graph/edit-undo-controller.ts` | depth-1 snapshot |
| Client module | `apps/client/src/modules/device-board/` | `DeviceBoardLauncher`, workspace store, board mode entry |
| Runtime host | `createScenarioRuntimeHost.ts` | audio, journal, INFO gate, loop tick |
| Регистрация | `registerClientModules.ts` | `MembranaRegistry.registerLazyModule` |

### Запрещено

- `new AudioContext()` / `getUserMedia` внутри `@membrana/device-board`
- Прямые вызовы `useMembranaStore.getState().registerModule` — только `MembranaRegistry`
- Импорт из `dist/` других пакетов

---

## 5. Edit model (канон §21)

| Механизм | Поведение |
|----------|-----------|
| **Save** | Только явный Save; baseline = полный `DeviceScenarioDocument` |
| **F7 branch snapshot** | `revert-if-dirty` при смене handler tab / Signal layer |
| **Function navigation** | `keep-dirty` при fn-1→fn-2, collapse→function |
| **Undo depth-1** | delete, pins, collapse, align, clear branch — **не** free drag |
| **Undo forget** | смена handler / function / слоя Scenario |

Публичный API контекста: `captureEditUndoSnapshot`, `undoLastEdit`, `forgetPendingEditUndo`, `setScenarioBranch`.

---

## 6. Scenario runtime (связь)

Исполнение графа — `ScenarioRuntime` + `ScenarioRuntimeHost`. Фазы, лупы, onTick — [`SCENARIO_RUNTIME.md`](../../../SCENARIO_RUNTIME.md).

| Режим | Runtime | UI |
|-------|---------|-----|
| Edit | не запущен | mutating ops, undo, marquee |
| Run | `start()` / `stop()` | read-only canvas, `inspectRuntimeNode`, exec overlay |

User functions: `exec-subgraph.ts` — вход через `function-input`, выход через `function-output`; depth ≤ 1. Exec pins первые на Input/Output, неудаляемы; subgraph-блок на ветке — badge `custom`, label = имя пользователя; unique id на collapse (#159), repair/delete по draftIndex (#160).

**Exec / Sequence (ES1–ES4):** optional data-pins — подпись `?` (напр. `& device ?`); exec fan-out блокируется при connect; узел **Sequence** (`then-0…then-8`, sync, **parallel async**, или **latent Then** `latentThen`) — см. CONCEPT §18.3.1. Pre-run: `validate-exec-fanout.ts`, `validate-sequence-async.ts`, `validate-async-promise.ts`.

**Async pipeline (AP v1):** палитра Promise nodes — `start-async-job`, `await-promise`, `on-async-resolved`, `cancel-async-jobs`; runtime `AsyncJobStore`; host bridge в client (`scenarioMicJournalBridge`); UI subscribe — `ScenarioAsyncJobHub` (`@membrana/agenda`). Bundled MVP v2.0-async: CONCEPT §16.5.2 · [`SCENARIO_RUNTIME.md`](../../../SCENARIO_RUNTIME.md) §10.

**Operator notes (инспектор узла):** реестр `graph/scenario-node-inspector-notes.ts` + `BoardNodeInspectorNotes` — статические подсказки по nodeKind (не в JSON сценария). Пример: `start-recording` — идемпотентный skip + канон размещения (onStart bootstrap, не каждый tick). Pre-run: `validate-start-recording-loop.ts`. CONCEPT §15.5.1 · cookbook § recording markers.

---

## 7. Зависимости

- `@membrana/core` — типы сценария, SocketType, variables, function pins
- `@membrana/agenda` — **не** зависит (client связывает)
- Services: `@membrana/audio-engine-service` (через client host only)

---

## 8. Плагины

Отдельных client-плагинов у модуля нет. Ноды палитры — часть scenario graph в `@membrana/device-board`. Node reference: `apps/docs/device-board/nodes/`.

---

## 9. Тесты

```bash
yarn workspace @membrana/device-board test
```

Критичные области: `branch-navigation.test.ts`, `device-board-nav.integration.test.tsx`, `scenario-runtime.test.ts`, `exec-subgraph.test.ts`.

---

## 10. Чеклист перед правками

1. Прочитать `DEVICE_BOARD_CONCEPT.md` §18–§22 и `SCENARIO_RUNTIME.md`.
2. При UX/edit — Mintlify editor pages и этот catalog-промпт.
3. Не нарушать границу пакетов (`device-board` ↛ `agenda`).
4. `yarn catalog:verify-client` после изменения `registry.json`.

---

## 11. Changelog

| Дата | Изменение |
|------|-----------|
| 2026-06-23 | **stable** (U10 D1): user workspace §22, `DeviceBoardLauncher`, Mintlify `user-workspace.mdx` |
| 2026-06-22 | **stable** (D3 docs sprint): edit model §21, Mintlify editor links, UX table |
| 2026-06-17 | draft catalog (MC-2); ссылка на `db-doc-v04-mvp` |
