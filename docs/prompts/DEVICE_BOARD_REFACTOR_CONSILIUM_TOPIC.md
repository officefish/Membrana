# Повестка консилиума: рефакторинг device-board (v0.4 — variables + event nodes + dataflow)

> **Назначение:** входной контекст (`--topic-file`) для консилиума виртуальной команды перед
> крупным продуктово-архитектурным решением по новому спринту рефакторинга `device-board`.
> **Формат и роли:** [`CONSILIUM_PROMPT.md`](./CONSILIUM_PROMPT.md), [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md).
> **Канон пакета:** [`packages/device-board/DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) (v0.3 → этот спринт двигает к v0.4).
>
> Запуск:
> ```bash
> yarn consilium --topic-file docs/prompts/DEVICE_BOARD_REFACTOR_CONSILIUM_TOPIC.md \
>   --save-as device-board-refactor-v04 \
>   "Как корректно ввести в device-board переменные, системный Event-node, dataflow-исполнение и fullscreen, не нарушив ARCHITECTURE?"
> ```
> Протокол сеанса → [`docs/seanses/device-board-refactor-v04-<дата>.md`](../seanses/).

---

## 1. Цель спринта

Перевести `device-board` из хакатонного вертикального среза (v0.3: exec-only сценарии, демо-ветки)
к модели **визуального скриптинга с переменными и потоком данных**: системный неудаляемый
`Event`-узел в обработчиках, типизированные ссылки (`Device`, `Microphone`) как переменные,
исполнение по **данным** (а не только по exec), полноэкранная доска. Спринт **затрагивает контракты
`@membrana/core`** (схема сценария, типы узлов/сокетов), поэтому по регламенту — ветка **`vesnin`** + LGTM Teamlead.

Консилиум должен **зафиксировать форму решения и границы фаз** до написания кода (а не саму реализацию).

---

## 2. Текущее состояние (факты из кода — не выдумывать сверх этого)

Карта составлена обзором кода. Ключевые опоры:

| Область | Где | Что есть сейчас |
|---|---|---|
| Shell/раскладка | `packages/device-board/src/components/device-board-shell.tsx` | `flex h-screen flex-col`; центр — `<main className="min-w-0 flex-1">` **без `h-full`/`min-h-0`/flex-col** → канвас не дотягивается до низа |
| Канвас | `packages/device-board/src/components/board-flow-canvas.tsx` | `@xyflow/react`; **один** XYFlow-тип `{ board: BoardFlowNode }`; всё — `type:'board'` с `data.blockKind`/`data.pluginId` |
| Монтаж в кабинете | `apps/cabinet/src/pages/DeviceBoardPage.tsx` | `fixed inset-0 z-50`, `showRunControls={false}` |
| Монтаж в клиенте | `apps/client/src/App.tsx` | board заменяет `Dashboard` при `isBoardMode` |
| Левый сайдбар | `packages/device-board/src/components/board-left-sidebar.tsx`, `src/types/board-ui.ts` | вкладки **веток**, не узлы: секции «Системные триггеры» (`initial`,`onStop`), «Лупы» (`main`,`alarm`), «Триггер узла» (`onDisconnect`), **«Конструктор функций»** (`function`) |
| Правый сайдбар | `packages/device-board/src/components/board-right-sidebar.tsx` | палитра `SCENARIO_NODE_PALETTE` (много блоков) + заглушка-инспектор |
| Схема сценария | `packages/core/src/contracts/device-board/scenario-graph.ts` | `SCENARIO_SYSTEM_BRANCHES = [initial, main, alarm, onStop, onDisconnect]`; `triggers.custom[]` — только в схеме, без UI |
| Блоки | там же, `SCENARIO_BLOCK_KINDS` | `select-microphone,start-stream,write-journal,record-chunk,trends-fft-detect,evaluate-sound-level,branch-on-detection,stop-scenario,handle-disconnect,subgraph,custom` |
| Runtime | `packages/device-board/src/runtime/scenario-runtime.ts`, `exec-subgraph.ts`, `block-executor.ts` | исполняет **только exec-рёбра** (`exec-out→exec-in`); **data-рёбра сериализуются, но в рантайме не обходятся**; блоки зовут host напрямую |
| Connection/Run | `device-board-graph-context.tsx` (`canRun`), `apps/cabinet/src/pages/NodesPage.tsx` | client-board `canRun` = валидно + есть host + не запущено (**не** завязан на онлайн устройства); cabinet «Пуск» завязан на `deviceId` (сопряжён), а **не** на живой online-статус |
| Presence/online | `packages/core/src/contracts/node-realtime/events.ts` (`node.online`/`node.offline`), `apps/client/src/stores/nodeConnectionStore.ts`, `apps/cabinet/src/lib/useCabinetNodeRuntime.ts` | онлайн-статус устройства приходит по node-realtime; в gating кнопки Пуск пока не используется |
| Сериализация | `packages/core/src/contracts/device-board/device-scenario.ts`, `device-board/src/graph/*` | `DeviceScenarioDocument`, export с `version`+`hash`, импорт отказывает более новой версии |

**Чего сегодня НЕТ (подтверждено поиском):**
- **переменных** (нет типов/стора/палитры/слотов рантайма);
- триггеров **`onConnect`** и **`onStart`** как ветвей (есть `initial`, в UI подписан «On start»);
- **`Event`-узла** и любой защиты от удаления узла (нет `deletable:false`/guard в `applyNodeChanges`);
- **обхода data-рёбер в рантайме** (поток данных декоративен);
- объектов-ссылок **`Device`/`Microphone`** в рантайме (есть только результаты детекции/уровень/журнал);
- множественного **списка функций** (конструктор функций редактирует одну функцию).

---

## 3. Требования владельца (вход спринта, 9 пунктов)

1. **Fullscreen.** Доска (рабочее поле) всегда отрисовывается до нижнего края страницы. Принять fullscreen как канонический режим борда.
2. **Четыре системных триггера:** `OnConnect`, `OnDisconnect`, `OnStart`, `OnStop`.
3. **Переменные.** Новое понятие борда. В левом сайдбаре **под конструктором функций** — **конструктор переменных**.
4. **Event-узел.** В обработчиках `OnConnect/OnDisconnect/OnStart/OnStop` первым узлом идёт системный узел типа `Event`. Он жёстко зашит в сценарий обработчика, **неудаляем**. От него идёт поток исполнения **и данные**. Данные: ссылка на `Device` в `OnStart/OnStop/OnConnect`; в `OnDisconnect` по каналу данных идёт `null`.
5. **Жизненный цикл ссылки.** В `OnConnect` соединение `Event → Device` превращает «слабую» ссылку в **постоянную пользовательскую** ссылку (которая есть у пользователя в конструкторе). В `OnDisconnect` соединение идёт так же в `Device`, но данные = `null` → ссылка становится **invalid**.
6. **Сценарий `OnStart`.** `Event` (+данные: ссылка на устройство) → условный узел `isValid`; если `true` — из `Device` методом `getMicrophone` (в методе — выпадающий список устройств) достаётся ссылка на `Microphone`; отдельным **set**-узлом сохраняется в узел-ссылку `Microphone` (позже используется в loop-сценариях).
7. **Gating Пуска.** Если связь с устройством разорвана — кнопка **Пуск неактивна** нигде: ни в списке устройств, ни в device-board.
8. **Палитра (пока).** В правом сайдбаре только узлы: `Print`, `isValid` (условный), `GetMicrophone`.
9. **Print/GetMicrophone.** К `Print` можно подвести данные из ссылок `Device` и `Microphone`. В `GetMicrophone` можно выбрать микрофон из списка доступных **на устройстве**.

---

## 4. Жёсткие ограничения (не обсуждаются — соблюдать)

- **Не второй AudioContext / Web Audio в обход `audio-engine-service`.** `getMicrophone`/enumerate — только через engine (`ARCHITECTURE.md`, `.cursorrules`). На устройстве — локальный enumerate; в кабинете список микрофонов устройства приходит **удалённо по node-realtime**, а не локальным enumerate.
- **Только `MembranaRegistry`** — без параллельного реестра.
- **Правки `@membrana/core`** (ветви сценария, типы узлов/сокетов, секция переменных) — ветка **`vesnin`** + LGTM Teamlead; сериализованные сценарии мигрируются по **expand/contract** (см. `CONTRIBUTING.md`), импорт более новой `version` → отказ.
- **Параметры узла — в сайдбаре**, не inline (`MODULE_AND_PLUGIN_UI.md` §3; концепт §8).
- **Верстка строго по `DESIGN.md`** (DaisyUI, a11y, конструктивизм).

---

## 5. Ключевые архитектурные развилки (распределить по ролям, спорить по существу)

| # | Развилка | Суть напряжения | Профильные роли |
|---|----------|------------------|-----------------|
| **A. Dataflow-исполнение** | Рантайм сегодня **exec-only**, data-рёбра декоративны. П.4–6,9 требуют реального **протягивания данных** (`Device`/`Microphone`-ссылки, null) по data-рёбрам. | Pull-eval входов узла vs push; где граница «exec ведёт, data питает»; не превратить ли это во второй движок (запрет концепта §4.6). | Teamlead, Структурщик, Математик |
| **B. Контракты core** | Новые ветви `onConnect`/`onStart`, секция `variables`, типы узлов `Event`/method/get-set/conditional, типы-ссылки `Device`/`Microphone`. | Сейчас `initial/main/alarm/onStop/onDisconnect`. `onStart` == `initial`? Как мигрировать JSON (expand/contract) без поломки round-trip и cabinet↔device sync. | Teamlead, Структурщик |
| **C. Переменные и типы-ссылки** | Переменные = типизированные значения (`Device`, `Microphone`) с признаком **validity**; связь с каталогом `SocketType`. | Scope переменных (на сценарий? глобально на документ?); как узлы ссылаются (get/set-узлы); «слабая → постоянная» ссылка и «invalid» — это состояние переменной или значение? | Структурщик, Математик, Teamlead |
| **D. Event-узел** | Новый системный тип узла (сейчас единый `board`-тип), **неудаляемый** (`deletable:false` + guard), отдаёт exec + data (`Device`/`null`). | Один XYFlow-тип vs набор типов узлов; кто инжектит Event в каждую новую ветвь обработчика; как запретить удаление и в UI, и в сериализации. | Структурщик, Верстальщик |
| **E. Удалённый enumerate микрофонов** | `GetMicrophone` dropdown: на устройстве — `audio-engine` enumerate; в кабинете — список приходит **по node-realtime** от устройства. | Контракт запроса/ответа «дай список входов» по node-realtime; единый источник для обоих режимов; запрет прямого Web Audio. | Музыкант, Структурщик |
| **F. Fullscreen-раскладка** | Принять fullscreen каноном (концепт §8 сейчас: «приоритет split; fullscreen опционально»). | Исправить цепочку высоты (`<main>` → `min-h-0 flex-col`, канвас `flex-1`); единый host-контракт для cabinet (`fixed inset-0`) и client (replace Dashboard); куда деть inspector/палитру в fullscreen. | Верстальщик, Структурщик, Teamlead |
| **G. Gating Пуска по online** | Сейчас client-board не завязан на online, cabinet — на «сопряжён», а не «онлайн». П.7 требует единый критерий «связь жива». | «Связь есть» = paired или online (WS presence)? Где единый селектор; синхронно гасить кнопку в списке устройств **и** в борде. | Структурщик, Верстальщик |

---

## 6. Что консилиум обязан решить (итог: да / нет / отложено + владелец)

1. **Вводим ли dataflow-исполнение** (обход data-рёбер для ссылок) в этом спринте — или ограничиваемся exec + «магазин переменных» в host без полноценного data-графа? (развилка A)
2. **`onStart` = переименование `initial`** или новая отдельная ветвь рядом с `initial`? И как соотносятся 4 триггера-обработчика с лупами `main/alarm`. (B)
3. **Модель переменных:** scope, типы (`Device`,`Microphone`, расширяемо?), как сериализуются, как узлы get/set ссылаются; связь с `SocketType`. (C)
4. **Event-узел:** вводим набор XYFlow node-types или остаёмся на одном `board`-типе с `data.kind='event'`; механизм неудаляемости. (D)
5. **Контракт удалённого enumerate** микрофонов для кабинета по node-realtime (нужен ли в этом спринте или достаём из уже передаваемых presence-данных). (E)
6. **Fullscreen каноном:** правим концепт §8 до v0.4; единый layout-контракт cabinet/client; судьба split/inspector. (F)
7. **Единый критерий «связь жива»** для gating Пуска (paired vs online) и где он живёт. (G)
8. **Сведе́ние палитры** до `Print`/`isValid`/`GetMicrophone` (п.8): как это уживается с системными `Event`/`Device`/`Microphone`-узлами и get/set-узлами переменных — что в палитре, что системное/из конструктора. 
9. **Фазировка спринта** (что в core/`vesnin` идёт первым; порядок: контракты → fullscreen → переменные → event/dataflow → узлы палитры → gating) и **что out of scope** (custom-триггеры UI, scheduled, multi-function manager, multi-level subgraph).

**Definition of Done консилиума:** таблица решений по 9 вопросам (да/нет/отложено + владелец-роль), список правок `@membrana/core` (ветка `vesnin`), черновой порядок фаз с DoD, и явный out-of-scope. Это станет основой эпик-промпта спринта (`docs/prompts/*_EPIC_PROMPT.md`) и записи в `docs/tasks/registry.json`.

---

## 7. Подсказка по порядку ролей (скрипт может перемешать)

Рекомендуемый старт обсуждения: **Teamlead** (рамка и приоритет контрактов) → **Структурщик** (модель переменных/узлов, границы рантайма) → **Математик** (семантика validity-ссылок и pull-eval) → **Музыкант** (enumerate через engine, удалённый список) → **Верстальщик** (fullscreen, конструктор переменных в сайдбаре, a11y, disabled-состояния Пуск). Не менее 20 реплик; каждая роль — минимум один раз; финал — единое решение.
