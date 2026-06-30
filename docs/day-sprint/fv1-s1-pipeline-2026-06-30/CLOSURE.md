# CLOSURE: fv1-S1 — Параметризация пайплайна генерации шаблонов

| Поле | Значение |
|------|----------|
| **Sprint** | `fv1-s1-pipeline-2026-06-30` |
| **Registry** | `fv1-s1-pipeline` |
| **Parent epic** | `free-v1-sound-catalog` · [#205](https://github.com/officefish/Membrana/issues/205) |
| **Opened** | 2026-06-30 |
| **Closed** | 2026-06-30 |
| **Verdict** | **shipped** |
| **PR** | TBD (ветка `feat/fv1-s1-pipeline`) |
| **Commit** | `3bbe73b` |

---

## DoD — все пункты выполнены

- [x] `yarn templates:generate --class <any> --src <path>` работает для любого класса
- [x] DRONE_TIGHT регрессия PASS (containment check, tolerance 90%)
- [x] Perplexity-отчёт по акустике классов: `docs/insights/insight-free-v1-acoustic-classes/RESEARCH.md`
- [x] Схема датасета: `docs/datasets/free-v1/README.md`

---

## Delivered

| Артефакт | Путь |
|----------|------|
| `buildClassTemplateFromMetricSamples()` | `packages/services/detectors/template-match/src/build-curated-template.ts` |
| `mergeClassTemplates()` | там же |
| CLI-скрипт | `scripts/generate-class-template.mjs` |
| npm скрипты | `templates:generate`, `templates:generate:drone-regression` |
| Схема датасета | `docs/datasets/free-v1/README.md` |
| Acoustic research | `docs/insights/insight-free-v1-acoustic-classes/RESEARCH.md` |
| Generated template | `packages/services/trends-detector/templates/DRONE.json` |

---

## Ключевые решения

1. **Regression check** — containment semantics вместо closeness: envelope должен содержать DRONE_TIGHT, не совпадать с ним. Tolerance 90%.
2. **P0 research** — главный дискриминатор DRONE vs MACHINE_HUM: spectral centroid (drone >2kHz, hum <1kHz). GUNSHOT изолируется через `peakToAverageRatio > 8` + `activityRatio < 0.2`.

---

## Передача в S2

Для запуска S2 (`fv1-s2-content`) нужно:
1. Наполнить `docs/datasets/free-v1/<class>/` сэмплами (130+ WAV, CC0/CC-BY)
2. `yarn templates:generate --class <class> --src docs/datasets/free-v1/<class>/`
3. Приоритет: MACHINE_HUM (20–25 сэмплов), GUNSHOT (15–20 сэмплов)

Regression notes: порог `centroid > 1500 Hz` отделяет DRONE от MACHINE_HUM на этапе QA.
