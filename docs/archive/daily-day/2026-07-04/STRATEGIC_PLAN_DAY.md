<!--
  archive-role: archive-snapshot
  archive-day: 2026-07-04
  archived-at: 2026-07-04T20:40:06.430Z
  source: docs/STRATEGIC_PLAN_DAY.md
  canonical: docs/STRATEGIC_PLAN_DAY.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-07-04T07:18:02.830Z (yarn plan:day) -->
<!-- Период: последние сутки (since="1 day ago"); горизонт: следующий день -->
<!-- Источник цели: WHITE_PAPER.md -->

# План на следующий день

**Дата:** 2026-07-03 (день после консилиума по studio-capture-adaptation и VDR hard-gate)  
**Период отчёта:** последние 24 часа (since="1 day ago")  
**Статус репозитория:** main, 1273c831, чистое рабочее дерево

---

## 1. Что сделано за период (последние сутки)

### Студийный захват (пакет `apps/membrana-studio` + `apps/client`)
- **SC1** (ba4b1f16): отключен `backgroundThrottling` в Electron main.ts, добавлена фокусировка окна при захвате через IPC `membrana:studio-shell:captureAcquired`. Тесты `boardLeaseBridge`: TTL-разряд, heartbeat, focus-once.
- **SC3** (105b0d4f, f6bfed1b): контракт паритета хостов (browser/studio/cabinet) в `STUDIO_HOST_BRIDGE_CONTRACT.md` — таблица состояний захвата и studio-специфика (throttling, focus, старые сборки).
- **SC4** (72add92e): логирование capture-lifecycle в shell-лог (`[capture] acquired/heartbeat/release`), скрипт `parse-studio-shell-log.mjs` для счётчиков и --require-* проверок. Runbook в actions.
- **SC5** (0d21600a): `clientVersion` в WS handshake — preload/main через IPC `studioShell.getAppVersion()`, cabinet gateway логирует версию. Тесты порта и деградация старых сборок.

### VDR — аппарат валидации (пакет `apps/client/src/plugins/vdr-validation/`)
- **HG2** (91d35800): плагин VDR-валидация в модуле Микрофон — прогон trends на пилотном корпусе (33 сэмпла), таблица pred-vs-truth, gate-badge (hard ≥85% / soft 80–85% / fail <80%). Тесты границ в `vdrMetrics.test.ts`.

### Детекторы дронов (пакет `packages/services/detectors/template-match/`)
- **HG3-механика** (4d4e3a94): benchmark `--manifest` и `--origin-labels` для preliminary-прогонов по пилоту. Регрессия #222 исправлена: `classifyTrends` с `droneFirstMinGap` + `classMinConfidence` в адаптере. Канон v0.2 переснят: template-match **P 67.5% / R 90.0% / F1 77.1%** (мультикласс, DRONE_TIGHT).
- Preliminary-пилот (33): template-match **P 52.0% / R 81.3% / F1 63.4%** — gap до hard-gate 85 из-за hard negatives.

### Документация и инфра
- Консилиум `studio-capture-adaptation-2026-07-03.md`: результаты, риск ST7 (tray emergency stop → backlog GH #236).
- Консилиум `vdr-validation-scope-2026-07-03.md`: pilot-валидация, операторская истина отложена до оборудования (~2026-07-17).
- Ночное разметочное задание (NB0-NB4): регистрация `VDR_LABEL_ROUNDTRIP_NIGHT_BUILD_EPIC_PROMPT.md`.
- Evening review: 0 закрыто в `close-github`, 38 архивных задач без карточек (кандидат на чистку).

---

## 2. Привязка к стратегической цели

### Текущее положение на дорожной карте (WHITE_PAPER §8)

**Этап 0 — Фундамент:** ✅ завершён
- `audio-engine` поставляет кадры.
- `fft-analyzer` даёт спектр в реальном времени.

**Этап 1.A — DSP-эшелон (один узел):** ⚠️ **достигнут потолок**
- Три независимых детектора (harmonic, cepstral, spectral-flux) реализованы (`@membrana/*-detector-service`).
- **Вердикт по FFT_METRICS_POTENTIAL_AND_LIMITS.md §4–6:**
  - Пороговый тест (centroid/flux/rms бокс): R 75–85% / FPR 40–70% → диагностика, не продакшн.
  - DSP-детекторы по отдельности (OR-консенсус): recall высокий (87–100%), **FPR близок к 100%** → сигнализаторы присутствия, не селекторы.
  - **Trends FFT (DRONE_TIGHT):** R **95%** / FPR **30%** / F1 **0.844** → **единственный FFT-кандидат, прошедший планку 80%/40%**.
- **Следствие:** эшелон 0 DSP/FFT на free-v1 исчерпан. Дальнейший рост — либо новый датасет (validated labels, VDR-разметка), либо переход на эшелон 2 (нейро/zero-shot).

**Этап 1.B — Neural & Agentic эшелон (один узел):** 🔄 **scaffold + планирование**
- YAMNet, CLAP, agentic — в бэклоге (`INTEGRATIONS_STRATEGY.md`).
- Требует fusion-контракта для объединения классификаторов (на этапе 2, не сейчас).

**Этап 2 — Пара узлов и TDOA:** ❌ **заморожен**
- Условие: stage-gate 1→2 (single-node detection ≥85% P / ≥90% R) **не пройден**.
- Текущий hard-gate: template-match preliminary P 52% / R 81% (оператор. истина отложена).
- `tdoa-service`, `transport-service` (шина узел↔сервер) не начинались.

**Этап 3–7** → зависят от stage-gate 2.

### Что приближает к цели
- ✅ **VDR-аппарат (HG2):** продуктовая поверхность для валидации детектора на реальных данных. Плагин закрывает feedback-цикл оператора → модель.
- ✅ **HG3-механика** (benchmark `--manifest`): инструмент честной оценки на пилоте (не на canonical free-v1).
- ✅ **Trends/template-match** в production-очереди: `DRONE_TIGHT` показал результат, пора curated-каталог + калибровка в librarian.

### Что нейтрально
- ✅ **Studio-capture (SC1–SC5):** улучшает ДХ студии (focus, throttling, version handshake), но ортогонально детекции БПЛА. Пересекается с VDR (локальный захват audio для разметки), но не блокирует.

### Что НЕ идёт по магистрали
- ❌ **DSP-бенчмарк round-N на free-v1:** harmonic/cepstral/flux уже измерены (4d4e3a94), повторный прогон без новых данных/алгоритма — впустую. Не планируем.
- ❌ **TDOA-инфра:** зависит от stage-gate 2, сейчас блокирована.

### Недостающие сервисы для полной архитектуры
| Сервис | Статус | Когда начинать |
|--------|--------|----------------|
| `@membrana/detection-ensemble-service` | plan | После gate 1→2 (fusion детекторов) |
| `@membrana/tdoa-service` | frozen (Stage 2) | После gate 1→2 |
| `@membrana/transport-service` | plan | После gate 1→2 (шина узел↔сервер) |
| `@membrana/localizer-service` | plan | Этап 3 |
| `@membrana/tracker-service` | plan | Этап 4 |
| `@membrana/yamnet-detector-service` / `@membrana/clap-detector-service` | scaffold | Параллельно VDR (эшелон 2) |
| `@membrana/agentic-detector-service` | plan | После zero-shot интеграции |

---

## 3. Риски и долг

### Технические риски
1. **ST7 — Tray emergency stop (GH #236):** Electron studio может залипнуть в режиме захвата при краше window-процесса. Mitigation: backlog-задача (deferred ~2026-07-17), отслеживаемый риск.
2. **VDR hard-gate 85/90 не пройден на пилоте:** template-match P 52% (пилот) vs P 67.5% (v0.2-канон) — gap объясняется hard negatives. Ожидаем операторскую истину в поле (~2026-07-17).
3. **Многолучёвость в акустике (WHITE_PAPER §9):** отражения от зданий искажают TDOA. Решение — только на этапе 2+, сейчас зафиксировано как риск.
4. **Синхронизация времени узлов:** без NTP/PPS на полях — миллисекундный джиттер. Этап 2, нужна стратегия (GPS-PPS на ответственных узлах).

### Накопленный долг
- **Старые архивные задачи (38 без карточек):** backlog до введения системы карточек. Кандидат на чистку как отдельная задача (low priority).
- **Тухлые регионы бенчмарка:** harmonic/cepstral/spectral-flux тестируются, но не используются в продакшене. Вариант: архивировать в docs/unused-detectors/ или держать как диагностику.
- **Live DSP в журнал (3-детектор OR):** FPR ≈100%, но работает в режиме реального времени. Используется как сигнализатор, но контракт не чётче ("presence vs. drone").

### Нарушения / потенциальные конфликты границ
- **VDR-плагин в `apps/client`:** импортирует `audio-engine-service` напрямую (OK по ARCHITECTURE.md §1b). Проверено.
- **Template-match детектор:** зависит от `detector-base` ✓, импортирует `audio-engine-service` для типов AudioWindow ✓ (допусти).

### Ограничения из WHITE_PAPER, актуальные сейчас
- **Скорость звука ~340 м/с:** квадрат лимитирован размером, задержки растут. На Этапе 2 нужна стратегия сегментирования.
- **Тишина дрона:** тихие режимы плохо ловятся акустикой. Решение — доп. модальность (RF, видео) после stage-gate 2.
- **Шум среды:** адаптивный профиль на узле (на Этапе 2), сейчас — в диагностике.

---

## 4. План на следующий день

### Задача 4.1: Куратирование template-match каталога (`DRONE_TIGHT` в production)

**Цель:** внедрить `DRONE_TIGHT` шаблон в curated-каталог template-match и пересчитать canonical benchmark v0.3 с мультиклассовой конкуренцией (исключить бакстаб от классификатора).

**Пакет / слой:** `packages/services/detectors/template-match/` + `data/detectors-benchmark/`

**Связь с WHITE_PAPER:** Этап 1.A — финальное доведение одиночного детектора до продакшена перед stage-gate.

**Definition of Done:**
- [ ] `DRONE_TIGHT` шаблон интегрирован в `detector.catalogPatterns` (финальные настройки tempo, spectral, confidence).
- [ ] Benchmark-харнесс обновлён: `--catalog drone-tight-curated` (явно).
- [ ] v0.3 отчёт: P ≥ 65% / R ≥ 88% / F1 ≥ 0.75 на free-v1 canonical.
- [ ] DETECTOR_BENCHMARK.md обновлён таблицей конкурентов (harmonic, cepstral, spectral-flux, trends, template-match side-by-side).

**Роль:** Музыкант (калибровка параметров) + Математик (тестирование, отчёт).

**Размер:** M

---

### Задача 4.2: Операторская истина (VDR разметка пилота, часть 1)

**Цель:** провести разметку pilot-корпуса (33 сэмпла) оператором в VDR-плагине; экспортировать метки JSON и синхронизировать с бенчмарк-репом для HG3 истины.

**Пакет / слой:** `apps/client/src/plugins/vdr-validation/` + инструмент лабельной базы.

**Связь с WHITE_PAPER:** Этап 1.A — получение ground truth для hard-gate 85/90.

**Definition of Done:**
- [ ] Пилот (33) размечен оператором (label: drone / not-drone / uncertain).
- [ ] Экспорт JSON: timestamp, pred (template-match), truth (operator), confidence.
- [ ] HG3-механика обновлена: --origin-labels pилот + intra-rater-проверка (≥95%).
- [ ] Preliminary → definitiveOriginLabels пилота в manifest.json.

**Роль:** Teamlead (sign-off), Верстальщик (UX разметки в плагине), оператор-пилот.

**Размер:** M (программная часть done; операторская часть ~3–4 ч реального времени, параллельно)

---

### Задача 4.3: Нейросетевой scaffold (эшелон 2 — CLAP)

**Цель:** создать scaffold `@membrana/clap-detector-service` с контрактом `DroneDetector`, подготовка интеграции с zero-shot моделью (HuggingFace transformers / onnx).

**Пакет / слой:** `packages/services/detectors/clap-detector-service/` (новый, analyzer-уровень).

**Связь с WHITE_PAPER:** Этап 1.B — начало нейро-эшелона после исчерпания DSP (FFT_METRICS_POTENTIAL_AND_LIMITS.md §6).

**Definition of Done:**
- [ ] Структура каталога: `src/math/` (modelLoader, audioPrep), `src/core/` (CllapDetectorService), `src/hooks/` (useClap), `index.ts`.
- [ ] Контракт `DroneDetector` реализован: `analyze(window) → DetectionResult { confidence, classification }`.
- [ ] `package.json` + `vite.config.ts`: зависимости от `@membrana/core`, `@membrana/detector-base`, `@transformers/transformers` (или замена на меньшую).
- [ ] README: описание модели, API, примеры использования (без реального моделей на этом этапе).
- [ ] Unit-тесты структуры (stub-сервис загружает фейк-модель).

**Роль:** Структурщик (архитектура пакета), Математик (загрузка модели, контракт).

**Размер:** M

---

### Задача 4.4: Уточнение контракта stage-gate 1→2

**Цель:** документировать точный стандарт hard-gate (Precision ≥85% / Recall ≥90%) в DETECTOR_BENCHMARK.md и создать task-промпт для валидации gate-пересечения.

**Пакет / слой:** `docs/` + спецификация в ARCHITECTURE.md §1e.

**Связь с WHITE_PAPER:** Принцип Single-Node Detection First (§8, stage-gate); блокирует Этап 2.

**Definition of Done:**
- [ ] `DETECTOR_BENCHMARK.md` §"Hard-gate criteria": Precision/Recall/F1/accuracy definition с методикой расчёта (микро/макро).
- [ ] Бенчмарк-скрипт: флаг `--check-hard-gate` возвращает exit-code 0 (passed) / 1 (failed) + таблица с зелёным/красным индикатором.
- [ ] Task-промпт `SINGLE_NODE_DETECTION_HARD_GATE_VALIDATION_PROMPT.md`: как запустить, что проверять, документирование результата.
- [ ] Консилиум: фиксация даты повторной проверки (after VDR operator truth, ~2026-07-24).

**Роль:** Teamlead (sign-off gate), Структурщик (документация), Математик (метрики).

**Размер:** S

---

### Задача 4.5: Подготовка к stage 2 — инструменты шкафа (основной документ)

**Цель:** создать `STAGE_2_PREREQUISITES.md` с чек-листом инструментов (синхронизация времени, GCC-PHAT, TDOA-оценка, таблица узлов), которые понадобятся при gate 1→2.

**Пакет / слой:** `docs/` — архитектурный документ.

**Связь с WHITE_PAPER:** Подготовка к Этапу 2 (§8), риски многолучёвости и синхронизации (§9).

**Definition of Done:**
- [ ] Раздел 1: синхронизация времени (GPS-PPS vs NTP/PTP, точность, джиттер).
- [ ] Раздел 2: TDOA методы (GCC-PHAT, FFT, спектральная привязка),算法, точность.
- [ ] Раздел 3: табличная конфигурация «количество узлов → геометрия → точность позиции» (примеры).
- [ ] Раздел 4: риски многолучёвости и как их смягчить (избыточные узлы, фильтры).
- [ ] Чек-лист: какие пакеты (`transport-service`, `tdoa-service`) нужны до gate 2.

**Роль:** Математик (алгоритмы), Структурщик (документация).

**Размер:** M

---

### Задача 4.6: Архивирование утёкших DSP-регионов (опциональная чистка)

**Цель:** оценить целесообразность архивирования/упрощения `@membrana/cepstral-detector-service` и `@membrana/spectral-flux-detector-service` (используются только в диагностике) или сохранения в качестве «как работает классическая спектральная обработка».

**Пакет / слой:** `packages/services/detectors/{cepstral,spectral-flux}/`

**Связь с WHITE_PAPER:** Чистка долга, уточнение обучающего материала vs. production-пути.

**Definition of Done:**
- [ ] Консилиум: какие детекторы архивировать (в `docs/detectors/unused/`) vs. оставить с mark `@deprecated`.
- [ ] Если архив — перенести с исходными комментариями, README, примерами (учебное значение).
- [ ] Обновить README.md в корне: перечень active vs. historical детекторов.

**Роль:** Teamlead (решение), Структурщик (архивирование).

**Размер:** S

---

## 5. Что НЕ делаем на этом горизонте

### ❌ Не повторяем unified benchmark harmonic/cepstral/spectral-flux на free-v1
**Обоснование:** FFT_METRICS_POTENTIAL_AND_LIMITS.md §4 — все три уже измерены на canonical v0.2 (harmonic R68/FPR88, cepstral R100/FPR100, spectral-flux R87/FPR100). Повторный прогон без **нового датасета, алгоритма или fusion-контекста** — впустую. Магистраль качества — trends/template-match или переход на эшелон 2 (нейро).

### ❌ Не начинаем TDOA-инфра / sync узлов / мультилатерацию до stage-gate 1→2
**Обоснование:** WHITE_PAPER §8 (stage-gate 1→2 обязательный), ARCHITECTURE.md §1e — TDOA-типы помечены @experimental @stage 2. Текущий hard-gate P52% пилот → операторская истина → gate-проверка. Только после пересечения gate начинаем Stage 2 infrastructure.

### ❌ Не расширяем классификацию БПЛА (мульти-ротор vs. крыло) до Этапа 5
**Обоснование:** WHITE_PAPER §8 — классификация на Этап 5. Сейчас валидируем simply drone/not-drone. Расширение в `@membrana/classifier-service` откладываем на потом.

### ❌ Не интегрируем RF-приёмник / видео до stage-gate 2 + Этап 6
**Обоснование:** WHITE_PAPER §1b, §4.3 (слияние модальностей как дополнительные анализаторы). Архитектурно поддерживаем, но реализация — после основной акустической сети (эшелон 2+).

### ❌ Не поднимаем fusion-слой (ассоциация / трекинг) на этапе 1
**Обоснование:** fusion живёт на этапе 3–4 (WHITE_PAPER §8). Сейчас одиночный узел → одиночный детектор. Многоузловая ассоциация включается после TDOA (Этап 2).

---

## 6. Проверки в конце периода

### Проверка 1: Canonical benchmark v0.3 с DRONE_TIGHT обновлён
- [ ] `yarn benchmark:detectors --catalog drone-tight-curated` проходит без ошибок.
- [ ] DETECTOR_BENCHMARK.md обновлён: template-match P/R/F1, таблица конкурентов (6–8 детекторов).
- [ ] Artнфакт: `data/detectors-benchmark/v0.3/reports/latest.json` (S3 timestamp или локальный файл).

### Проверка 2: VDR-плагин готов к операторской разметке
- [ ] `apps/client` собирается: `yarn build:client`.
- [ ] VDR-панель в MicrophoneModule монтируется, загружает пилот-корпус (33 сэмпла), даёт прогон по trends DRONE_TIGHT.
- [ ] Экспорт JSON работает (кнопка "Export labels").

### Проверка 3: CLAP-scaffold структурирован
- [ ] Каталог `packages/services/detectors/clap-detector-service/` содержит `.cursorrules`-compliant структуру.
- [ ] `yarn test --include=clap-detector` проходит (stub-тесты).
- [ ] `yarn build --include=clap-detector` собирает library-бандл.

### Проверка 4: Контракт hard-gate 85/90 задокументирован
- [ ] `DETECTOR_BENCHMARK.md` содержит раздел Hard-gate criteria с формулами.
- [ ] `--check-hard-gate` флаг работает в бенчмарк-скрипте.
- [ ] TASK-PROMPT `SINGLE_NODE_DETECTION_HARD_GATE_VALIDATION_PROMPT.md` создан.

### Проверка 5: STAGE_2_PREREQUISITES.md наполнен
- [ ] Документ содержит 4 раздела (синхрон, TDOA, геометрия, чек-лист пакетов).
- [ ] Таблица узлов × точность позиции заполнена примерами.
- [ ] Консилиум дата gate-проверки зафиксирована (~2026-07-24).

### Проверка 6: Консилиум — результаты дня
- [ ] Файл `docs/seanses/strategic-plan-day-2026-07-04.md` создан с итогами.
- [ ] Перечень выполненных задач (4.1–4.6) и статусы.
- [ ] Обновлён backlog: что откладываем на следующий день / спринт.

---

## Приложение: Таблица зависимостей задач

| Задача | Зависит от | Блокирует | Размер |
|--------|-----------|-----------|--------|
| 4.1 (DRONE_TIGHT curated) | HG3-механика (merged) | 4.2 (valuation), gate 1→2 | M |
| 4.2 (VDR разметка) | 4.1 (каталог готов), оборудование | gate 1→2 sign-off | M |
| 4.3 (CLAP scaffold) | — (параллельно) | CLAP-интеграция (Этап 1.B) | M |
| 4.4 (hard-gate контракт) | 4.1, 4.2 (данные) | gate 1→2 execution | S |
| 4.5 (STAGE_2_PREREQUISITES) | — (info-gather) | планирование Stage 2 | M |
| 4.6 (архив DSP) | консилиум (решение) | backlog/cleanup | S |

---

**Статус подготовки:** готово к обсуждению на утреннем standup (2026-07-04).