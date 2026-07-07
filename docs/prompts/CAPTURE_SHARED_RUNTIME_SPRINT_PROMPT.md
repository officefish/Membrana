# Sprint prompt: Общий контроль сценария под захватом — единый runtime клиента (CSR1–CSR3)

> **Тип:** task-промпт (спринт, epic `capture-shared-runtime`)
> **Размер:** L (CSR1 L + CSR2 M + CSR3 S; каждая фаза = отдельный PR)
> **Ожидаемый артефакт:** PR по фазам в `main`, зелёный CI + `check:boundaries`, LGTM Teamlead
> **Источник:** владелец, 2026-07-07 — «кнопки play/pause/stop не синхронизированы с
> сервером, никак не влияют на поведение сценария. При захвате контроль должен быть
> общим: сценарий запущен на сервере → на клиенте можно только stop (паузу блокируем);
> сценарий остановлен, но устройство захвачено → можно запустить и с клиента, на сервере
> тоже отразится».

---

## Диагностика (подтверждена по коду, зафиксировать в CSR1 PR)

На клиенте — **два независимых экземпляра `ScenarioRuntime`**, каждый со своим
`createScenarioRuntimeHost()`:

1. **Runtime доски** — `DeviceBoardGraphProvider` создаёт `new ScenarioRuntime(runtimeHost)`
   ([`device-board-graph-context.tsx`](../../packages/device-board/src/context/device-board-graph-context.tsx) ~635).
   Им управляют кнопки борда (`graph.startScenario/stopScenario/pauseScenario`).
2. **Singleton-контроллер** — `DeviceBoardRuntimeController.ensureRuntime`
   ([`deviceBoardRuntimeController.ts`](../../apps/client/src/lib/deviceBoardRuntimeController.ts) ~176)
   создаёт свой `new ScenarioRuntime(...)`. Им управляют команды кабинета через
   [`runtimeRealtimeBridge`](../../apps/client/src/lib/runtimeRealtimeBridge.ts), и
   **только он** шлёт `runtime.state` на сервер (node → server → cabinet).

Инстансы не связаны: кнопки борда крутят №1 (сервер не узнаёт, кабинет не видит),
команда кабинета крутит №2 (борд показывает состояние №1 → «idle», кнопки рассинхрон,
и при захвате клиент видит доску, но playing-сценарий — в другом инстансе).

**Существующий контракт капчи готов** — доводим до дела: `resolveServerFirstFlags`
(soft: `allowFieldStop`, `blockLocalRun=false`, `allowFieldPause=false`; hard:
только stop), `FIELD_ALLOWED_ACTIONS` (core). Проблема не в матрице прав, а в том,
что кнопки борда правят не тот runtime.

| Код | Роль |
|-----|------|
| [`deviceBoardRuntimeController.ts`](../../apps/client/src/lib/deviceBoardRuntimeController.ts) | Singleton, realtime-bridged, emits runtime.state |
| [`runtimeRealtimeBridge.ts`](../../apps/client/src/lib/runtimeRealtimeBridge.ts) | node↔server runtime.state / runtime.command |
| [`device-board-graph-context.tsx`](../../packages/device-board/src/context/device-board-graph-context.tsx) | Runtime доски + gating startScenario/stopScenario |
| [`server-first-flags.ts`](../../packages/device-board/src/components/server-first-flags.ts) | Матрица прав поля под захватом |
| [`PlaybackClusterControl`](../../packages/device-board/src/components) | Кнопки play/pause/stop |
| `docs/DEVICE_BOARD_SERVER_FIRST.md` §3–§4 | Канон: shared control, LWW, emergency stop §3.3 |

---

## Промпт целиком

```text
Ты работаешь по спринту capture-shared-runtime (CSR1–CSR3),
docs/prompts/CAPTURE_SHARED_RUNTIME_SPRINT_PROMPT.md.
Корень: на клиенте два ScenarioRuntime (доска vs realtime-singleton) — кнопки борда
правят не тот. Цель: единый источник истины runtime, чтобы под захватом контроль был
общим и двунаправленным. Инварианты: emergency stop доступен ВСЕГДА (канон §3.3, звук
не блокируем); аудио только через audio-engine; device-board зависит только от core;
пауза под захватом заблокирована (тариф v3). Автономный режим (без захвата) не должен
регрессировать. Каждая фаза = отдельный PR в main. Не расширяй scope без нового Issue.
```

---

## Две независимые оси (важно, уточнение владельца 2026-07-07)

- **Сопряжение (pairing)** решает, идёт ли **синхронизация с сервером**: сопряжённое
  устройство пишет в серверный журнал и шлёт `runtime.state` **всегда**, захвачено оно
  или нет. Устройство может гонять сценарии без захвата, оставаясь связанным и наполняя
  серверный журнал — это штатный режим, кабинет **наблюдает**.
- **Захват (capture)** решает только **матрицу управления** (кто чем может рулить).
  Захват НЕ включает и НЕ выключает синк — он лишь передаёт часть контроля кабинету.

| Состояние | Контроль клиента | Синк с сервером |
|-----------|------------------|-----------------|
| **Не сопряжён** | полный (play/pause/stop) | нет (локально) |
| **Сопряжён, не захвачен** | полный (play/pause/stop) | **да** — журнал + runtime.state, кабинет наблюдает |
| **Сопряжён + захвачен, работает** | только **Stop** (пауза заблокирована) | да; Stop отражается на кабинете |
| **Сопряжён + захвачен, остановлен** | **Start** | да; запуск отражается на кабинете |

Инвариант: **единый runtime используется во всех сопряжённых состояниях** (захват или
нет) — иначе журнал/state теряются, как сейчас с дублем инстансов. Захват меняет только
доступность кнопок, не сам факт синка.

## Фазы

### CSR1 — Единый runtime: борд делегирует исполнение общему контроллеру · L

**Пакеты:** `apps/client` (controller/bridge/wiring) + `packages/device-board`
(graph-context принимает внешний runtime вместо создания своего).

- **Диагностику зафиксировать в PR** (два инстанса).
- Устранить дубль: во **всех сопряжённых состояниях** (захват или нет) борд использует
  **тот же** runtime, что realtime-мост (singleton-контроллер), а не создаёт свой. Точный
  шов — Структурщик в PR (варианты: инъекция контроллера в `DeviceBoardGraphProvider`;
  или `graph` делегирует start/stop/subscribe контроллеру).
- **Сопряжён-но-не-захвачен — тоже единый runtime**: устройство под своим полным
  контролем гоняет сценарий и при этом пишет серверный журнал + шлёт runtime.state
  (кабинет наблюдает). Это не автономия — синк обязан работать. Не сопряжён (нет pairing)
  — локальный runtime без эмиссии, поведение сохраняется.
- Результат: команда кабинета → общий runtime → борд показывает `isRunning` (подписка
  на тот же state); кнопка борда → общий runtime → `runtime.state` + журнал уходят на
  сервер → кабинет видит. Двунаправленность — за счёт уже существующей эмиссии контроллера.
- LWW/preemption (CT6) и режим normal/alarm сохраняются.
- Тесты: борд-state отражает команду кабинета; локальный start/stop сопряжённого
  устройства эмитит runtime.state (мок sink) — **и захваченного, и не захваченного**;
  несопряжённое (autonomous) не эмитит.

### CSR2 — Матрица кнопок под захватом · M (после CSR1)

**Пакет:** `packages/device-board` (PlaybackClusterControl + graph gating + shell).

- Кнопки строго по матрице владельца, читая **общий** runtime state + capture flags:
  - работает → активен только **Stop** (Start скрыт/disabled), Pause **disabled**
    с подсказкой «пауза недоступна под захватом»;
  - остановлен + захвачено → активен **Start**;
  - hard-режим — как soft для этой матрицы, НО emergency stop всегда (§3.3).
- Чистая функция матрицы (Математик): `(captured, isRunning, mode) → {canStart,
  canStop, canPause}` — полная таблица кейсов в тестах.
- a11y: disabled-кнопки с title (не исчезают, DESIGN.md); sr-only статус.

### CSR3 — Docs + smoke · S (после CSR2)

- `docs/DEVICE_BOARD_SERVER_FIRST.md`: раздел «единый runtime клиента», обновить
  §3/§4 матрицей; отметить устранение двойного инстанса.
- Ручной smoke чек-лист в PR: захват → пуск с кабинета (борд показывает Работает,
  доступен Stop) → стоп с клиента (кабинет видит остановку) → пуск с клиента (кабинет
  видит запуск) → пауза заблокирована → emergency stop работает всегда.

## Мнения виртуальной команды

```text
[Teamlead — Vesnin]: Корень — архитектурный дубль runtime, не матрица прав (она готова).
CSR1 — рискованная (единый источник истины), делаем осторожно, автономный режим не ломаем.
Строгий порядок CSR1→CSR2→CSR3. Emergency stop §3.3 неприкосновенен во всех фазах.
[Структурщик — Ozhegov]: шов инъекции runtime в graph-context — ключевое решение; граница
device-board↔client не нарушается (контроллер живёт в client, в пакет инъектируется через
проп/порт, не импортом). check:boundaries в DoD.
[Математик — Dynin]: матрица кнопок — чистая функция от (captured, isRunning, mode);
полная таблица кейсов. LWW-инвариант: последний start побеждает (CT6).
[Музыкант — Kuryokhin]: единственный runtime = единственный источник звука (сейчас два
инстанса могут играть параллельно через один engine — латентный конфликт). Emergency stop
и graceful fade (200мс) не трогать.
[Верстальщик — Rodchenko]: кнопки не прыгают — dis­abled+title по матрице; «пауза
недоступна под захватом», «остановите с кабинета/клиента». Обе темы, sr-only статус.
```

## Definition of Done (спринт)

- [ ] CSR1: один runtime во всех сопряжённых состояниях; команда кабинета отражается на
      борде; локальный start/stop эмитит runtime.state + журнал (кабинет видит) — и с
      захватом, и без; несопряжённый режим без регрессий; диагностика в PR; тесты синка.
- [ ] CSR2: кнопки строго по матрице (работает→только Stop, стоп+захват→Start, пауза
      заблокирована); чистая функция матрицы + полная таблица тестов; emergency stop всегда.
- [ ] CSR3: docs sync + ручной smoke выполнен.
- [ ] Каждая фаза: CI зелёный, `check:boundaries`, отчёт в Issue, LGTM, `task:archive`.

## Out of scope

- Пауза/resume под захватом (тариф v3).
- Изменение серверного enforcement (gateway whitelist уже корректен).
- Multi-node shared control (один узел на free-тарифе).
- Журнал телеметрии сайдбара — отдельный спринт `board-telemetry-journal` (#278).

## Порядок ролей

1. CSR1: Ozhegov (шов runtime) + Kuryokhin (единственный источник звука) — ведёт Ozhegov.
2. CSR2: Rodchenko (кнопки) + Dynin (матрица) + Ozhegov (gating).
3. CSR3: Vesnin (docs + приёмка smoke).

## Заметки для постановщика

- Issue спринта с чеклистом CSR1–CSR3; после регистрации `yarn task:sync-readme`.
- CSR1 требует ручной проверки на связке узел↔кабинет (не только unit) — заложить в smoke.
