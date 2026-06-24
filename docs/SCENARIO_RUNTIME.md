# Scenario runtime — концепт исполнения сценария

> **Статус:** v1 (зафиксировано после полевых испытаний, 2026-06-18).  
> **Пакет:** `@membrana/device-board` (`packages/device-board/src/runtime/`).  
> **Связано:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) §1f, [`packages/device-board/DEVICE_BOARD_CONCEPT.md`](../packages/device-board/DEVICE_BOARD_CONCEPT.md) §21, [`apps/docs/device-board/editor/edit-and-navigation`](../apps/docs/device-board/editor/edit-and-navigation.mdx), [`prompts/DEVICE_BOARD_REALTIME_RUNTIME_EPIC_PROMPT.md`](./prompts/DEVICE_BOARD_REALTIME_RUNTIME_EPIC_PROMPT.md).

---

## 1. Назначение

**Scenario runtime** — чистое ядро без React/DOM, исполняющее **scenario graph**: ветки `initial`, лупы `main` / `alarm`, триггеры `onStop` / `onDisconnect`, пользовательские функции.

Runtime **оркестрирует** вызовы через `ScenarioRuntimeHost` (микрофон, journal, детекторы, Print). Он **не**:

- создаёт `AudioContext` и не обходит `@membrana/audio-engine-service`;
- исполняет signal graph (хабы / `plugin.install`);
- генерирует TypeScript из графа.

Клиент (`apps/client`) подставляет реальный host; тесты — `createStubScenarioRuntimeHost`.

---

## 2. Три часа (не смешивать)

| Часы | Где | Ритм | Примеры |
|------|-----|------|---------|
| **Audio** | `audio-engine`, worklet, analyzer-сервисы | буферы PCM, кванты worklet (~2–10 ms) | FFT, trends, RMS |
| **Scenario** | `ScenarioRuntime` | итерации main/alarm (~30–60 Hz в v1) | detection-front, journal, variable-set |
| **UI** | React, подсветка нод | кадр отрисовки (`requestAnimationFrame`) | `activeNodeId`, paint |

В JavaScript **нет системного `onTick`**. Нет DOM-события и нет аналога Unity `Update()` на уровне платформы. Узел **`onTick` в графе** — доменное имя **точки входа итерации лупа** (как `Update` / `_process` в игровых движках), а не привязка к браузерному API.

Смена планировщика под капотом **не меняет** сериализацию графа и контракт нод `onTick` / `loop-repeat`.

---

## 3. Фазы и ветки

```
initial → (main ⟲) ⇄ (alarm ⟲) → onDisconnect? → onStop
              ↑___________|
         detection-front (только mode=normal)
         manual override (mode=alarm)
```

| Ветка | UI-лейбл (v0.4+) | Entry | Завершение итерации |
|-------|-------------------|-------|---------------------|
| `initial` | On start | `event` (handler) | конец exec-цепочки |
| `main` | `onMainTick` | `event` (`eventVariant: loopTick`) | узел `loop-repeat` (∞) |
| `alarm` | `onAlarmTick` | `event` (`loopTick`) | `loop-repeat` |
| `onStop` / `onDisconnect` | … | `event` (handler) | конец цепочки |

**Переход main → alarm:** фронт детекции (`isDetectionFrontEdge`) в режиме `normal`, либо ручной `setMode('alarm')`.

**Выход из alarm:** тишина (`evaluateSoundLevel`) в авто-режиме; `setMode('normal')` в ручном override.

---

## 4. Луп: onTick, deltatime, tickMs, ∞

Каждая итерация `main` / `alarm`:

1. Runtime вычисляет контекст тика (`loopElapsedMs`, `loopTickMs` от `Date.now()`).
2. Исполняется подграф от **onTick** по exec-рёбрам.
3. Узел **`loop-repeat`** (∞) запрашивает следующую итерацию (явный конец; **циклические рёбра в лупе запрещены**).
4. Пауза до следующего тика через `host.waitUntilNextLoopTick` (см. §5).

**Выходы onTick:**

| Пин | Тип | Семантика |
|-----|-----|-----------|
| `deltatime` | `DateTime` | elapsed с **старта сценария** (value-type; в Print — ISO offset от epoch, не календарь) |
| `tick ms` | `Integer` | миллисекунды с **предыдущего** тика этого лупа (variable Δt планировщика) |

---

## 5. Планировщик тиков (v1 / v2)

### v1 (текущая реализация)

- Между итерациями: `waitUntilNextLoopTick` → по умолчанию `waitMs(LOOP_TICK_PAUSE_MS)` (~16 ms, ориентир ~60 Hz).
- Внутри итерации: после каждого exec-шага — `yieldToEventLoop` (клик Stop, React paint).
- Защита: `MAX_SUBGRAPH_EXEC_STEPS` при отсутствии ∞ в подграфе.

Константы: `packages/device-board/src/runtime/runtime-timing.ts`.

### Контракт host

```typescript
// packages/device-board/src/runtime/host.ts
waitUntilNextLoopTick?: (options: {
  pauseMs: number;
  signal: AbortSignal;
}) => Promise<void>;
```

- **Ядро** (`ScenarioRuntime`) вызывает только этот порт — **не** `requestAnimationFrame` и **не** `setInterval` напрямую.
- **Stub / vitest:** fallback на `waitMs` (wall-clock).
- **Client (v1):** та же wall-clock реализация в `createScenarioRuntimeHost`.
- **Client (v2, план):** rAF или «кадр готов» от audio-engine с cap ~60 Hz; граф без изменений.

Alarm loop использует отдельную паузу `ALARM_LOOP_PAUSE_MS` (400 ms) между итерациями.

---

## 6. ScenarioRuntimeHost — порты I/O

| Порт | Назначение |
|------|------------|
| `startStream` / `stopStream` / `selectMicrophone` | audio-engine |
| `trendsFftDetect` / `evaluateSoundLevel` / `recordChunk` | анализ и чанки |
| `writeJournal` | журнал устройства |
| `printLine` | вывод пользователя (не глушится галочкой INFO) |
| `log` | служебные логи runtime (в client — через INFO gate) |
| `waitUntilNextLoopTick` | планировщик между итерациями лупа |
| `watchConnection` | onDisconnect при потере pairing |

Реализация: `apps/client/src/modules/device-board/createScenarioRuntimeHost.ts`.

---

## 7. Логирование

| Канал | Управление | Пример |
|-------|------------|--------|
| `host.log` / bridge | галочка **INFO** в shell | `[INFO] [device-board] event` |
| `host.printLine` | узел Print в сценарии | `[device-board] 33` |

---

## 8. Границы пакетов

- `@membrana/device-board` — runtime, граф, UI доски; зависит только от `@membrana/core`.
- `apps/client` — host, audio-engine, journal, INFO gate.
- Контракты WS `runtime.*` — `@membrana/core` (ветка `vesnin`), см. epic MP7b.

**Запрещено:** DOM/Web Audio внутри `ScenarioRuntime`; циклические exec-рёбра в лупах без узла ∞.

---

## 9. Эволюция (не breaking)

| Шаг | Содержание |
|-----|------------|
| v2 scheduler | audio-aligned или rAF в `waitUntilNextLoopTick` |
| Fixed timestep | опциональный режим: стабильный `tickMs` в onTick |
| Remote runtime | `runtime.state` / `runtime.log` по WS; ядро без изменений |

Обсуждение команды (2026-06-18): зафиксировано в ходе консилиума по onTick; итоговые решения — этот документ.

---

## 11. Editor vs runtime (post-#140)

Редактирование графа и исполнение — **разные режимы** одного shell (`device-board-shell.tsx`).

| Аспект | Edit | Run (`ScenarioRuntime`) |
|--------|------|-------------------------|
| Канвас | mutating (connect, delete, collapse) | **read-only** |
| Undo | depth-1 hydrated snapshot | нет |
| Подсветка | breadcrumbs, pin meter | **exec-chain overlay** на активном пути |
| Логи | optional INFO edit steps | `host.log`, Print, scenario trace buffer |

Переход edit → run: `ScenarioRuntime.start()` после pre-run validation. Stop — `stop()` или системные триггеры (`onStop`, disconnect).

### Pause / Resume (v0.7, DBP0–DBP2)

| Механизм | Семантика |
|----------|-----------|
| **Stop** | `isRunning → false`, ветка `onStop`, teardown |
| **Pause** | `isPaused: true`, `isRunning` остаётся `true`, `onStop` **не** вызывается |
| **Resume** | снимает паузу, exec продолжается с точки ожидания |
| `loopTickPauseMs` | планировщик между тиками лупа — **не** пользовательская пауза |

**UI:** кнопки Pause / Resume в `device-board-shell` (рядом с Run/Stop).

**Граф:** узел `pause-runtime` (exec-in → exec-out) — вызывает `pause()` и блокирует цепочку до Resume.

Аудио-поток при паузе **не** останавливается; замораживается только scenario graph.

**User functions:** runtime входит в подграф через `exec-subgraph` (см. `function-input` / `function-output` в графе). Навигация между функциями в UI **не** перезагружает runtime — только editor state (`keep-dirty` drafts).

Документация оператора: Mintlify [Edit & navigation](../apps/docs/device-board/editor/edit-and-navigation.mdx) · канон [`DEVICE_BOARD_CONCEPT.md`](../packages/device-board/DEVICE_BOARD_CONCEPT.md) §21.

---

## 12. Ключевые файлы

| Файл | Роль |
|------|------|
| `scenario-runtime.ts` | оркестрация фаз и лупов |
| `exec-subgraph.ts` | исполнение подграфа, yield, лимит шагов |
| `block-executor.ts` | семантика блоков, `loop-repeat` |
| `host.ts` | контракт портов |
| `runtime-timing.ts` | паузы, yield, константы |
| `pause-runtime-node.ts` | узел PauseRuntime в графе (DBP2) |
