# Промпт (эпик): Device-Board — Pause runtime v0.7

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** эпик **`device-board-pause-runtime-v07`**  
> **GitHub Issue:** [#142](https://github.com/officefish/Membrana/issues/142)  
> **Пакет:** `@membrana/device-board` (+ docs; **без** `vesnin` / `@membrana/core` unless pause node needs core enum)  
> **Приоритет:** критерий успеха дня 2026-06-22 (брифинг); блокер UserCase MVP workflow  
> **Предшественник:** function modal sprint (#139), edit v2 + docs (#140)

---

## Контекст продукта

Сейчас в toolbar есть **Run** и **Stop**. **Stop** прерывает runtime и запускает ветку **`onStop`** — это необратимая остановка сценария.

Оператору нужен **режим паузы**: заморозить исполнение **без** `onStop`, с возможностью **Resume** с того же места (та же фаза, та же итерация лупа, тот же exec-контекст).

**Не путать:**

| Механизм | Что делает |
|----------|------------|
| `loopTickPauseMs` / `waitUntilNextLoopTick` | Планировщик: задержка **между** тиками main/alarm (~30–60 Hz) |
| **Pause runtime (этот эпик)** | Пользовательский / графовый **freeze**: exec-цепочка и лупы **ждут**, `onStop` **не** вызывается |
| **Stop** | Abort + `onStop` + `isRunning: false` |

Аудио-поток (микрофон через audio-engine) при паузе **продолжает** работать; замораживается только scenario graph.

---

## Зафиксированные решения

| # | Решение |
|---|---------|
| 1 | `pause()` / `resume()` на `ScenarioRuntime`; состояние `isPaused: boolean` в `ScenarioRuntimeState` |
| 2 | При паузе `isRunning` остаётся `true`; `phase` сохраняет текущую ветку (`main` / `alarm` / …) |
| 3 | **Stop** из paused — валиден: снимает паузу и выполняет обычный stop + `onStop` |
| 4 | UI: кнопки **Pause** / **Resume** рядом с Run/Stop в `device-board-shell` |
| 5 | Опционально (DBP2): узел **`pause-runtime`** по exec-in (аналог `stop-runtime`, но freeze, не stop) |
| 6 | Документация: `docs/SCENARIO_RUNTIME.md` § pause; `DEVICE_BOARD_CONCEPT.md` §7.4 |

---

## Мнение виртуальной команды

```text
[Teamlead — Vesnin]:
Pause — продуктовый must-have до UserCase MVP. Не смешивать с Stop. LGTM после browser smoke:
Run → Pause → Resume → Stop без регрессии main/alarm loops.

[Структурщик — Ozhegov]:
Реализация в scenario-runtime.ts: await waitWhilePaused(signal) в точках yield (между exec-шагами
и перед waitUntilNextLoopTick). Чистое ядро; graph context — pauseScenario/resumeScenario.

[Математик — Dynin]:
Счётчики loop iteration и deltatime при паузе: время паузы **не** входит в tick ms (wall-clock freeze).

[Музыкант]:
Audio-engine не трогаем. Pause не вызывает stopStream.

[Верстальщик — Rodchenko]:
Pause disabled когда !isRunning; Resume disabled когда !isPaused. board-runtime-status: badge «Пауза».
```

---

## План (DBP0–DBP4)

| Фаза | Registry `id` | Size | Содержание |
|------|---------------|------|------------|
| **DBP0** | `dbp-0-runtime-pause-core` | M | `pause()`/`resume()`, `isPaused`, `waitWhilePaused`, unit tests runtime |
| **DBP1** | `dbp-1-ui-toolbar` | M | Shell Pause/Resume, graph context API, runtime status badge |
| **DBP2** | `dbp-2-pause-runtime-node` | S | Node kind `pause-runtime`, palette, exec handler → `runtime.pause()` |
| **DBP3** | `dbp-3-docs-scenario-runtime` | S | `SCENARIO_RUNTIME.md`, CONCEPT §7.4, cookbook note |
| **DBP4** | `dbp-4-teamlead-closure` | S | CI green, browser smoke, LGTM, archive epic |

**Порядок:** DBP0 → DBP1 → DBP2 → DBP3 → DBP4

---

## DBP0 — runtime core

**Файлы:** `scenario-runtime.ts`, `types.ts`, `scenario-runtime.test.ts`

**API:**

```ts
pause(): void;   // no-op if !isRunning || already paused
resume(): void;  // no-op if !isPaused
```

**Поведение:**

- В циклах main/alarm и в `runSubgraphOnce` — проверка паузы с `await` (не spin).
- `abort` signal от Stop снимает ожидание паузы.
- `patchState` при pause/resume обновляет `isPaused`.

**Тесты (минимум):**

- start → pause → resume → completes main iteration
- pause → stop → `onStop` runs, `isPaused` false
- pause does not increment main loop while frozen (tick ms semantics)

---

## DBP1 — UI

**Файлы:** `device-board-shell.tsx`, `board-runtime-status.tsx`, `device-board-graph-context.tsx`

- `pauseScenario()` / `resumeScenario()` делегируют в runtime
- Run disabled when paused (or show Resume only)
- Keyboard shortcut — **out of scope** (backlog)

---

## DBP2 — pause-runtime node

Зеркало `stop-runtime-node.ts`:

- `pause-runtime` node kind, exec-in only (или + DeviceRef — решить в PR; default exec-in only)
- Handler вызывает `host.pauseRuntime?.()` или callback из runtime

---

## Definition of Done (эпик)

- [ ] DBP0–DBP4 archived
- [ ] `yarn workspace @membrana/device-board test` green
- [ ] Browser smoke: Run → Pause → Resume → Stop
- [ ] LGTM Vesnin
- [ ] Нет регрессии Stop / onDisconnect / alarm manual override

---

## Промпт целиком (для агента)

Ты — координатор Membrana (Vesnin). Пакет: `@membrana/device-board`.

**Цель:** режим **Pause/Resume** scenario runtime без ветки `onStop`.

1. **DBP0:** добавь `isPaused`, `pause()`, `resume()`, `waitWhilePaused` в `ScenarioRuntime`; тесты.
2. **DBP1:** кнопки Pause/Resume в shell + graph context + status badge.
3. **DBP2:** узел `pause-runtime` в палитре.
4. **DBP3:** обнови `docs/SCENARIO_RUNTIME.md` и CONCEPT.
5. **DBP4:** smoke + archive.

**Запрещено:** Web Audio в device-board; менять семантику Stop; `vesnin` без отдельного gate.

Читай: [`SCENARIO_RUNTIME.md`](../SCENARIO_RUNTIME.md), [`DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) §7.4.

---

## Out of scope

- Demount user function
- Async heavy nodes
- Server-side UserCase pipeline
- Keyboard shortcuts for pause
