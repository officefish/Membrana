<!--
  archive-role: archive-snapshot
  archive-day: 2026-07-02
  archived-at: 2026-07-02T19:08:31.317Z
  source: docs/STRATEGIC_PLAN_DAY.md
  canonical: docs/STRATEGIC_PLAN_DAY.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-07-02T04:06:30.971Z (yarn plan:day) -->
<!-- Период: последние сутки (since="1 day ago"); горизонт: следующий день -->
<!-- Источник цели: WHITE_PAPER.md -->

# План на следующий день

## 1. Что сделано за период (последние сутки)

### Крупные артефакты

- **Завершение free-v1 S2 (fv1-s2-closeout, #223):** реестр синхронизирован, эпик архивирован, stale-worktree очищены. Натуральный dataset с 148 WAV-файлами (birds, gunshot, machine-hum, silence, speech, wind) загружен в `docs/datasets/free-v1/`.
- **Мультиклассовый роутинг в trends-detector (fv1-s3, #222, LGTM):** SoundClass union внедрен; drone-first calibration прошёл stage-gate (recall 90%, FPR 6.9% < 15%). Trends-шаблоны (`DRONE_TIGHT`, конкуренты BIRDS/GUNSHOT/MACHINE_HUM/WIND) подключены в runtime.
- **Research-Tree демонстратор (RT, #220, вторая половина спринта):** полный интерактивный граф знаний с playhead (genesis 2026-05-12 ↔ now 2026-07-01), time-travel по transitions[], git-анализатор `yarn rt:day-report` с генерацией DAY_GIT_FLOW.md для каждой даты.
- **Инструментарий:** BOM-гард (scripts/check-package-json-bom.mjs), headroom proxy (+HTTPS_PROXY для geo-restricted сред), shared spawn-claude helper, prop-types hoisting fix.

### Статус доказательной базы

- **Детектор:** Trends FFT (DRONE_TIGHT) с конкурентами достигает **recall 95% / FPR 30% / F1 0.844** на held-out val (эпик #84, зафиксировано в `FFT_METRICS_POTENTIAL_AND_LIMITS.md`).
- **Stage-gate 1→2:** пройден на drone-first calibration в мультиклассовом сценарии. DSP-детекторы (harmonic/cepstral/spectral-flux) задокументированы как **диагностические индикаторы**, не как основной путь.
- **Датасет:** free-v1 натуральный, размеченный вручную, 148 сэмплов, метрики в `QUALITY_REPORT.md` и `STAGE_GATE_REPORT.md`.

---

## 2. Стратегический контекст (WHITE_PAPER)

### Текущий этап в дорожной карте

Проект находится в **транзите Этап 1 → Этап 2:**
- **Этап 1 (Single-Node Detection)** завершён на FFT-уровне: trends `DRONE_TIGHT` пробивает stage-gate recall/FPR.
- **Этап 2 (пара узлов, TDOA, азимут)** заморожен согласно WHITE_PAPER §8, пока stage-gate 1→2 не пройден. Gate **пройден** 2026-07-01 (drone-first в мультиклассе).
- **Ближайшие 48 ч:** разблокировка Этапа 2 и планирование TDOA/локализации.

### Стратегические приоритеты (по WHITE_PAPER)

1. **Разделение модальностей на контрактах** (§6): FFT, RF (будущее), видео (будущее) — через единый интерфейс `AcousticObservation` / `Track`.
2. **Слияние данных в центре (fusion):** локализация, трекинг, классификация — **пока на льду** (Stage 2).
3. **Минимальные узлы, умная сеть:** текущее состояние — один узел (микрофон + FFT), next — два узла (TDOA).
4. **Контракт наблюдений стабилен:** `AcousticObservation`, `Track` в `@membrana/core` — фундамент для будущих аналайзеров.

---

## 3. Архитектурные ограничения (ARCHITECTURE.md, SERVICES.md)

### Обязательные границы

- **Foundation-сервисы** (`audio-engine`, (будущее) `io-engine`): имеют право на Web Audio API, MediaStream, file I/O.
- **Analyzer-сервисы** (FFT, trends, детекторы, future: нейро, LLM): зависят от foundation, **не** друг от друга.
- **Семейства детекторов** в `packages/services/detectors/*`: каждый — независимый пакет с контрактом `DroneDetector` из `detector-base`.
- **Новый сервис = собственный `package.json`, `vite.config.ts`, `src/index.ts`.**

### Текущее состояние сервисов

| Сервис | Статус | Зависимости |
|--------|--------|-------------|
| `@membrana/audio-engine-service` | stable v0.1 | core |
| `@membrana/fft-analyzer-service` | stable v0.1 | core, audio-engine |
| `@membrana/detector-base` | stable v0.1 | core |
| `@membrana/harmonic-detector-service` | implemented v0.1 | core, detector-base |
| `@membrana/trends-detector-service` | production v0.3 (drone-tight) | core, detector-base |
| `@membrana/template-match-detector-service` | implemented v0.1 | core, detector-base, trends-detector |
| `@membrana/cepstral-detector-service` | scaffold | (impl. pending) |
| `@membrana/spectral-flux-detector-service` | scaffold | (impl. pending) |

---

## 4. Приоритеты детекции на СЕЙЧАС

### Фиксированные вердикты (не пересматривать без нового датасета)

Согласно `FFT_METRICS_POTENTIAL_AND_LIMITS.md` и консилиумам:

- ✅ **Trends FFT (DRONE_TIGHT) + конкуренты:** recall 95% / FPR 30% → **го для production**.
- ❌ **DSP-трёхфонарик (harmonic OR cepstral OR spectral-flux):** recall ~100% / FPR ~100% → **no-go как детектор** (сигнализатор присутствия, не селектор).
- ⚠️ **Пороговый FFT-тест:** recall 75–85% / FPR 40–70% → диагностика и обучение, не решающий голос.

### Чего НЕ делать завтра

- ~~Повторный тюнинг harmonic/cepstral/spectral-flux порогов на free-v1~~ (физический потолок доказан).
- ~~«Unified benchmark трёх DSP» для stage-gate~~ (gate уже пройден trends-ом).
- ~~«Дальнейший рост качества на чистом FFT»~~ (потолок зафиксирован).

### Чего ДА делать завтра

1. **Разблокировка Этапа 2:** инициализация TDOA-сервиса + документ по синхронизации времени узлов.
2. **Продакшн-путь trends:** убедиться, что `DRONE_TIGHT` встроен в `droneTightCalibration.ts` и используется в device-board runtime.
3. **Валидированный датасет (VDR):** пилот на 20–30 сэмплах, Cohen's Kappa для межблюдателя, затем CLAP-инференс (эшелон 2, zero-shot).
4. **Коммуникация:** документальное закрытие Этапа 1 в WHITE_PAPER (обновить §8).

---

## 5. Открытые нити и неясности

### По коммитам и документам

1. **VDR-эпик (Validated Dataset)** упоминается в `team-evening-feedback-2026-07-01` как магистраль, но **нет явного task-промпта**. Нужно уточнить:
   - Какие 20–30 сэмплов; откуда их взять (добавить в free-v1 или новый источник)?
   - Кто разметит (консилиум-решение)?
   - Cohen's Kappa — порог приемлемости?

2. **CLAP/YAMNet и эшелон 2** упоминаются в `INTEGRATIONS_STRATEGY.md` (не предоставлен в контексте), но нет явного плана. Нужно:
   - Прочитать `INTEGRATIONS_STRATEGY.md` полностью.
   - Уточнить, когда начинать эшелон 2 (сразу после Этапа 1 закрытия или после разблокировки TDOA?).

3. **Stage-gate 1→2 пройден в мультиклассовом сценарии** (drone-first), но полная валидация по исходному SLD (P≥85% / R≥90%) — не достигнута:
   - Trends precision на val ≈ 0.76 (ниже 85%).
   - Нужно ли пересчитать gate или пересмотреть SLD-критерий?

4. **Файловая структура свежего натурального датасета** (148 WAV-файлов в docs/datasets/free-v1/) — как интегрировать с библиотекой сэмплов и background-media?
   - Синхронизация с `background-media` сервером (Prisma schema, хранилище)?
   - Или это просто reference-набор для разработки?

5. **Research-Tree демонстратор** (apps/demos/Research-Tree/) — это продакшн-компонент или dev-инструмент? На какой день планировать дальнейшее развитие?

---

## 6. Рекомендуемый план на следующий день

### Утро (разведка + стратегия)

1. **Прочитать:**
   - `docs/INTEGRATIONS_STRATEGY.md` полностью (уточнить zero-shot-путь эшелона 2).
   - `docs/datasets/free-v1/STAGE_GATE_REPORT.json` (метрики, precision точная).
   - Протокол консилиума (если есть) по VDR-пилоту.

2. **Консилиум (30 мин):**
   - Закрытие Этапа 1 в WHITE_PAPER: что обновить в §8?
   - VDR-пилот: scope, таймлайн, ответственные.
   - Stage-gate 1→2 заново: precision 0.76 vs. критерий 85% — пересмотреть или принять как soft-gate?

### День (основная работа)

#### Вектор A: Разблокировка Этап 2 (TDOA prep)

- [ ] Инициализировать `@membrana/tdoa-service` (scaffold):
  - `packages/services/tdoa/package.json`, `vite.config.ts`, `src/index.ts`.
  - Контракт: `TdoaInput` (два узла + `AcousticObservation[]`), `TdoaResult` (разница времён, confidence).
  - Зависимости: `@membrana/core` (типы), внешний npm: `numeric` или similar для корреляции.
- [ ] Документ `docs/prompts/TDOA_SERVICE_SPECIFICATION.md`:
  - Алгоритм: GCC-PHAT на стеке наблюдений.
  - Синхронизация времени: GPS-PPS vs. NTP, требования к джиттеру.
  - Тесты: mock-наблюдения с известными задержками.

#### Вектор B: Продакшн-путь trends (если необходимо уточнение)

- [ ] Верифицировать, что `droneTightCalibration.ts` в `apps/client` использует `DRONE_TIGHT`-шаблон из trends-detector.
- [ ] Smoke-тест: включить trends-fft в device-board runtime, проверить, что journalEntry содержит класс дрона.
- [ ] Обновить `DETECTOR_BENCHMARK.md` с финальными метриками drone-tight (precision, recall, F1 на held-out val).

#### Вектор C: VDR-пилот (если консилиум дал зелёный свет)

- [ ] Scope: 20–30 новых натуральных сэмплов или выборка из free-v1?
- [ ] Разметка: кто, когда, Cohen's Kappa > 0.6?
- [ ] CLAP-инференс: написать scaffold `evaluate-clap-on-vdr.mjs` с webhook/API для результатов.

### Вечер (документация + закрытие)

- [ ] Обновить WHITE_PAPER §8: Этап 1 завершён, gate-пройден, Этап 2 разблокирован (дата).
- [ ] Закрыть / архивировать `fv1-s2-closeout` и смежные tasks в registry.json.
- [ ] Записать консилиум + открытых нитей в `docs/seanses/plan-next-day-2026-07-02.md`.

---

## 7. Ключевые файлы для консультации

| Документ | Назначение |
|----------|-----------|
| `docs/WHITE_PAPER.md` | Стратегия Membrana (§8 дорожная карта). |
| `docs/ARCHITECTURE.md` | Границы пакетов и граф зависимостей. |
| `docs/SERVICES.md` | Соглашения о сервисах (foundation vs. analyzer). |
| `docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md` | Потолок FFT-детекции (**обязателен перед любой задачей по DSP**). |
| `docs/datasets/free-v1/STAGE_GATE_REPORT.md` | Метрики drone-tight (recall/FPR/precision). |
| `docs/INTEGRATIONS_STRATEGY.md` | Zero-shot эшелон 2 (CLAP, YAMNet, LLM-reasoning). |
| `packages/services/trends-detector/src/data/free-v1-templates.ts` | DRONE_TIGHT и конкуренты (production-шаблоны). |
| `apps/client/src/lib/droneTightCalibration.ts` | Integration trends-gate в client runtime. |

---

## 8. Риски и зависимости

### Внешние зависимости

- **Консилиум по VDR:** не может начать пилот без решения scope/timeline.
- **INTEGRATIONS_STRATEGY.md:** нужно полное прочтение для планирования эшелона 2.
- **Precision 0.76 vs. gate 85%:** может требовать решения Teamlead (пересмотр criteria или доучения модели).

### Технические риски

- **Синхронизация времени между узлами** (для TDOA): спецификация нужна ДО реализации, иначе сервис и клиент будут несовместимы.
- **VDR-разметка**: если Cohen's Kappa < 0.6, нужна переразметка или уточнение критериев.

---

## Итоговая рекомендация

**Завтра начинать с вектора A (TDOA-prep + консилиум),** параллельно B (верифиция trends-production) и C (если окей от Teamlead). На консилиуме **обязательно закрыть нить про VDR-timeline и stage-gate precision**. По окончании дня обновить WHITE_PAPER с фактом разблокировки Этапа 2.