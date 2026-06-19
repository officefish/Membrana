<!--
  archive-role: archive-snapshot
  archive-day: 2026-06-16
  archived-at: 2026-06-16T18:07:04.583Z
  source: docs/DAILY_STANDUP.md
  canonical: docs/DAILY_STANDUP.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-06-16T08:02:47.394Z (yarn standup) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, GitHub Issues (25), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->

# Ежедневный стендап виртуальной команды — 2026-06-16

## Резюме дня

**Фокус:** Завершить Этап 1.A (single-node detection) — довести три DSP-детектора (harmonic, cepstral, spectral-flux) до пригодного для бенчмарка состояния и запустить unified benchmark всех трёх. **Главный риск:** текущие детекторы недостаточно качественны (F1 ~50–71%, требуется ≥85% precision / ≥90% recall для stage-gate 1→2) — день должен выявить корень проблемы (feature engineering? недостаточно данных? нужны нейросети?). **Критерий успеха к вечеру:** все три детектора собираются без ошибок, запущен benchmark, протокол консилиума по gate-результатам зафиксирован в `docs/seanses/`.

---

## Входные артефакты

| Источник | Актуальность | Что берём сегодня |
|----------|--------------|-------------------|
| `STRATEGIC_PLAN_DAY.md` | 2026-06-16 08:01 | **Задачи 1–5 приоритет** (довести 1.A, benchmark, рефакторинг grafа, live-pipeline, консилиум) |
| `DAILY_CODE_REVIEW.md` | 2026-06-15 18:53 | Чеклисты для merge: циклические зависимости, edge-case тесты детекторов, a11y в UI, latency budget |
| GitHub Issues (#79, #78, #59, #58, #57) | active | TJ5 (live-journal UI), DDR3 (отчёты), background-media deploy — **вне скоупа дня, параллельный трек** |
| GitHub Issues (#49, #46, #37–#35) | низкий приоритет | Консилиум микрофона, cleanup, index — **отложить** |
| packages/temp | отсутствует | — |

**Вывод:** Сегодня **одна магистраль — Этап 1.A**: фокусируемся на качестве DSP, остальное (TJ, DDR, deploy) идёт параллельно без блокировки. Если в 17:00 benchmark показал gate-failure → консилиум по улучшениям; если pass → переходим на 1.B.

---

## Порядок работы

**Цепочка исполнения:**
1. **Teamlead** (Vesnin) — формулирует стратегические границы и приоритет Issues.
2. **Структурщик** (Ozhegov) — проверяет граф зависимостей, интегрирует детекторы в live-pipeline; подтверждает отсутствие циклов.
3. **Математик** (Dynin) — реализует/доделывает harmonic и cepstral алгоритмы, пишет edge-case тесты, готовит чистые функции для benchmark'а.
4. **Музыкант** (Boyarskiy) — следит за качеством audio-потока в live-pipeline (sample rate, буфер, задержка), интегрирует результаты детекторов в UI.
5. **Верстальщик** (Rodchenko) — обновляет `mic-live-drone-analysis` UI (toggle'ы для трёх детекторов), убеждается в соответствии DESIGN.md.
6. **Teamlead** (LGTM) — принимает benchmark-результаты, модерирует консилиум по stage-gate.

**Параллельные треки:**
- **TJ + DDR эпики** (Issues #79, #78): Музыкант + Верстальщик независимо (не блокируют 1.A gate).
- **background-media A5c deploy** (Issue #59): Структурщик + DevOps (если есть) параллельно.

---

## [Teamlead — Vesnin]

### Стратегический фокус

Сегодня — **критическая точка** на пути к Этапу 2. WHITE_PAPER §8 требует, чтобы Этап 1.A (три независимых DSP-детектора на одном узле) прошёл stage-gate 1→2: **precision ≥ 85%, recall ≥ 90%**. На вчера лучший детектор (cepstral) показал F1 ~50%, ensemble (template-match) — 71.4%. **Это ниже целевого.** Задача дня — честный бенчмарк и принятие решения:
- **Если gate не пройден** → список конкретных улучшений (feature engineering, новые признаки, больше данных) и сроки повтора.
- **Если gate пройден** → запуск эпиков Этапа 1.B (YAMNet, CLAP, agentic детекторы).

### Что СОЗНАТЕЛЬНО НЕ делаем сегодня

- ❌ **Этап 2 (TDOA, мультилатерация)**: заморожен до результата gate; `localizer-service`, `tracker-service` — не трогаем.
- ❌ **Масштабирование на десятки узлов**: ориентируемся на 1–4 узла; распределённые системы — после gate.
- ❌ **RF-приёмник и доп. модальности**: сначала акустика должна работать.
- ❌ **Fine-tuning нейросетей (1.B)**: не начинаем, пока 1.A не пройдёт gate.

### Приоритизация GitHub Issues (дневной скоуп)

| Issue | Статус | Скоуп дня | Причина |
|-------|--------|----------|---------|
| #79 TJ5 live-journal UI | active | 🟡 параллельно | Не блокирует gate; идёт в параллельном треке с Музыкантом + Верстальщиком |
| #78 DDR3 детальный отчёт | active | 🟡 параллельно | Не блокирует gate; готов по #79 |
| #59 background-media A5c deploy | active | 🟡 параллельно | Инфра-задача; может идти в параллели |
| #58 background-media v1 | active | 🟡 параллельно | Завязана на A5c; не приоритет сегодня |
| #57 trends-fft template editor | active | 🔴 отложить | Вне скоупа; низкий приоритет |
| #54 MCP rollout acceptance | active | 🔴 отложить | CI/infra; не приоритет сегодня |
| #49 MicrophoneCapturePanel консилиум | active | 🔴 отложить | Отложен до стабилизации 1.A |
| #46 test linear sync | closed/skip | — | Тестовый issue; закрыть |
| #37 code-review index | reference | — | Справочный документ |
| #36 code-review discrepancies | info | 🟡 прочитать | Обратная связь для скрипта `yarn code-review` |
| #35, #34, #33, #32, #31, #30 | imperfection | 🟡 параллельно | Мелкие фиксы (a11y, docs, edge-case тесты) — не блокируют |
| #29, #28, #27, #26, #25 | imperfection | 🟡 параллельно | Инфра и тесты — параллельные треки |
| #12, #11, #10 | imperfection | 🟡 параллельно | Unit-тесты и CI — добавить в день, если есть время |

**Итог:** Сегодня **главная магистраль** — Задачи 1–5 из STRATEGIC_PLAN_DAY. Issues #79, #78, #59 идут параллельно, но не блокируют. Issue #36 надо прочитать и учесть для завтрашнего code-review.

---

## [Структурщик — Ozhegov]

### Завершить Этап 1.A: граф зависимостей и интеграция

**Задача 3 (STRATEGIC_PLAN_DAY):** Исправить граф зависимостей — `mic-live-drone-analysis` отделить от `template-match`.

**Проблема:** На вчера плагин `mic-live-drone-analysis` импортирует другие analyzer'ы (template-match и др.) напрямую, нарушая правило: analyzer'ы должны быть независимы. Контакт с шиной hub должен быть через контракт, а не через импорт.

**План на сегодня:**
1. Рефакторить `mic-live-drone-analysis` как простой **плагин-слушатель**:
   - Подписывается на `microphoneStreamHub` (входящий сигнал).
   - Для каждого активного детектора вызывает `analyzeSample()` через сервис-фасад `@membrana/drone-detector-service`.
   - Не импортирует другие analyzer'ы напрямую.

2. Проверить **Задачу 4** (live-pipeline с трёмя DSP-детекторами):
   - Плагин UI имеет toggle'ы для harmonic, cepstral, spectral-flux, template-match.
   - Динамическая регистрация/отписка детектора в pipeline.
   - Каждый детектор отдаёт результат в единый consumer (например, `useLiveDetectionResults` хук).

3. Запустить **Задачу 2** (unified benchmark):
   - Скрипт `scripts/benchmark-detectors.mjs` ротирует по всем трём детекторам + ensemble.
   - Выход: JSON в `data/detectors-benchmark/v0.2/reports/dsp-trio-<date>.json`.
   - Таблица F1, precision, recall в `DETECTOR_BENCHMARK.md`.

### Checklist слабой связанности

- [ ] `yarn lint:deps` — 0 ошибок на циклические зависимости.
- [ ] `packages/services/detectors/` — каждый детектор зависит только от `@membrana/core`, `detector-base`, `audio-engine-service`.
- [ ] Нет импортов между `harmonic`, `cepstral`, `spectral-flux`, `template-match`.
- [ ] `mic-live-drone-analysis` плагин не импортирует ни один из detector'ов — только `@membrana/drone-detector-service` (фасад).
- [ ] Документирована цепь вызовов: hub → плагин → фасад → детектор в `ARCHITECTURE.md §Layers`.

---

## [Математик — Dynin]

### Задача 1: Завершить Этап 1.A (harmonic, cepstral, spectral-flux)

**Текущее состояние:**
- ✅ `harmonic-detector-service` — существует, но не интегрирован в benchmark.
- 🟡 `cepstral-detector-service` — scaffold, нужна полная реализация.
- 🟡 `spectral-flux-detector-service` — scaffold.

**План на сегодня:**

1. **`cepstral-detector`:**
   - Реализовать чистую функцию `analyzeCepstral(samples: Float32Array, sampleRate: number): DetectionResult`:
     - Вход: буфер сэмплов (например, 2048 сэмплов при 48 kHz = 42 мс).
     - Процесс: FFT → логарифм спектра → IFFT (cepstral) → поиск пиков → классификация.
     - Выход: `{frequency, confidence, features: {cepstralPeak, periodicity}}`.
   - Защитные edge cases: пустой буфер → `{frequency: null, confidence: 0}`; NaN/Infinity → `return {frequency: null, confidence: 0}`.

2. **`spectral-flux-detector`:**
   - Реализовать `analyzeSpectralFlux(currentSpectrum: Float32Array, prevSpectrum: Float32Array): DetectionResult`:
     - Входы: текущий и предыдущий спектры (от FFT).
     - Процесс: дельта между спектрами (L2-норма изменения) → сравнение с threshold.
     - Выход: `{frequency: estimatedFreq, confidence: fluxNorm, features: {fluxEnergy}}`.

3. **`harmonic-detector` доделать:**
   - Убедиться, что экспортирует тот же `DroneDetector` интерфейс (сигнатура `analyzeSample`).
   - Добавить edge-case тесты в `harmonic.spec.ts`.

4. **Unit-тесты:**
   - Для каждого детектора: тест на пустой буфер, constant signal, simple sine, шум, clipping.
   - Тесты на граничные случаи размера буфера.
   - Все тесты deterministic, без браузерных API.

5. **Контракт данных:**
   - Убедиться, что все три детектора экспортируют одинаковый формат результата:
   ```typescript
   interface DetectionResult {
     frequency: number | null;
     confidence: number;  // [0, 1]
     features?: Record<string, number>;  // дополнительные метрики
   }
   ```

### Checklist для Математика

- [ ] `harmonic`, `cepstral`, `spectral-flux` сервисы содержат только чистые функции (no React, no Web Audio, no I/O).
- [ ] `*.spec.ts` файлы покрывают edge cases (пустой буфер, DC смещение, Nyquist, малый размер).
- [ ] `yarn test --filter='@membrana/harmonic*' --filter='@membrana/cepstral*' --filter='@membrana/spectral-flux*'` — ✅ зелёные.
- [ ] Функции готовы к `benchmark-detectors.mjs` без модификаций.

---

## [Музыкант — Boyarskiy]

### Интеграция в live-pipeline и качество audio-потока

**Задача 4 (из STRATEGIC_PLAN_DAY):** Интегрировать harmonic + cepstral в live-pipeline параллельно с Task 1.

**План на сегодня:**

1. **Обновить `useMicLiveDroneAnalysis` хук:**
   - Добавить настройку: какие детекторы активны (harmonic, cepstral, spectral-flux, template-match).
   - Для каждого активного детектора: подписаться на окна audio-потока (например, 2048 сэмплов каждые 10 мс).
   - Вызвать `analyzeSample()` для каждого и собрать результаты.

2. **Проверить latency budget:**
   - От момента захвата микрофона (`microphoneStreamHub`) до первого результата анализа — должно быть ≤ 100 мс.
   - Если детекторы работают параллельно (не последовательно) — использовать `Promise.all()`.
   - Логирование: каждый детектор измеряет свою обработку; Верстальщик покажет в UI.

3. **Audio-format:**
   - Убедиться, что sample rate = 48 kHz (по DESIGN.md).
   - Buffer size для анализа: обычно 2048–4096 сэмплов (43–85 мс при 48 kHz); согласовать с Математиком.
   - Защита от клиппинга: если входящий сигнал > 1.0 → логировать warning в telemetry-journal.

4. **Интеграция с `mic-live-drone-analysis` плагином:**
   - Плагин должен вызывать хук `useMicLiveDroneAnalysis` с конфигом активных детекторов.
   - Результаты направить в фильтр/визуализацию (Верстальщик).

### Checklist для Музыканта

- [ ] `useMicLiveDroneAnalysis` хук принимает `{harmonic: bool, cepstral: bool, spectral_flux: bool, template_match: bool}`.
- [ ] Latency p95 < 100 мс (профайлирование в DevTools).
- [ ] Нет разрывов между audio-окнами (плавный фид).
- [ ] Smoketest: 10 секунд записи без клиппинга и артефактов.

---

## [Верстальщик — Rodchenko]

### UI live-pipeline с toggle'ами для трёх детекторов

**Задача 4 (UI часть):** Обновить `mic-live-drone-analysis` плагин UI для управления детекторами.

**План на сегодня:**

1. **Добавить toggle'ы:**
   - Чекбоксы для каждого детектора: "Harmonic", "Cepstral", "Spectral-Flux", "Template-Match".
   - Сохранение выбора в persist (localStorage).
   - Визуальная обратная связь: активный детектор — badge "ON", неактивный — "OFF".

2. **Отображение результатов:**
   - Каждый детектор получает **отдельную карту/строку** с:
     - Именем детектора + иконкой (цвет по типу).
     - Обнаруженной частотой (Hz) + доверием ([0, 1]).
     - Ключевые признаки (из `features` в `DetectionResult`).
     - Время обработки (latency).
   - Карты обновляются в реальном времени.

3. **Соответствие DESIGN.md:**
   - Цвета по палитре дизайна (не выдумывать).
   - Шрифты: заголовок sans-serif, метрики mono-space.
   - Spacing и адаптив согласно гайду.
   - ARIA-разметка: `role="region"`, `aria-live="polite"`, `aria-label="Детектор Harmonic"`.

4. **Вне скоупа (но на будущее):**
   - График истории обнаружений за последние 30 сек.
   - Экспорт результатов в JSON (идёт как отдельная задача DDR).

### Checklist для Верстальщика

- [ ] Компоненты `HarmonicToggle`, `CepstralToggle`, `SpectralFluxToggle` в UI-библиотеке.
- [ ] Карты результатов отдельные для каждого детектора (no mixing).
- [ ] ARIA-разметка: все интерактивные элементы имеют `aria-label`.
- [ ] Responsive дизайн (мобиль: одна карта в полшириины; desktop: все в ряд или сетка).
- [ ] Тёмная тема (если есть в DESIGN.md) тестирована.
- [ ] Стобтест в Storybook (опционально, но полезно).

---

## План на сегодня

| Блок | Размер | Задача | DoD | Issues |
|------|--------|--------|-----|--------|
| **1. DSP-детекторы завершены** | M | Довести harmonic, cepstral, spectral-flux до рабочего состояния (Математик) | `yarn test --filter='@membrana/harmonic*' --filter='@membrana/cepstral*'` ✅; все 3 собираются без ошибок | — |
| **2. Unified benchmark запущен** | S | Запустить `scripts/benchmark-detectors.mjs` на validated dataset (Структурщик + Математик) | JSON в `data/detectors-benchmark/v0.2/reports/dsp-trio-<date>.json`; таблица в `DETECTOR_BENCHMARK.md` с F1/precision/recall | — |
| **3. Граф зависимостей исправлен** | M | Рефакторить `mic-live-drone-analysis` плагин (Структурщик) | `yarn lint:deps` → 0 ошибок; плагин не импортирует детекторы напрямую | — |
| **4. Live-pipeline интегрирован** | M | Интегрировать harmonic + cepstral + spectral-flux в live-pipeline (Музыкант + Верстальщик) | `useMicLiveDroneAnalysis` хук работает с toggle'ами; latency p95 < 100 мс; UI обновляется в реальном времени | — |
| **5. Консилиум stage-gate 1→2** | S | Модерировать обсуждение результатов бенчмарка и принять решение (Teamlead + Музыкант) | Протокол в `docs/seanses/stage-gate-1-2-consilium-2026-06-16.md`; решение зафиксировано (gate pass/fail + next steps) | — |
| **6. Time sync strategy (подготовка к Этапу 2)** | M | Подготовить документ `TIME_SYNC_STRATEGY.md` с вариантами (GPS-PPS, NTP, PTP) (Структурщик + Математик) | Document в `docs/`; выбран рекомендуемый вариант с обоснованием; scaffold сервиса (если нужен) | — |

---

## Матрица Issues ↔ задачи дня

| Задача дня | GitHub Issues | Статус |
|-----------|---------------|--------|
| Task 1 — DSP-детекторы | #10 (unit-тесты math), #32 (edge cases), #34 (FFT docs) | 🟡 параллельно |
| Task 2 — Benchmark | #10, #32 | 🟡 параллельно |
| Task 3 — Граф зависимостей | #30 (audit mic imports), #24 (lint boundaries) | 🟡 параллельно |
| Task 4 — Live-pipeline | #11, #33 (a11y), #27 (graceful degradation) | 🟡 параллельно |
| Task 5 — Консилиум | #28, #29 (CI тесты) | 🟡 сведомление |
| Task 6 — Time sync | — | 🟡 документация |
| TJ5 (live-journal UI) | #79 | 🟡 параллельный трек |
| DDR3 (отчёты) | #78 | 🟡 параллельный трек |
| background-media A5c deploy | #59 | 🟡 параллельный трек |

**Вывод:** Issues #10, #32, #34 (тесты и docs) идут as-is параллельно; новые issues по stage-gate результатам создадим при необходимости в 17:00.

---

## Итоговый артефакт

**Файлы/пакеты, ожидаемые в конце дня:**

1. **`packages/services/detectors/harmonic/`** — обновлен, все тесты ✅.
2. **`packages/services/detectors/cepstral/`** — реализован, тесты edge cases ✅.
3. **`packages/services/detectors/spectral-flux/`** — реализован, тесты edge cases ✅.
4. **`data/detectors-benchmark/v0.2/reports/dsp-trio-2026-06-16T*.json`** — бенчмарк результаты.
5. **`docs/DETECTOR_BENCHMARK.md`** — обновлен с таблицей F1/precision/recall.
6. **`apps/client/src/plugins/mic-live-drone-analysis/`** — рефакторен; UI с toggle'ами, результаты карточек.
7. **`docs/seanses/stage-gate-1-2-consilium-2026-06-16.md`** — протокол консилиума.
8. **`docs/TIME_SYNC_STRATEGY.md`** — новый документ (опционально, если есть время).
9. **Параллельно:** `docs/DAILY_STANDUP.md` (этот файл), обновлён `STRATEGIC_PLAN_DAY.md`.

---

## Definition of Done (день)

- [ ] Все три DSP-детектора (`harmonic`, `cepstral`, `spectral-flux`) собираются без ошибок (`yarn build`).
- [ ] Unit-тесты всех трёх детекторов пройдены (`yarn test` ✅); edge cases покрыты.
- [ ] Unified benchmark запущен и завершен; JSON отчёт в `data/detectors-benchmark/v0.2/reports/`.
- [ ] Таблица F1/precision/recall обновлена в `DETECTOR_BENCHMARK.md`.
- [ ] `yarn lint:deps` — 0 ошибок на циклические зависимости; `mic-live-drone-analysis` плагин не импортирует детекторы напрямую.
- [ ] Live-pipeline UI обновлен: toggle'ы для трёх DSP-детекторов + template-match; результаты видны в карточках; latency p95 < 100 мс.
- [ ] Протокол консилиума stage-gate 1→2 зафиксирован в `docs/seanses/`; решение принято (gate pass/fail + concrete next steps).
- [ ] Если gate не пройден: список конкретных улучшений (feature engineering, dataset expansion) + приблизительный срок повтора (S/M/L задача).

---

## Риски

1. **Stage-gate не пройден** — вероятность ~70% (текущие лучшие детекторы F1 ~50–71%, нужно 85/90). **Действие:** консилиум в 16:00, обсуждение конкретных путей (нужны ли нейросети уже на 1.B? какие признаки добавить? сколько данных?). **Срезание:** если debate затянется — перенести fine-гейт в вечернее ревью.

2. **Latency live-pipeline > 100 мс** — если все три детектора вызываются **последовательно** вместо параллельных, задержка может вырасти. **Действие:** профайлирование в DevTools; возможно, параллелизм через `Promise.all()` или web workers. **Срезание:** если не вмещаемся в budgetе — toggle'ы to disable heavy детекторы.

3. **Тесты детекторов падают на edge cases** — if cepstral/spectral-flux имеют баги на граничных входах (пустой буфер, NaN), это выявится в unit-тестах. **Действие:** фиксить на лету; Математик приоритизирует. **Срезание:** if критичные баги — отложить детектор на 1.B (начать с harmonic + template-match).

4. **Рефакторинг grafа (Task 3) затянулся** — если плагин всё ещё имеет циклические зависимости после рефакторинга, merge заблокирован. **Действие:** Структурщик начинает рано; может потребоваться доп. abstraction слоя (фасад-сервис). **Срезание:** if время кончается — merge в отдельной PR после консилиума (не блокирует benchmark).

---

**Статус:** Готовы к запуску. Дневной цикл: 09:00–17:00 работа, 17:00 консилиум по gate-результатам, 18:00 архивирование дня в `docs/archive/daily-day/2026-06-16/`.