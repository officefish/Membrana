<!-- Сгенерировано: 2026-06-20T04:17:31.958Z (yarn plan:day) -->
<!-- Период: последние сутки (since="1 day ago"); горизонт: следующий день -->
<!-- Источник цели: WHITE_PAPER.md -->

# План на следующий день

**Дата:** 2026-06-17 (по состоянию на `7df7593`)  
**Ветка:** `techies68`  
**Период:** последние сутки

---

## 1. Что сделано за период (последние сутки)

**Коммитов за последние 24 часа не выявлено.**

Последний коммит (`7df7593`, 3 дня назад): `chore: sync yarn.lock for journal-report-views detector-report dep`. Это техническое обслуживание зависимостей.

**Состояние репозитория:**
- Working tree чист (кроме служебных файлов `.claude/`, `.continue/`).
- 1743 отслеживаемых файла.
- Нет незавершённых локальных изменений, готово к планированию.

**Вывод:** период подходит для глубокого переосмысления пути реализации эшелонов детекции и подготовки следующего рывка.

---

## 2. Привязка к стратегической цели

### Текущий этап из WHITE_PAPER

По дорожной карте (§8):
- **Этап 0 (Фундамент):** ✅ завершён.
  - `audio-engine` поставляет кадры.
  - `fft-analyzer` даёт спектр.
  - Клиент отображает спектр.

- **Этап 1.A (DSP-эшелон, один узел):** ⚠️ **исчерпан на free-v1**.
  - Реализованы: `@membrana/harmonic-detector-service`, контракт `DroneDetector`.
  - **Вердикт по docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md:**
    - Пороговый тест FFT: recall 75–85%, FPR 40–70% → **no-go как селективный детектор**.
    - Гармонический: precision 43.6%, recall 68.3%, FPR 88% → **вспомогательный индикатор**.
    - Cepstral (live): recall 100%, FPR 100% → **сигнализатор присутствия**.
    - Spectral-flux (live): recall 87%, FPR 100% → **сигнализатор присутствия**.
  - **Единственный FFT-путь, достигший целей:** Trends FFT (`DRONE_TIGHT`) — recall 95%, FPR 30%, F1 0.844 (превышает мягкую планку 80%/40%).

- **Этап 1.B (Neural & Agentic):** ❌ **не начат**.
  - Заморожен до **stage-gate 1→2** (см. WHITE_PAPER §8, DETECTOR_BENCHMARK.md).
  - Условие: лучший одиночный детектор или ensemble **precision ≥ 85%, recall ≥ 90%**.
  - Trends FFT не закрывает **precision** (0.76 на val); нужна либо validated dataset (VDR), либо переход на нейро.

- **Этап 2 (пара узлов, TDOA):** ❌ **заморожен** до stage-gate 1→2.
  - Типы `SyncedTimestamp`, `TimeSyncProvider`, `TdoaResult` в `@membrana/core` помечены `@experimental @stage 2`.

### Что приближает к цели, что — нейтрально, что — отвлекает

| Направление | Статус | Обоснование |
|-------------|--------|-----------|
| **Trends FFT + DRONE_TIGHT + template-match** | ✅ Приближает | Единственный FFT-путь, достигший целей. Ключ к _продакшн-версии эшелона 0_. |
| **Повтор benchmark harmonic/cepstral/flux на free-v1** | ⛔ Отвлекает | Эшелон 0 исчерпан (FFT_METRICS §6). FPR физически не упадёт ниже 40% без новых данных или нейро. |
| **Validated Dataset (VDR) + калибровка шаблонов** | ✅ Приближает | Путь к stage-gate 1→2. Даёт precision ≥ 85% для trends или нейро. |
| **Zero-shot нейро (CLAP/YAMNet)** | ✅ Приближает | Путь Этапа 1.B (INTEGRATIONS_STRATEGY.md). Параллелен VDR, переход вперёд после gate. |
| **Синхронизация времени, TDOA, локализация** | ⛔ Отвлекает на этот период | Этап 2 заморожен до gate. Первичная детекция — критический путь. |
| **Расширение UI / карты квадрата** | 🟡 Нейтрально | Полезно для демо, но не блокирует gate. Низкий приоритет до stage-gate 1→2. |

### Недостающие сервисы

**Критические для stage-gate 1→2 (очередь):**
1. `@membrana/detection-ensemble-service` — агрегация результатов нескольких детекторов (trends + CLAP + YAMNet) с взвешиванием.
2. `@membrana/validated-dataset-service` или `/tools/vdr-calibrator` — утилита для переразметки libre/community-сэмплов и калибровки шаблонов trends.

**Критические для Этапа 2 (после gate):**
3. `@membrana/transport-service` — шина событий и формат транзита наблюдений между узлом и сервером.
4. `@membrana/tdoa-service` — взаимная корреляция и TDOA.
5. `@membrana/localizer-service` — мультилатерация и 2D-позиция.
6. `@membrana/tracker-service` — фильтр Калмана и ассоциация целей.

**Текущий статус:**
- Foundation: `audio-engine` ✅, `fft-analyzer` ✅.
- Analyzer (DSP): `harmonic-detector` ✅ (limited), `cepstral-detector` (scaffold), `spectral-flux-detector` (scaffold), `threshold-test` (diagnostic).
- Analyzer (Neural): 0 сервисов (заморозь).
- Fusion/tracking: 0 сервисов (заморозь).

---

## 3. Риски и долг

### Технические риски

| Риск | Уровень | Действие |
|------|---------|---------|
| **Trends DRONE_TIGHT переобучена на free-v1** | 🔴 Высокий | Требует VDR-калибровки на новых городских сценариях (шум строительства, доставочные дроны, птицы). Без этого spec падёт на real-world. |
| **Precision 0.76 не закрывает stage-gate** | 🔴 Высокий | Trends сама по себе не проходит SLD (P≥85%). Нужна либо ensemble (trends + CLAP + YAMNet), либо ручная валидация шаблонов. |
| **Синхронизация времени не проверена** | 🟡 Средний | Для Этапа 2 критична точность ±1 мс между узлами. Сейчас нет ни GPS-PPS, ни NTP-калибровки в `audio-engine`. Риск отсрочки Этапа 2 на неделю+. |
| **Нейро-детекторы (CLAP, YAMNet) не интегрированы** | 🟡 Средний | Изучены теоретически, но нет `@membrana/clap-detector-service` / `yamnet-detector-service`. Блокирует путь к Этапу 1.B. |
| **Фоновая техника (ESC-50) даёт FPR 30% и выше** | 🟡 Средний | Trends `DRONE_TIGHT` не различает дрон от компрессора/вентилятора. Требует либо дополнительный модальный канал (RF/видео), либо agentic-разбор (LLM). |

### Накопленный долг

1. **Документация**
   - `DETECTOR_BENCHMARK.md` актуален (эпик #84 завершён).
   - Консилиум `docs/seanses/single-node-detection-first-2026-05-16.md` закрыл stage-gate 1→2 как **невозможный на чистом DSP/FFT**.
   - **Нечего документировать:** этап 1.A завершён, результаты зафиксированы.

2. **Код**
   - `cepstral-detector-service`: scaffold, не завершена (`implementation` -> работающий сервис).
   - `spectral-flux-detector-service`: scaffold, не завершена.
   - Ни один из них не входит в магистраль (не требуется по FFT_METRICS §6).
   - **Рекомендация:** сохранить как educational/diagnostic модули, не вкладываться в доделку.

3. **Архитектура**
   - Граф пакетов стабилен (ARCHITECTURE.md, SERVICES.md соблюдены).
   - Нет нарушений зависимостей.
   - **Долг:** появление `detection-ensemble-service` требует новой связи `core ← ensemble ← {trends, clap, yamnet}`. Нужно предварительно уточнить контракт в `@membrana/core` (типы для weighted voting).

### Релевантные ограничения из WHITE_PAPER

| Ограничение (WHITE_PAPER §9) | Статус на free-v1 | Действие |
|------|------|---------|
| Тишина дрона (Low-throttle БПЛА) | 🔴 Не решено | Требует RF-детектор или близкие микрофоны (<10 м). Trends на дальних низких дронах теряет recall. |
| Шум среды (город, ветер, дождь) | 🟡 Частично | Trends хороша в сухом фоне (free-v1), но фоновая техника (вентиляторы, генераторы) дают ложные. Нужна VDR-калибровка на реальных городских условиях. |
| Многолучёвость (отражения) | 🟢 Далёко | Проблема Этапа 2 (TDOA), пока её игнорируем. |
| Скорость звука ~340 м/с | 🟢 Далёко | Лимит размера квадрата, Этап 3+. |
| Этика (буфер, приватность) | 🟢 Решено | `audio-engine` уже имеет кольцевой буфер с TTL. |

---

## 4. План на следующий день

### Задача 4.1: Продвижение Trends `DRONE_TIGHT` в production-каталог

**Цель:** встроить `DRONE_TIGHT` как основной шаблон в `@membrana/background-media/template-catalog` и заново снять `benchmark:detectors` на curated-датасете.

**Пакет / слой:** `background-media` (data plane) + `@membrana/trends-detector-service` (analyzer).

**Связь с WHITE_PAPER:** §8 Этап 1.A завершение; пролог к Этап 1.B (stage-gate).

**Definition of Done:**
- [ ] Шаблон `DRONE_TIGHT` экспортирован в `background-media/templates/drone-tight-curated.json` с полным описанием гиперпараметров (centroid/flux/rms боксы, temporal constraints).
- [ ] Запущен `yarn benchmark:detectors --dataset=curated-hand-labeled` с не менее 50 дронов и 100 не-дронов (ESC-50 + городской фон).
- [ ] Таблица результатов: recall, precision, F1, FPR по trends `DRONE_TIGHT`.
- [ ] Обновлена `docs/DETECTOR_BENCHMARK.md` с вердиктом: trends проходит / не проходит stage-gate 1→2.

**Роль:** Музыкант (обработка аудио, настройка шаблонов) + Математик (бенчмарк, метрики).

**Размер:** M.

---

### Задача 4.2: Спецификация контракта `DetectionEnsemble` в `@membrana/core`

**Цель:** добавить типы и интерфейсы для взвешенной агрегации нескольких детекторов (trends, CLAP, YAMNet) в центральное `@membrana/core`.

**Пакет / слой:** `@membrana/core` (foundation-types).

**Связь с WHITE_PAPER:** §7 (контракт наблюдения); §8 Этап 1.B (Neural & Agentic).

**Definition of Done:**
- [ ] Добавлены типы в `packages/core/src/detection.ts`:
  - `interface WeightedDetectorResult { detectorId, confidence, isDrone, weight }`.
  - `interface EnsembleConfig { detectors: DetectorMeta[], votingStrategy: 'weighted' | 'majority' | 'unanimous', minConfidence }`.
  - `interface EnsembleVerdic { iDrone: boolean, confidence: number, components: WeightedDetectorResult[] }`.
- [ ] Утилита `aggregateDetectorResults(results[], config): EnsembleVerdic` (чистая функция, без побочных эффектов).
- [ ] Unit-тесты на 3 сценариях: единогласие, разброс, одиночный детектор.
- [ ] Экспортировано из `@membrana/core/index.ts`.

**Роль:** Структурщик (дизайн контракта) + Математик (логика агрегации).

**Размер:** S.

---

### Задача 4.3: Разведка и техническое задание для zero-shot детектора (CLAP / YAMNet)

**Цель:** подготовить детальное TZ на интеграцию хотя бы одного из CLAP / YAMNet как `@membrana/zero-shot-detector-service` (scaffold + реализация на 50%).

**Пакет / слой:** `packages/services/detectors/@membrana/zero-shot-detector-service` (analyzer, новый).

**Связь с WHITE_PAPER:** §8 Этап 1.B (Neural эшелон); INTEGRATIONS_STRATEGY.md.

**Definition of Done:**
- [ ] Технический документ `docs/zero-shot-detector-spec.md` с разделами:
  - Выбор модели (CLAP vs YAMNet vs другое) с обоснованием.
  - Pipeline: загрузка модели (ONNX / PyTorch), квантизация на CPU, latency p95.
  - Контракт входа/выхода (совместимость с `DroneDetector`).
  - Тестовый набор из 20 дронов free-v1.
  - Ожидаемые precision / recall на free-v1 (литература / претесты).
- [ ] Scaffold `@membrana/zero-shot-detector-service` в правильной структуре (math/ + core/ + hooks/).
- [ ] README с примером использования и зависимостями.

**Роль:** Математик (выбор модели, теория) + Структурщик (TZ и scaffold).

**Размер:** M.

---

### Задача 4.4: Initialized Validated Dataset (VDR) лоток для переразметки

**Цель:** подготовить утилиту/скрипт для переразметки libre-сэмплов (free-v1) под `DRONE_TIGHT` и калибровки на уличных сценариях.

**Пакет / слой:** `tools/` или `packages/services/@membrana/data-validator-service` (data plane, новый).

**Связь с WHITE_PAPER:** §8 Этап 1.A завершение; путь к stage-gate 1→2.

**Definition of Done:**
- [ ] Утилита `yarn vdr:calibrate-trends --input=libre-v1.zip --output=vdr-calibrated.csv`.
  - Входные параметры: dataset путь, шаблон `DRONE_TIGHT` (автоматически загружается).
  - Выход: CSV с колонками `sample_id | ground_truth_label | trends_confidence | trends_verdict | manual_override`.
- [ ] Интерфейс ручной разметки (Electron-приложение или web-форма) для быстрого просмотра спорных сэмплов.
- [ ] Статистика покрытия: сколько сэмплов согласны/не согласны с trends, какие классы слабые.
- [ ] README на русском с инструкцией использования.

**Роль:** Музыкант (аудио-обработка) + Верстальщик (UI разметки).

**Размер:** L.

---

### Задача 4.5: Выравнивание зависимостей и CI-чек для Этапа 1.B (заготовка)

**Цель:** обновить корневой `package.json` и Turbo-конфиг с поддержкой будущих нейро-сервисов (CLAP, YAMNet, ONNX-runtime и т.п.); убедить что CI не сломается при их добавлении.

**Пакет / слой:** Корневая инфра (`package.json`, `turbo.json`, `.github/workflows/`).

**Связь с WHITE_PAPER:** §8 подготовка к Этап 1.B.

**Definition of Done:**
- [ ] Добавлены зависимости (в `devDependencies` и интерпретируемо в документе): `onnxruntime`, `@huggingface/transformers`, `librosa-js` (опционально).
- [ ] Turbo-конфиг обновлён: добавлены task-зависимости для `@membrana/zero-shot-detector-service` (build → test → benchmark).
- [ ] CI-workflow проверяет, что новые сервисы не вызывают циклических зависимостей (`yarn check-deps`).
- [ ] Обновлена документация `docs/DEVELOPMENT.md` с инструкцией запуска локального ONNX-инференса.

**Роль:** Teamlead (инфра) + Структурщик (граф зависимостей).

**Размер:** S.

---

### Задача 4.6: Отчёт о state-of-the-art детекции дронов (literature review)

**Цель:** провести mini-research на публикации и open-source решения (CLAP, YAMNet, BYOL-A, PANNs) с метриками на acoustic-drone-datasets и рекомендациями для Membrana.

**Пакет / слой:** Документация / research (`docs/research/`).

**Связь с WHITE_PAPER:** §5 математический фундамент; §8 Этап 1.B стратегия.

**Definition of Done:**
- [ ] Документ `docs/research/acoustic-drone-detection-sota.md` (~3000 слов) с разделами:
  - Обзор SOTA моделей (CLAP, YAMNet, PANNs, Whisper-на-БПЛА).
  - Меtriques на benchmark-датасетах (если опубликованы).
  - Ожидаемая performance на free-v1 (интерполяция, no fine-tuning).
  - Рекомендация для Membrana (путь 1: CLAP; путь 2: YAMNet; гибридный путь 3).
  - Open questions для stage-gate 1→2.
- [ ] 3–5 ссылок на статьи и открытые модели.
- [ ] Таблица сравнения: память, latency, требования к GPU, лицензия.

**Роль:** Математик (теория) + Teamlead (стратегия).

**Размер:** M.

---

## 5. Что НЕ делаем на этом горизонте

### 5.1 Не повторяем unified benchmark harmonic/cepstral/spectral-flux на free-v1

**Почему:** Эшелон 0 (чистый DSP/FFT) исчерпан. Каждый из трёх детекторов по отдельности показывает recall >80%, но FPR близок к 100% на фоновых сценариях ESC-50 (см. FFT_METRICS §2, §4). Взвешенное голосование (OR) только усугубляет FPR до 100%. Без новых данных (VDR) или переход на нейро (CLAP/YAMNet) прогресс невозможен. **Магистраль:** trends `DRONE_TIGHT` (выполнена) → nейро zero-shot → ensemble.

### 5.2 Не трогаем TDOA, локализацию и трекинг на этап 2

**Почему:** Stage-gate 1→2 требует precision ≥85% и recall ≥90% на одиночном детекторе или ensemble. Сейчас trends P=0.76, что ниже порога. Начинать многоузловую архитектуру (TDOA, мультилатерация, синхронизация) — значит строить на песке. Сначала поднимаем precision до 85%+ через VDR или нейро, потом открываем Этап 2. **Время окончания:** ~1–2 спринта после завершения VDR-калибровки или интеграции CLAP.

### 5.3 Не расширяем UI карты и визуализацию квадрата

**Почему:** До Этапа 2 (локализация) позиций целей нет. Ситуационная карта (apps/client) сейчас только отображает спектр одного узла и live-логи детекций. Расширение UI под многоузловые треки — карго-культ до gate-прохождения. **Отложили:** вся UI для Этапа 3 (локализация + карта) и Этап 4 (трекинг).

### 5.4 Не доделываем cepstral и spectral-flux детекторы как боевые

**Почему:** Результаты (FFT_METRICS §2.3, §2.4) показывают cepstral/spectral-flux как сигнализаторы присутствия (R~100%, FPR~100%), но не селективные детекторы. Их роль — live-индикаторы в журнале для оператора, не решающие голоса в трёх. Держим как scaffold / diagnostic, вкладываемся в trends и нейро.

### 5.5 Не интегрируем RF-детектор / видео / ADS-B на этот период

**Почему:** WHITE_PAPER §8 Этап 6 (модальности) — это после Этапа 4 (трекинг). Сейчас ресурс уходит на stage-gate 1→2 (precision дронов на одной модальности). RF и видео — дополнительные модальности для повышения robustness после, но не вместо основного акустического пути. Пересмотрим при неудаче gate.

---

## 6. Проверки в конце периода

### 6.1 Trends `DRONE_TIGHT` пройдена curated-бенчмарк с recall ≥95%, FPR ≤35%

**Артефакт:** обновленная таблица в `docs/DETECTOR_BENCHMARK.md` (раздел «Trends FFT»).  
**Критерий:** результаты на непересекающемся с train-сетом curated-датасете (минимум 50 дронов, 100 не-дронов с городским фоном ESC-50 + техника).

### 6.2 Контракт `DetectionEnsemble` + утилита агрегации merge в `@membrana/core`

**Артефакт:** PR с новыми типами и unit-тестами, merged в `main`.  
**Критерий:** все 4 пункта Definition of Done закрыты, CI зелёная.

### 6.3 TZ на zero-shot детектор опубликовано и согласовано с Teamlead

**Артефакт:** документ `docs/zero-shot-detector-spec.md` (merged в docs/) + scaffold `@membrana/zero-shot-detector-service` на GitHub (open draft PR).  
**Критерий:** Teamlead даёт LGTM, нет критических возражений на выбор модели.

### 6.4 VDR-калибратор реализован как рабочий прототип

**Артефакт:** утилита `yarn vdr:calibrate-trends --input=free-v1.zip --output=vdr.csv` (executable).  
**Критерий:** запускается без ошибок на 100+ сэмплах, выдаёт CSV с ground-truth и trends-вердиктом.

### 6.5 CI/Turbo обновлены без регрессий на новые зависимости

**Артефакт:** updated `package.json`, `turbo.json`, workflow файлы merged в `main`.  
**Критерий:** `yarn build` и `yarn ci:check` проходят, нет предупреждений о циклических зависимостях.

### 6.6 Research документ на SOTA опубликован внутренне

**Артефакт:** `docs/research/acoustic-drone-detection-sota.md` (merged).  
**Критерий:** минимум 3 reference, таблица сравнения моделей, ясная рекомендация для stage-gate.

---

## Заключение

**Стратегический ориентир:** дневной план сосредоточен на **переходе от эшелона 0 к stage-gate 1→2**, минуя тупиковую ветку повторных бенчмарков DSP на free-v1. Ключевые движители:

1. **Trends `DRONE_TIGHT`** как боевой путь на чистом FFT (выполнено в эпике #84, нужна только promotion в prod).
2. **VDR-калибровка** на реальных городских данных (закроет precision-разрыв до 85%+ или обнаружит необходимость нейро).
3. **Zero-shot детекторы** (CLAP/YAMNet) как параллельный путь к Этапу 1.B (не блокирует, но ускоряет gate).
4. **Отказ от DSP-доделок** (cepstral/flux как боевые), перевод на диагностику.

По завершении этих задач система будет готова либо к gate-прохождению через VDR-validated ensemble, либо к pivot на нейро-детекторы с гарантией P≥85%/R≥90%. **Многоузловая архитектура остаётся заморожена** до этого момента.