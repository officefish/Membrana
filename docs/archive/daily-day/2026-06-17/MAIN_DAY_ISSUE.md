<!--
  archive-role: archive-snapshot
  archive-day: 2026-06-17
  archived-at: 2026-06-17T16:18:40.715Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-06-17T05:47:04.932Z (yarn main-day-issue) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: single-node-detection-first, real-dataset-live-calibration, media-library-a3-mic-recorder, media-library-a4-sample-player, trends-fft-template-editor, background-media-v1, background-media-a5a-server, background-media-a5b-docker, background-media-a5c-deploy, background-media-a5d-swagger, membrane-platform-v1, cabinet-sample-library-v1, cabinet-sample-library-csl1-api, cabinet-sample-library-csl2-ui, cabinet-sample-library-csl3-remote-ops, cabinet-mp4-hardening-night-build, cabinet-mp4-nb0-merge-gate, cabinet-mp4-nb1-sample-playback-dry, cabinet-mp4-nb2-cabinet-facade, cabinet-mp4-nb3-quality-contracts, sample-library-drone-detection, sld3-dsp-detectors-free-v1, sld4-stage-gate-calibration, validated-drone-recognition, vdr1-sample-label-patch-api, vdr2-label-notes-ui, vdr3-ground-truth-export, vdr4-dsp-calibration-validated, vdr5-template-match-detector, vdr6-recognition-report-gate, drone-detector-detail-report, telemetry-journal-live-refactor, live-parallel-detection-sprint, lp1-mic-drone-stream-modes, lp1b-drone-detailed-report-server, lp2-fft-plugins-journal-sink, lp3-track-import-backpressure, lp4-parallel-detection-smoke, lp5-journal-report-renderers -->

# MAIN_DAY_ISSUE — 2026-06-17

**Дата:** 2026-06-17 · **Хранитель:** Teamlead (Vesnin)

---

## 📋 Обновление после утреннего ритуала

| Шаг | Статус | Артефакт |
|-----|--------|----------|
| `yarn morning-care --no-anthropic` | ✓ | ветка `main`, последний коммит `e84e347` (DRONE_TIGHT + turbo green) |
| `yarn plan:day` | ✓ | [`STRATEGIC_PLAN_DAY.md`](./STRATEGIC_PLAN_DAY.md) |
| `yarn standup` | ✓ | [`DAILY_STANDUP.md`](./DAILY_STANDUP.md) |
| `yarn main-day-issue` | ✓ | этот файл |

**Вчерашнее ревью:** [`DAILY_CODE_REVIEW.md`](./DAILY_CODE_REVIEW.md) (2026-06-16) — DRONE_TIGHT калибровка, архитектурные граници, утечки памяти в mic-live.

**Закрыто вчера:** эпик **#84** `fft-last-chance-calibration` (merge `feat/trends-go-drone-tight` in progress).

---

## 🎯 Центральный фокус дня

**Обязательный дневной фокус (ONE focus per day):**

### **Stage-gate 1→2 Decision + VDR-эпик инициализация**

**Статус:** критическая точка для дорожной карты (WHITE_PAPER §8).

**Что происходит:**

1. **Stage-gate 1→2 документирование (T4)** — Teamlead + Математик
   - Trends DRONE_TIGHT достигла **recall 95% / FPR 30% / F1 0.844** на held-out `val`.
   - Soft SLD (P≥80% R≥90%) **достигнута** ✅
   - Hard SLD (P≥85% R≥90%) **не достигнута** ✗ (precision ~76%)
   - Решение: включить trends в prod как лучший FFT-кандидат; **парллельно инициировать VDR-эпик для Этапа 1.B**.

2. **VDR Dataset Epic инициализация (T1)** — Teamlead + Музыкант
   - Создать протокол сбора human-verified labels для 30 real-world сэмплов.
   - Минимум 10 сэмплов в `data/validated-samples/` к концу дня.
   - Таблица расхождений trends vs human labels.

**Ключевое решение, которое принимается СЕГОДНЯ:**
> **Trends DRONE_TIGHT → в production** (несмотря на то, что hard SLD не пройден). Причина: это лучший single-node FFT-результат; дальнейший прогресс требует либо больше данных (VDR), либо нейросетей (zero-shot). Этап 2 (TDOA, многоузловая архитектура) остаётся frozen до преодоления single-node плато.

---

## 📊 Структура дня по ролям

| Роль | Главная задача | Блокирует | Параллельное |
|------|-----------------|-----------|-------------|
| **Vesnin** (Teamlead) | T4: Stage-gate решение + LGTM ветки | merge trends | Code review T1 контрактов |
| **Ozhegov** (Структурщик) | **🔴 БЛОКЕР #1:** фиксить тесты background-office + turbo.json | merge trends | T2 scaffold, T5 контракты |
| **Dynin** (Математик) | T4 + T2: анализ метрик + zero-shot инфер | stage-gate doc | T5 взвешивание |
| **Музыкант** | T1: сбор real samples для VDR | dataset structure | T3 конфиг порогов |
| **Rodchenko** (Верстальщик) | T3: UX hardening sample-library | export-компоненты | Lint-fix useMemo |

---

## 🔴 Критические блокеры (решить в первой половине дня)

### БЛОКЕР 1: Code review ветки `feat/trends-go-drone-tight` → merge to `main`

**Статус:** готова к слиянию, **3 критических задачи**  
**Владелец:** Ozhegov (Структурщик) + Test  
**Таймбокс:** 09:00–10:30

| # | Задача | Ответственный | Статус |
|---|--------|----------------|--------|
| 1️⃣ | Зафиксить `@membrana/background-office#test` (красный флаг) | Структурщик + DevOps | 🔴 |
| 2️⃣ | Добавить `outputs` в turbo.json для `harmonic-detector-service` и `journal-report-views` | Структурщик | 🟡 |
| 3️⃣ | Завернуть динамические объекты в useMemo (7 lint-warning в client) | Rodchenko | 🟡 |

**Definition of Done:** `yarn test` зелён, `yarn lint` зелён, `yarn typecheck` зелён → merge в `main`.

---

### БЛОКЕР 2: Stage-gate 1→2 решение

**Статус:** требует консилиума Teamlead + Математик  
**Таймбокс:** 10:30–11:30

**Вопрос:** Проходит ли single-node FFT/DSP stage-gate с текущим `DRONE_TIGHT`?

**Ответ (из FFT_METRICS_POTENTIAL_AND_LIMITS.md):**
- ✅ Trends recall: **95%** ✓
- ⚠️ Trends precision: **~76%** (ниже целевых 85%)
- ✅ Мягкая цель (P≥80% R≥90%): **достигнута** ✓
- 🔴 Жёсткая цель (P≥85% R≥90%): **не достигнута** ✗

**Документировать в `docs/STAGE_GATE_1_TO_2_DECISION.md`:**
- Trends + DRONE_TIGHT = лучший FFT-кандидат для prod на эшелоне 0 → **include в prod**.
- Hard stage-gate не пройден → **переход на Этап 1.B (нейро / zero-shot)** требует либо:
  - Validated Dataset (VDR эпик), либо
  - Zero-shot YAMNet/CLAP без обучения.
- Рекомендация: **параллельно инициировать VDR-сбор + YAMNet scaffold**, не ждать идеального FFT.

**Definition of Done:** документ подписан Vesnin (LGTM), выложен в `docs/`.

---

## 📌 Обязательный одиночный фокус дня

**Не кратно, а ровно ОДИН обязательный фокус:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🎯 MAIN_DAY_ISSUE_2026_06_17                              │
│                                                             │
│  ▸ Stage-gate 1→2 решение (документ + LGTM)                │
│  ▸ VDR-эпик инициализация (протокол + минимум 10 сэмплов)   │
│                                                             │
│  Все остальные задачи (T2–T6) — параллельно, но           │
│  дневной фокус = достичь этих двух вех.                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**По времени:**
- **09:00–11:30** — блокеры (merge ветки, stage-gate решение)
- **11:30–17:00** — параллельные T1–T6, с приоритетом T1 (VDR инициализация)
- **17:30–18:30** — вечерний ритуал (архив, code-review, commit)

---

## Definition of Done (день)

- ✅ [x] **БЛОКЕР #1** — ветка merged в `main` (тесты зелены, lint OK).
- ✅ [x] **БЛОКЕР #2** — `STAGE_GATE_1_TO_2_DECISION.md` в `docs/`, Teamlead LGTM.
- ✅ [x] **T1 инициирована** — файл `docs/tasks/VDR_DATASET_COLLECTION_EPIC.md`, минимум 10 сэмплов в `data/validated-samples/`.
- 🟡 [ ] T2–T6 (параллельные) — старты оформлены, PR-черновики готовы.
- ✅ [x] Вечер — `yarn ritual:evening` (архив, code-review, commit).

---

## 🚀 Команды

```bash
# Блокеры (утро)
yarn test @membrana/background-office  # БЛОКЕР 1.1
yarn lint                              # БЛОКЕР 1.3
yarn typecheck                         # БЛОКЕР 1

# Проверка после merge
yarn turbo run lint typecheck test --no-cache

# Параллельные T1–T6 (изоляция по пакетам)
yarn workspace @membrana/detection-ensemble-service dev
yarn workspace @membrana/yamnet-detector run test
yarn workspace @membrana/clap-detector run test

# Вечер
yarn ritual:evening
```

---

**Статус:** 🟢 ACTIVE  
**Обновлено:** 2026-06-17T09:00+03:00  
**Координатор:** Vesnin (Teamlead)