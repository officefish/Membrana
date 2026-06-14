# Single-Node Detection First — memo 2026-06-10

**Контекст:** пять task-промптов #47 без полевой базы звуков; синтетика v0.1 + `yarn benchmark:detectors`.

## Решения

1. **Контракт** — `@membrana/detector-base` stable v0.1 (`DetectionMetrics`, mock detector).
2. **Датасет** — `docs/DATASET.md` + `yarn dataset:generate` (9 WAV synthetic).
3. **Бенчмарк** — `yarn benchmark:detectors` → `DETECTOR_BENCHMARK.md` autogen.
4. **Harmonic** — `@membrana/harmonic-detector-service` на бенчмарке (метрики не gate).
5. **Freeze** — `ARCHITECTURE.md` §1e + PR template: no TDOA/localizer/tracker/transport до gate.

## Gate

Precision ≥85%, recall ≥90% на **расширенном** test-split — после полевых данных, не в v0.1 synthetic.
