# Эпик: Validated Drone Recognition — ground truth, калибровка ≥80%, шаблоны

> **Стратегический task-эпик** (несколько PR) · регламент [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Размер:** L · **GitHub:** [#47](https://github.com/officefish/Membrana/issues/47) (продолжение)  
> **Родитель:** `sample-library-drone-detection` (SLD1–SLD4) · **Предшественник:** [`SAMPLE_LIBRARY_DRONE_DETECTION_EPIC_PROMPT.md`](./SAMPLE_LIBRARY_DRONE_DETECTION_EPIC_PROMPT.md)  
> **Консилиум:** [`docs/discussions/sample-library-drone-detection-consilium-2026-06-14-next-epics.md`](../discussions/sample-library-drone-detection-consilium-2026-06-14-next-epics.md)

---

## Ключевое достижение эпика

> **На free-v1 (120 × 5 с) с ручной валидацией меток в БД — хотя бы один детектор (DSP или template-match) достигает ≥80% accuracy на val-split (40 сэмплов) по достоверным меткам `drone` / `not_drone`, с воспроизводимым отчётом `yarn benchmark:detectors` и сравнением pred vs truth в плагине библиотеки.**

Иными словами: переход от «детекторы что-то показывают» к **измеримому узнаванию дрона на размеченном корпусе**, где метки хранятся в `background-media`, редактируются людьми и экспортируются в benchmark — а не берутся только из папки `drone/` / `not-drone/`.

**Не является достижением эпика:** прохождение stage-gate 85/90 ([`WHITE_PAPER.md`](../WHITE_PAPER.md) §8) — это stretch goal или отдельный эпик после VDR.

---

## Контекст (почему новый эпик)

| Факт | Источник |
|------|----------|
| SLD1–SLD4 дали контракт, плагин, три DSP-детектора, stage-gate отчёт | PR #77, [`DETECTOR_CALIBRATION.md`](../DETECTOR_CALIBRATION.md) |
| Stage-gate **не пройден**; val F1 лучшего DSP ≈ 55–67% на folder-labels | `calibration-latest.json` |
| Ручное прослушивание: cepstral/flux ~100% confidence почти везде | оператор |
| Folder-labels free-v1 ≠ «слышу дрон» | консилиум 2026-06-14 |
| FFT пороговый тест и Trends+шаблоны — **ценны** как калибровка и few-shot, не как замена DSP без разметки | консилиум |

---

## Продуктовое решение

| Принцип | Формулировка |
|---------|----------------|
| **Ground truth** | `label` (`drone` \| `not_drone` \| `unlabeled`) + `notes` в `Sample` (`background-media`) |
| **Кто правит system catalog** | Пользователь cabinet с **`role: admin`** (внутренняя роль в БД `background-cabinet`). На старте в БД один пользователь (`admin`) — ему достаточно этой роли для разметки free-v1 |
| **Кто правит user/buffer** | Владелец узла на **client** (без cabinet admin) |
| **notes** | Текстовый контекст сэмпла (модель, среда, дистанция) — задел под обучение и шаблоны |
| **Канон benchmark** | После VDR3 метки для `yarn benchmark:detectors` берутся из **экспортированного** `manifest.json` (поле `label` после курации), не из исходной папки |
| **Целевая метрика** | **Accuracy ≥ 80%** на `split: val` при `label ∈ {drone, not_drone}` (исключить `unlabeled` из метрик) |
| **Детекторы** | Существующие DSP + новый **template-match** (поверх `@membrana/trends-detector-service`) |
| **Инструменты mic** | `fft-threshold-test`, `trends-fft-analyzer` — **наблюдение и построение шаблонов**, не отдельный stage-gate без benchmark |

### Принято постановщиком (2026-06-14)

- Сценарий эпика VDR1–VDR6 **принят**.
- В БД кабинета сейчас один пользователь (`admin`); для разметки корпуса ему назначается **`role: admin`** (внутренняя роль в Prisma).
- Разметка free-v1: cabinet → login `admin` → tariff dataset → label + notes по каждому сэмплу.

---

## Архитектура (слои)

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Хранение | `packages/background-media` | `Sample.label`, `Sample.notes`; PATCH API |
| Клиентская библиотека | `@membrana/media-library-service` | `updateSampleMeta()`, синхронизация с сервером |
| UI client | `apps/client` `SampleLibraryModule` + плагины | Редактирование label/notes; pred vs truth в drone-analysis |
| UI cabinet | `apps/cabinet` sample-library | Админ-редактирование tariff dataset |
| Экспорт GT | `scripts/export-ground-truth-manifest.mjs` | DB/catalog → `data/detectors-benchmark/v0.2/manifest.json` |
| DSP | `packages/services/detectors/*` | Пороги после VDR5 |
| Template-match | `packages/services/detectors/template-match` (новый) | `DroneDetector` → `classifyTrends` + validated templates |
| Агрегация | `@membrana/detector-base` `analyzeSample()` | Общий путь UI + benchmark |
| Шаблоны | `trends-detector` + `userTemplatesStore` + `background-media` TrendTemplate | Шаблоны только из **validated drone** сэмплов (VDR6) |
| Benchmark | `yarn benchmark:detectors`, `yarn calibrate:detectors` | Метрики только на curated manifest |

**Запрещено:** второй `AudioContext`; логика детекции в JSX; обучение нейросетей на GPU в этом эпике.

---

## Фазы эпика (один PR ≈ одна запись реестра)

| Фаза | `id` реестра | Размер | Содержание | DoD (кратко) |
|------|--------------|--------|------------|--------------|
| **VDR1** | `vdr1-sample-label-patch-api` | M | PATCH `label` + `notes` в `background-media`; `User.role` (`admin` \| `user`) в cabinet; guard: system catalog — только admin | API + тесты; `/auth/me` отдаёт `role`; seed: `admin` → `role: admin` |
| **VDR2** | `vdr2-label-notes-ui` | L | UI: select label + textarea notes (client user/buffer; cabinet system read-write для admin) | a11y; read-only tariff для обычного user; сохранение на сервер |
| **VDR3** | `vdr3-ground-truth-export` | M | Экспорт manifest; протокол разметки; плагин drone-analysis: колонка «метка» vs вердикт | `docs/DATASET_CURATION.md`; `yarn dataset:export-ground-truth`; ≥80% записей не `unlabeled` — **ручная работа оператора** |
| **VDR4** | `vdr4-dsp-calibration-validated` | L | `yarn calibrate:detectors` на curated labels; применить лучшие пороги в фабриках детекторов / `analyzeSample` options | Отчёт val accuracy/F1; цель **≥80% accuracy** хотя бы у одного DSP |
| **VDR5** | `vdr5-template-match-detector` | L | `@membrana/template-match-detector-service`; шаблоны из validated drone; строка в плагине + benchmark | Unit-тесты; сравнение с DSP на val; документировать в `DETECTOR_BENCHMARK.md` |
| **VDR6** | `vdr6-recognition-report-gate` | M | Сводный отчёт: лучший детектор, gap до 80% и 85/90; обновить `DETECTOR_CALIBRATION.md` | LGTM Vesnin; рекомендация по следующему эпику (neural / ensemble) |

**Порядок merge:** VDR1 → VDR2 → VDR3 → (оператор размечает) → VDR4 → VDR5 → VDR6.

**Блокер VDR4:** не стартовать калибровку, пока в manifest **< 100** размеченных сэмплов (`drone` + `not_drone`) или оператор не зафиксировал sign-off в `DATASET_CURATION.md`.

---

## VDR1 — API меток (промпт для агента)

### Задачи

1. `PATCH /devices/:deviceId/samples/:sampleId` — поля `label?`, `notes?` (`background-media`).
2. Cabinet: enum `UserRole` (`admin` \| `user`), поле `User.role`; миграция; bootstrap-пользователь `admin` получает `role: admin`.
3. Guard: изменение сэмплов в **system** collection (`systemKey: tariff-dataset`) — только сессия cabinet с `role: admin` (media-bridge).
4. `@membrana/media-library-service` — `updateSampleLabelNotes(id, { label?, notes? })`.
5. `GET /v1/auth/me` — поле `role` в ответе (cabinet SPA).
6. Unit-тесты `samples.service` + auth guard.

### Out of scope VDR1

- UI (VDR2)
- Экспорт manifest (VDR3)

---

## VDR2 — UI разметки

### Задачи

1. Client: в таблице библиотеки — select `drone` / `not-drone` / `не установлено`; notes под строкой или modal.
2. Cabinet: те же поля для tariff dataset **только если** `auth.user.role === 'admin'`.
3. Сценарий оператора: login `admin` → sample-library → tariff dataset → прослушать → label + notes → сохранить.
3. Плагин `sample-library-drone-analysis`: показать `label` выбранного сэмпла рядом с вердиктами.
4. DESIGN.md: badge для label; error state при сетевом сбое.

### DoD

- [ ] Сохранение label переживает reload
- [ ] Tariff dataset read-only для non-admin на client

---

## VDR3 — Экспорт ground truth

### Задачи

1. `scripts/export-ground-truth-manifest.mjs` — merge catalog DB + bundled free-v1 → benchmark manifest `label` + `notes`.
2. [`docs/DATASET_CURATION.md`](../DATASET_CURATION.md) — протокол: критерий «дрон», шаблон `notes`, кто подписывает sign-off.
3. Чек-лист оператора на 120 сэмплов (можно итерациями по 40).

### DoD

- [ ] `yarn dataset:export-ground-truth` обновляет `data/detectors-benchmark/v0.2/manifest.json`
- [ ] Benchmark читает только curated manifest

---

## VDR4 — Калибровка DSP на validated labels

### Задачи

1. Расширить `calibrate-detectors.mjs`: метрики только где `label !== unlabeled`.
2. Применить лучшие `aggregation` + `sampleConfidenceThreshold` + detector config в коде (константы или preset).
3. Повторный прогон `yarn benchmark:detectors` на val.

### DoD

- [ ] Хотя бы один DSP: **val accuracy ≥ 80%** ИЛИ явный отчёт «не достигнуто» с gap analysis

---

## VDR5 — Template-match детектор

### Задачи

1. Новый пакет `packages/services/detectors/template-match/` — `createTemplateMatchDetector(templates)`.
2. Внутри: нарезка 5 с → `MetricSample[]` → `classifyTrends()`; `isDrone` если best match `DRONE*` и confidence ≥ threshold.
3. Шаблоны: `buildTemplateFromAnalysis` из **validated** drone-сэмплов (скрипт `yarn templates:build-from-dataset`).
4. Подключить в `analyzeSampleDetectors.ts` + benchmark row `template-match`.

### DoD

- [ ] Четвёртая строка в плагине и benchmark
- [ ] Не использовать bootstrap `DRONE` без пересборки на curated set

---

## VDR6 — Итоговый отчёт

### Задачи

1. Таблица: detector | val accuracy | val F1 | P | R | прошёл 80%?
2. Рекомендация: ensemble / YAMNet / продолжение разметки.
3. Обновить [`MAIN_DAY_ISSUE.md`](../MAIN_DAY_ISSUE.md) при закрытии.

---

## Связь с плагинами микрофона

| Плагин | Роль в эпике VDR |
|--------|------------------|
| `fft-threshold-test` | Оператор подбирает «трубу» при разметке; отчёты в журнале — **не** gate |
| `trends-fft-analyzer` | Live preview трендов; источник идей для шаблонов VDR5 |
| `trends-fft-sample-analyzer` | Offline preview на сэмпле перед «сохранить как шаблон» |

Опционально (out of scope VDR, follow-up): вынести FFT-трубу в benchmark как `observability` row без влияния на 80% gate.

---

## Out of scope эпика

- TDOA, мультиузел, ensemble-service (до отдельного LGTM)
- YAMNet / CLAP / agentic (эпик 1.B)
- Обучение с backprop на GPU
- Автоматическая разметка без человека
- Закрытие GitHub #47 (может остаться открытым для neural wave)

---

## Команды

```bash
yarn dataset:assign-splits          # уже есть: 80/40
yarn dataset:export-ground-truth      # VDR3
yarn benchmark:detectors
yarn calibrate:detectors
yarn templates:build-from-dataset     # VDR5
yarn workspace @membrana/client dev   # разметка + прослушивание
```

---

## Definition of Done эпика

- [ ] label + notes редактируются в UI (client + cabinet admin)
- [ ] Curated manifest экспортируется в benchmark
- [ ] Протокол разметки в `DATASET_CURATION.md` + sign-off оператора
- [ ] ≥80% val **accuracy** у лучшего детектора (DSP или template-match) на curated labels
- [ ] Плагин показывает pred vs truth
- [ ] VDR1–VDR6 в архиве реестра
- [ ] LGTM Vesnin

---

## Закрытие фазы

merge PR → комментарий в #47 → `yarn task:archive <id> --notes "PR #…"`.

**Закрытие эпика:** после VDR6 → `yarn task:archive validated-drone-recognition`.
