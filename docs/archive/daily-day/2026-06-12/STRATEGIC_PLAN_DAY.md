<!--
  archive-role: archive-snapshot
  archive-day: 2026-06-12
  archived-at: 2026-06-12T20:31:20.111Z
  source: docs/STRATEGIC_PLAN_DAY.md
  canonical: docs/STRATEGIC_PLAN_DAY.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-06-12T05:26:53.226Z (yarn plan:day) -->
<!-- Период: последние сутки (since="1 day ago"); горизонт: следующий день -->
<!-- Источник цели: WHITE_PAPER.md -->

# План на следующий день | Membrana
## 2026-06-12

---

## 1. Что сделано за период (последние сутки)

### Клиент (`apps/client`)
- **Trends FFT Sample Analyzer** (bc0dfef): новый плагин для анализа сэмплов из библиотеки с созданием и сохранением пользовательских шаблонов; UI для фильтрации по спектральным, временным и расширенным метрикам.
- **AudioFrameFeed** (ff5c8b5): унифицированная инфраструктура для подачи аудиокадров от микрофона, sample-library и device-board в analyzer-плагины; миграция `fft-threshold-test` и `harmonic-detector-viz`.
- **Sample Playback Hub** (03d206d): воспроизведение сэмплов с controls (seek, pause), визуализация waveform, экспорт.
- **Template Editor** (d996182): CRUD редактор пользовательских шаблонов trends-FFT с метрикой `frameHitRatio` (50–80%) и автозаполнением от последнего анализа.
- **Match Breakdown UI** (655acf1): топ-3 рейтинг совпадений, таблицы по полям, collapsible секции.

### Сервисы (`packages/services/*`)
- **trends-detector-service** (9b40fa4): новый сервис (analyzer) с классификацией сцен, подсчётом `frameHitRatio`, экспортом `buildTemplateMatchBreakdown`.
- **audio-engine**: расширения для playback-offset и buffer-player (seek/pause).

### Background-сервер (`packages/background-media`)
- **NestJS+Fastify+Prisma** (4147361): локальный data-plane для образцов и шаблонов trends; PostgreSQL, blob-storage, REST API для devices/collections/samples/trends-templates; Docker Compose для dev-окружения.

### Документация и инфра
- **BACKGROUND_SERVERS.md** (d35c904): определение границ фоновых серверов, статус `background-media` как A5.
- **BACKGROUND_MEDIA_*_PROMPT.md**: три промпта для A5a (сервер), A5b (Docker), A5c (развёртывание).
- **Архивирование**: закрыты таски #55 (analyzer-frame-feed-refactor) и #56 (trends-fft-microphone-plugin).

---

## 2. Привязка к стратегической цели

### Текущий этап по WHITE_PAPER
Находимся в **Этапе 1.A–1.B** (DSP + Neural эшелон на одном узле):
- ✅ `fft-analyzer` (Этап 0) — стабилен.
- ✅ `harmonic-detector-service` (Этап 1.A) — существует.
- ✅ `trends-detector-service` (Этап 1.B) — нейросетевой классификатор сцен (не явная БПЛА-нейросеть, но аналайзер).
- 🔴 **Шлюз stage-gate 1→2 НЕ пройден** — нет единого бенчмарка детекторов (precision ≥ 85%, recall ≥ 90%) на разном датасете (см. WHITE_PAPER §8).

### Что приближает к цели
1. **Тренды и шаблоны** — техника отбора спектральных признаков (frameHitRatio, scoring) подходит для будущего ensemble детекторов; переиспользуемо.
2. **AudioFrameFeed** — стандартизирует поток кадров на одном узле, готовит основу для фьюжена наблюдений (Этап 2–3).
3. **Background-media** — инфраструктура для хранения датасетов, необходимых для stage-gate (см. DETECTOR_BENCHMARK.md).

### Что нейтрально / отвлекает
- **Sample playback + trends шаблоны** — это аналитические инструменты для экспериментатора, а не часть ядра Membrana; готовят датасет, но прямо не приближают к многоузловому детекшену.
- **Пользовательские шаблоны в localStorage** — локальная персистентность, хорошо для UX, но не ядро архитектуры.

### Недостающие сервисы (критические для Этапа 2+)
По дорожной карте WHITE_PAPER §8:
1. **`@membrana/detection-ensemble-service`** (analyzer) — агрегатор результатов детекторов 1.A–1.B с gate-логикой; **надо создать перед stage-gate**.
2. **`@membrana/tdoa-service`** (analyzer, Этап 2) — **ЗАМОРОЖЕН** до stage-gate 1→2.
3. **`@membrana/localizer-service`** (analyzer, Этап 3) — **не начинался**.
4. **`@membrana/tracker-service`** (analyzer, Этап 4) — **не начинался**.
5. **`@membrana/transport-service`** (foundation, Этап 2) — шина событий узел↔сервер; контракт наблюдений (AcousticObservation); **не начинался**.

---

## 3. Риски и долг

### Технические риски
1. **Stage-gate 1→2 не закрыт** — нет обязательного бенчмарка (DETECTOR_BENCHMARK.md) с таблицей precision/recall для лучшего одиночного детектора или ensemble. **Без этого**: Этап 2 (TDOA, мультилатерация) остаётся заморожен; инвестиции в многоузловую архитектуру могут быть напрасны при слабом детекторе.
   - **Действие**: задача A3b (см. раздел 4) — создать датасет и бенчмарк.

2. **Background-media интеграция отложена** — NestJS-сервер поднят, но `apps/client` не подключен к HTTP API. Нет механизма синхронизации сэмплов между UI и backend. **Риск**: дублирование данных, потеря истории.
   - **Действие**: задача A6a (см. раздел 4) — интеграция клиента с background-media.

3. **Контракт наблюдений** (WHITE_PAPER §7) не кодифицирован в `@membrana/core`. Нет типов `AcousticObservation`, `Track` в схеме. **Без этого**: сервисы Этапа 2+ будут гадать о формате события.
   - **Действие**: задача A2a (см. раздел 4) — стабилизировать контракт в core.

### Накопленный долг
- **AudioFrameFeed** — свежий, но покрывает только микрофон и sample-library; `device-board` stub пока не реальный.
- **Trends-detector-service** — хорошо работает наFFT-данных, но не обучена на реальных БПЛА (использует synthetic templates); нужна переподготовка.
- **UI слой trends** — много компонентов (TrendsCreateTemplate, MatchBreakdown, etc.), потребуется рефакторинг при добавлении новых модальностей.

### Нарушения границ пакетов
- Пока не видны критические нарушения ARCHITECTURE.md / SERVICES.md.
- `trends-detector-service` корректно не зависит от других analyzer-сервисов, только от `core` + `audio-engine` (для типов окна).

---

## 4. План на следующий день

### A1. Стабилизировать контракт наблюдений в `@membrana/core`

**Цель:** Кодифицировать типы `AcousticObservation`, `Track`, `DetectionEvent` для единого формата между узлом и fusion-сервисом.

**Пакет:** `@membrana/core` (foundation, infra-tier).

**Связь с WHITE_PAPER:** §7 (контракт наблюдения), §4.6 (слой слияния данных), принцип 5 (открытый формат событий).

**Definition of Done:**
1. Тип `AcousticObservation` с полями: `nodeId`, `capturedAt`, `syncedAt`, `features` (spectrum, fundamentals, snr), опциональный `bearing`.
2. Тип `Track` с полями: `id`, `classification`, `position` (x, y, z), `velocity`, `covariance`, `firstSeenAt`, `lastUpdatedAt`.
3. Union-тип `DetectionEvent = AcousticObservation | TrackUpdate`.
4. Экспорт из `src/index.ts`; примеры в README.

**Роль:** Структурщик (ревью архитектуры) + Математик (типы координат/ковариации).

**Размер:** M.

---

### A2a. Создать бенчмарк-инфраструктуру для детекторов (Stage-Gate)

**Цель:** Скелет `docs/DETECTOR_BENCHMARK.md` с таблицей метрик, протоколом запуска `yarn benchmark:detectors`, и интеграцией с background-media для датасета.

**Пакет:** Документация + интеграция background-media (infra).

**Связь с WHITE_PAPER:** §8 (stage-gate 1→2), `DETECTOR_BENCHMARK.md` как обязательный артефакт; принцип Single-Node Detection First.

**Definition of Done:**
1. `docs/DETECTOR_BENCHMARK.md` с описанием тестового набора, метрик (TP/FP/FN/precision/recall), таблица сравнения (harmonic vs cepstral vs DSP-ensemble).
2. Скрипт `yarn benchmark:detectors` (или `scripts/benchmark-detectors.ts`) с выводом JSON + markdown.
3. Указание на датасет в background-media (коллекция samples для stage-gate).
4. CI-интеграция: бенчмарк запускается при PR к detectors/*.

**Роль:** Музыкант (метрики на данных) + Структурщик (CI/скрипты).

**Размер:** L.

---

### A2b. Подготовить датасет для stage-gate (образцы БПЛА + неправильно определяемые сигналы)

**Цель:** Загрузить в background-media коллекцию sample-ов (не менее 100 фрагментов) с разметкой для бенчмарка.

**Пакет:** background-media (data-plane).

**Связь с WHITE_PAPER:** §8 (Single-Node Detection First), `DATASET.md` (структура данных).

**Definition of Done:**
1. Коллекция `stage-gate-1-dataset` в background-media.
2. Samples размечены: класс (drone/not-drone), ground-truth (если применимо).
3. Минимум 100 фрагментов: 60 дрона, 40 ложные срабатывания/шум.
4. REST API на background-media возвращает список сэмплов для скрипта бенчмарка.

**Роль:** Музыкант (сбор/разметка данных) + Структурщик (загрузка в backend).

**Размер:** L.

---

### A3. Создать `@membrana/detection-ensemble-service` (analyzer)

**Цель:** Сервис агрегации результатов от harmonic-detector + cepstral-detector + trends-detector с простой логикой голосования (majority voting) и stage-gate кодом.

**Пакет:** `packages/services/detectors/ensemble-service` (analyzer).

**Связь с WHITE_PAPER:** §8 Этап 1.B, консилиум single-node-detection-first; принцип 1 (локальная автономность узла).

**Definition of Done:**
1. Тип `EnsembleConfig` с весами детекторов и threshold согласованности.
2. Функция `aggregateDetections(obs1, obs2, obs3) => EnsembleResult` с votingLogic.
3. Stage-gate хук: `isGatePassed(metrics: DetectionMetrics) => boolean` (проверка precision ≥ 85%, recall ≥ 90%).
4. Unit-тесты на мок-детекциях; экспорт из `src/index.ts`.

**Роль:** Структурщик (архитектура ensemble) + Математик (voting logic).

**Размер:** M.

---

### A4. Наладить интеграцию client ↔ background-media

**Цель:** Подключить `apps/client` к REST API background-media для загрузки/сохранения samples и trends-templates.

**Пакет:** `apps/client` + `@membrana/media-library-service` (analyzer).

**Связь с WHITE_PAPER:** §7 (датасет и доказательная база); MEDIA_LIBRARY_ARCHITECTURE.md и BACKGROUND_SERVERS.md.

**Definition of Done:**
1. HTTP-клиент в `@membrana/media-library-service` для background-media endpoints (GET /devices/{id}/samples, POST /collections/{id}/samples).
2. При загрузке sample в UI: синхронизация с backend (не только localStorage).
3. Trends-templates: persistence переходит с localStorage на backend.
4. Тест-демонстрация: загрузить sample в client, проверить его в background-media.

**Роль:** Верстальщик (HTTP-интеграция) + Структурщик (синхронизация).

**Размер:** M.

---

### A5. Уточнить роль background-media в фьюзене (Этап 2+)

**Цель:** Документировать, как background-media будет хранить логи узлов, буферы и события трекинга для режима расследования (rewind).

**Пакет:** Документация (`docs/BACKGROUND_SERVERS.md` расширение).

**Связь с WHITE_PAPER:** §4.6 (ситуационный слой), §9 (доказательная база и приватность).

**Definition of Done:**
1. Раздел в BACKGROUND_SERVERS.md: «Хранилище узловых буферов и истории трекинга».
2. Схема Prisma: таблица `NodeAudioBuffer` (nodeId, capturedAt, bufferRef, ttl); таблица `TrackEvent` (trackId, eventTime, position).
3. Примеры API: GET /nodes/{id}/buffer?from=X&to=Y (для вытягивания буфера узла).
4. TTL-политика: буферы живут N часов, события — M дней.

**Роль:** Структурщик + Математик (schema).

**Размер:** S.

---

### A6. Разведочный коммит: каркас `@membrana/transport-service` (foundation)

**Цель:** Создать заготовку сервиса для транспорта событий узел→сервер с контрактом `Event` и местом для стратегий (HTTP REST, WebSocket, MQTT stub).

**Пакет:** `packages/services/transport-service` (foundation).

**Связь с WHITE_PAPER:** §6 (таблица соответствия слоёв и пакетов), Этап 2 (синхронизация и TDOA требуют надёжного транспорта).

**Definition of Done:**
1. Каркас `src/service.ts` с базовым типом `TransportConfig` и методом `send(event: AcousticObservation)`.
2. Заглушки для трёх транспортных стратегий: HTTP, WebSocket, MQTT (в `src/strategies/`).
3. Не реализовываем логику — только интерфейсы и типы.
4. Экспорт из `src/index.ts` без функциональности.

**Роль:** Структурщик (архитектура каркаса).

**Размер:** S.

---

### A7. Подновить `docs/DATASET.md`

**Цель:** Уточнить требования к датасету для single-node detection и этапов 2+ (структура, разметка, источники).

**Пакет:** Документация.

**Связь с WHITE_PAPER:** §8 (бенчмарк и датасет), DETECTOR_BENCHMARK.md как дочерний документ.

**Definition of Done:**
1. Таблица распределения классов (drone/не-drone/неизвестный).
2. Спектральные параметры образцов (частота дискретизации, длительность, SNR).
3. Ссылка на коллекцию в background-media.
4. Планы расширения для Этапа 2 (синхронизированные пары узлов, TDOA-данные).

**Роль:** Музыкант + Структурщик.

**Размер:** S.

---

## 5. Что НЕ делаем на этом горизонте

1. **Трекинг целей** (Этап 4) — отложен до успешного прохождения stage-gate 1→2. Нет смысла реализовывать фильтр Калмана, если основной детектор не надёжен.

2. **Мультилатерация и TDOA** (Этап 2–3) — **заморожены** до stage-gate (см. WHITE_PAPER §8). Любые попытки начать TDOA-сервис будут отклонены на ревью.

3. **RF-анализатор и модальность видео** (Этап 6) — не входят в обязательный план. Могут быть пилотом параллельно, но не блокируют сдачу Этапа 1.

4. **Развёртывание в продакшене на множество физических узлов** — сейчас разработка только на ноутбуке + симуляция; полевые испытания — после Этапа 3.

5. **Оптимизация latency для боевых сценариев** — сейчас фокус на **качестве детекции**, а не на `p95 < 3с` (этот метрик — в WHITE_PAPER §11 как цель проекта, но не обязателен для текущего горизонта).

---

## 6. Проверки в конце периода

### Артефакты
1. ✅ `docs/DETECTOR_BENCHMARK.md` с таблицей сравнения трёх детекторов, результаты бенчмарка в JSON.
2. ✅ Коммит в `@membrana/core` с типами `AcousticObservation`, `Track`, `DetectionEvent`.
3. ✅ Новый пакет `packages/services/detectors/ensemble-service` с функцией `aggregateDetections` и stage-gate логикой.
4. ✅ Коммит в background-media: коллекция `stage-gate-1-dataset` с минимум 100 размеченных сэмплов.

### Метрики
1. ✅ Лучший одиночный детектор на датасете: **precision ≥ 85%** или **ensemble precision ≥ 88%** (намек на stage-gate).
2. ✅ `yarn benchmark:detectors` выполняется за < 5 минут и выдаёт markdown-таблицу.
3. ✅ Интеграция client ↔ background-media: sample загружается через UI и появляется в backend API.

### Демонстрация
1. 🎬 Запустить `yarn benchmark:detectors` на stage-gate-1-dataset; показать результат.
2. 🎬 Загрузить sample в trends-fft-analyzer через UI; сохранить template в backend; перезагрузить страницу; template всё ещё там.
3. 🎬 Вызвать `aggregateDetections()` на трёх детекторах; показать согласованность.

### Review & Approval
- 📋 Teamlead ревьюит DETECTOR_BENCHMARK.md и согласует, близки ли мы к stage-gate pass (если нет, то что именно слабо).
- 📋 Структурщик проверит ARCHITECTURE.md / SERVICES.md соответствие новых пакетов.
- 📋 Музыкант валидирует датасет (распределение классов, разметка).

---

## Итого: Направление движения

За период мы **усилили инструменты для анализа одного узла** (trends, sample playback, template editor) и **заложили инфраструктуру backend** (background-media). Текущий приоритет — **закрыть stage-gate 1→2**, чтобы разблокировать Этап 2 (TDOA, локализация, многоузловая архитектура).

**Стратегический риск:** если датасет покажет, что лучший детектор даёт precision < 85%, то потребуется или переподготовка нейросети, или пересмотр подхода (например, добавить модальность RF). План на следующий день учитывает эту неопределённость через задачи A2a–A2b (подготовка бенчмарка) и A3 (ensemble для улучшения).