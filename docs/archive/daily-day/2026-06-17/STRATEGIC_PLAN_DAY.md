<!--
  archive-role: archive-snapshot
  archive-day: 2026-06-17
  archived-at: 2026-06-17T16:18:40.715Z
  source: docs/STRATEGIC_PLAN_DAY.md
  canonical: docs/STRATEGIC_PLAN_DAY.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-06-17T05:45:13.269Z (yarn plan:day) -->
<!-- Период: последние сутки (since="1 day ago"); горизонт: следующий день -->
<!-- Источник цели: WHITE_PAPER.md -->

# План на следующий день

**Дата:** 2026-06-17  
**Период:** 2026-06-16 18:00 — 2026-06-17 18:00  
**Branch:** `turbo-build-green-apps` → merge to `main`

---

## 1. Что сделано за период (последние сутки)

### Обзор коммитов

1. **Эпик #84 (FFT Last-Chance) + интеграция детекции в журнал**  
   - Завершён цикл `DRONE_TIGHT` стека: спектральная + временна́я фильтрация достигла целевых метрик (recall 95% / FPR 30% / F1 0.844 на held-out `val`).
   - Добавлены sample-library плагины для ручного тестирования FFT-порогов и trends-шаблонов на сэмплах (`sample-library-fft-threshold-test`, `trends-fft-sample-analyzer`).
   - Калибровочные дефолты перенесены в `droneTightCalibration.ts` и применены в curated-каталоге шаблонов.

2. **Зелёная сборка приложений (TURBO_BUILD_GREEN_APPS)**  
   - `tsc -b` на полном графе зависимостей — все TS-ошибки типизации исправлены.
   - Cabinet добавлены project references и Docker build-контекст включает `journal-report-views`, `trends-detector`, `fft-analyzer`.
   - CI на `main`/`techies68` проходит: честная типизация, no-emit сборка, e2e background-office.

3. **Live parallel detection sprint (LP1–LP5)**  
   - `mic-live-drone-analysis`: поток ввода из микрофона с 3s окном + лёгкие brief-отчёты в live journal.
   - `mic-live-drone-analysis`: backpressure + queue (одна в полёте, одна в очереди, latest wins).
   - FFT-threshold и trends-fft отчёты в live journal (компактные `FftThresholdReportView`, `TrendsFftReportView`).
   - Shared library `journal-report-views` для клиента и cabinet.

4. **Journal event-driven архитектура (JE1–JE5)**  
   - Dual-mode clear (remote через cabinet API / локальный).
   - Hub-driven refresh: обновления публикуются через `liveJournalHub`, авто-refresh падает с 5s на ~30s фолбэк.
   - Cabinet polling каждую секунду, но молча (без мигания loading-state).
   - Contextual clear: clearByFilter удаляет только отфильтрованное подмножество.

5. **Детекции из номерной платформы**
   - Shared `drone-detection-orchestrator` для live и sample-library анализов.
   - background-media: endpoint для декодирования WAV в mono + fetch для clip-анализа.
   - Brief/detailed разделение: fast DDR-brief в журнал по умолчанию, полный DDR on-demand от сервера.

6. **Инфраструктура и документирование**
   - Архив закончившихся эпиков (JE, JS, FTC) в `docs/tasks/archive/`.
   - Reference-документ `FFT_METRICS_POTENTIAL_AND_LIMITS.md` окончательно одобрен: потолок эшелона 0 (DSP/FFT) на free-v1 зафиксирован.
   - Tariff matrix (`TARIFF_MATRIX.md`) за три уровня (free, indie, business).

---

## 2. Привязка к стратегической цели

### Текущее место на дорожной карте (WHITE_PAPER §8)

Мы находимся в **конце Этапа 1.A → начало Этапа 1.B** по одиночному узлу:
- **✅ Этап 0 (фундамент):** `audio-engine-service`, `fft-analyzer-service` работают надёжно; live-потоки захватываются.
- **✅ Этап 1.A (DSP-эшелон, один узел):** три DSP-детектора реализованы (`harmonic`, `cepstral`, `spectral-flux`); **однако эшелон 0 (чистый FFT/DSP) исчерпан** — одиночные детекторы не проходят stage-gate (precision ≥ 85% AND recall ≥ 90%).
- **🟢 Практический результат:** trends-FFT с `DRONE_TIGHT` шаблоном и временно́й структурой обходит потолок и даёт **recall 95% / FPR 30%** на одном узле — это **лучший FFT-кандидат** и единственный, рекомендуемый для prod на эшелоне 0.
- **⏳ Этап 1.B (Neural & Agentic, один узел):** не начат; требует либо нового датасета (validated), либо zero-shot моделей (YAMNet, CLAP) из `INTEGRATIONS_STRATEGY.md`.

### Что приближает к цели

- ✅ **Live journal + brief reports:** пользователь видит детекции в реальном времени, можно калибровать на real data.
- ✅ **Sample-library тесты:** ручная валидация trends и FFT-порогов перед prod.
- ✅ **Shared orchestrator & curated templates:** основа для последующих детекторов (нейро, agentic) — будут подключаться по тому же контракту.

### Что отвлекает или нейтрально

- 🟡 **Cabinet + background-media:** полезны для многопользовательского сценария, но не критичны для single-node detection on main path. Рекомендуется отложить масштабирование cabinet до stage-gate 1→2 (многоузловая локализация).
- 🟡 **Tariff matrix & MEMBRANE_PLATFORM docs:** стратегический контекст, но не влияет на детекцию или сеть в данный момент.

### Недостающие сервисы (на горизонте stage-gate 1→2)

| Сервис | Статус | Этап по WHITE_PAPER | Назначение |
|--------|--------|---------------------|-----------|
| `@membrana/tdoa-service` *(заморожен)* | scaffold | Этап 2 | Разница времён прихода между парой узлов |
| `@membrana/localizer-service` | plan | Этап 3 | Мультилатерация на плоскости (3+ узла) |
| `@membrana/tracker-service` | plan | Этап 4 | Фильтр Калмана для трекинга целей |
| `@membrana/transport-service` | plan | foundation | Транспорт узел ↔ сервер, шина событий |
| `@membrana/detection-ensemble-service` | plan | analyzer | Агрегация результатов детекторов (после stage-gate) |
| `@membrana/yamnet-detector-service` | plan | Этап 1.B | Zero-shot audio-классификация (YAMNet) |
| `@membrana/clap-detector-service` | plan | Этап 1.B | Contrastive learning (CLAP) для дронов |
| `@membrana/agentic-detector-service` | plan | Этап 1.B | LLM-reasoning над FFT + DSP-признаками |

**Решение:** перед началом Этапа 1.B требуется **validated dataset** с human-verified labels (VDR-эпик) или согласие на использование zero-shot моделей. Оба пути описаны в `INTEGRATIONS_STRATEGY.md`.

---

## 3. Риски и долг

### Технические риски

| Риск | Уровень | Описание | План снижения |
|------|---------|---------|---------------|
| **Stage-gate 1→2 не пройдён** | 🔴 HIGH | Precision trends ~76% на val (ниже целевых 85%). Single-node не проходит hard SLD (P≥85% R≥90%), но проходит soft SLD (P≥80% R≥90%). TDOA и многоузловая архитектура заморожены до улучшения качества. | Validated dataset (VDR) или переход на zero-shot (CLAP/YAMNet) — эшелон 1.B. Не навешивать TDOA на weak single-node. |
| **Синхронизация времени между узлами** | 🟡 MEDIUM | TDOA требует миллисекундного джиттера; sampleRate должен быть один на всех узлах. GPS-PPS есть в concept, но физического оборудования нет. | Поле `syncedAt` в `AcousticObservation` зарезервировано; реальная синхронизация — этап 2 после stage-gate. Сейчас — монолог (один узел). |
| **Многолучёвость и задержка звука** | 🟡 MEDIUM | Отражения от зданий и рельефа искажают TDOA; скорость звука зависит от температуры/влажности. Размер квадрата лимитирован (целевой — 2×2 км). | GCC-PHAT, медианная фильтрация TDOA, адаптивный профиль звука — этап 2. На этапе 0–1A можно игнорировать. |
| **Низкая энергия тихих дронов** | 🟡 MEDIUM | Электрические БПЛА на низких оборотах хорошо пролезают под FFT-пороги; trends помогает, но не решает полностью. | Zero-shot (CLAP) или фиксированная модель (YAMNet) на эшелоне 1.B. Сейчас — документированное ограничение. |

### Накопленный долг

- **TS-типизация**: ✅ исправлена полностью в TURBO_BUILD_GREEN_APPS.
- **Cabinet интеграция**: 🟡 dual-mode (local + remote) работает, но чрезмерно усложняет логику. После stage-gate 1→2 рекомендуется вернуться и упростить (один режим на тип deployment).
- **Live journal UI**: 🟡 отчёты compact, но не интерактивны. Доп. разбор (drill-down в фреймы) требует LP5+ и связан с background-media API (в работе).
- **Документирование FFT/trends**: ✅ полнота достигнута (`FFT_METRICS_POTENTIAL_AND_LIMITS.md`); однако пользовательская документация (как калибровать `DRONE_TIGHT`) живёт в inline-комментариях.

### Нарушения границ пакетов (не обнаружены)

По коммитам и diff-у все сервисы соответствуют правилам `SERVICES.md`:
- Analyzer-сервисы (FFT, trends, harmonic, etc.) зависят только от `@membrana/core` и foundation (`audio-engine`).
- `mic-live-drone-analysis` (плагин клиента) не нарушает зависимости, правильно использует `detector-report` и `drone-detection-orchestrator`.

---

## 4. План на следующий день

### Задача T1: Validated Dataset (VDR) — инициализация эпика

**Цель:** создать минимальный структурированный датасет с human-verified labels для калибровки детекторов эшелона 1.B и преодоления stage-gate 1→2.

**Пакет / слой:** `docs/` + `data/detectors-benchmark/` (разметка данных, вне монорепо-кода).

**Связь с WHITE_PAPER:** §8 Дорожная карта, Этап 1.B — prerequisite для neural детекторов.

**Definition of Done:**
- [ ] Документ `docs/tasks/VDR_DATASET_COLLECTION_EPIC.md` с протоколом сбора и разметки.
- [ ] Минимум 30 real-world сэмплов (5–10 дронов, 5–10 птиц, 5–10 шумовых) в `data/validated-samples/`.
- [ ] Каждый сэмпл: спектрограмма, временная разметка, человеческий класс (drone / not-drone / ambiguous).
- [ ] Таблица расхождений trends (`DRONE_TIGHT`) vs human labels (precision/recall/F1 на VDR).

**Роль:** Teamlead (инициализация протокола) + Музыкант (сбор реальных примеров).

**Размер:** M (10–15 ч структурирования + сбора).

---

### Задача T2: Zero-shot YAMNet + CLAP интеграция (scaffold)

**Цель:** подготовить два foundation-сервиса для нейросетевых детекторов на эшелоне 1.B без обучения (ONNX/TF.js).

**Пакет / слой:**
- `@membrana/yamnet-detector-service` (foundation, новый).
- `@membrana/clap-detector-service` (foundation, новый).

**Связь с WHITE_PAPER:** §8 Этап 1.B (Neural & Agentic эшелон).

**Definition of Done:**
- [ ] Оба сервиса экспортируют контракт `DroneDetector` (из `detector-base`).
- [ ] YAMNet: загрузка ONNX (quantized, ~4 МБ), инфер на 1s кадрах, класс `speech`, `animal`, `mechanical` → бинарный `isDrone`.
- [ ] CLAP: zero-shot embedding "drone engine" vs "not a drone"; cosine distance → confidence.
- [ ] Benchmark на свободно доступных данных (ESC-50 + синтетические дроны) — no tie-in с VDR, это pre-flight.
- [ ] Unit-тесты на mock-буферах; latency p95 < 200 мс (медленнее DSP — OK на эшелоне 1.B).

**Роль:** Математик (выбор моделей, инфер) + Структурщик (scaffold сервисов).

**Размер:** M (12–20 ч интеграции моделей + контракты).

---

### Задача T3: Sample-library UX hardening для trends + FFT-threshold

**Цель:** упростить ручной тест trends и FFT-порогов в sample-library, добавить export результатов.

**Пакет / слой:**
- `apps/client/src/plugins/sample-library-fft-threshold-test/` (дополнение).
- `apps/client/src/plugins/trends-fft-sample-analyzer/` (дополнение).

**Связь с WHITE_PAPER:** §8 Этап 1.A — инструмент валидации для пользователей.

**Definition of Done:**
- [ ] Side-by-side таблица: сэмпл | FFT-вердикт | trends-вердикт | human-class (если доступен).
- [ ] Export (CSV): список сэмплов с метриками и вердиктами для дальнейшего анализа.
- [ ] Прямая ссылка на `droneTightCalibration` из UI с возможностью быстро подогнать пороги.
- [ ] Локальное сохранение последних 5 тестовых профилей (localStorage).

**Роль:** Верстальщик (UX + export) + Музыкант (конфигурация порогов).

**Размер:** S (6–10 ч интеграция компонентов + export).

---

### Задача T4: Stage-gate 1→2 Decision Document

**Цель:** составить формальный протокол решения, проходит ли single-node detection stage-gate, и что дальше.

**Пакет / слой:** `docs/STAGE_GATE_1_TO_2_DECISION.md` (документирование).

**Связь с WHITE_PAPER:** §8 Single-Node Detection First, stage-gate 1→2.

**Definition of Done:**
- [ ] Таблица метрик на free-v1 held-out `val` (precision / recall / F1 / FPR) для каждого инструмента.
- [ ] Вердикт: hard SLD (P≥85% R≥90%) не пройден single-node FFT/DSP → recommend Этап 1.B или валидированный датасет.
- [ ] Soft SLD (P≥80% R≥90%) — trends достигает recall 95%, но precision ~76% → acceptable с дисклеймером.
- [ ] Решение Teamlead: включить trends-DRONE_TIGHT в prod или отложить до 1.B (ожидание VDR/zero-shot).

**Роль:** Teamlead (решение) + Структурщик (документирование).

**Размер:** S (4–6 ч анализ метрик + написание).

---

### Задача T5: Draft `@membrana/detection-ensemble-service` контракты

**Цель:** подготовить пакет для агрегации результатов детекторов (trends + FFT-threshold + YAMNet + CLAP), который будет использован после stage-gate 1→2.

**Пакет / слой:** `@membrana/detection-ensemble-service` (analyzer, scaffold).

**Связь с WHITE_PAPER:** §8 Этап 1.B — агрегация DSP + neural детекторов.

**Definition of Done:**
- [ ] Interfaces `EnsembleConfig` (веса детекторов, стратегия голосования) и `EnsembleResult` (итоговый вердикт + breakdown).
- [ ] Три стратегии голосования: AND (все согласны), OR (кто-то согласен), weighted-average (вес по confidence).
- [ ] Unit-тесты на mock-детекторах (DSP vs neural в разном согласии).
- [ ] ❌ **НЕ реализовывать интеграцию** — только контракты и skeleton; интеграция после решения stage-gate.

**Роль:** Структурщик (контракты) + Математик (взвешивание).

**Размер:** S (5–8 ч контракты + юнит-тесты).

---

### Задача T6: Background-media audio-analysis endpoint harden

**Цель:** завершить реализацию на background-media server-side endpoint для полного drone-detection-report (с интеграцией YAMNet/CLAP после их готовности).

**Пакет / слой:** `packages/background-media/` (foundation-фасад).

**Связь с WHITE_PAPER:** §4.4 Слияние данных —後端обработка на сервере, на этапе 1B.

**Definition of Done:**
- [ ] Endpoint `POST /analysis/drone-detection` принимает WAV-blob и конфигурацию детекторов.
- [ ] Запускает trends + FFT-threshold (текущие, работают); плейсхолдеры для YAMNet + CLAP.
- [ ] Возвращает `DetectionReport` (v1) с confidence и breakdown по каждому детектору.
- [ ] Интеграционный тест: sample-library отправляет WAV и получает результат.

**Роль:** Структурщик (endpoint + контракты) + Математик (оркестровка детекторов).

**Размер:** M (10–15 ч NestJS + интеграция, учитывая уже сделанный скелет).

---

## 5. Что НЕ делаем на этом горизонте

1. **Повторный unified benchmark harmonic + cepstral + spectral-flux на free-v1 без нового датасета или алгоритма** → FF_METRICS_POTENTIAL_AND_LIMITS.md §6 явно запрещает. Поточные метрики зафиксированы; их улучшение требует либо нового датасета (VDR), либо смены архитектуры (trends, neural). Бенчмарк на free-v1 — no-go как магистраль.

2. **TDOA и многоузловую синхронизацию (Этап 2)** → stage-gate 1→2 заморожен до преодоления single-node плато. GPS-PPS и NTP — только контракты в `@membrana/core`; физическое снабжение узлов оборудованием — вне scope.

3. **Cabinet масштабирование (multi-node UI, дашборд)** → отложить до Этапа 3–4 (трекинг + карта). На текущий момент достаточно single-node live journal.

4. **Аудиозахват на нескольких микрофонах (микрофонная решётка, bearing estimation)** → Этап 2, требует TDOA и синхронизации. Текущий `audio-engine` рассчитан на single-microphone.

5. **Интеграция с RF-приёмником, ADS-B, видеокамерой** → Этап 6 (Расширение модальностей). Сейчас — только акустика.

6. **LLM-agentic детектор на текущем free-v1 датасете** → Этап 1.B требует либо validated data (VDR), либо zero-shot CLAP + YAMNet. LLM для reasoning — опциональный аддон, не магистраль; требует OpenAI API и отдельного эпика (`agentic-detector-service`).

---

## 6. Проверки в конце периода

1. **VDR эпик инициирован:** файл `docs/tasks/VDR_DATASET_COLLECTION_EPIC.md` существует, план сбора согласован, минимум 10 сэмплов загружено в `data/validated-samples/`.

2. **Zero-shot детекторы (YAMNet + CLAP) готовы к интеграции:** оба сервиса имеют собственные пакеты, соответствуют контракту `DroneDetector`, пройдены юнит-тесты на mock-данных. Bench на открытых данных (ESC-50) показывает reasonable метрики.

3. **Sample-library UX улучшена:** новые UI-компоненты за trends и FFT-threshold тесты, export в CSV работает, localStorage сохраняет профили.

4. **Stage-gate 1→2 решение зафиксировано:** документ `STAGE_GATE_1_TO_2_DECISION.md` опубликован, Teamlead принял решение о дальнейшем пути (stay on trends или переход на 1.B).

5. **Контракты ensemble + background-media** готовы к реализации: interfaces в `detection-ensemble-service` одобрены, endpoint на background-media протестирован на интеграции с trends и FFT.

6. **Лог изменений пуст (working tree clean):** все новые файлы закоммичены, стек `turbo-build-green-apps` merge-нут в `main`, CI зелён.

---

## Справочные материалы

- **WHITE_PAPER.md** — стратегическая цель (Membrana — сенсорная сеть под небом).
- **ARCHITECTURE.md** — правила пакетов и слоёв (foundation / analyzer / agenda / device-board).
- **SERVICES.md** — соглашения о пакетах-сервисах.
- **FFT_METRICS_POTENTIAL_AND_LIMITS.md** — потолок эшелона 0 и путь дальше.
- **DETECTOR_BENCHMARK.md** — метрики детекторов на free-v1.
- **INTEGRATIONS_STRATEGY.md** — path to zero-shot (YAMNet, CLAP) и fusion.

---

*Документ подготовлен на основе анализа git-истории за 2026-06-16 18:00 — 2026-06-17 09:00 и состояния репозитория на commit `e84e347` (DRONE_TIGHT stack + turbo green build).*