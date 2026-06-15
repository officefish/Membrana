# Архив: SLD1 — SampleDetectionVerdict + analyzeSample

| Поле | Значение |
|------|----------|
| **ID** | `sld1-sample-detection-contract` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-06-15 |
| **Архивирована** | 2026-06-15 |
| **GitHub Issue** | #47 |
| **Промпт** | [`docs/prompts/SAMPLE_LIBRARY_DRONE_DETECTION_EPIC_PROMPT.md`](../../prompts/SAMPLE_LIBRARY_DRONE_DETECTION_EPIC_PROMPT.md) |

## Заметки при закрытии

PR #77; `analyzeSample()` в `@membrana/detector-base`; benchmark на v0.2 (120).

## Отчёт о выполнении

- `packages/services/detectors/base/src/analyze-sample.ts` — агрегация кадров → `SampleDetectionVerdict`
- `scripts/benchmark-detectors.mjs` — общий путь с UI
- harmonic baseline на free-v1: F1≈0.53

---

*Карточка: `yarn task:archive` / ручное закрытие 2026-06-15.*
