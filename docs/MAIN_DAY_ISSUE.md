<!-- Обновлено: 2026-06-15 (VDR6 — epic closure) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) -->
<!-- Эпик: docs/prompts/VALIDATED_DRONE_RECOGNITION_EPIC_PROMPT.md -->
<!-- Отчёт: docs/discussions/vdr-epic-closure-2026-06-15.md -->

# MAIN_DAY_ISSUE — 2026-06-15

**Дата:** 2026-06-15 · **Хранитель:** Teamlead (Vesnin)

---

## Статус эпика `validated-drone-recognition`

**Закрыт по FFT-ветке free-v1** (VDR1–VDR6). Цель ≥80% val accuracy **не достигнута** — ожидаемо; см. closure report.

| Фаза | Статус |
|------|--------|
| VDR1–VDR2 | label + notes API/UI (cabinet + client) |
| VDR3 | `yarn dataset:export-ground-truth` · 120/120 curated |
| VDR4 | `yarn calibrate:detectors` · DSP presets |
| VDR5 | template-match · `DRONE_CURATED` из 60 drone |
| VDR6 | [`vdr-epic-closure-2026-06-15.md`](./discussions/vdr-epic-closure-2026-06-15.md) |

---

## Лучшие метрики (val, 40 сэмплов)

См. [`vdr6-closure.json`](./data/detectors-benchmark/v0.2/reports/vdr6-closure.json) — `yarn report:vdr6`

**Лучший FFT-детектор:** template-match (val F1 выше DSP; accuracy ~56% на полном корпусе).

---

## Следующий фокус (вне этого эпика)

1. **Рефакторинг журнала** (agenda / telemetry) — следующий эпик после merge PR #77.
2. **Следующий тариф** (не эта неделя): MFCC, спектрограммы, ~600 сэмплов.

---

## Команды

```bash
yarn report:vdr6
yarn benchmark:detectors
yarn templates:build-from-dataset
```
