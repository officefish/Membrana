# Промпт (эпик): Device-Board Refactor v0.4 — переменные, Event-узел, dataflow-резолюция, fullscreen

> **Task-промпт для координатора и агента** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)
> **Task-эпик** (7 PR) · **Размер:** **L** (фазы DBR0–DBR6)
> **Ожидаемый артефакт:** последовательные PR; каждый `Closes` подзадачу в GitHub Issue эпика.
> **Реестр:** `id` = **`device-board-refactor-v04`** в [`docs/tasks/registry.json`](../tasks/registry.json)
> **Канон пакета:** [`packages/device-board/DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) (v0.3 → этот эпик двигает к **v0.4**)
> **Консенсус команды:** [`seanses/device-board-refactor-v04-2026-06-18.md`](../seanses/device-board-refactor-v04-2026-06-18.md)
> **Повестка консилиума:** [`DEVICE_BOARD_REFACTOR_CONSILIUM_TOPIC.md`](./DEVICE_BOARD_REFACTOR_CONSILIUM_TOPIC.md)

**GitHub Issue:** [#95](https://github.com/officefish/Membrana/issues/95).

---

## Контекст продукта

`device-board` — редактор сценариев поведения устройства (бриф [`DEVICE_BOARD_HACKATHON_BRIEF.md`](./DEVICE_BOARD_HACKATHON_BRIEF.md)).
Хакатон 1 дал вертикальный срез: канвас `@xyflow/react`, ветви сценария, **exec-only** scenario runtime,
сериализация `device-scenario` v1. Этот эпик переводит доску к модели **визуального скриптинга с
переменными и потоком данных**: системный неудаляемый `Event`-узел в обработчиках событий, типизированные
ссылки (`Device`, `Microphone`) как переменные, исполнение по данным (ленивая резолюция ссылок), и
fullscreen-раскладка до нижнего края страницы.

**Что уже есть (факты из кода — опора, не выдумывать сверх):**

| Область | Где | Состояние |
|---|---|---|
| Shell/раскладка | `packages/device-board/src/components/device-board-shell.tsx` | `flex h-screen flex-col`; центр `<main className="min-w-0 flex-1">` **без `h-full`/`min-h-0`/flex-col** → канвас не дотягивается до низа |
| Канвас | `packages/device-board/src/components/board-flow-canvas.tsx` | один XYFlow-тип `{ board: BoardFlowNode }`; всё — `type:'board'` + `data.blockKind`/`data.pluginId` |
| Монтаж | `apps/cabinet/src/pages/DeviceBoardPage.tsx` (`fixed inset-0 z-50`, `showRunControls={false}`), `apps/client/src/App.tsx` (заменяет `Dashboard`) | расходящиеся хосты |
| Левый сайдбар | `packages/device-board/src/components/board-left-sidebar.tsx`, `src/types/board-ui.ts` (`BRANCH_SIDEBAR_SECTIONS`) | секции веток; есть «Конструктор функций» (одна функция, без list-UI) |
| Правый сайдбар | `packages/device-board/src/components/board-right-sidebar.tsx`, `SCENARIO_NODE_PALETTE` | большая палитра блоков + заглушка-инспектор |
| Схема сценария | `packages/core/src/contracts/device-board/scenario-graph.ts` | `SCENARIO_SYSTEM_BRANCHES=[initial,main,alarm,onStop,onDisconnect]`; `triggers.custom[]` без UI |
| Рантайм | `packages/device-board/src/runtime/{scenario-runtime,exec-subgraph,block-executor}.ts` | исполняет **только exec-рёбра**; data-рёбра сериализуются, но **не обходятся**; блоки зовут host напрямую |
| Run/connection | `device-board/src/context/device-board-graph-context.tsx` (`canRun`), `apps/cabinet/src/pages/NodesPage.tsx` | client-board `canRun` **не** завязан на online; cabinet «Пуск» — по «сопряжён» (`deviceId`), а не online |
| Presence | `packages/core/src/contracts/node-realtime/events.ts` (`node.online`/`node.offline`), `apps/cabinet/src/lib/useCabinetNodeRuntime.ts`, `apps/client/src/stores/nodeConnectionStore.ts` | online-статус есть, в gating Пуска не используется |
| Сериализация | `packages/core/src/contracts/device-board/device-scenario.ts`, `device-board/src/graph/*` | `DeviceScenarioDocument`, export `version`+`hash`, импорт новее → отказ |

**Чего сегодня НЕТ (подтверждено поиском):** переменных; ветвей `onConnect`/`onStart` (есть `initial`,
в UI «On start»); `Event`-узла и защиты от удаления (`deletable:false`/guard отсутствуют); обхода data-рёбер
в рантайме; объектов-ссылок `Device`/`Microphone`; multi-function manager.

**Принятые решения консилиума (2026-06-18, зафиксировано):**

1. **Dataflow — ограниченно:** ленивая резолюция data-входов для ссылок (`resolveInput`, чистая функция), exec ведёт. **Не** полноценный push-движок (концепт §4.6).
2. **4 обработчика событий** `onConnect/onStart/onStop/onDisconnect` — группа; `main/alarm` — лупы отдельно. `onStart` поглощает прежний `initial` (миграция `initial→onStart`, добавить `onConnect`).
3. **Переменные:** scope = **документ сценария**; `Variable={id,name,type,value:Ref|null}`; типы `DeviceRef`/`MicrophoneRef` в каталоге `SocketType`; узлы get/set — из конструктора переменных.
4. **Event-узел:** единый XYFlow-тип, рендер по `data.kind`; системный Event **`deletable:false`** + guard в `applyNodeChanges`; авто-инжект как entry каждой ветви-обработчика.
5. **Remote-enumerate микрофонов для кабинета** — scoped follow-up; основной таргет — полевой клиент через `audio-engine` enumerate.
6. **Fullscreen каноном:** концепт §8 переписать; фикс высоты; единый host-контракт cabinet/client; shell владеет `h-screen/h-full`.
7. **Критерий «связь жива» для Пуска** = online-presence (`node.online/offline`), единый селектор `isDeviceLive`; гасить в списке устройств **и** в борде.
8. **Палитра** сводится к `Print`/`isValid`/`GetMicrophone`; Event — системный (не в палитре); get/set Device/Microphone — из конструктора переменных; старая палитра под флагом.
9. **Фазировка** DBR0→DBR6; out of scope: remote-enumerate UI, реальные loop-узлы, multi-function manager, multi-level subgraph, UI `custom`/`scheduled`.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`packages/device-board/DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) | Канон пакета (обновить до v0.4 в DBR0) |
| [`seanses/device-board-refactor-v04-2026-06-18.md`](../seanses/device-board-refactor-v04-2026-06-18.md) | Решения консилиума + DoD |
| [`DEVICE_BOARD_HACKATHON_BRIEF.md`](./DEVICE_BOARD_HACKATHON_BRIEF.md) | Продуктовый бриф, эталонный сценарий |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Границы пакетов, запрет второго AudioContext/движка |
| [`MODULE_AND_PLUGIN_UI.md`](../MODULE_AND_PLUGIN_UI.md) | `MembranaRegistry`, сайдбар плагина |
| [`DESIGN.md`](../DESIGN.md) | Токены, цветовой код сокетов, a11y |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Ветка `vesnin`, expand/contract миграции |
| [`MEMBRANE_PLATFORM.md`](../MEMBRANE_PLATFORM.md) | pairing, deviceId, node-realtime presence |

**Ветка:** контракты `@membrana/core` (`scenario-graph.ts`, `device-scenario.ts`, каталог `SocketType`) —
**ветка `vesnin`**, LGTM Vesnin (DBR0). Фазы по `device-board`/apps — feature-ветки от смёрдженного DBR0
(или поверх `vesnin` до merge), без повторных правок core-контрактов вне `vesnin` (stop-rule).

---

## Мнение виртуальной команды

```text
[Teamlead — Vesnin]:
Корень — доска переросла exec-only хакатонный срез. Двигаем к v0.4, но строго: dataflow только как
ленивая резолюция ссылок, НЕ второй движок (§4.6). Контракты core — DBR0 на vesnin, без него фазы не
стартуют; миграция initial→onStart через expand/contract, round-trip JSON не ломаем. Merge-order
DBR0→DBR6. Scope держу: никаких реальных loop-узлов, multi-function, custom/scheduled UI в этом эпике.

[Структурщик — Ozhegov]:
Термины точно. Переменные — document-scope, Variable={id,name,type,value:Ref|null}; узлы get/set из
конструктора переменных, не из палитры. Event и прочее — единый XYFlow-тип, разводим по data.kind,
не плодим типы. Неудаляемость — deletable:false + фильтр type:'remove' в applyNodeChanges для системных.
resolveInput — чистая функция протягивания входа назад по data-рёбрам. Запрещено: второй реестр,
build-логика в презентации, дубль метаданных вне MembranaRegistry.

[Математик — Dynin]:
Валидность ссылки — это поле значения, а не магия: Ref={kind,handle,valid}. onDisconnect кладёт null →
set делает valid=false; isValid — чистый предикат. resolveInput детерминирована и тестируется без UI:
вход — подграф + карта переменных, выход — значение порта. Идемпотентность set по id переменной.

[Музыкант]:
getMicrophone и список входов — ТОЛЬКО через audio-engine-service enumerate, второго AudioContext нет.
На клиенте — реальный enumerate; кабинет — follow-up (последний известный список или disabled). Print
печатает значение/метаданные ссылки, в Web Audio не лезет; реальный стрим — забота loop-узлов позже.

[Верстальщик — Rodchenko]:
Fullscreen — корень в <main> без min-h-0/flex-col; чиню цепочку высоты, shell владеет h-screen/h-full,
канвас flex-1, единый host cabinet/client. Конструктор переменных — секция под «Конструктор функций»:
тип = цветной бейдж (как цветовой код сокетов §5.2), invalid = badge-error/приглушение. Параметры — в
сайдбаре, не на ноде. Disabled-Пуск с title/aria «нет связи с устройством». Всё по DESIGN.md, a11y.
```

---

## План спринта (фазы DBR0–DBR6)

| Фаза | Реестр `id` | PR | Lead | Содержание | Зависит от |
|------|-------------|-----|------|------------|------------|
| **DBR0** | `dbr-0-concept-core` | 0 | Vesnin + Ozhegov | Концепт → **v0.4**; контракты `@membrana/core` (**ветка `vesnin`**): `SCENARIO_SYSTEM_BRANCHES` → `onConnect/onStart/onStop/onDisconnect` + лупы `main/alarm`; `ScenarioGraph.variables` (`Variable`, типы `DeviceRef`/`MicrophoneRef`); `SocketType` += ссылочные типы; дискриминатор `data.kind` узлов; **expand/contract** миграция (`initial→onStart`), импорт новее → отказ; round-trip тесты | — |
| **DBR1** | `dbr-1-fullscreen` | 1 | Rodchenko + Ozhegov | Fullscreen каноном: фикс высоты (`<main>` → `flex min-h-0 flex-col`, канвас `flex-1`), shell владеет `h-screen/h-full`; единый host-контракт cabinet (`fixed inset-0`) / client (replace Dashboard); палитра/инспектор — сворачиваемые панели | — |
| **DBR2** | `dbr-2-variables` | 2 | Ozhegov + Rodchenko | Переменные: модель (document-scope), персист/сериализация; **конструктор переменных** в левом сайдбаре под «Конструктор функций» (`+ переменная`, тип, индикатор `valid/invalid`); узлы **get/set** (drag из конструктора) | DBR0 |
| **DBR3** | `dbr-3-event-node` | 3 | Ozhegov + Rodchenko | Системный **Event-узел**: единый XYFlow-тип через `data.kind`; **неудаляемость** (`deletable:false` + guard в `applyNodeChanges`); авто-инжект как entry в `onConnect/onStart/onStop/onDisconnect`; data-выход = `DeviceRef` (или `null` в `onDisconnect`); pre-run «Event-as-entry» | DBR0 |
| **DBR4** | `dbr-4-dataflow-resolve` | 4 | Ozhegov + Dynin | **Dataflow-резолюция** в рантайме: чистая `resolveInput(subgraph, vars, node, port)`; семантика validity ссылок (`onConnect`: слабая→постоянная `valid=true`; `onDisconnect`: `null`→`valid=false`); set/get переменных в host; unit-тесты | DBR2, DBR3 |
| **DBR5** | `dbr-5-palette-nodes` | 5 | Ozhegov + Музыкант + Rodchenko | Узлы палитры **`Print`/`isValid`/`GetMicrophone`** (старая палитра под флагом); `Print` принимает `DeviceRef`/`MicrophoneRef`; `isValid` — условный по `Ref.valid`; `GetMicrophone` (= `Device.getMicrophone`) с dropdown из **`audio-engine` enumerate**; set результата в переменную `Microphone` | DBR2, DBR4 |
| **DBR6** | `dbr-6-run-gating` | 6 | Ozhegov + Rodchenko | Gating Пуска по **online-presence** (`node.online/offline`): единый селектор `isDeviceLive(deviceId)` на сторону (cabinet/client); гасить кнопку Пуск **в списке устройств (`NodesPage`) и в борде**; «сопряжён, но офлайн» → неактивна | — |

**Параллельность:** DBR1 (fullscreen) и DBR6 (gating) не зависят от core-контрактов — ведутся параллельно
DBR0–DBR5. DBR2/DBR3 — параллельны между собой после DBR0. DBR4 сводит DBR2+DBR3.

**Оценка календаря (ориентир):** DBR0 2–3д · DBR1 0.5–1д · DBR2 2д · DBR3 1–2д · DBR4 2д · DBR5 2–3д · DBR6 1д.

**Ритм дня:** перед кодом — `MAIN_DAY_ISSUE.md` + id фазы из реестра; вечер — `yarn task:archive <dbr-id>` после LGTM.

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Координатор виртуальной команды Membrana (Teamlead Vesnin). Соблюдай
[`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md), merge-order **DBR0 → DBR6**. Перед кодом —
краткий план (1–2 абзаца + список файлов). **Не расширяй scope** на реальные loop-узлы (record/trends),
multi-function manager, multi-level subgraph, UI `custom`/`scheduled`, remote-enumerate UI кабинета,
полноценный push-dataflow движок. Контракты `@membrana/core` — только в DBR0 на ветке `vesnin`.

---

### Что построить (по фазам)

1. **DBR0 — концепт v0.4 + контракты core (`vesnin`).** Обновить `DEVICE_BOARD_CONCEPT.md` до v0.4
   (4 обработчика, переменные, dataflow-резолюция, fullscreen канон). В `@membrana/core`: ветви
   `onConnect/onStart/onStop/onDisconnect` (+ лупы `main/alarm` как отдельная группа); секция
   `ScenarioGraph.variables` с типом `Variable` и ссылочными типами `DeviceRef`/`MicrophoneRef` в каталоге
   `SocketType`; дискриминатор `data.kind` для узлов. Миграция **expand/contract**: парсер читает старый
   `initial` и мапит в `onStart`, добавляет `onConnect`; импорт более новой `version` → отказ. Тесты
   round-trip и миграции v1→v2.
2. **DBR1 — fullscreen.** Починить цепочку высоты в `device-board-shell.tsx`: `<main>` → `flex min-h-0
   flex-col`, канвас-обёртка `flex-1` (XYFlow получает реальную высоту до низа). Shell владеет
   `h-screen`/`h-full` и не зависит от внешнего контейнера; единый host-контракт для cabinet
   (`fixed inset-0`) и client (replace Dashboard). Палитра и инспектор — сворачиваемые боковые панели,
   канвас всегда занимает остаток по ширине и высоте. Концепт §8 — fullscreen канон.
3. **DBR2 — переменные.** Модель document-scope (`Variable={id,name,type,value:Ref|null}`), сериализация в
   `device-scenario` и персист (`apps/*` адаптеры). В левом сайдбаре под «Конструктор функций» — секция
   **«Конструктор переменных»**: список (имя, тип-бейдж, индикатор `valid/invalid`), «+ переменная», drag
   узлов **get/set** на канвас. `isValidConnection` использует ссылочные `SocketType`.
4. **DBR3 — Event-узел.** Единый XYFlow-компонент рендерит по `data.kind` (`event`/`get`/`set`/`print`/
   `is-valid`/`get-microphone`). Системный Event: `deletable:false` + в `applyNodeChanges` отбрасывать
   `type:'remove'` для системных узлов; авто-инжект как entry в каждой ветви-обработчике при hydrate
   (фикс id, как сейчас `*-entry`). Data-выход Event = `DeviceRef` для `onConnect/onStart/onStop`, `null`
   для `onDisconnect`. Pre-run-правило «Event обязателен как entry» рядом с `validate-pre-run.ts`.
5. **DBR4 — dataflow-резолюция.** Чистая `resolveInput(subgraph, variables, nodeId, port) → value`:
   протягивает вход узла назад по data-рёбрам до источника (Event/get/метод). Семантика validity:
   `onConnect` set `Device` → `valid=true` (слабая → постоянная пользовательская ссылка); `onDisconnect`
   set `null` → `valid=false`; `isValid(Ref)` — чистый предикат. get/set переменных через host. Unit-тесты:
   valid/invalid, null в onDisconnect, идемпотентность set, типовая несовместимость.
6. **DBR5 — узлы палитры.** Свести `SCENARIO_NODE_PALETTE` к `Print`/`isValid`/`GetMicrophone` (старые
   блоки — под флагом `VITE_DEVICE_BOARD_LEGACY_PALETTE`). `Print` принимает `DeviceRef`/`MicrophoneRef`,
   выводит человекочитаемое значение + статус `valid` (без Web Audio). `isValid` — условный по `Ref.valid`
   (true-ветка дальше по exec). `GetMicrophone` = `Device.getMicrophone` с dropdown из **`audio-engine`
   enumerate** (без второго AudioContext); результат — `MicrophoneRef`, который set-узел кладёт в переменную
   `Microphone` (для будущих loop-сценариев).
7. **DBR6 — gating Пуска.** Единый критерий «связь жива» = online-presence (`node.online`/`node.offline`).
   Селектор-обёртка `isDeviceLive(deviceId)` на каждой стороне (cabinet — `useCabinetNodeRuntime` presence;
   client — `NodeRealtimeClient`/`nodeConnectionStore`). Гасить кнопку Пуск **и** в `NodesPage` (список
   устройств), **и** в борде; «сопряжён, но офлайн» → неактивна, `title`/`aria` «нет связи с устройством».

---

### Архитектура / границы

| Слой | Путь | Ответственность |
|------|------|-----------------|
| core (vesnin) | `packages/core/src/contracts/device-board/scenario-graph.ts`, `device-scenario.ts` | Ветви-обработчики, `variables`, `data.kind`, миграция; round-trip (DBR0) |
| core (vesnin) | `packages/core/src/contracts/device-board/socket-type` / каталог `SocketType` | Ссылочные типы `DeviceRef`/`MicrophoneRef` (DBR0) |
| device-board UI | `packages/device-board/src/components/device-board-shell.tsx`, `board-flow-canvas.tsx`, `board-flow-node.tsx` | Fullscreen высота; рендер узлов по `data.kind`; неудаляемость (DBR1,3,5) |
| device-board UI | `board-left-sidebar.tsx`, `src/types/board-ui.ts`, `board-right-sidebar.tsx` | Конструктор переменных; свод палитры (DBR2,5) |
| device-board graph | `packages/device-board/src/graph/{initial-board-state,validate-pre-run,connection-validation,build-device-scenario,serialize-*}.ts` | Авто-инжект Event; pre-run Event-as-entry; сериализация переменных (DBR2,3) |
| device-board runtime | `packages/device-board/src/runtime/{scenario-runtime,exec-subgraph,block-executor,host,types}.ts` | `resolveInput`, validity ссылок, get/set переменных (DBR4) |
| audio | `@membrana/audio-engine-service` (enumerate) | Список микрофонов для `GetMicrophone` (DBR5) |
| cabinet | `apps/cabinet/src/pages/{DeviceBoardPage,NodesPage}.tsx`, `lib/useCabinetNodeRuntime.ts` | Host fullscreen; gating Пуск по online (DBR1,6) |
| client | `apps/client/src/App.tsx`, `stores/nodeConnectionStore.ts`, `lib/nodeRealtimeClient.ts` | Host fullscreen; `isDeviceLive`; gating (DBR1,6) |

**Запрещено:**

- Второй AudioContext / Web Audio в обход `audio-engine-service` (enumerate/getMicrophone — только через engine).
- Полноценный push-dataflow движок (Rete-подобный) — только ленивая `resolveInput` ссылок (§4.6).
- Параллельный реестр плагинов — только `MembranaRegistry`.
- Правки контрактов `@membrana/core` вне DBR0/ветки `vesnin`.
- Плодить XYFlow node-types вместо `data.kind`-дискриминатора.
- Inline-редактор параметров на ноде (параметры — в сайдбаре).
- Реальные loop-узлы (record/trends), multi-function manager, multi-level subgraph, UI `custom`/`scheduled`.

---

### Визуальный дизайн

- **Fullscreen:** канвас всегда до нижнего края; без прыгающего scrollbar; панели (палитра/инспектор/сайдбар)
  не ломают высоту канваса (`min-h-0` на flex-детях). По `DESIGN.md`.
- **Конструктор переменных:** секция под «Конструктор функций»; тип — цветной бейдж (цветовой код сокетов,
  концепт §5.2 / `DESIGN.md`); `invalid` — `badge-error`/приглушение; состояния empty («нет переменных»).
- **Event-узел:** визуально отличим как системный (иконка/акцент), без контрола удаления; a11y-роль.
- **Gating Пуска:** `disabled` + `title`/`aria-label` «нет связи с устройством» одинаково в списке и борде.
- Бизнес-логику (resolveInput, validity, isDeviceLive) держать **вне** презентационных компонентов.

---

### Тесты

| Область | Минимум |
|---------|---------|
| DBR0 | Round-trip export→import v2; миграция v1(`initial`)→v2(`onStart`) без потерь; импорт более новой `version` → отказ; парсер `variables` |
| DBR1 | Канвас дотягивается до низа в cabinet и client (нет обрезки); панели не схлопывают высоту |
| DBR2 | Переменная создаётся/сериализуется/восстанавливается; `isValidConnection` запрещает несовместимый ссылочный тип |
| DBR3 | Системный Event не удаляется (UI-change `remove` отбрасывается, сериализация сохраняет Event); авто-инжект во все 4 обработчика; pre-run падает без Event-as-entry |
| DBR4 | `resolveInput` (pure): valid/invalid `DeviceRef`, `null` в onDisconnect → `valid=false`, идемпотентность set, типовая несовместимость; `isValid` предикат |
| DBR5 | `Print` принимает `DeviceRef`/`MicrophoneRef`; `GetMicrophone` dropdown из enumerate; set кладёт `Microphone`; легаси-палитра только под флагом |
| DBR6 | Офлайн-устройство → Пуск `disabled` в `NodesPage` и в борде; online → активна; единый селектор |

---

### Definition of Done

- [ ] **DBR0:** концепт v0.4; core-контракты на `vesnin` (ветви, `variables`, ссылочные `SocketType`, `data.kind`); expand/contract `initial→onStart`; round-trip и миграционные тесты; LGTM Vesnin.
- [ ] **DBR1:** fullscreen — канвас до нижнего края в cabinet и client; единый host-контракт; a11y.
- [ ] **DBR2:** конструктор переменных (под функциями); get/set узлы; индикатор `valid/invalid`; сериализация.
- [ ] **DBR3:** Event-узел неудаляем (UI + сериализация), авто-инжект как entry во всех 4 обработчиках.
- [ ] **DBR4:** `resolveInput` + validity ссылок покрыты unit-тестами; get/set переменных в рантайме.
- [ ] **DBR5:** `Print`/`isValid`/`GetMicrophone`; `getMicrophone` через `audio-engine` enumerate; set `Microphone`; легаси-палитра за флагом.
- [ ] **DBR6:** Пуск гаснет по online-presence в списке устройств и в борде; единый `isDeviceLive`.
- [ ] `yarn turbo run lint typecheck test build --continue` — зелёный для затронутых пакетов.
- [ ] Эталонная проверка: на полевом клиенте `onConnect`→Device valid; `onStart`→`isValid`→`getMicrophone`→set `Microphone`; `onDisconnect`→Device invalid; ручной smoke с микрофоном (headless — не блокер).

---

### Out of scope

- Реальные loop-узлы (record-chunk, trends-fft и пр.) — следующая итерация, под флагом легаси-палитры.
- Remote-enumerate микрофонов для редактирования в кабинете (контракт node-realtime) — scoped follow-up.
- Multi-function manager (список нескольких функций), multi-level subgraph (>1 уровень).
- UI для `triggers.custom[]` и `scheduled` (остаются в схеме без UI).
- Полноценный push-dataflow движок / Rete (только ленивая `resolveInput`).
- Авто-обновление/conflict-resolution двусторонней sync — вне этого эпика.

---

### Порядок работы ролей

1. **Teamlead (Vesnin)** — merge-order DBR0→DBR6, контракты на `vesnin`, держит scope и §4.6.
2. **Структурщик (Ozhegov)** — модель переменных/узлов, `data.kind`, `resolveInput`, границы рантайма.
3. **Математик (Dynin)** — семантика validity ссылок, чистота `resolveInput`, идемпотентность set.
4. **Музыкант** — `getMicrophone`/enumerate через engine; `Print` без Web Audio.
5. **Верстальщик (Rodchenko)** — fullscreen высота, конструктор переменных, disabled-Пуск, a11y, `DESIGN.md`.

---

### Формат ответа координатора (планирование)

```text
[Teamlead]: scope фазы, merge-order, граница §4.6
[Структурщик]: слой → путь → ответственность; запрещённое
[Математик]: инварианты validity / чистота resolveInput
[Музыкант]: enumerate/getMicrophone план (если в фазе)
[Верстальщик]: fullscreen/сайдбар/disabled (если в фазе)

Итоговый артефакт: PR (Closes #N), id фазы из реестра
Definition of Done: чеклист фазы
```

---

## Заметки для человека-постановщика

1. GitHub Issue (`wish`) «Рефакторинг device-board v0.4: переменные, Event-узел, dataflow, fullscreen» +
   ссылка на этот файл, на протокол консилиума и на `id` реестра.
2. Записи в `docs/tasks/registry.json`: эпик `device-board-refactor-v04` + фазы DBR0–DBR6 (`status: active`,
   `dependsOn` как в таблице плана).
3. После merge каждой фазы: отчёт в Issue → `yarn task:archive <dbr-id> --notes "PR #…"`.
4. Архив эпика — после DBR6 + эталонной проверки сценария на полевом клиенте.

### Проверка после PR

```bash
yarn turbo run lint typecheck test build --continue
# DBR0: round-trip JSON + миграция initial→onStart; импорт новее → отказ
# DBR1: открыть борд в cabinet и client — канвас до низа, без обрезки
# DBR4: unit-тесты resolveInput (valid/invalid/null)
# DBR6: офлайн-устройство → Пуск disabled в списке и в борде
```

---

## Связь с дорожной картой

- **Канон:** `DEVICE_BOARD_CONCEPT.md` v0.3 → **v0.4** (этот эпик).
- **Консенсус:** консилиум 2026-06-18 — 9 решений с владельцами и DoD.
- **Этот эпик** реализует решения как рефакторинг пакета `device-board` + контрактов core (DBR0–DBR6).
- **Смежно:** будущие итерации — реальные loop-узлы, remote-enumerate кабинета, multi-function/subgraph.
