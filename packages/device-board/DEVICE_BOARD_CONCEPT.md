# DEVICE_BOARD_CONCEPT.md

**Концепт `@membrana/device-board`: signal graph + scenario graph (visual scripting).**

> Документ описывает, **что такое device-board в Membrana**, зачем он нужен, как
> ложится на уже зафиксированную архитектуру (`docs/ARCHITECTURE.md`,
> `docs/SERVICES.md`, `docs/MODULE_AND_PLUGIN_UI.md`) и каким контрактам он
> обязана подчиняться. Это не дизайн-док конкретной реализации и не план
> релиза — это «север» для пакета `device-board`, к которому будут сверяться
> PR агентов AI-команды.
>
> Статус: **v0.6 — journal + reporter** (GetJournal, GetReporter, MakeReport*, PublishReport).
> v0.5 — collectors (Recorder/SpectralAnalyser singletons, Collect event-ports).
> v0.4 — signal + scenario + переменные + dataflow-ссылки, обработчики событий (§15).
> Контракты `@membrana/core`: v0.4 + v0.5 collectors (§16); schema-версия документа → 2.
> Предыдущие версии: v0.3 (хакатон 1), v0.2 (2026-06, `@xyflow/react`). Хранитель: Teamlead.
> Бриф и интервью: [`docs/prompts/DEVICE_BOARD_HACKATHON_BRIEF.md`](../../docs/prompts/DEVICE_BOARD_HACKATHON_BRIEF.md),
> [`docs/seanses/hackathon-brief-interview-2026-06-17.md`](../../docs/seanses/hackathon-brief-interview-2026-06-17.md).
> При конфликте с `WHITE_PAPER.md` / `ARCHITECTURE.md` выигрывают они.

---

## 1. Зачем нод-доска

Membrana — это сенсорная сеть. Каждый клиент строится **под конкретный тип
прибора** (микрофон, радиоантенна, сонар, тепловизор и т.д.), и для этого
прибора собирается цепочка обработки: захват → аналайзеры → выдача
наблюдений в transport-service для fusion-сервера.

Сейчас цепочка задаётся **через сайдбар плагинов** (`docs/MODULE_AND_PLUGIN_UI.md`
§3): пользователь активирует плагины модуля, и они подписываются на shared-хабы
(см. `microphoneStreamHub` как эталон). Это удобно для разработки, но плохо
показывает **топологию обработки сигнала** — особенно когда цепочка становится
нетривиальной (несколько источников, ветвления, параллельные аналайзеры).

Нод-доска даёт **альтернативное представление** того же конвейера: ноды —
зарегистрированные модули и плагины, рёбра — подписки между ними. Это:

1. **Делает топологию видимой** — оператор сразу понимает, какие данные куда
   текут, без чтения исходников.
2. **Снижает порог входа для операторов прибора** — настройка клиента
   превращается в манипуляции с графом, а не с абстрактным списком плагинов.
3. **Материализует этапы WHITE_PAPER** — переход «этап 1 → этап 2 → этап 3»
   виден как добавление новых нод и связей, а не как невидимая магия активаций.
4. **Готовит почву под мульти-устройство** — два микрофона в решётке или две
   антенны для пеленга — это просто две ноды-источника в графе.

Нод-доска **не отменяет сайдбар** и **не вводит второго audio-движка**
(см. §3). Это редактор и декларация двух связанных слоёв (§1.1), а не
отдельная подсистема исполнения сигнала.

### 1.1 Продуктовая цель (visual scripting)

Primary user: специалист по безопасности (в т.ч. оператор ПВО), доступ по тарифу.

Пользователь без уверенного программирования должен:

1. Войти в **режим device-board** (клиент или кабинет).
2. Собрать **сценарий поведения устройства** из блоков: initial, main loop,
   alarm loop, триггеры, (позже) scheduled jobs.
3. Запустить сценарий и наблюдать работу через **журнал устройства**.

Эталонный сценарий хакатона 1: микрофон → поток → 5–30 с чанки → trends FFT
детектор → журнал → alarm loop по громкости (плагин качества звука) → возврат
в main loop. Подробно — бриф §2.

### 1.2 Два слоя доски

| Слой | Вкладка UI | Назначение | Исполнение |
| ---- | ---------- | ---------- | ---------- |
| **Signal graph** | `Signal` | Топология захват → анализ → observation | Engine + shared-хабы + `plugin.install` / teardown |
| **Scenario graph** | `Scenario` | Поведение: initial, loops, triggers, schedule | **Scenario runtime** в `device-board` (чистое ядро); вызывает сервисы и плагины, не Web Audio напрямую |

Решение интервью (B1): **две вкладки** в v1. Если UX не зайдёт — откат к
единому канвасу отдельным эпиком. Предпочтительно **одновременная видимость**
обоих слоёв (split-view или синхронизированные вкладки, P5).

Signal graph остаётся **view-only** над dataflow (v0.2). Scenario graph
добавляет **control flow** (exec-рёбра) и data-рёбра между блоками при
поддержке типов узлом (V1).

---

## 2. Что НЕ делает нод-доска

Чтобы исключить распространённые ошибки на ранних PR:

- **Не исполняет dataflow самостоятельно.** Реальные данные текут через
  engine-сервисы (`audio-engine-service`, будущий `rf-engine-service` и т.д.)
  и shared-хабы. Нод-доска только декларирует связи.
- **Не дублирует функции сайдбара.** Параметры плагина по-прежнему живут в
  сайдбаре (`renderPluginSidebarDetails` в `pluginSidebarDetails.tsx`).
  Нода показывает связи и компактный статус, а не полный набор контролов.
- **Не вводит «универсальные ноды».** Ноды намеренно специфичны под тип
  прибора: `AcousticFFT`, `RFSpectrumAnalyzer`, `ThermalBlobDetector` — даже
  если внутри они вызывают похожий код. Универсальность живёт на уровне
  контрактов (`@membrana/core`), а не нод.
- **Не дублирует `MembranaRegistry`.** Регистрация плагинов — только через
  registry; доска читает метаданные и `nodeKind`.
- **Не генерирует исполняемый TypeScript/Python** из графа (out of scope v1).
- **Scenario runtime не создаёт AudioContext.** Микрофон, чанки, FFT — только
  через `audio-engine-service` и существующие плагины/сервисы.

## 3. Принципы

1. **Нода = view зарегистрированного модуля/плагина.** У ноды нет собственного
   состояния, она читает `MembranaRegistry` и рендерит компактное представление
   модуля или плагина. Удаление ноды = деактивация плагина; добавление = его
   активация.

2. **Ребро = подписка на shared-хаб.** Создание ребра между сокетами вызывает
   тот же механизм подписки, что и `plugin.install()` сейчас. Удаление ребра
   вызывает teardown. То есть lifecycle `install` / teardown
   (`MODULE_AND_PLUGIN_UI.md` §0) **не меняется** — меняется только триггер.

3. **Один источник истины — `MembranaRegistry`.** Граф не хранит дубликатов
   метаданных модулей и плагинов. Он хранит только: список нод (id + позиция
   на доске), список рёбер (source/target + sourceHandle/targetHandle), и
   serialized JSON конфига графа.

4. **Контракты `@membrana/core` важнее визуализации.** Если новый тип сокета
   нужен — сначала добавляется тип в `@membrana/core`, потом он появляется на
   доске. Не наоборот.

5. **Граф каждого клиента уникален, контракт выхода — общий.** В каждом графе
   обязательно есть терминальная нода `ObservationEmitter`, которая сводит
   специфичные для прибора потоки к общему `AcousticObservation`-контракту
   (WHITE_PAPER §7). Граф невалиден, пока этот терминал не подключён.

6. **Декларативная сериализация.** Граф сериализуется в JSON и хранится в
   persisted-store рядом с `pendingModulePrefs`. При rehydrate сначала
   регистрируются модули и плагины (старый путь через `registerClientModules`),
   потом восстанавливается граф, потом активируются связи.

7. **Пресеты графов поставляются вместе с плагинами прибора.** Микрофонный
   клиент при первом запуске имеет готовый signal-граф `Mic → FFT → Detector →
   Emitter` и scenario-пресет (бриф §2). Пресет — JSON рядом с регистрацией
   модулей прибора (см. §6.4).

8. **Системные ветки сценария фиксированы.** На каждом устройстве четыре
   обязательные цепочки: `initial`, `onStop`, `base loop` (main), `alarm loop`
   + пользовательские `custom` триггеры (P4). Имена стабильны в JSON schema.

9. **Предзапусковая валидация.** Перед Run сценарий проверяется (обрывы,
   несовместимые типы, отсутствие обязательных веток) — как compile errors (P3).

---

## 4. Выбор библиотеки

**Используется `@xyflow/react` (React Flow / XYFlow).** Не Rete.js и не
кастомный canvas-редактор с нуля.

Обоснование зафиксировано здесь, чтобы будущие агенты не возвращались к выбору
без нового stage-gate. В **2026-06** проведён сравнительный анализ (внешний
research по кандидатам 2024–2026); вывод совпадает с первоначальным решением
v0.1 и уточняет границы «что даёт библиотека» vs «что строим сами».

### 4.1 Решение в одном абзаце

Нам нужен **view-only** редактор графа поверх уже существующего движка
исполнения (`audio-engine-service`, shared-хабы, `plugin.install` / teardown).
Библиотека должна быть **React-native**, дружить с **TypeScript**, позволять
**кастомные ноды на DaisyUI/Tailwind** и сериализовать граф в **plain JSON**
без навязанной семантики runtime. Под этот профиль лучше всего подходит
`@xyflow/react`. Rete.js v2 — запасной вариант, если когда-нибудь понадобится
встроенная модель typed sockets **и** клиентский execution engine; сейчас это
конфликтует с архитектурой Membrana.

### 4.2 Сравнение кандидатов (2026-06)

Краткая матрица. Оценки относительные, для нашего стека (React 18+, TS strict,
SaaS, граф ~100 нод).

| Библиотека | React / TS | View-only | DaisyUI в нодах | Typed pins | JSON без runtime | Поддержка | Вердикт |
| ---------- | ---------- | --------- | --------------- | ---------- | ---------------- | --------- | ------- |
| **@xyflow/react** | отлично | да | да (ноды = React-компоненты) | через `isValidConnection` | да | высокая | **выбор** |
| **Rete.js v2** | хорошо (плагин) | частично (есть DataflowEngine) | хорошо, layout жёстче | из коробки (sockets) | привязка к модели Rete | высокая | запасной |
| LiteGraph.js | canvas, imperative | нет (engine-centric) | плохо | базово | свой формат | умеренная | отклонён |
| Drawflow | imperative | да | HTML-сниппеты, не React | ad-hoc | простой JSON | низкая | отклонён |
| Flume | React-native | да | хорошо | data-flow only | да | умеренная | отклонён |
| JointJS / GoJS | обёртки | да | свои шаблоны, не React | ports + rules | да | высокая (часть — платно) | отклонён |
| Blockly | блоки, не граф | engine встроен | плохо | block types | XML/код | высокая | отклонён |
| Node-RED editor | не reusable | runtime-bound | — | runtime typing | tied to Node-RED | — | отклонён |
| baklavajs | React — вручную | да | если дописать интеграцию | metadata | да | нишевый | отклонён |
| Reaflow | React-native | да | да | ad-hoc | да | умеренная | отклонён (DAG-viz, не editor) |

Детальное сравнение React Flow vs Rete (ядро решения v0.1):

| Критерий | @xyflow/react | Rete v2 |
| -------- | ------------- | ------- |
| Встроенный движок dataflow | нет | есть |
| Подходит для «view-only» графа | да | избыточен |
| Интеграция с React + DaisyUI + Tailwind | нативная | через `Presets` |
| Типизация сокетов | `isValidConnection` + каталог `@membrana/core` | sockets из коробки |
| Порог входа | низкий | высокий |
| Активность сообщества | высокая | средняя |

Главный аргумент против Rete: у нас **уже есть движок исполнения** — это
engine-сервисы и shared-хабы. Введение второго движка (Rete `DataflowEngine`)
породит конкуренцию двух источников истины («граф нарисован — почему звук не
идёт?»).

Минус React Flow — типизацию сокетов и валидацию соединений пишем сами. Это
функция вида `(connection) => boolean` поверх каталога `SocketType` из
`@membrana/core`. Принимаемая цена.

### 4.3 Уроки UE Blueprints и n8n (архитектура, не выбор npm-пакета)

**Unreal Engine Blueprints** и **n8n** не используют готовые JS-библиотеки —
у них собственные редакторы, глубоко связанные с runtime. Полезны как образец
**разделения слоёв**, а не как аргумент «переписать свой Slate/Vue-редактор»:

| Паттерн | Blueprints | n8n | Membrana (`device-board`) |
| ------- | ---------- | --- | ------------------------- |
| Граф vs исполнение | граф компилируется в IR, UI ≠ runtime | JSON workflow → отдельный engine | JSON граф → `applyGraph` → хабы / `install` |
| Типы на соединениях | pins с типами, exec vs data | типы нод и валидация на save | `SocketType` + `isValidConnection` |
| Шаблоны | macro / function graphs | workflow templates, clone | `*.graph.json` пресеты по `DeviceKind` |
| Палитра | context search, node catalog | searchable node palette | ноды из `MembranaRegistry` + `nodeKind` |
| Настройки ноды | details panel | node parameters panel | сайдбар плагина (§8, MODULE_AND_PLUGIN_UI §3) |

Вывод: **не копируем** их UI-стек; **копируем** контракт «редактор = UI над
JSON», типы явные, исполнение снаружи.

### 4.4 Что строим поверх `@xyflow/react` (наш слой, не библиотека)

XYFlow даёт примитивы: ноды, рёбра, pan/zoom, drag, handles, minimap.
Паттерны «как Blueprint / n8n» — ответственность пакета `device-board`:

1. **Типизированные handles** — `sourceHandle` / `targetHandle` совпадают с
   именами сокетов в `nodeKind` плагина (§9).
2. **Валидация рёбер** — `isValidConnection` читает каталог `SocketType` из
   `@membrana/core`; несовместимые соединения не создаются.
3. **Стили рёбер по семантике** — при необходимости exec vs data (как в
   Blueprints): custom `edgeTypes`, цвет/штрих из `docs/DESIGN.md`; на D0–D1
   достаточно data-flow сокетов прибора.
4. **Палитра нод** — список плагинов с `nodeKind` для текущего `DeviceKind`;
   drag из палитры → `activatePlugin` + нода в graph state (§7.2).
5. **Пресеты графов** — JSON рядом с регистрацией клиента прибора; аналог
   n8n templates, без отдельного маркетплейса на D0.
6. **Состояния нод** — `active` / `inactive` / `missing` / `invalid` на самой
   ноде; полные настройки — только в сайдбаре (§8).
7. **Маппинг граф ↔ runtime** — `MembranaRegistry.applyGraph()`; библиотека
   об этом не знает.

### 4.5 Явно отклонённые варианты (не переоткрывать без stage-gate)

- **Node-RED editor** — монолит с runtime, не embeddable React-компонент.
- **Blockly** — блочная парадигма (Scratch), не node-and-edge граф прибора.
- **GoJS / JointJS Rappid** — коммерческие diagramming SDK; плохая стыковка
  с DaisyUI; избыточны для signal-processing графа.
- **LiteGraph.js** — canvas без React-нод; уместен для shader/audio DAW, не
  для нашего UI.
- **Кастомный редактор с нуля** — дорого (hit-test, routing, zoom); XYFlow
  уже закрывает инфраструктуру.

### 4.6 Control flow: scenario runtime (не Rete)

В v0.3 **control flow** (initial, loops, triggers, cron) живёт в **scenario
runtime** — отдельном чистом ядре `device-board`, а не во втором dataflow-движке
сигнала. Rete / `DataflowEngine` по-прежнему **не** вводим: signal graph
остаётся view-only над хабами.

Scenario runtime:

- читает сериализованный `ScenarioGraph` (§9);
- исполняет exec-цепочки и вызывает **существующие** API (плагины, journal,
  audio-engine, trends templates);
- не дублирует Web Audio и не обходит `MembranaRegistry`.

Канонический документ по фазам, onTick, планировщику и host-портам:
[`docs/SCENARIO_RUNTIME.md`](../../docs/SCENARIO_RUNTIME.md).

Пересмотр Rete — только если scenario runtime не покрывает кейс **и** это
зафиксировано stage-gate в `docs/seanses/`.

---

## 5. Типы сокетов и контракты

### 5.1 Каталог `SocketType`

Каталог типов сокетов живёт в `@membrana/core` и расширяется через PR.
Для каждого типа фиксируются: имя, форма данных, эталонный хаб (если есть).

Текущий и плановый каталог (см. WHITE_PAPER §6):

| Тип сокета     | Прибор              | Чем течёт                               | Источник                            |
| -------------- | ------------------- | --------------------------------------- | ----------------------------------- |
| `AudioFrame`   | микрофон            | `Float32Array` кадры PCM                | `audio-engine-service`              |
| `Spectrum`     | микрофон            | спектр FFT                              | `fft-analyzer-service`              |
| `Detection`    | любой               | `{ kind, confidence, features }`        | `drone-detector-service` _(план)_   |
| `TDOAPair`     | микрофон (≥2)       | `{ nodeA, nodeB, deltaT, confidence }`  | `tdoa-service` _(план)_             |
| `IQSamples`    | радио _(план)_      | комплексные отсчёты                     | `rf-engine-service` _(план)_        |
| `RFSignature`  | радио _(план)_      | спектральная подпись                    | `rf-analyzer-service` _(план)_      |
| `ThermalFrame` | тепловизор _(план)_ | матрица температур                      | `thermal-engine-service` _(план)_   |
| `BlobMask`     | тепловизор _(план)_ | бинарная маска целей                    | `thermal-analyzer-service` _(план)_ |
| `Observation`  | любой (терминал)    | `AcousticObservation` из WHITE_PAPER §7 | `transport-service` _(план)_        |

Сокеты разных типов **не соединяются**. Это валидируется в `isValidConnection`
на уровне React Flow и дополнительно — в store при загрузке сериализованного
графа.

### 5.2 Цветовой код сокетов

Чтобы оператор видел тип потока без чтения подписи, каждому `SocketType`
назначается цвет в `docs/DESIGN.md`. На уровне ноды сокет — цветной кружок с
тултипом-именем типа. Палитра согласована с DaisyUI и темами клиента.

### 5.3 Терминальный контракт

Любой граф любого прибора **обязан** заканчиваться нодой `ObservationEmitter`,
у которой:

- входы — специфичные для прибора (например, `Detection`, `TDOAPair`),
- выход — `Observation` в `transport-service`.

Граф без подключённого `ObservationEmitter` помечается как **invalid**: UI
показывает плашку «граф не отправляет наблюдения на сервер», и плагины,
ниже по цепочке от обрыва, не активируются.

---

## 6. Категории нод и фильтрация по `DeviceKind`

### 6.1 `DeviceKind`

В `@membrana/core` вводится перечисление `DeviceKind`:

```ts
type DeviceKind =
  | 'microphone'
  | 'mic-array'
  | 'rf-antenna'
  | 'sonar'
  | 'thermal-camera'
  | 'optical-camera'
  | 'ads-b-receiver';
```

Каждый клиент при сборке декларирует свой `DeviceKind` (или несколько —
комбинированные приборы возможны). Это значение прокидывается в
`device-board` как контекст доски.

### 6.2 `nodeKind` плагина

Каждая регистрация модуля или плагина в `MembranaRegistry` дополняется полем
`nodeKind` (опциональным для обратной совместимости):

```ts
nodeKind?: {
  category: 'source' | 'analyzer' | 'detector' | 'transport' | 'terminal';
  deviceKinds: DeviceKind[];     // на каких приборах нода имеет смысл
  inputs: SocketSpec[];
  outputs: SocketSpec[];
};
```

Если `nodeKind` не задан — модуль/плагин не появляется в палитре нод-доски
(но продолжает работать через сайдбар). Это путь миграции: существующие
плагины не ломаются, новые получают представление на доске постепенно.

### 6.3 Палитра

Палитра нод фильтруется по `DeviceKind` клиента: микрофонный клиент не
показывает thermal- и RF-ноды. Это намеренно — оператор прибора не должен
видеть нерелевантные опции.

### 6.4 Пресеты

Пресет графа — JSON-файл рядом с регистрацией модулей прибора:

```
apps/client-microphone/src/presets/
  default.graph.json      # граф по умолчанию
  array-2mic.graph.json   # пресет для двухмикрофонной решётки
```

При первом запуске клиента (или при сбросе настроек) активируется
`default.graph.json`. Пресет — это сериализованный граф в том же формате,
что и persisted-граф пользователя.

---

## 7. Lifecycle и взаимодействие со store

### 7.0 Режим device-board

Вход в **board mode** перестраивает UI под редактор сценариев (полная
перерисовка или split: канвас + inspector, U1). Выход — в обычный режим
модулей/плагинов. Board mode доступен на **клиенте** (`apps/client`) и в
**кабинете** (admin edit, B3); синхронизация сценария — двусторонняя по
`deviceId` (S1).

Onboarding v1: тултипы + wizard на 3 шага + ссылка на manual (P6).

### 7.1 Регистрация и rehydrate

Порядок:

1. `apps/client-*/src/main.tsx` запускает `registerClientModules()` — модули
   и плагины регистрируются в `MembranaRegistry` (без изменений относительно
   текущей схемы).
2. `MembranaRegistry.finalizeRegistration()` сбрасывает `pendingModulePrefs`
   (без изменений, см. `MODULE_AND_PLUGIN_UI.md` §0).
3. **Новый шаг:** `MembranaRegistry.applyGraph(persistedGraph ?? defaultPreset)`.
   Signal-граф проходится топологически; связи → подписки на хабы.
4. **Новый шаг:** `ScenarioRuntime.load(persistedScenario ?? defaultScenario)`.
   Сценарий не активен до явного Run пользователем.
5. Если плагин в графе не зарегистрирован — нода `missing`, предупреждение в UI.

### 7.2 Действия пользователя на доске

| Действие в UI             | Что вызывается в store                                                           |
| ------------------------- | -------------------------------------------------------------------------------- |
| Перетащил ноду из палитры | `activatePlugin(pluginId)` + добавление ноды в graph state                       |
| Удалил ноду               | `deactivatePlugin(pluginId)` + удаление ноды и всех её рёбер                     |
| Создал ребро              | `subscribeHub(source.handle → target.handle)`                                    |
| Удалил ребро              | соответствующий teardown                                                         |
| Кликнул на ноду           | сайдбар плагина (`renderPluginSidebarDetails`, U2)                               |
| Run / Stop сценария       | `ScenarioRuntime.start()` / `.stop()`; stop также по системному событию (T1)   |
| Disconnect                | `onDisconnect` → stop; reconnect → `initial` (T4)                              |

### 7.4 Scenario runtime (поведение)

| Ветка | Назначение | Ключевые правила |
| ----- | ---------- | ---------------- |
| `initial` | Старт: выбор mic, stream on, запись в журнал | Список устройств из `audio-engine` enumerate |
| `main` (base loop) | onTick → чанки → trends FFT → журнал → ∞ | Entry: `onMainTick`; итерация завершается узлом `loop-repeat`; см. [`docs/SCENARIO_RUNTIME.md`](../../docs/SCENARIO_RUNTIME.md) |
| `alarm` | По фронту детекции; raw level через sound-quality plugin | Entry: `onAlarmTick`; пауза 400 ms между итерациями; отдельный **тег** в журнале (J2) |
| `onStop` | Teardown; сценарий на канвасе остаётся editable (T2) | UI-кнопка + системное событие |
| `onDisconnect` | Stop (единая ветка mic/server пока, T3) | Позже: restart по таймеру |
| `custom[]` | Пользовательские триггеры | Расширяемый список |
| scheduled (stretch) | Cron-like анализ журнала → statistics sink | J3, J4 |

Переход **main → alarm** — по **фронту** детекции (V3). Журнал main loop:
detection yes/no, clip meta, raw level, detector/template id (J1).

Subgraph / функции: pins на границе, глубина вложенности ≤ 1 (V4).

Важно: **`plugin.install()` не меняется** для signal graph. Scenario runtime
оркестрирует вызовы сервисов и плагинов; не подменяет lifecycle хабов.

### 7.3 Конфликт сайдбара и доски

Если пользователь выключил плагин в сайдбаре, а на доске у него были рёбра —
ноды остаются на доске, но помечаются как `inactive`, рёбра подсвечиваются
как «порванные». Повторная активация в сайдбаре возвращает рёбра в работу.

Это компромисс: мы не удаляем граф при деактивации, чтобы пользователь не
потерял топологию, но и не «оживляем» рёбра молча.

---

## 8. UI-правила

Согласовано с `docs/MODULE_AND_PLUGIN_UI.md` и бриф-интервью (U1–U4):

1. **Board mode** — отдельный **fullscreen**-layout (канон v0.4): shell владеет
   высотой (`h-screen` → ряд `flex-1 min-h-0` → `<main>` `flex-col` → канвас
   `flex-1`), канвас всегда дотягивается до **нижнего края страницы**; сайдбары
   (вкладки/палитра/инспектор) — боковые панели с внутренним скроллом, высоту
   ряда не распирают. Единый host-контракт: cabinet (`fixed inset-0`) и client
   (replace `Dashboard`). Вкладки **Signal** / **Scenario**; цвета слоёв —
   токены **DaisyUI** (`docs/DESIGN.md`). См. §15.
2. **Доска — модуль** `id: 'device-board'`, `@xyflow/react`, без лишней `card`.
3. **Настройки нод — в сайдбаре** (U2). §3 MODULE_AND_PLUGIN_UI не нарушается.
4. **На ноде** — имя, цветные сокеты, статус (`active` / `inactive` / `missing` / `invalid`).
5. **Палитра** — drag из палитры желателен; поиск и категории не обязательны в v1.
6. **Tailwind `content`** включает `packages/device-board/src`.

---

## 9. Сериализация (device-scenario v1)

Единый JSON-документ сценария устройства. Export metadata: обязательны
`version` и `hash`; import более новой `version` → **отказ** (V6); секреты
(токены, keys) **вычищаются** при export (S3).

```json
{
  "version": 1,
  "kind": "device-scenario",
  "deviceKind": "microphone",
  "meta": { "title": "Drone watch", "exportedAt": "ISO-8601", "hash": "sha256-…" },
  "signalGraph": {
    "nodes": [
      { "id": "n1", "pluginId": "microphone", "position": { "x": 80, "y": 200 } },
      { "id": "n2", "pluginId": "fft-analyzer", "position": { "x": 320, "y": 200 } }
    ],
    "edges": [
      { "source": "n1", "sourceHandle": "audio-out", "target": "n2", "targetHandle": "audio-in" }
    ]
  },
  "scenario": {
    "initial": { "entry": "n-start", "nodes": [], "edges": [] },
    "loops": {
      "main": { "entry": "n-loop-main", "nodes": [], "edges": [] },
      "alarm": { "entry": "n-loop-alarm", "nodes": [], "edges": [] }
    },
    "triggers": {
      "onStop": { "entry": "n-on-stop", "nodes": [], "edges": [] },
      "onDisconnect": { "entry": "n-on-disc", "nodes": [], "edges": [] },
      "custom": []
    },
    "functions": [],
    "scheduled": []
  }
}
```

Правила формата:

- `version` обязателен; миграции — `device-board/src/migrations`.
- `pluginId` / block types ссылаются на `MembranaRegistry` или каталог блоков
  scenario runtime. Конфиг плагинов **в JSON не дублируется**.
- `signalGraph` — формат v0.2 (§9 legacy) как вложенный объект.
- `scenario.*` — отдельные подграфы с exec- и data-рёбрами; data-типы
  валидируются capability узла (V1).
- Синхронизация: двусторонняя device ↔ cloud по `deviceId` (S1); cabinet admin
  может редактировать (S2).

### 9.1 Legacy: только signal graph

Для обратной совместимости допустим файл только с `nodes`/`edges` (v0.2) —
импорт оборачивает в `signalGraph` при миграции v0→v1.

---

## 10. Дорожная карта пакета

### Хакатон 1 (2026-06) — вертикальный срез

См. [`DEVICE_BOARD_HACKATHON_1_EPIC_PROMPT.md`](../../docs/prompts/DEVICE_BOARD_HACKATHON_1_EPIC_PROMPT.md).

| Эпик | Содержание |
| ---- | ---------- |
| H0 | Этот документ v0.3 |
| H1 | Core contracts, XYFlow shell, serialize + validation |
| H2 | Runtime initial+main, mic/journal, cabinet sync (stretch: JSON import) |
| H3 | Triggers, subgraph |
| H4 | **Alarm loop (обязателен)**, smoke, close |

### Этап D0 — Каркас (signal + scenario shell)

- Пакет `@membrana/device-board` со скелетом доски на `@xyflow/react`.
- Зависимость: `@xyflow/react` (не legacy `react-flow-renderer`).
- Регистрация как модуль через `MembranaRegistry`.
- Каталог `SocketType` в `@membrana/core` (минимум: `AudioFrame`, `Spectrum`).
- Валидация соединений по типу сокета.

### Этап D1 — Микрофонный пресет (соответствует WHITE_PAPER «Этап 1»)

- Ноды: `MicrophoneSource`, `FFTAnalyzer`, `DroneDetector`,
  `ObservationEmitter`.
- Пресет `default.graph.json` для микрофонного клиента.
- Клик на ноду открывает сайдбар.

### Этап D2 — Решётка (соответствует WHITE_PAPER «Этап 2»)

- `DeviceKind` `mic-array`.
- Ноды: вторая `MicrophoneSource`, `TDOA` с двумя входами.
- Пресет `array-2mic.graph.json`.

### Этап D3 — Локализация (соответствует WHITE_PAPER «Этап 3»)

- Ноды: третья `MicrophoneSource`, `Localizer` с тремя входами.
- Терминальный `Observation` начинает нести координаты.

### Этап D4 — Многомодальность (соответствует WHITE_PAPER «Этап 6»)

- Новые `DeviceKind` — `rf-antenna`, `thermal-camera`.
- Новые типы сокетов в `@membrana/core`.
- Новые клиенты с собственными палитрами и пресетами.
- **Контракт `Observation` на выходе графа — не меняется.**

---

## 11. Метрики качества пакета

Не функциональные требования, а признаки того, что пакет «здоров»:

- **Добавление нового аналайзера** (нового плагина с `nodeKind`) — это PR
  без изменений в `device-board` core, только регистрация плагина и
  опциональное добавление в пресет.
- **Добавление нового прибора** (нового `DeviceKind`) — это PR с новыми
  типами сокетов в `@membrana/core`, новым набором плагинов и новым
  пресетом. Сам `device-board` не правится.
- **Сериализованный граф** одного клиента не ломается при минорных
  обновлениях плагинов (migrations работают).
- **Граф без `ObservationEmitter`** или с обрывами — виден оператору
  визуально, без чтения консоли.

---

## 12. Открытые вопросы

Закрыто в v0.3 / интервью:

- Exec vs data в scenario — **да**, оба; signal — data-only (§1.2).
- Subgraph v1 — depth ≤ 1 (V4).
- Параметры на ноде — **в сайдбаре** (без изменений).

Остаётся открытым:

- **Порог «достаточно тихо»** для выхода из alarm — формализация на DB-H4
  поверх плагина sound-quality.
- **Conflict resolution** при двусторонней sync (S1) — v1 минимальный last-write
  или явные правила merge.
- **Группировка нод (subgraphs > 1 уровень)** — после хакатона 1.
- **Параллельные сценарии** на одном устройстве — не планируется в v1.

---

## 13. Связанные документы

- [`WHITE_PAPER.md`](./WHITE_PAPER.md) — стратегическая цель, §6 (отображение
  на архитектуру), §7 (контракт наблюдений), §8 (этапы).
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — границы пакетов, правила слоёв.
- [`SERVICES.md`](./SERVICES.md) — правила пакетов-сервисов (foundation,
  analyzer).
- [`MODULE_AND_PLUGIN_UI.md`](./MODULE_AND_PLUGIN_UI.md) — `MembranaRegistry`,
  lifecycle `install` / teardown, правила сайдбара плагинов.
- [`DESIGN.md`](./DESIGN.md) — токены UI, в том числе для цветового кода
  сокетов.
- [`INTEGRATIONS_STRATEGY.md`](./INTEGRATIONS_STRATEGY.md) — стратегия
  подключения новых аналайзеров, естественно становящихся новыми нодами.

- [`DEVICE_BOARD_HACKATHON_BRIEF.md`](../../docs/prompts/DEVICE_BOARD_HACKATHON_BRIEF.md) — бриф хакатона 1.
- [`HACKATHON_REGULATION.md`](../../docs/HACKATHON_REGULATION.md) — ритуалы хакатона.

---

## 14. Статус и порядок изменения

- **Статус:** v0.4 — концепт (signal + scenario + переменные + dataflow).
- **Changelog v0.4 (2026-06-18):** обработчики событий
  `onConnect/onStart/onStop/onDisconnect` (§15); переменные сценария
  (document-scope, ссылочные `DeviceRef`/`MicrophoneRef`); системный Event-узел;
  dataflow-ссылки с флагом `valid`; таксономия `ScenarioNodeKind`
  (`event`/`variable-get`/`variable-set`/`print`/`is-valid`/`get-microphone`);
  schema `device-scenario` → v2 (expand: миграция v1 `initial→onStart`, `+onConnect`,
  `+variables`). Эпик `device-board-refactor-v04` (issue #95), фаза DBR0.
- **Changelog v0.3 (2026-06-17):** продуктовая цель visual scripting; два слоя
  Signal/Scenario; scenario runtime; board mode; device-scenario JSON v1;
  системные ветки; ссылка на хакатон 1; закрытие exec-пинов через scenario layer.
- **Changelog v0.2 (2026-06):** §4 — библиотеки, Blueprint/n8n, XYFlow слой.
- **Хранитель:** Teamlead.
- **Изменения:** через PR с пометкой `/architect` и обязательным ревью
  Teamlead. Изменения, затрагивающие каталог `SocketType` или контракт
  `Observation`, требуют синхронной правки `@membrana/core` и упоминания
  в `WHITE_PAPER.md`.
- При конфликте этого документа с `WHITE_PAPER.md` / `ARCHITECTURE.md` —
  выигрывают они.

---

## 15. Рефакторинг v0.4: обработчики событий, переменные, dataflow

> Раздел фиксирует модель v0.4. Контракты `@membrana/core` уже расширены в фазе
> DBR0 (эпик `device-board-refactor-v04`, issue #95); UI/runtime — фазы DBR1–DBR6.
> Полный план: [`docs/prompts/DEVICE_BOARD_REFACTOR_V04_EPIC_PROMPT.md`](../../docs/prompts/DEVICE_BOARD_REFACTOR_V04_EPIC_PROMPT.md).
> Решения консилиума: [`docs/seanses/device-board-refactor-v04-2026-06-18.md`](../../docs/seanses/device-board-refactor-v04-2026-06-18.md).

### 15.1 Обработчики событий

Сценарий устройства имеет 4 системных обработчика событий и 2 лупа:

| Обработчик | Поле схемы | Данные Event-узла | Назначение |
|------------|-----------|-------------------|------------|
| `onConnect` | `scenario.onConnect` (новое в v2) | `DeviceRef` (valid) | устройство подключилось |
| `onStart` | `scenario.initial` (лейбл «On start») | `DeviceRef` (valid) | запуск сценария |
| `onStop` | `scenario.triggers.onStop` | `DeviceRef` | остановка |
| `onDisconnect` | `scenario.triggers.onDisconnect` | `null` → invalid | потеря связи |
| `main` / `alarm` | `scenario.loops.*` | — | рабочие лупы |

`onStart` — презентационный лейбл подграфа `initial`; сериализация ветки в JSON
сохраняется как `initial` (совместимость без слома round-trip).

### 15.2 Системный Event-узел

В каждом обработчике события первым узлом жёстко зашит **Event-узел**
(`nodeKind: 'event'`, `system: true`): он неудаляем и является точкой входа
exec-потока и источником data-ссылки. Удаление/отсутствие — ошибка валидации.

**Реализовано (DBR3):** добавлена ветка-обработчик `onConnect` (4 обработчика
событий в левом сайдбаре: `onConnect`/`onStart`/`onStop`/`onDisconnect`).
Системный Event-узел (`createEventBoardNode`): `deletable:false` + guard
`rejectSystemNodeRemovals` отбрасывает UI-`remove` для системных узлов;
авто-инжект как entry каждого обработчика при гидратации (`ensureEventEntry`,
фикс-id `*-event`); data-выход `DeviceRef` (значение `null` в `onDisconnect`
различается рантаймом — DBR4); pre-run-правило «entry обработчика обязан быть
Event-узлом» (`event-entry-required`). Рантайм исполняет Event как pass-through;
сериализация Event round-trip (build → parse → hydrate).

### 15.3 Переменные сценария

Переменная — типизированная ссылка document-scope (конструктор переменных в
левом сайдбаре). Модель: `ScenarioVariable = { id, name, type, value }`, где
`type ∈ {DeviceRef, MicrophoneRef}`, а `value` — `ScenarioReferenceValue
{ kind, handle, valid }` либо `null` (не задана). Узлы `variable-get` /
`variable-set` читают/пишут переменную по `variableId`.

- **onConnect:** Event(`DeviceRef` valid) → `variable-set` в пользовательскую
  переменную Device → ссылка становится постоянной и валидной.
- **onDisconnect:** Event(`null`) → `variable-set` → ссылка `valid:false`.
- **onStart:** Event(`DeviceRef`) → `is-valid` → (true) `get-microphone`
  (выбор из списка) → `variable-set` в переменную Microphone (для loop-сценариев).

**Реализовано (DBR2):** конструктор переменных в левом сайдбаре под «Конструктор
функций» (создание `+ Device`/`+ Microphone`, переименование, удаление,
индикатор `не задана`/`valid`/`invalid`); узлы `variable-get`/`variable-set`
(кнопки get/set добавляют узел в активную ветку), типизированные пины по
ссылочному `SocketType`; сериализация `scenario.variables` и узлов
(round-trip build → parse → hydrate; узлы с отсутствующей переменной
отбрасываются при гидратации). Запись значения в host и протяжка данных —
**DBR4** (см. §15.4).

### 15.4 Dataflow и валидность

Data-рёбра несут ссылочные `SocketType` (`DeviceRef`/`MicrophoneRef`).
Резолюция значений — pull-based (lazy input resolution, фаза DBR4):
терминальный/потребляющий узел тянет вход по data-ребру. Флаг `valid` ссылки
отражает доступность ресурса; `invalidateReference` помечает её висячей,
не теряя `handle` для диагностики. Совместимость соединения — по точному
совпадению типа (`isValidSocketConnection`).

**Реализовано (DBR4):** чистая `resolveInput(subgraph, variables, nodeId, port,
context)` — pull-резолюция от Event/variable-get; `resolveEventReference` по
ветви (`onConnect`/`initial`/`onStop` → valid `DeviceRef`; `onDisconnect` →
`null`); `isReferenceValid` — предикат для `is-valid` (DBR5); `applyVariableSetValue`
(onConnect → `valid=true`, onDisconnect null → `invalidateReference`, идемпотентность
set). `ScenarioVariableStore` + `variable-set` в `block-executor`; `ScenarioRuntime`
сбрасывает store при load, `runOnConnect()` для обработчика onConnect. Unit-тесты:
valid/invalid/null, idempotent set, type mismatch, cycle, runtime integration.

### 15.5 Палитра v0.4 (правый сайдбар)

Пока только: `print` (терминальный лог; принимает `DeviceRef`/`MicrophoneRef`),
`is-valid` (условный по валидности ссылки), `get-microphone` (извлекает
`MicrophoneRef` из `DeviceRef`, выбор микрофона из списка устройства).
Кнопка «Пуск» неактивна, если связь с устройством разорвана (online-presence,
фаза DBR6) — и в списке устройств, и на борде.

**Реализовано (DBR6):** единый селектор `isDeviceLive(deviceId)` на сторону —
cabinet: presence map из WS `node.online`/`node.offline` (`useCabinetNodeRuntime`);
client paired: WS `connected` (`useDeviceLive`); автономный клиент — без gating.
`resolveRunDisabledReason` + `deviceLive` prop в `DeviceBoardGraphProvider`;
disabled + `title`/`aria-label` «нет связи с устройством» в `NodesPage` и Run на борде.

**Реализовано (DBR5):** правый сайдбар по умолчанию — 3 узла (`Print`/`isValid`/
`GetMicrophone`); legacy D0-палитра только при `VITE_DEVICE_BOARD_LEGACY_PALETTE=true`.
Фабрики `createPaletteBoardNode`, pins и round-trip сериализация; `Print` логирует
`formatReferenceForPrint` (handle + valid); `is-valid` ветвит exec (`exec-true-out` /
`exec-false-out` по `isReferenceValid`); `get-microphone` — dropdown микрофона в
инспекторе из `host.enumerateMicrophones` (audio-engine enumerate), data-выход
`MicrophoneRef` через `resolveInput` для set переменной Microphone.

### 15.6 Контракты (DBR0, уже в `@membrana/core`)

- `SocketType += 'DeviceRef' | 'MicrophoneRef'`; `REFERENCE_SOCKET_TYPES`,
  `isReferenceSocketType`.
- `scenario-variables.ts`: `ScenarioVariable`, `ScenarioReferenceValue`,
  `createReferenceValue` / `invalidateReference` / `createScenarioVariable`.
- `scenario-node-kind.ts`: `SCENARIO_NODE_KINDS`, `ScenarioNodeKind`,
  `SYSTEM_SCENARIO_NODE_KINDS` (`data.kind`-таксономия, отдельная от legacy
  D0 `SCENARIO_BLOCK_KINDS`).
- `ScenarioGraphNode += nodeKind? / system? / variableId?` (аддитивно).
- `ScenarioGraph += onConnect / variables`.
  - `DEVICE_SCENARIO_DOCUMENT_VERSION = 2`, `DEVICE_SCENARIO_MIN_DOCUMENT_VERSION = 1`;
  `parseDeviceScenarioDocument` мигрирует v1→v2 и отклоняет version > 2.

### 15.7 Узлы-конструкторы и Pure getters (v0.9)

**Проблема:** value-типы вроде `Integer`/`String` задаются через **variable-set** или
инспектор переменной; **policy-объекты** и **ref-материализации** требуют явного
источника в графе — «создать экземпляр и передать по dataflow».

**Blueprint parity (Pure vs Impure):** семантика как в UE Blueprints — на canvas и в
runtime (`@membrana/core` `scenario-node-pure.ts`, эпик
`db-pure-getters-blueprint-parity`):

| Режим | Exec pins | Участие в exec-walk | Resolve |
|-------|-----------|---------------------|---------|
| **Pure** (`pure: true`) | **нет** | пропуск (transparent) | pull через `resolveInput` / `resolveNodeOutput` на каждый read (D4: без tick-cache) |
| **Impure** (`pure: false`) | exec-in → exec-out | выполняется на exec-тике | выход фиксируется на шаге exec |

**Sidebar:** галочка **Pure** для `PURE_ELIGIBLE` (`variable-get`, `get-journal`, `get-reporter`); ref-getter — read-only
bound/empty badge (D2); value-getter — редактирование выходного value. Переключение
**impure → pure** удаляет все exec-рёбра узла (D1).

**Два класса конструкторов** (`CONSTRUCTOR_SCENARIO_NODE_KINDS` в core):

| Класс | Примеры | Выход | Pure | Exec pins |
|-------|---------|-------|------|-----------|
| **Policy constructor** | `MakeRecordingPolicy`, `MakeFftTrendsPolicy` | `RecordingPolicy`, `FftTrendsPolicy` | **always true** (`CONSTRUCTOR_ALWAYS_PURE`, D3) | **never** |
| **Ref constructor** | `MakeTrack`, `MakeReportFrom*`, `MakeFftTrendsAnalysis` | `TrackRef`, `ReportRef`, … | **always false** | exec-in → exec-out |

**MakeRecordingPolicy** — **только** data-out `RecordingPolicy` (enum:
`windowSec` 3|5|7|10|15|30, `captureFormat` wav|webm|mp4). Data-edge к
`StartRecording.policy` (bootstrap + restart). Exec-hop через policy **deprecated**
(v0.8 → миграция v0.9).

**MakeFftTrendsPolicy** — **только** data-out `FftTrendsPolicy` (enum
presets trends-fft-analyzer). Data-edge к `MakeFftTrendsAnalysis.policy`.

**Не путать:** `variable-get`/`variable-set` — document-scope переменные;
конструкторы — **фабрики значений/ref на канвасе** (как уже было de-facto у MakeTrack).

**Палитра v0.9:** категория «Конструкторы» — policy nodes (badge `constructor · pure`) +
ref constructors. `RecordingPolicy` **убран** из sidebar «Конструктор переменных» (legacy JSON
variables мигрируют через `resolveScenarioRecordingPolicy`).

**Sign-off:** [`docs/device-board-scripts/PURE_GETTERS_LGTM.md`](../../docs/device-board-scripts/PURE_GETTERS_LGTM.md).

---

## 16. Collectors v0.5: Recorder, SpectralAnalyser, event-порты

> Эпик `device-board-collectors-v05` (DBC0–DBC6). Консилиум:
> `docs/seanses/device-board-collectors-v05-2026-06-20.md`.

### 16.1 Модель

| Сущность | Ref / тип | Роль |
|----------|-----------|------|
| **GetRecorder(device)** | `RecorderRef` | Singleton на device runtime — очередь `AudioSampleRef` |
| **GetSpectralAnalyser(device)** | `SpectralAnalyserRef` | Singleton — очередь `FftFrameRef` |
| **GetSample** | `AudioSampleRef` | PCM-окно за exec-тик (Sample ≠ Frame) |
| **GetFFTFrame** | `FftFrameRef` | Спектр из Sample (отдельный узел) |
| **CollectSamples / CollectFftFrames** | config + event-out | Append + flush → `AudioSampleRefList` / `FftFrameRefList` |
| **NewTrack / NewFftTrendsAnalysis** | terminal | data-in: массив ref → track / trends report |

Микрофон (`MicrophoneRef`) — только A/D и `StartStreaming`; **не** владелец треков.

**Policy на singleton — frozen (v0.6).** MVP: `collectorConfig` на Collect-узле, правый сайдбар
(defaults: bufferSize 2048, smoothing 0.75, windowSec 3, queueCapacity 10).

### 16.2 Pin kind `event`

- `exec` — каждый tick лупа;
- `data` — dataflow;
- **`event`** — квадратный handle; срабатывает при flush Collect (count **OR** windowSec).

Рёбра `ScenarioEdgeKind: 'event'` соединяют `event-out` Collect с downstream exec-in.

### 16.3 Канонический граф (MVP) — legacy v0.5–v0.6

> **Deprecated для новых сценариев.** Оставлен для миграции JSON. Целевой MVP — §16.5.

```text
GetDevice → GetRecorder / GetSpectralAnalyser
GetMicrophone → StartStreaming → stream
Main tick: GetSample → GetFFTFrame → CollectFftFrames → [event] → NewFftTrendsAnalysis
Parallel: CollectSamples → [event] → NewTrack
```

### 16.4 Interim runtime (P0–P3, `vesnin`)

Пока на борде нет узлов §16.5, host **эмулирует** целевой gate:

- PCM: `ScenarioContinuousPcmBuffer` + `flushRecorderSession` / `takeSlice()`
- Track: `MakeTrack` → `uploadTrackAsync` (не блокирует tick)
- Report: `device-board-observation/v1`, `trackId` ← `lastObservationTrackId`
- Trends: `analyzeTrendsFromFftFrames` (без PCM round-trip)

См. [`DEVICE_BOARD_REALTIME_OBSERVATION_EPIC_PROMPT.md`](../../docs/prompts/DEVICE_BOARD_REALTIME_OBSERVATION_EPIC_PROMPT.md).

### 16.5 Целевой MVP: AudioStream → track + report (v0.8 LGTM)

> **Достигнуто 2026-06-21:** bundled `usercase-mvp-microphone` на device-board; sign-off [`USERCASE_MVP_MICROPHONE_LGTM.md`](../../docs/device-board-scripts/USERCASE_MVP_MICROPHONE_LGTM.md).  
> **Дальше:** usability + docs snapshot + server persist — [`DEVICE_BOARD_POST_USERCASE_ROADMAP.md`](../../docs/prompts/DEVICE_BOARD_POST_USERCASE_ROADMAP.md).

**Центральная продуктовая цель device-board:** observation bundles с микрофона (recording gate + trends report).
Один bundle = **TrackRef (preview/upload)** + **Trends FFT report** (`trends-fft/v0.1`) в journal.

#### Точка входа

```text
GetMicrophone → GetAudioStream → AudioStreamRef (audiostream1)
GetDevice(device1) → GetRecorder → RecorderRef
GetDevice(device1) → GetSpectralAnalyser → SpectralAnalyserRef
```

#### Bootstrap (первый valid stream)

```text
StartRecording(recorder, audioStream, recordingPolicy)
  recordingPolicy: MakeRecordingPolicy → { windowSec: 5, captureFormat: 'wav' }   // v0.8 MVP
```

Host пишет PCM **непрерывно** в буфер Recorder. **CollectSamples не используется.**

#### Каждый main tick

```text
onTick → isValid(mic) → GetAudioStream → isValid(stream)
  → [if !recording] StartRecording
  → GetSample(stream) → GetFFTFrame → analyserQueue.append   // только FFT, не для track
  → if recorder.realDurationSec >= recordingPolicy.windowSec:
        ┌─ StopRecording → MakeTrack(slice)
        ├─ MakeTrack(exec) → StartRecording(restart)
        ├─ MakeRecordingPolicy(data) → StartRecording.policy
        ├─ MakeFftTrendsPolicy(data) → MakeFftTrendsAnalysis.policy
        ├─ FlushSpectralAnalyser → FftFrameRefList
        ├─ MakeFftTrendsAnalysis(frames, policy)
        ├─ MakeReportFromAnalysis         → trends-fft/v0.1
        └─ PublishReport(journal)
  → loop-repeat (∞)
```

#### Gate — один `if` на tick

Оба конвейера (PCM и analyser) **сходятся** в одной проверке длительности записи.
На **true**: stop/slice/track/restart **и** flush analyser → trends → observation → journal.

#### Узлы v0.9 (shipped)

| nodeKind | Роль |
|----------|------|
| `make-recording-policy` | Pure constructor `RecordingPolicy` (data-only, §15.7) |
| `make-fft-trends-policy` | Pure constructor `FftTrendsPolicy` (data-only) |
| `start-recording` | Bootstrap + restart после gate |
| `stop-recording` | `RecordingSliceRef` из clip recorder |
| `is-recording-window-full` | Exec gate |
| `flush-spectral-analyser` | Flush FFT queue (`CollectFftFrames` — append-only) |

Плюс: `make-track`, `make-fft-trends-analysis`, `make-report-from-analysis`, `publish-report`.

#### Узлы v0.7 (reference)

| nodeKind | Входы | Выходы |
|----------|-------|--------|
| `start-recording` | exec, `RecorderRef`, `AudioStreamRef`, `RecordingPolicy` | exec, `RecorderRef` |
| `stop-recording` | exec, `RecorderRef` | exec, `RecordingSliceRef` |
| `is-recording-window-full` | exec, `RecorderRef`, `windowSec` | exec-false / exec-true |

**Не в целевом MVP:** `collect-samples`, `make-report-from-track`, drone publish.

#### Ожидаемые chain-log маркеры

```text
start-recording → … → recording-window-full
stop-recording → track concat-ok uploadMode:async → start-recording
analyser-flush → fft-trends-input → publish-report (trends-fft/v0.1)
```

### 16.6 Контракты collectors (DBC0, `@membrana/core`)

- `SocketType += RecorderRef | SpectralAnalyserRef | AudioSampleRefList | FftFrameRefList`
- `SCENARIO_NODE_KINDS += get-recorder, get-spectral-analyser, collect-samples,
  collect-fft-frames, new-track, new-fft-trends-analysis`
- `ScenarioPinKind += 'event'`; `ScenarioEdgeKind += 'event'`
- `ScenarioCollectorConfig`, `DEFAULT_SCENARIO_COLLECTOR_CONFIG`, `resolveScenarioCollectorConfig`
- `ScenarioGraphNode += collectorConfig?`

---

## 17. Journal + Reporter v0.6

> Эпик `device-board-journal-reporter-v06` (DBJ0–DBJ6). Issue #131.

### 17.1 Модель

| Сущность | Ref / тип | Роль |
|----------|-----------|------|
| **GetJournal(device \| server)** | `JournalRef` | Per-device journal; handle `journal:{scope}:{deviceId}` |
| **GetReporter(journal)** | `ReporterRef` | Scoped reporter; handle `reporter:{journalHandle}` |
| **MakeReportFromTrack** | `TrackRef` → `ReportRef` | Drone / track report (`drone-detection-report/v1`) |
| **MakeReportFromAnalysis** | `FftTrendAnalysisRef` → `ReportRef` | Trends FFT report (`trends-fft/v0.1`) |
| **PublishReport** | `JournalRef` + `ReportRef` | Append report в породивший journal |

**Scope frozen:** server journal = **per-device** (`deviceId`), не per-membrane.

Backend routing — **host** (`resolveJournalBackend`): device scope → electron-fs / local; server scope → cabinet sync when paired.

### 17.2 Node kinds (отдельные make-report для палитры и suggest modal)

- `get-journal`, `get-reporter`
- `make-report-from-track`, `make-report-from-analysis` (два node kind, не один переключатель)
- `publish-report`

### 17.3 Канонический граф

```text
GetDevice → GetJournal(device) → GetReporter → MakeReportFromTrack → PublishReport
GetServer → GetJournal(server) → GetReporter → MakeReportFromAnalysis → PublishReport
```

Legacy v0.5 **прямая запись отчёта в journal** из `NewFftTrendsAnalysis` убрана (DBJ5).
Сами узлы **NewTrack** / **NewFftTrendsAnalysis** — фабрики Recorder / SpectralAnalyser в v0.6 chain:

| Node | In | Out |
|------|-----|-----|
| **NewTrack** | `AudioSampleRefList` | `TrackRef` |
| **NewFftTrendsAnalysis** | `FftFrameRefList` | `FftTrendAnalysisRef` |

Канонический граф:

```text
CollectSamples → [event] → NewTrack → TrackRef → MakeReportFromTrack → PublishReport
CollectFftFrames → [event] → NewFftTrendsAnalysis → FftTrendAnalysisRef → MakeReportFromAnalysis → PublishReport
GetJournal → GetReporter ────────────────────────────────────────────────────────────────────────────────┘
```

`NewTrack` по-прежнему создаёт track row в journal (host `createTrackFromSampleRefs`); **report append** только через `PublishReport`.
