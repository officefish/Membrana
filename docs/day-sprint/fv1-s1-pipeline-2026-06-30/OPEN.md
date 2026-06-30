# OPEN: fv1-S1 — Параметризация пайплайна генерации шаблонов

| Поле | Значение |
|------|----------|
| **Sprint** | `fv1-s1-pipeline-2026-06-30` |
| **Registry** | `fv1-s1-pipeline` |
| **Parent epic** | `free-v1-sound-catalog` · [#205](https://github.com/officefish/Membrana/issues/205) |
| **Status** | **open** |
| **Started** | 2026-06-30 |
| **Lead** | Ozhegov · **Support:** Dynin |

**Промпт:** [`docs/prompts/FREE_V1_SOUND_CATALOG_EPIC_PROMPT.md`](../../prompts/FREE_V1_SOUND_CATALOG_EPIC_PROMPT.md) §Спринт 1  
**Ветка:** `feat/fv1-s1-pipeline`

---

## Фазы

| Фаза | Deliverable | Status |
|------|-------------|--------|
| **P0** | Perplexity research — акустика 7 классов, discriminative features | ✅ `docs/insights/insight-free-v1-acoustic-classes/RESEARCH.md` |
| **P1** | Параметризация пайплайна: `buildClassTemplateFromMetricSamples`, `mergeClassTemplates`, `generate-class-template.mjs`, npm scripts | ⏳ code written, not merged |
| **P2** | Схема датасета: `docs/datasets/free-v1/README.md` (структура, naming, metadata JSON) | ⏳ draft written |
| **P3** | Регрессия DRONE_TIGHT: `yarn templates:generate:drone-regression` PASS | ⏳ blocked by regression delta |
| **P-CLOSE** | PR merge, `yarn task:archive fv1-s1-pipeline`, `CLOSURE.md` | — |

---

## DoD (из промпта)

- [ ] `yarn templates:generate --class <any> --src <path>` работает для любого класса
- [ ] DRONE_TIGHT регрессия pass (`--tolerance 5%`)
- [ ] Perplexity-отчёт по акустике классов сохранён в `docs/insights/insight-free-v1-acoustic-classes/`
- [ ] Схема датасета задокументирована в `docs/datasets/free-v1/README.md`

---

## Baseline

| Проверка | Ожидание |
|----------|----------|
| `data/detectors-benchmark/v0.2/drone/` | 63 WAV, 48 kHz, 5 s |
| `curated-drone-templates.json` (DRONE_TIGHT) | centroid 2900–4300, flux 0.03–0.16, rms 0.07–0.28 |
| `yarn workspace @membrana/template-match-detector-service test` | pass |

---

## Примечание по P3 (regression gap)

DRONE_TIGHT был сгенерирован с **дополнительным шагом ручной настройки** (tight p10-p90 percentile approach), а не только envelope merge. Новый `mergeClassTemplates()` даёт более широкие границы (envelope merge всех 63 сэмплов). Варианты:

**A.** Принять расхождение — новый пайплайн корректен для других классов; DRONE_TIGHT остаётся canonical reference, не перегенерируется в S1.  
**B.** Добавить percentile-режим в `mergeClassTemplates()` для воспроизводимости.  
**C.** Поднять tolerance до 90% (envelope всегда шире tight percentile).

➡️ **Решение нужно от Vesnin / обсуждение с Ozhegov перед P3.**

---

## Первые команды

```bash
git checkout feat/fv1-s1-pipeline
yarn workspace @membrana/template-match-detector-service build
yarn templates:generate --class wind --src docs/datasets/free-v1/wind/   # после P2 контента
yarn templates:generate:drone-regression
```

**Out of scope:** Сбор новых сэмплов (S2), интеграция в детектор (S3).
