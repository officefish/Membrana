# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-05-16T06:16:50.671Z |
| Команда | `yarn consilium` |
| Модель | claude-haiku-4-5-20251001 |
| Файл | `docs/seanses/single-node-detection-first-2026-05-16.md` |
| Порядок ролей | Музыкант → Teamlead → Структурщик → Математик → Верстальщик |
| GitHub Issue | #47 |
| Повестка | `docs/prompts/SINGLE_NODE_DETECTION_FIRST_PROMPT.md` |

**Вопрос:**

Консилиум по task-промпту Single-Node Detection First: согласовать stage-gate 1→2, заморозку TDOA, связь с активной задачей dsp-drone-detector (#45), структуру packages/services/detectors/, метрики precision≥85%/recall≥90%, порядок следующих промптов и риски.

---

# Консилиум: Single-Node Detection First — stage-gate и пересмотр дорожной карты

**Повестка:** Согласование пересмотра WHITE_PAPER с введением stage-gate 1→2, заморозка TDOA до прохождения шлюза, структура пакетов `packages/services/detectors/*`, метрики детекции (precision ≥85%, recall ≥90%), связь с активной задачей #45 (dsp-drone-detector), порядок реализации детекторов.

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант, Верстальщик (Rodchenko).

**Порядок реплик:** Музыкант → Teamlead → Структурщик → Математик → Верстальщик

---

[Музыкант]: Слушаю. Самый насущный вопрос для меня — будет ли на этапе 1.A / 1.B (DSP и Neural) реальный аудиопоток с микрофона или это чистая обработка заранее записанных сэмплов? Потому что если реальный поток, то нужна интеграция с `audio-engine-service`, а значит, детекторы должны работать с `LiveSampler` и оконными буферами. Если только файлы и тесты — проще, но менее практично.

[Teamlead]: Хороший вопрос. Я предлагаю начать с **потоковой архитектуры с первого дня** — детектор получает окно аудио (`AudioWindow` — Float32Array + sr + timestamp) независимо от источника. На этапе 1.A/1.B мы заполняем датасет реальными записями дронов и шумом фона, но **live-интеграцию** с микрофоном и UI подкручиваем во втором-третьем детекторе (harmonic + cepstral = проверяем архитектуру, yamnet = уже с live-UI). Это убирает архитектурный риск и даёт раннее ревью потокового контракта.

[Структурщик]: Согласен. Это значит, что каждый детектор в `packages/services/detectors/<name>/` экспортирует через `src/index.ts` интерфейс `DroneDetector` с методом `detect(window: AudioWindow): Promise<DetectionResult>`. В `ARCHITECTURE.md` добавляем раздел «Семейства детекторов» с явным указанием: нет циклических зависимостей между детекторами, каждый зависит только от `@membrana/core` и `@membrana/audio-engine-service` (для типов `AudioWindow`). Базовый пакет `@membrana/detector-base` содержит интерфейсы и утилиты (окно, normalization), остальные его переиспользуют.

[Математик]: Стоп. `AudioWindow` я создаю или он приходит из engine? Если engine, то мне нужен контракт: что внутри — частота дискретизации, временная метка, разрешение буфера? Потому что FFT, гармоники, цепстр требуют **чистые** данные без артефактов обвязки. И ещё: `confidence` в `DetectionResult` — это вероятность или ratio сигнал/шум? Если вероятность, то используем лосс-функцию из нейросети, если ratio, то это метрика DSP. Это влияет на объединение результатов нескольких детекторов.

[Верстальщик]: Я пока слушаю, но уже вижу, что UI позволит переключаться между детекторами в live-режиме и выбирать ensemble-стратегию. Это значит, что мне нужна структура: карточка детектора (name, family, live confidence, reasoning), табло ensemble-результата, лог вызовов. А если есть `features` в результате, то можно показать спектраграмму или мелкие метрики для отладки. Вопрос к Teamlead: это в scope первого этапа UI или отложено на 1.B?

[Teamlead]: UI с переключением детекторов — **отложено на 1.B / Stage 2**. На 1.A фокус на том, чтобы детекторы вообще работали и давали результаты. Но **контракт** `DroneDetector` и `DetectionResult` обязан быть готов для UI-использования. Значит, `confidence` — **числитель вероятности** от 0 до 1, калиброванное из обучения (для neural) или порога (для DSP). `reasoning` — optional, для отладки. На `features` договоримся в промпте для harmonic-детектора конкретно.

[Музыкант]: Логично. Тогда мне нужна гарантия: если я беру один detector и хочу слышать дрон в наушниках после детекции, есть ли у него latency-бюджет? Потому что `Promise<DetectionResult>` может быть async и медленным, а пользователь ждёт сигнала в наушниках. Это влияет на то, где живёт детектор: в Web Worker, на сервере или в main thread.

[Teamlead]: На 1.A детекторы — **синхронные JavaScript + Wasm** в main thread, никакого remote-вычисления. На 1.B (neural, agentic) можем перейти на вызовы сервера (`background-office`), но это блокируется stage-gate — не делаем это раньше времени. `latencyMs` в результате — обязательное поле, чтобы отслеживать, не ломаем ли мы реактивность UI.

[Структурщик]: Давайте я уточню структуру файлов в scaffolding. Каждый пакет детектора:

```
packages/services/detectors/<name>/
├── package.json          # @membrana/<name>-detector-service
├── tsconfig.json         # composite: true, ref на core
├── vite.config.ts
├── README.md
└── src/
    ├── index.ts          # экспорт DroneDetector + DetectionResult
    ├── detector.ts       # класс <Name>Detector implements DroneDetector
    ├── math/             # чистые вычисления (если есть)
    ├── types.ts
    └── __tests__/        # юнит-тесты на контракт
```

И `packages/services/detectors/base/` содержит:
- `AudioWindow` (type из audio-engine)
- `DroneDetector`, `DetectionResult` (интерфейсы)
- `DetectorRegistry` (для регистрации детекторов, если потребуется)
- утилиты: `normalizeAudio()`, `windowBuffer()` и т.п.

Все детекторы импортируют `@membrana/detector-base`. Правильно?

[Математик]: Почти. Но не из `detector-base`, а из `@membrana/audio-engine-service` (для `AudioWindow`) и из отдельного пакета `@membrana/detector-commons` — утилиты обработки. Или `detector-base` переиспользует что-то из engine? Если да, то зависимость: `detector-base` → `audio-engine-service`. Если нет — `detector-base` остаётся standalone (только core). Какой вариант?

[Teamlead]: `detector-base` зависит от `audio-engine-service` для `AudioWindow` — это правильно. `@membrana/detector-base` импортирует интерфейсы, дефолтные константы, может содержать `normalizeAudio()` как shared utility. Зависимостей между самими детекторами быть не должно — каждый независимый `dsp` или `neural` слуга на одной карте.

[Верстальщик]: Ясно. Тогда если UI когда-нибудь покажет список активных детекторов и их режимы (live, batch, disabled), это будет плагин, который регистрирует `DetectorRegistry.getAll()` и рендерит карточки. Слой UI остаётся отделён от ядра детекции. Хорошо.

[Музыкант]: Вернусь к real-time части. Есть ли между harmonic и cepstral детектором общая инфраструктура? Типа, оба работают на FFT, обе дают спектр. Если повторяют код FFT, это нарушение слабой связанности. Может, выделить `@membrana/spectral-commons` с предпосчитанным спектром?

[Структурщик]: Опасный путь. Если выделить `spectral-commons` — это становится foundation, и тогда harmonic, cepstral, spectral-flux все из неё зависят. Лучше: каждый детектор пишет свою FFT (код маленький, копипаст приемлем) либо — если это назойлёво — создаём один foundation `@membrana/spectral-analysis-service` с `computeSpectrum()`, но только если > 3 детекторов его переиспользуют. На 1.A давайте без фундамента, только `detector-base`.

[Математик]: Согласен. И ещё важный момент: как тестировать контракт? На 1.A нет реального датасета, значит, пишем мок-буферы (синусоидальные волны, белый шум, их смеси). Каждый детектор должен пройти минимальный набор unit-тестов:
- Pure sine 440 Hz → должен вернуть `isDrone: false`
- Harmonic series 100 + 200 + 300 Hz (дрон) → `isDrone: true`
- White noise → `isDrone: false`
- Это гарантирует, что интерфейс работает и логика не полностью сломана.

[Teamlead]: Обязательное требование. Добавляю в DoD: каждый детектор имеет 3–5 unit-тестов на контракт с мок-данными. `yarn test:detectors` должен зелениться.

[Верстальщик]: А каков визуальный контракт для отображения результата детекции в UI (когда это станет актуальным)? Просто значок с `confidence`? Или карточка с `features`?

[Teamlead]: Сейчас забиваем на UI, но в `DESIGN.md` добавим placeholder-раздел: «Карточка детектора» (макет отложен на 1.B). Вкратце: иконка семейства (DSP / Neural / Agentic) + name + confidence-bar + опциональный `reasoning`. На `features` не полагаемся.

[Структурщик]: Тогда я уточню ARCHITECTURE.md: раздел «Детекторы и их семейства»:

```markdown
## Детекторы дронов (Single-Node Detection First)

### Архитектура

- `@membrana/detector-base` — интерфейсы, типы, общие утилиты.
- `@membrana/<name>-detector-service` — реализация конкретного детектора (DSP / Neural / Agentic).

Зависимости:
- Каждый детектор: `@membrana/core` + `@membrana/audio-engine-service` (для `AudioWindow`)
- Детекторы НЕ зависят друг от друга
- `detector-base` зависит от `audio-engine-service`

### Семейства

| Семейство | Детекторы | Статус 1.A | Статус 1.B |
|-----------|-----------|-----------|-----------|
| DSP | harmonic, cepstral, spectral-flux | Реализация | Отложено |
| Neural | yamnet, clap | Scaffold | Реализация |
| Agentic | agentic-claude | Scaffold | Реализация |

### Контракт

```typescript
interface DroneDetector {
  readonly name: string;
  readonly family: 'dsp' | 'neural' | 'agentic';
  detect(window: AudioWindow): Promise<DetectionResult>;
}

interface DetectionResult {
  isDrone: boolean;
  confidence: number; // [0, 1], calibrated from training/threshold
  reasoning?: string; // optional, for debugging
  features?: Record<string, number>;
  latencyMs: number;
}
```

Калибровка confidence:
- DSP: порог с запасом → 0..1
- Neural: выход softmax / sigmoid
- Agentic: нормализованная оценка модели
```

Это выглядит?

[Математик]: Хорошо. Но добавь в ARCHITECTURE: «Stage-gate 1→2: лучший детектор (или ensemble) достигает precision ≥85% и recall ≥90% на тестовом наборе задачи. До прохождения шлюза Этап 2 (TDOA, мультиузел) остаётся заморожен.»

[Teamlead]: Добавляю. И вот ещё важное: **заморозка TDOA**. Сейчас в активной разработке находится `packages/services/tdoa/`. Я предлагаю:
- Перенести этот пакет в milestone «Stage 2 — Network» как `@experimental @stage 2`.
- Добавить в README TDOA и в типы аннотацию `@experimental`.
- Любые новые работы по TDOA — блокируются до прохождения stage-gate.
- Существующий код остаётся, не удаляется, просто исключается из active CI-конфига (если мешает).

[Структурщик]: Я помню, что TDOA использует `SyncedTimestamp`, `TimeSyncProvider`, `TdoaResult`. Эти типы куда деть? Оставить в ядре как preserved, или переместить в `@membrana/tdoa-service`?

[Teamlead]: Оставить в ядре (`@membrana/core/types/`) как `@experimental` с комментарием «для Stage 2». Если что-то из этого понадобится для детекторов на 1.A/1.B, мы выломаем. Но я не вижу пересечений.

[Музыкант]: Хорошо. Тогда у меня есть риск: если на 1.A детекторы работают в main thread синхронно, а потом на 1.B переходим на async (сервер, нейросеть), не будет ли рассинхрона между детекторами? То есть, harmonic вернул за 10 ms, а yamnet за 500 ms?

[Teamlead]: Это обработается на уровне UI / ensemble. На 1.A детекторы просто работают параллельно (Promise.all или Promise.race), на 1.B добавляем таймаут и fallback. Но это уже тема для промпта ensemble-сервиса.

[Верстальщик]: Мне остаётся уточнить: есть ли в scope 1.A интеграция с UI (хотя бы plugholder для детектора в меню), или чистая CLI `yarn test:detectors`?

[Teamlead]: На 1.A — только CLI и unit-тесты. Никакого плагина. На 1.B планируем `detection-ui-plugin`, который будет читать `DetectorRegistry` и показывать карточки активных детекторов. Это задача для промпта `DETECTION_UI_PLUGIN_PROMPT.md` после stage-gate.

[Структурщик]: Тогда в scaffolding добавляю CLI-утилиту: `yarn test:detectors` (запуск всех unit-тестов), `yarn bench:detectors --detector=harmonic` (заглушка для future `DETECTOR_BENCHMARK.md`). Правильно?

[Teamlead]: Да. И ещё: `yarn lint:detectors` должен покрывать все пакеты в `packages/services/detectors/`. Это в turbo.json.

[Математик]: Ладно. Тогда уточню контракт на `AudioWindow`. Из `audio-engine-service` берём:

```typescript
interface AudioWindow {
  samples: Float32Array;
  sampleRate: number;
  timestamp: number; // milliseconds or seconds?
  duration: number;
}
```

Нужна ясность: `timestamp` в миллисекундах от начала потока или абсолютное время? И `duration` — это длина окна (samples.length / sampleRate)?

[Teamlead]: Timestamp в **миллисекундах от начала потока** (DOMHighResTimeStamp эквивалент). Duration в **секундах** (samples.length / sampleRate). Это согласуется с Web Audio API. Добавляю в `detector-base`.

[Музыкант]: Подожди. А если источник — файл, а не микрофон? Timestamp какой тогда?

[Teamlead]: Timestamp = (currentSamplePosition / sampleRate) * 1000. То есть, прогресс в файле. Так работает и для потока, и для файла.

[Верстальщик]: Ясно. Тогда, когда UI заработает, легко будет связать timestamp детекции с позицией на временной шкале редактора. Хорошо.

[Структурщик]: Теперь вопрос о реестре. Где хранится список активных детекторов в runtime? В `MembranaRegistry` (как плагины) или в отдельном `DetectorRegistry`?

[Teamlead]: Пока создаём отдельный `DetectorRegistry` в `detector-base`. На 1.B, когда UI появится, может слиться с `MembranaRegistry`. Сейчас просто: `DetectorRegistry.register(detector)` в каждом пакете детектора (экспортируется из `src/index.ts`).

[Математик]: И как тестировать ensemble? Если есть 6 детекторов, а их нельзя зависимо импортировать, то как написать `ensembleVote()`?

[Teamlead]: Ensemble — это задача **следующего** промпта (`DETECTION_ENSEMBLE_SERVICE_PROMPT.md`), а не этого. На 1.A каждый детектор живёт отдельно, в `__tests__` каждый тестируется изолированно. На 1.B напишем фасад `@membrana/detection-ensemble-service`, который зависит от всех детекторов (это один случай, когда допускается зависимость от нескольких сервисов) и реализует voting / averaging / confidence-weighted fusion.

[Структурщик]: Лучше добавить в ARCHITECTURE раздел: «Ensemble как Stage 2+». И в `INTEGRATIONS_STRATEGY.md` указать, что это блокируется stage-gate, не начинаем разработку до прохождения.

[Teamlead]: Согласен. Добавляю в DoD: обновить `INTEGRATIONS_STRATEGY.md` § 4 с таблицей четырёх эшелонов:
1. **Single-Node Detection First** (1.A/1.B) — детекторы, контракты, stage-gate.
2. **Stage 2: Network** — TDOA, мультиузел (заморожен до gate).
3. **Stage 2.5: Ensemble** — voting, confidence fusion (после gate).
4. **Stage 3+: Advanced** — real-time локализация, map-building, feedback loops.

[Верстальщик]: Это значит, что в `INTEGRATIONS_STRATEGY.md` появляется trade-off таблица: качество детекции (1 узел) vs latency vs complexity?

[Teamlead]: Да. Каждый эшелон имеет свой набор trade-off'ов. На 1.A: качество >> скорость. На Stage 2: качество = скорость (сеть добавляет задержку). На Stage 3: неизвестно.

[Музыкант]: Хорошо. Тогда для меня минимум на 1.A: гарантия, что `detect()` вернёт результат за < 100 ms на обычном ноутбуке (макбук M1 / Windows i7). Это добавляю как acceptance criterion для каждого детектора?

[Teamlead]: Да. В промптах реализации каждого детектора (harmonic, cepstral и т.д.) добавляю: «latencyMs должен быть < 100 на тестовом наборе». Это часть unit-тестов.

[Структурщик]: И последний вопрос: как организовать GitHub Issues для 10 задач (8 детекторов + 2 мета)? Они все в одном milestone `single-node-detection-first` или разделены по этапам (1.A / 1.B)?

[Teamlead]: Один milestone `Stage 1: Single-Node Detection`. Issues:
- **Meta:** `#?? Benchmark infrastructure`, `#?? Dataset bootstrap` (с меткой `task-type:infra`)
- **DSP (1.A):** 3 issues (harmonic, cepstral, spectral-flux) с меткой `stage:1a`
- **Neural/Agentic (1.B):** 3 issues (yamnet, clap, agentic) с меткой `stage:1b`, blocked until 1.A green
- **Meta:** `#?? Scaffolding packages/services/detectors/*` (текущий промпт) + `#?? TDOA freeze & Stage 2 setup`

Всего 8–10 issues. Плюс один `meta:stage-gate-criteria` issue для отслеживания метрик.

[Математик]: Согласен. Я возьму на себя создание контрактов в `detector-base` и проверку unit-тестов для первых двух детекторов (harmonic, cepstral). Правильно?

[Teamlead]: Да. Dynin, ты:
1. Пишешь `packages/services/detectors/base/src/` (интерфейсы, типы, утилиты).
2. Пишешь unit-тесты на контракты (мок-буферы).
3. Ревьюишь первый детектор (harmonic) когда выйдет.

[Структурщик]: Я беру на себя:
1. Scaffolding всех 6 пакетов детекторов (tsconfig, vite, package.json, placeholder).
2. Обновление `turbo.json` (добавить `test:detectors`, `lint:detectors`).
3. Обновление ARCHITECTURE.md раздел детекторов.
4. PR с открытием всех 8–10 GitHub Issues.

[Музыкант]: Мне нужно ли что-то делать на 1.A?

[Teamlead]: На 1.A для тебя: добавить в `DESIGN.md` placeholder «Карточка детектора» (макет, поля, responsive). Это нужно для того, чтобы Верстальщик потом быстро понял, как рендерить результаты.

[Верстальщик]: Спасибо. Я беру на себя:
1. Добавление в `DESIGN.md` (детектор-карточка, ensemble-статус, features-display).
2. Создание пустого плагина-stub `detection-results-viewer-plugin` (на 1.B включится).

[Teamlead]: Отлично. Тогда итоговый план:

**Phase 0 (этот консилиум → спецификация):**
- Согласованы контракты, зависимости, stage-gate.
- Созданы GitHub Issues.

**Phase 1 (Ozhegov, Dynin, Rodchenko параллельно, 1–2 дня):**
- Ozhegov: scaffolding `packages/services/detectors/*`.
- Dynin: `detector-base`, unit-tests.
- Rodchenko: `DESIGN.md` placeholder, stub-плагин.

**Phase 2 (Dynin, потом harmonic-промпт, 2–3 дня):**
- Первый детектор (harmonic) как эталон.
- Unit-тесты + latency check.

**Phase 3 (параллельно дальше):**
- Остальные DSP-детекторы (cepstral, spectral-flux).
- Benchmark инфраструктура.
- Dataset bootstrap.

**Stage-gate review (после 1.A полный):**
- Все DSP-детекторы работают.
- Метрики: precision ≥85%, recall ≥90% (если есть тестовый датасет).
- **Решение:** перейти на 1.B (neural, agentic) или заморозить на 1.A?

[Музыкант]: Принимаю. Единственное: если на 1.B детекторы станут async (сервер), нужна гарантия backwards-compatibility контракта `detect()`. То есть, можно вернуть `Promise<DetectionResult>` без изменения сигнатуры?

[Teamlead]: Да, контракт уже `Promise<DetectionResult>`, поэтому 1.A может быть синхронный (оборачиваем в `Promise.resolve()`), а 1.B async. Никакого breaking change.

[Верстальщик]: Принимаю. В `DESIGN.md` буду учитывать оба сценария (быстрый результат, медленный результат с loader).

[Структурщик]: Принимаю. Scaffolding начинаю сразу после merge консилиума.

[Математик]: Принимаю. Спецификация детекторов в `detector-base` напишу параллельно.

[Teamlead]: Отлично. Тогда финализируем. Остаётся уточнить риски:

**Риск 1:** dsp-drone-detector (#45) уже в работе (Структурщик занят). Как не конфликтовать?

**Решение:** #45 работает на своей ветке, её результаты влияют в harmonic-детектор (#?). После merge этого консилиума (#45 может либо слиться в harmonic, либо остаться отдельной заглушкой для миграции. Уточним в планировании дня.

**Риск 2:** Stage-gate требует датасета (precision/recall). Но датасета нет до `DATASET_BOOTSTRAP_PROMPT.md`.

**Решение:** На 1.A тестируем на мок-данных (синусоиды, белый шум). На gate используем малый синтетический датасет (типы дронов × фоновый шум). Это достаточно для gate.

**Риск 3:** Если ensemble не реализуем на 1.A, как мы вообще сравниваем детекторы?

**Решение:** Каждый детектор тестируется отдельно (confusion matrix, metrics.py скрипт). На gate выбираем лучшего по precision/recall. Ensemble — это опция, не необходимость для gate.

[Верстальщик]: Принимаю риски.

[Музыкант]: Принимаю риски.

[Структурщик]: Принимаю риски.

[Математик]: Принимаю риски.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| **Stage-gate 1→2** | Precision ≥85%, recall ≥90% на тестовом наборе (синтетический или бутстраповый датасет). Лучший детектор / ensemble открывает путь на Этап 2 (TDOA, мультиузел). |
| **Заморозка TDOA** | `packages/services/tdoa/` помечается `@experimental @stage 2`, перемещается в milestone «Stage 2 — Network», исключается из active CI. Типы `SyncedTimestamp`, `TimeSyncProvider`, `TdoaResult` остаются в ядре как preserved. |
| **Структура детекторов** | 6 пакетов в `packages/services/detectors/*`: base + harmonic + cepstral + spectral-flux + yamnet + clap + agentic-claude. Каждый реализует `DroneDetector`, зависит только от `@membrana/core` + `@membrana/audio-engine-service`. Нет зависимостей между детекторами. |
| **Контракт `DroneDetector`** | `detect(window: AudioWindow): Promise<DetectionResult>` с полями: `isDrone`, `confidence` (0–1, calibrated), `reasoning?`, `features?`, `latencyMs`. `AudioWindow` из `audio-engine-service`: `samples`, `sampleRate`, `timestamp` (мс от начала потока), `duration` (сек). |
| **Метрики latency** | < 100 ms на обычном ноутбуке (M1 / i7) для каждого детектора. Это acceptance criterion в промптах реализации. |
| **Unit-тесты на контракт** | Каждый детектор имеет 3–5 юнит-тестов с мок-буферами (sine, harmonics, white noise). `yarn test:detectors` зелёный перед merge. |
| **Phase 1 работы** | Параллельно: Ozhegov (scaffolding), Dynin (detector-base + контракты), Rodchenko (DESIGN.md + stub-плагин). 1–2 дня. |
| **Первый детектор (harmonic)** | Эталон для остальных. Реализация после Phase 1 в отдельном промпте. Dynin ревьюит контракт, Ozhegov — интеграцию. |
| **Обновлённые документы** | WHITE_PAPER.md (Этап 1.A/1.B + gate), ARCHITECTURE.md (раздел детекторов), INTEGRATIONS_STRATEGY.md (4 эшелона + trade-off), DESIGN.md (карточка детектора). Скелеты: DETECTOR_BENCHMARK.md, DATASET.md. |
| **GitHub Issues** | 10 issues: 3 DSP (1.A) + 3 Neural/Agentic (1.B, blocked) + 2 Meta (benchmark, dataset) + 1 Scaffolding (текущий) + 1 Stage-gate criteria. Milestone: «Stage 1: Single-Node Detection». |
| **Связь с #45 (dsp-drone-detector)** | #45 не расширяется. После merge консилиума: уточняем в планировании дня — либо слияние результатов в harmonic (#??), либо #45 остаётся reference-реализацией. |
| **Порядок следующих промптов** | 1. `HARMONIC_DETECTOR_IMPLEMENTATION_PROMPT.md` (Dynin). 2. Остальные DSP (Dynin / volunteers). 3. `DETECTOR_BENCHMARK_INFRASTRUCTURE_PROMPT.md` (Структурщик). 4. `DATASET_BOOTSTRAP_PROMPT.md` (Meta). 5. `STAGE_GATE_1_TO_2_REVIEW_PROMPT.md` (Teamlead). 6. Neural/Agentic детекторы (параллельно). 7. `DETECTION_ENSEMBLE_SERVICE_PROMPT.md` (для Stage 2.5). |
| **Ensemble на 1.A** | Не реализуем. Каждый детектор — standalone. Ensemble — отдельный сервис `@membrana/detection-ensemble-service` на Stage 2.5 (блокируется gate). |
| **Live интеграция в UI** | На 1.A только CLI и unit-тесты. На 1.B добавляем `detection-ui-plugin` (читает `DetectorRegistry`, показывает карточки, переключение). DESIGN.md уже подготовит макет. |

**Definition of Done:**

- [ ] **White papers & architecture:** WHITE_PAPER.md (gate), ARCHITECTURE.md (детекторы), INTEGRATIONS_STRATEGY.md (эшелоны) обновлены и reviewed Vesnin.
- [ ] **Scaffolding:** 6 пакетов в `packages/services/detectors/*` с tsconfig, vite, package.json, placeholder-реализацией, README, turbo.json updated.
- [ ] **Контракты:** `detector-base` экспортирует `DroneDetector`, `DetectionResult`, `AudioWindow`, утилиты.
- [ ] **Unit-тесты:** Мин. 3 теста на мок-данных в каждом пакете (template в detector-base).
- [ ] **GitHub Issues:** 10 issues созданы и организованы в milestone, links обновлены в WHITE_PAPER, ARCHITECTURE.
- [ ] **Freezing:** `@experimental @stage 2` добавлены к TDOA, milestone создана.
- [ ] **DESIGN.md & UI:** Карточка детектора в DESIGN.md, stub-плагин зарегистрирован.
- [ ] **CI:** `yarn lint:detectors`, `yarn test:detectors` зелёные. Turbo build passes.
- [ ] **LGTM:** Vesnin одобрил PR.
- [ ] **Переориентировка дня:** После merge — `yarn main-day-issue` указывает на harmonic-детектор как центральную задачу дня.

**Риски и миtigations:**

| Риск | Mitigation |
|------|-----------|
| #45 (dsp-drone-detector) конфликтует | Уточнение в планировании; результаты #45 → harmonic или отдельный reference. |
| Нет датасета для gate | Используем синтетические + простые мок-данные на 1.A; реальный датасет bootstraps параллельно. |
| Ensemble нужен немедленно | Не нужен на 1.A; каждый детектор тестируется отдельно; voting реализуем на gate или Stage 2.5. |
| Latency-требование не достижимо | Это constraint для реализации; если не достигается, используем async + Web Worker для 1.B. |

---

*Реплик в диалоге: 45; каждый участник высказался не менее одного раза. Консенсус достигнут.*
