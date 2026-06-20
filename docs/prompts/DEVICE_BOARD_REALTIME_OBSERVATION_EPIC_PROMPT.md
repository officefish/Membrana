# Промпт (эпик): Device-Board Realtime Observation Pipeline

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)
> **Эпик** · **Размер:** **L** (фазы P0–P3)
> **Реестр:** `id` = **`db-realtime-observation-pipeline`**

**GitHub Issue:** _(создать при triage)_

---

## Контекст

Main loop device-board MVP пишет треки через **CollectSamples → N×GetSample → concat → sync MakeTrack → upload**,
блокируя tick (~200 ms+), даёт щелчки на стыках PCM и публикует **два** отчёта (drone + trends).
Alarm `write-journal` шлёт `device-board-scenario/v1` без рендера (+ cabinet 500).

**Цель:** ~20 observation bundles/min (window 3 s), отчёт + trackId в одном пакете,
loop не блокируется, preview-трек без артефактов, trends = «Анализатор тенденций FFT».

**Консенсус:** [`docs/device-board-scripts/logs/info.txt`](../device-board-scripts/logs/info.txt) + team consilium 2026-06-18.

**Ветка:** `vesnin`

---

## Фазы

| Фаза | `id` | Содержание |
|------|------|------------|
| **P0** | `db-observation-p0-quick-wins` | windowSec=3; crossfade concat; async MakeTrack upload; убрать drone publish из main; fix alarm write-journal |
| **P1** | `db-observation-p1-continuous-buffer` | Continuous PCM ring per device; MakeTrack from buffer slice (не ref-queue concat) |
| **P2** | `db-observation-p2-bundle` | Schema `device-board-observation/v1`; linked trackId; renderer client+cabinet; lazy audio stub |
| **P3** | `db-observation-p3-frame-trends` | Trends из FftFrame metrics (без PCM round-trip); flux в frame meta |

---

## Definition of Done (эпик)

- [ ] Main loop ≥8 Hz при active monitoring (upload async)
- [ ] Flush каждые ~3 s → один observation bundle в journal
- [ ] Trends UI = TrendsFftReportView; нет «нет совместимого рендера»
- [ ] Preview-трек без слышимых щелчков (continuous buffer + crossfade fallback)
- [ ] `yarn turbo run lint typecheck test --continue` green (scope: device-board, client, journal-report-views)
- [ ] LGTM Vesnin; `yarn task:archive` всех фаз + эпик

---

## Out of scope

- Server-side async encode job (background-media queue) — follow-up
- Новые graph nodes StartRecording/StopRecording — P1 через host buffer, nodes в v0.7
- SSE journal push
