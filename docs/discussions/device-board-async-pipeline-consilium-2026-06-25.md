# Consilium: Device-Board async pipeline (Promise nodes + latent Sequence)

> **Дата:** 2026-06-25  
> **Эпик:** `device-board-async-pipeline-v1`  
> **Baseline log:** `runId 7e8a289c` (10 gate, 10 trends publish, 3 upload-ok, 9 drone-skip)  
> **Perplexity:** engine async semantics (UE latent vs fire-and-forget, Unity/Godot) — 2026-06-25  
> **Статус:** **LGTM Teamlead 2026-06-25** · Issue [#176](https://github.com/officefish/Membrana/issues/176)

---

## Вопрос консилиума

Какой контракт async orchestration в Membrana device-board **максимально качественно** развязывает track upload, analysis, report build и journal publish от main tick (~60 Hz), сохраняя canvas-выразимость и chain-log correlation?

---

## Сводка Perplexity (внешние референсы)

| Паттерн | Семантика | Применимость к Membrana |
|---------|-----------|-------------------------|
| Fire-and-forget | Старт job, exec продолжается | `start-async-job` + detached event |
| Latent await | Suspend **ветку** до completion | `await-promise` на side branch |
| Event continuation | Completion → callback/event pin | `on-async-resolved` → MakeReportFromTrack |
| Backpressure + cancel | Queue limit, abort stale | `AsyncJobStore`, onStop |

**Ключевое правило:** background work **не мутирует** runtime state напрямую — только через completion handler на main orchestration path.

---

## Обсуждение команды (сжатый протокол)

[Teamlead]: Выбираем **вариант 5** из async-обсуждения 2026-06-25: Sequence latent + Promise nodes + AsyncJobStore в core. Bridge-only callback на `upload-ok` — interim не более одного PR. Core → `vesnin`. Сохраняем LGTM L4: trends publish sync на gate.

[Структурщик]: Три слоя не смешивать: (1) `AsyncJobStore` в device-board runtime, (2) типы в core, (3) `ScenarioAsyncJobHub` в agenda — тонкий subscribe для UI, без циклов. `dispatchCollectEventBranches({ detach: true })` — отдельный PR R8 с abort tests.

[Математик]: Partial order: \(P_{\text{upload}} \rightarrow \text{MakeReportFromTrack} \rightarrow \text{Publish}\); trends path параллелен и sync. `maxPending=3` предотвращает unbounded queue. Job state machine: 4 terminal states, idempotent resolve.

[Музыкант]: StopRecording → StartRecording остаётся sync на gate (&lt;16 ms budget). FFT flush до restart — invariant. Upload и drone analysis — вне hot path. Щелчки / gap PCM — блокер, async I/O — нет.

[Верстальщик]: Inspector: Sequence checkbox «Latent Then» отдельно от «Параллельный async» с warning tooltip. Promise nodes — квадратный event-out на `on-async-resolved`. Chain-log: `async-job-*` рядом с `runId`/`tick`.

[Teamlead]: `parallelAsync` не удаляем — для pure parallel branches. Новый `latentThen` — default **off**; bundled MVP v2 включает latent на gate Sequence.

[Структурщик]: `supportsAsync: true` на impure nodes — explicit opt-in в node metadata + pre-run. User functions async-capable — follow-up если body flag `asyncCapable`.

[Математик]: `await-promise` timeout default 30s; reject → `async-job-rejected` + optional skip edge (future).

[Музыкант]: `cancel-async-jobs` на onStop — обязательно, иначе upload completion после Stop пишет в journal.

[Верстальщик]: logs:parse новые поля для sprint OPEN/closure checklist.

---

## ADR (принято для R0)

| ID | Решение | Владелец |
|----|---------|----------|
| AD1 | `latentThen` на Sequence — канон non-blocking orchestration | Ozhegov |
| AD2 | 4 promise node kinds в core | Vesnin |
| AD3 | Trends publish sync на gate | Kuryokhin bridge |
| AD4 | maxPending track-upload = 3 | Dynin |
| AD5 | vesnin branch для core | Vesnin |
| AD6 | Supersede ucv2-2 minimal shim | Teamlead |
| AD7 | Graph meta `v2.0-async` | Ozhegov |

---

## Итоговое решение

**Принято:** реализовать эпик `device-board-async-pipeline-v1` фазами R0–R12 по [`DEVICE_BOARD_ASYNC_PIPELINE_EPIC_PROMPT.md`](../prompts/DEVICE_BOARD_ASYNC_PIPELINE_EPIC_PROMPT.md).

**Отклонено:** только bridge callback без graph nodes; `parallelAsync` на impure gate path; sync `MakeReportFromTrack` на hot path.

**Отложено:** Web Worker drone analysis; WS remote async jobs (MP7b hook в R10 only).

---

## Teamlead LGTM (2026-06-25)

**Vesnin:** AD1–AD7 приняты без изменений. GitHub Issue **#176**. Core work стартует на `vesnin`. Trends sync на gate (AD3) — operator default accepted. Старт R1+R2.

**Issue:** https://github.com/officefish/Membrana/issues/176

---

## Следующие шаги

1. ~~Teamlead LGTM на ADR~~ **done**
2. ~~GitHub Issue~~ **#176**
3. R1+R2 на ветке `vesnin` → merge → device-board R3+
