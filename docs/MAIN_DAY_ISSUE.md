<!-- Обновлено: 2026-06-15 (SLD1 — sample-library-drone-detection epic) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) -->
<!-- Эпик: docs/prompts/SAMPLE_LIBRARY_DRONE_DETECTION_EPIC_PROMPT.md -->
<!-- Реестр: sld1-sample-detection-contract -->

# MAIN_DAY_ISSUE — 2026-06-15

**Дата:** 2026-06-15 · **Хранитель:** Teamlead (Vesnin)

---

## Один обязательный фокус дня

### **SLD1: контракт анализа 5-с сэмпла + benchmark на free-v1**

**GitHub Issue:** [#47](https://github.com/officefish/Membrana/issues/47)  
**Эпик:** `sample-library-drone-detection`  
**Фаза:** `sld1-sample-detection-contract`  
**Промпт:** [`docs/prompts/SAMPLE_LIBRARY_DRONE_DETECTION_EPIC_PROMPT.md`](./prompts/SAMPLE_LIBRARY_DRONE_DETECTION_EPIC_PROMPT.md)

---

## Цель дня

Заложить **единый путь** «декодированный сэмпл 5 с → вердикт детектора» для UI (плагин SLD2) и `yarn benchmark:detectors`. Канонический датасет — **free-v1 v0.2 (120 треков)**, не синтетика v0.1.

---

## Definition of Done (SLD1)

- [x] `@membrana/detector-base`: `SampleDetectionVerdict`, `analyzeSample()`
- [x] `scripts/benchmark-detectors.mjs` вызывает `analyzeSample` (без дублирования цикла)
- [x] Unit-тесты `analyze-sample.test.ts` green
- [x] `yarn benchmark:detectors` на v0.2 (120) — harmonic F1≈0.53
- [x] Docs: v0.1 = legacy smoke only ([`DATASET.md`](./DATASET.md))

**В работе (SLD2):** плагин `sample-library-drone-analysis` — UI + auto-analyze после play.

---

## Порядок работы

| Время | Задача |
|-------|--------|
| Утро | `analyzeSample` + тесты + benchmark refactor |
| День | Прогон benchmark на 120; зафиксировать baseline harmonic |
| Вечер | `yarn task:archive sld1-sample-detection-contract` после merge PR |

---

## Команды

```bash
yarn turbo run lint typecheck test build --filter=@membrana/detector-base --filter=@membrana/harmonic-detector-service
yarn benchmark:detectors
```

---

## Связь с продуктом

После SLD1 → **SLD2** плагин библиотеки сэмплов показывает таблицу: детектор | family | isDrone | confidence после play/анализа 5-с трека.
