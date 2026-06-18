# Промпт (эпик): MP7b — Device Board Realtime Runtime (WebSocket: run/stop, режим, live-мониторинг)

> **Task-промпт для координатора и агента** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)
> **Task-эпик** (8 PR) · **Размер:** **L** (фазы RT0–RT7)
> **Ожидаемый артефакт:** 8 последовательных PR; каждый `Closes` подзадачу в GitHub Issue эпика.
> **Реестр:** `id` = **`membrane-node-runtime-remote`** в [`docs/tasks/registry.json`](../tasks/registry.json)
> **Канон:** [`MEMBRANE_PLATFORM.md`](../MEMBRANE_PLATFORM.md) §«Транспорт узла» (MP7b)
> **Предшественник:** [`MEMBRANE_NODE_REALTIME_GATEWAY_EPIC_PROMPT.md`](./MEMBRANE_NODE_REALTIME_GATEWAY_EPIC_PROMPT.md) (MP7, канал `runtime` зарезервирован)

**GitHub Issue:** #<TBD>.

---

## Контекст продукта

MP7 принёс WebSocket-gateway (`background-cabinet`) с каналами `journal | mic-live | presence` и **зарезервировал канал `runtime`** под device-board (`packages/core/src/contracts/node-realtime/envelope.ts`). Этот эпик активирует `runtime`: **device-board становится управляемым из кабинета по WS**, а полевой клиент исполняет `ScenarioRuntime` поверх реального audio-engine — **live-мониторинг звука управляется исключительно сценарием доски** (run/stop, режим normal/alarm).

Параллельно эпик приводит UX к целевому виду: кабинет разделяет **Узлы / Ключи**, страница «Узлы» показывает **список узлов** (multi-node), каждый узел — карточка с run/stop, режимом и ссылками на журнал и доску; device-board перекомпонован (вкладки слева, шапка только run/stop + normal/alarm, правый сайдбар «инспектор / палитра», очистка и пересборка доски).

**Что уже есть:**

- `ScenarioRuntime` (чистое ядро, `packages/device-board/src/runtime/`): `initial → main → alarm → onStop → onDisconnect`; alarm входит по **detection-front** автоматически; `ScenarioRuntimeHost` — порты I/O.
- `DeviceBoardShell` (`packages/device-board/src/components/device-board-shell.tsx`): верхние табы Signal/Scenario + под-табы веток, `BoardInspector`.
- Cabinet: `NodesPage` (узел + ключи совмещены), `DeviceBoardPage` (`showRunControls={false}`), `cabinetNodeRealtimeClient`, `useCabinetLiveJournal`.
- Prisma: `Membrane.nodes Node[]` (отношение уже plural), но `Node.membraneId @unique` (фактически 1:1).

**Принятые продуктовые решения (зафиксировано постановщиком):**

1. **Signal-слой** — скрыть за advanced/feature-флагом (`VITE_DEVICE_BOARD_SIGNAL_ADVANCED`), код сериализации не удалять.
2. **normal/alarm** — ручной режим **приоритетный override**: `alarm` форсит alarm-loop, `normal` форсит main; авто detection-front работает **только** в режиме normal.
3. **Multi-node** — закладываем сразу: миграция схемы (несколько `Node`/`Device` на мембрану, лимит по тарифу).

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`MEMBRANE_PLATFORM.md`](../MEMBRANE_PLATFORM.md) | Граница REST vs WS, MP7b |
| [`BACKGROUND_SERVERS.md`](../BACKGROUND_SERVERS.md) | WS только в cabinet, не в media |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Границы пакетов, device-board ↔ client |
| [`DESIGN.md`](../DESIGN.md) | Токены, info/warning тона, состояния |
| [`MEMBRANE_NODE_REALTIME_GATEWAY_EPIC_PROMPT.md`](./MEMBRANE_NODE_REALTIME_GATEWAY_EPIC_PROMPT.md) | Контракт envelope, gateway, auth |
| [`TASK_CLOSURE_REGULATION.md`](./TASK_CLOSURE_REGULATION.md) | Закрытие фаз + prod-smoke |
| [`deploy/MEMBRANE_PLATFORM_DEPLOY.md`](../deploy/MEMBRANE_PLATFORM_DEPLOY.md) | Prod deploy cabinet |

**Ветка:** контракты `@membrana/core` + runtime/board-ui модель → **`vesnin`**. Client/cabinet UI + Prisma-миграция — feature-ветки по [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md).

---

## Мнение виртуальной команды

```text
[Teamlead — Vesnin]:
Эпик RT0→RT7 последовательно по контракту, параллельно по UI. RT0 — контракт без сети
(события runtime + ремодель веток onStart/onStop/onDisconnect). RT1–RT2 — сервер и клиентский
мост; RT2 — реальный audio-host (live monitoring). RT3 — режим normal/alarm как override.
RT4 — миграция multi-node (Prisma) ДО UI узлов. RT5 — страница узлов; RT6 — UX доски (зависит
только от RT0, ведём параллельно). RT7 — prod-smoke обязателен до archive. Конкретное наполнение
сценария — следующий эпик; здесь только транспорт + оболочка + контроль run/stop/mode.

[Структурщик — Ozhegov]:
Канал runtime — отдельный envelope.type-namespace. Команды cabinet→node, состояние/лог node→cabinet.
ScenarioRuntime НЕ импортирует сеть — управляется через адаптер в apps/client (nodeRealtimeClient
→ runtime.command → runtime.start/stop/setMode). Запрещено: WS в background-media; прямой импорт
gateway из device-board; второй AudioContext (только @membrana/audio-engine-service).
Multi-node: снять @unique с Node.membraneId, лимит узлов из Tariff; Device.nodeId @unique остаётся
(один device на узел). fan-out по nodeId, не только membraneId.

[Математик — Dynin]:
По runtime — скаляры состояния (phase, mode, активная ветка, итерации), не кадры. Инвариант:
runtime.state монотонна по ts per nodeId. Режим override: при mode=alarm detection-front игнорируется
(forced alarm); при mode=normal — авто detection-front как раньше. setMode идемпотентен.

[Музыкант]:
Live monitoring host: реальный startStream/recordChunk/trendsFftDetect/evaluateSoundLevel поверх
audio-engine. DoD ручной smoke: кабинет Run → полевой клиент стартует поток и main-loop; переключение
alarm → слышимый/визуальный alarm-loop; Stop → поток закрыт. Headless без микрофона — не блокер CI.

[Верстальщик — Rodchenko]:
Узел в кабинете: карточка с info-пульсом при running-normal, warning-рамкой при alarm; ссылки
журнал/доска; run/stop + переключатель режима (виден только в running). Доска: шапка = run/stop +
normal/alarm; левый сайдбар (onStart, onStop, main loop, alarm loop, onDisconnect, customFunc);
правый сайдбар = настройки выбранной ноды ИЛИ палитра нод по категориям. Очистка борда + пересборка.
DESIGN.md токены; a11y: live region для смены режима; без прыгающего scrollbar (h-full).
```

---

## План спринта (фазы RT0–RT7)

| Фаза | Реестр `id` | PR | Lead | Содержание | Зависит от |
|------|-------------|-----|------|------------|------------|
| **RT0** | `mp7b-rt0-contract` | 0 | Vesnin | События канала `runtime` в `@membrana/core` (`RuntimeCommand/State/Log`). Ремодель веток `onStart` — **презентационный label** (`initial ↔ On start`), вынесен в RT6 без слома сериализации `device-scenario` | — |
| **RT1** | `mp7b-rt1-gateway` | 1 | Ozhegov | Канал `runtime` в `NodeRealtimeGateway`: cabinet→node команды, node→cabinet state/log, fan-out по `nodeId` | RT0 |
| **RT2** | `mp7b-rt2-client-runtime` | 2 | Ozhegov + Музыкант | `nodeRealtimeClient` runtime-канал → драйвит `ScenarioRuntime`; реальный `ScenarioRuntimeHost` на audio-engine (live monitoring) | RT1 |
| **RT3** | `mp7b-rt3-mode` | 3 | Dynin/Ozhegov | Ручной режим normal/alarm (`setMode`) как override; согласование с авто detection-front | RT2 |
| **RT4** | `mp7b-rt4-multinode-schema` | 4 | Ozhegov | Prisma multi-node: снять `@unique` с `Node.membraneId`, лимит по тарифу, API list/create узлов | RT1 |
| **RT5** | `mp7b-rt5-cabinet-nodes` | 5 | Rodchenko | Разделить Узлы/Ключи; список узлов; карточка (журнал/доска ссылки, run/stop, режим, info-пульс/warning-рамка) | RT3, RT4 |
| **RT6** | `mp7b-rt6-board-ux` | 6 | Rodchenko + Ozhegov | Device-board: убрать верхние табы; шапка run/stop + normal/alarm; левый сайдбар вкладок; правый сайдбар инспектор/палитра; clear + rebuild; Signal за advanced-флагом | RT0 |
| **RT7** | `mp7b-rt7-prod-hardening` | 7 | Vesnin | Reconnect, персист режима, prod-smoke (кабинет → узел → реальный звук), runbook, `MEMBRANE_PLATFORM` MP7b | RT5, RT6 |

**Оценка календаря (ориентир):** RT0 0.5д · RT1 1–2д · RT2 2д · RT3 1д · RT4 1–2д · RT5 1–2д · RT6 2д · RT7 1д.

**Параллельность:** RT6 (UX доски) зависит только от RT0 — ведётся параллельно серверной ветке RT1–RT4.

**Ритм дня (регламент):** перед кодом — `MAIN_DAY_ISSUE.md` + id фазы из реестра; вечер — `yarn task:archive <rt-id>` после LGTM; Issue — батч `yarn task:close-github`.

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Координатор виртуальной команды Membrana (Teamlead Vesnin). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md), merge-order **RT0 → RT7**. Перед кодом — краткий план (1–2 абзаца + список файлов). **Не расширяй scope** на конкретное наполнение сценария live-мониторинга (блоки) и на media/sample library — это следующие эпики.

---

### Что построить (продуктовое описание)

1. **Транспорт runtime (WS):** кабинет управляет device-board узла по каналу `runtime` — команды `run`/`stop`/`setMode`; узел шлёт `runtime.state` и `runtime.log`.
2. **Live-мониторинг по сценарию:** полевой клиент исполняет `ScenarioRuntime` поверх реального audio-engine; запуск/останов и режим — исключительно из доски/кабинета.
3. **Режим normal/alarm:** ручной приоритетный override (alarm форсит alarm-loop, normal форсит main; авто detection-front только в normal).
4. **Multi-node:** мембрана может иметь несколько узлов (лимит по тарифу).
5. **Кабинет — страница «Узлы»:** список узлов, у каждого ссылки на журнал и доску, кнопка run/stop, переключатель режима (виден в running), визуальные состояния (info-пульс при normal, warning-рамка при alarm). **Ключи** — отдельная страница.
6. **Device-board UX:** нет верхних табов Signal/Scenario; шапка = run/stop + normal/alarm; вкладки слева (onStart, onStop, main loop, alarm loop, onDisconnect, customFunc); правый сайдбар = настройки выбранной ноды ИЛИ палитра нод по категориям; полная очистка борда и пересборка из палитры.

---

### Контракт канала `runtime` (RT0, обязательно)

**Пакет:** `@membrana/core` (ветка `vesnin`). Расширить `contracts/node-realtime/`.

```typescript
/** Команды кабинета узлу (cabinet → node). */
export type RuntimeCommandPayload =
  | { readonly action: 'run' }
  | { readonly action: 'stop' }
  | { readonly action: 'setMode'; readonly mode: RuntimeMode };

export type RuntimeMode = 'normal' | 'alarm';

/** Снимок состояния runtime (node → cabinet). */
export interface RuntimeStatePayload {
  readonly phase: 'idle' | 'initial' | 'main' | 'alarm' | 'onStop' | 'onDisconnect' | 'stopping' | 'stopped' | 'error';
  readonly isRunning: boolean;
  readonly mode: RuntimeMode;
  readonly activeBranch: string | null;
  readonly activeNodeId: string | null;
  readonly mainLoopIteration: number;
  readonly alarmLoopIteration: number;
  readonly lastError: string | null;
}

/** Строка лога runtime (node → cabinet). */
export interface RuntimeLogPayload {
  readonly branch: string;
  readonly message: string;
  readonly ts: string;
}
```

| channel | type | Направление |
|---------|------|-------------|
| runtime | `runtime.command` | cabinet → server → node |
| runtime | `runtime.state` | node → server → cabinet |
| runtime | `runtime.log` | node → server → cabinet |

**Ремодель веток (перенесён в RT6, презентационный слой):** сериализованный ключ `scenario.initial` в `@membrana/core` **не переименовывается** (это сломало бы parse/serialize/hydrate/persist/cabinet-sync). В RT6 левый сайдбар показывает `initial` под лейблом «On start» и фиксирует порядок секций: системные триггеры `onStart`(=initial), `onStop`; лупы `main`, `alarm`; узловой триггер `onDisconnect`; конструктор `customFunc`. Маппинг label делается в `board-ui` без изменения схемы документа.

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| core | `packages/core/src/contracts/node-realtime/` | Типы `runtime.*`, экспорт из `index.ts`, parse/validate |
| device-board | `packages/device-board/src/runtime/scenario-runtime.ts` | `setMode(mode)`, override-логика; `runtime.state` снимок |
| device-board | `packages/device-board/src/types/board-ui.ts` | Ремодель веток, модель сайдбара/палитры |
| device-board | `packages/device-board/src/components/device-board-shell.tsx` | Новый layout: шапка + левый/правый сайдбар, clear/rebuild |
| background-cabinet | `packages/background-cabinet/src/modules/node-realtime/` | runtime канал в gateway, fan-out по nodeId |
| background-cabinet | `packages/background-cabinet/prisma/schema.prisma` | multi-node миграция |
| apps/client | `apps/client/src/lib/nodeRealtimeClient.ts` (+ runtime-адаптер) | Приём `runtime.command`, драйв `ScenarioRuntime`, реальный host |
| apps/cabinet | `apps/cabinet/src/pages/NodesPage.tsx`, `KeysPage.tsx`, `CabinetShell.tsx` | Разделение Узлы/Ключи, список узлов, runtime-контроль |

**Запрещено:**

- WS в `background-media`; прямой импорт gateway из `device-board` или плагинов.
- Второй `AudioContext` / прямой Web Audio — только через `@membrana/audio-engine-service`.
- Импорт сетевого кода в чистое ядро `ScenarioRuntime`.
- Передача сырого PCM/opus или матриц кадров по каналу `runtime` (только скаляры состояния/лог).

---

### Визуальный дизайн (RT5, RT6)

- **Карточка узла (кабинет):** running-normal — мягкий info-пульс (анимация рамки/индикатора в info-тонах); alarm — рамка `warning`. Переключатель режима виден только когда узел запущен. Ссылки «Журнал» и «Доска» открывают соответствующие разделы для этого `nodeId`.
- **Device-board:** шапка содержит только run/stop + normal/alarm (без табов слоя). Левый сайдбар — секции: «Системные триггеры» (onStart, onStop), «Лупы» (main loop, alarm loop), «Триггер узла» (onDisconnect), «Конструктор функций» (customFunc). Правый сайдбар (режим редактирования): если выбрана нода — её настройки; иначе — палитра всех доступных нод по категориям. Кнопка «Очистить борд» + пересборка перетаскиванием/добавлением из палитры.
- DESIGN.md токены; a11y: `aria-live` для смены режима normal/alarm; `h-full` без прыгающего scrollbar.

---

### Тесты

| Область | Минимум |
|---------|---------|
| core RT0 | parse/validate `runtime.*` envelope; reject unknown type |
| runtime RT3 | `setMode('alarm')` форсит alarm-loop; `setMode('normal')` возвращает в main; detection-front игнорируется в alarm |
| gateway RT1 | mock cabinet шлёт `runtime.command` → node получает; node `runtime.state` → cabinet subscriber |
| prisma RT4 | миграция применяется; 2 узла на мембрану; лимит тарифа отклоняет создание сверх лимита |
| device-board RT6 | clear board → пустые ветки; rebuild из палитры; смена вкладок сайдбара |
| cabinet RT5 | список из ≥2 узлов; режим виден только в running |

---

### Definition of Done

- [ ] Канал `runtime` работает end-to-end: кабинет Run/Stop/setMode → узел исполняет `ScenarioRuntime`; состояние возвращается в кабинет.
- [ ] Live-мониторинг: полевой клиент в paired режиме по команде Run стартует поток и main-loop поверх реального audio-engine.
- [ ] Режим normal/alarm — override согласно решению (alarm форсит alarm-loop, авто detection-front только в normal).
- [ ] Multi-node: мембрана с ≥2 узлами; кабинет показывает список; лимит по тарифу.
- [ ] Кабинет: Узлы и Ключи — отдельные страницы; карточка узла с ссылками, run/stop, режимом, визуальными состояниями.
- [ ] Device-board: верхние табы убраны; шапка run/stop + normal/alarm; вкладки слева; правый сайдбар инспектор/палитра; clear + rebuild; Signal за advanced-флагом.
- [ ] `yarn turbo run lint typecheck test build --continue` — зелёный.
- [ ] Prod-smoke (RT7) выполнен и задокументирован в runbook.
- [ ] LGTM Teamlead.

---

### Out of scope

- Конкретное наполнение сценария live-мониторинга (семантика блоков) — следующий эпик.
- Сырой аудио-stream (PCM/opus) в кабинет.
- device-board в Membrana Studio / Membrana Device desktop (после MS-эпика).
- Sample library / media по WS.
- Полное удаление Signal-слоя (только скрытие за флагом).

---

### Порядок работы ролей

1. **Teamlead** — фиксирует merge-order RT0→RT7, держит scope.
2. **Структурщик** — контракт runtime, границы пакетов, fan-out по nodeId, multi-node схема.
3. **Математик** — инварианты state/mode override, идемпотентность setMode.
4. **Музыкант** — реальный audio-host, ручной smoke live-мониторинга.
5. **Верстальщик** — карточка узла, layout доски, токены/a11y.

---

### Формат ответа координатора (планирование)

```text
[Teamlead]: scope фазы, merge-order, что НЕ делаем
[Структурщик]: слой → путь → ответственность; запрещённые импорты
[Математик]: инварианты/типы
[Музыкант]: smoke-план (если audio)
[Верстальщик]: компоненты, токены, состояния

Итоговый артефакт: PR (Closes #N), id фазы из реестра
Definition of Done: чеклист фазы
```

---

## Заметки для человека-постановщика

1. GitHub Issue (`wish`) «Перевести device-board на WebSocket + live-мониторинг по сценарию» + ссылка на этот файл и на `id` реестра.
2. Записи в `docs/tasks/registry.json` (эпик `membrane-node-runtime-remote` + фазы RT0–RT7, `status: active`) — добавлены.
3. После merge каждой фазы: отчёт в Issue → `yarn task:archive <rt-id> --notes "PR #…"`.
4. Архив эпика — только после RT7 prod-smoke (как MP7/MS).

### Проверка после PR

```bash
yarn turbo run lint typecheck test build --continue
# RT4: yarn media:* не трогаем; cabinet миграция — yarn workspace @membrana/background-cabinet prisma migrate
# RT7: ручной smoke — кабинет Run → полевой клиент стартует поток; alarm → alarm-loop; Stop → поток закрыт
```

---

## Связь с дорожной картой

- **MP7** (`membrane-node-realtime-gateway`) — journal/mic-live/presence по WS (предшественник).
- **MP7b** (этот эпик) — канал `runtime`, device-board по WS, live-мониторинг.
- **Следующий эпик** — конкретный сценарий live-мониторинга (наполнение блоков, шаблоны trends, пороги).
