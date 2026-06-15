<!-- Сгенерировано: 2026-06-15T06:19:08.763Z (yarn plan:day) -->
<!-- Период: последние сутки (since="1 day ago"); горизонт: следующий день -->
<!-- Источник цели: WHITE_PAPER.md -->

# План на следующий день — Membrana (2026-06-15)

## 1. Что сделано за период (последние сутки)

### Инфраструктура и платформа

1. **Night Build завершён (NB0–NB3 checkpoints)**  
   Docs: `NIGHT_BUILD_ACTIVE.md`, `NIGHT_BUILD_LOG.md`, `NIGHT_SPRINT_REGULATION.md` зафиксировали чек-пойнты для ночного цикла сборки. Regulation уточняет фазы NB0 (prep), NB1 (core), NB2 (hardening), NB3 (handoff). Практический результат — снизили риск регрессии при нестабильной сети.

2. **Cabinet MP4 / MP5 / MP6 — полный цикл платформы (MP4, MP5, MP6)**  
   - MP4: кво́та за мембрану из тарифа (`device-limits.ts`, миграция `mp4_device_membrane`)
   - MP5: облачный журнал телеметрии (`journal.controller`, `journal.service`, UI `JournalPage`)
   - MP6: итоговый дым-тест всей платформы после merge
   - Граничная проблема: `bcrypt` timeout на CI, решена увеличением timeout в `vitest.config.ts`

3. **Sample Playback Service — новый foundation-сервис**  
   `packages/services/sample-playback/` → вынесен из `apps/client` в отдельный пакет с LRU-кешем (N=20), lifecycle hooks, тестами. Переиспользуется в `cabinet` и `client`. Это **правильный шаг** в сторону composition.

4. **Tariff Dataset v1 — DS1–DS5 завершены**  
   - DS1: корпус `free-v1` (120 × 5s WAV, real audio)
   - DS2: доменная модель (`bundled-catalog.ts`, `collection-ids.ts`)
   - DS3: бандл в `apps/client/public/catalog/`
   - DS4: benchmark runner v0.2 (`benchmark-detectors.mjs`)
   - DS5: серверная каталогизация (`catalog-provision.service.ts`, idempotent seed)
   - Результат: в `background-media` live продакшен-каталог, доступный и client-у, и cabinet-у.

5. **Prisma и CI — изоляция клиентов между пакетами**  
   `background-cabinet` и `background-media` теперь имеют **собственные** Prisma-клиенты (`src/prisma/client.ts`) для избежания conflicts на CI. Миграции разделены по пакетам.

### Клиент и сервисы

6. **Cabinet SampleLibrary UI — single-column layout + playback**  
   Вертикальная компоновка: сборка → player-panel → таблица с inline-строкой для выбранного семпла и waveform-визуализацией в ячейке. Компонент `CabinetSampleTable` переиспользует `sample-playback-service`. **Позитив:** чистое разделение ответственности (service ↔ UI).

7. **Node Connection & Pairing — prod API URLs и unlink**  
   `apps/client/.env.development` + `apps/client/vite.config.ts` для prod API; новый endpoint `PATCH /pair/{id}/unlink`, UI-компонент `MembraneLinkedPanel`, мониторинг статуса через `usePairStatusMonitor`. Smoke-тест `_ssh-cabinet-pair-unlink-prod.mjs` валидирует 401 после revoke.

---

## 2. Привязка к стратегической цели

### Текущая позиция в дорожной карте

**Стадия:** Параллельно работают **Этап 0–1.A** (фундамент + DSP-детекторы) и **Этап 0 инфраструктуры платформы** (Cabinet, Journal, Quotas).

**Карта статус:**
- ✅ Этап 0: `audio-engine`, `fft-analyzer` стабильны; foundation-слой целостен.
- ⏳ Этап 1.A: DSP-детекторы (`harmonic-`, `cepstral-`, `spectral-flux-`) в scaffolds; benchmark v0.2 готов, но **детекторы ещё не интегрированы в единый ensemble**.
- ❌ Stage-gate 1→2: **`DETECTOR_BENCHMARK.md` не содержит актуальных метрик** (Precision ≥ 85%, Recall ≥ 90%); шлюз заморожен, TDOA в консервации.
- ⏸️ Этапы 2–7: TDOA, мультилатерация, трекинг, классификация — **на паузе до stage-gate**.

### Что приближает к цели

1. **Tariff Dataset v1** → включает реальный corpus (120 семплов дронов и не-дронов) — критически важно для **валидации детекторов на stage-gate 1→2**.
2. **Sample Playback Service** → переиспользуемая foundation для анализа семплов в UI; облегчает добавление плагинов-анализаторов.
3. **Cabinet Sample Library** → демонстрирует путь от сырых WAV → tagged catalog → UI-плеер; это инфраструктура, на которой будет ехать **детектор-интеграция** (плагины показывают результаты анализа).

### Что нейтрально или отвлекает

- **Membrane Platform (MP4–MP6):** квоты, журналы, pairing — важны для **production-ready**, но не приближают к **детекции дронов**. На горизонте этапов 1–3 это инфра-долг, необходимый но параллельный основной задаче.
- **Cabinet UI сложность:** single-column layout, waveform scrubber — полезны для demo, но затягивают ресурсы от реализации детекторов.

### Критически недостающие сервисы

По коммитам видно, что **scaffold'и существуют**, но не реализованы:

| Сервис | Статус | Блокирует |
|--------|--------|-----------|
| `@membrana/harmonic-detector-service` | Scaffold | Stage-gate 1→2 |
| `@membrana/cepstral-detector-service` | Scaffold | Stage-gate 1→2 |
| `@membrana/spectral-flux-detector-service` | Scaffold | Stage-gate 1→2 |
| `@membrana/detection-ensemble-service` | Plan | Stage-gate 1→2 |
| `@membrana/yamnet-detector-service` | Plan (1.B) | Этап 1.B |
| `@membrana/tdoa-service` | Frozen (Stage 2) | Этап 2 |
| `@membrana/localizer-service` | Plan | Этап 3 |
| `@membrana/tracker-service` | Plan | Этап 4 |

**Вывод:** Первый приоритет — **завершить реализацию DSP-детекторов и запустить stage-gate 1→2**.

---

## 3. Риски и долг

### Технический долг

1. **Детекторы в scaffold'е**  
   Три пакета (`harmonic-`, `cepstral-`, `spectral-flux-`) объявлены, но код незавершён. Отсутствует:
   - Реализация математических ядер (FFT-обработка, гармонический анализ, cepstrum).
   - Unit-тесты с мок-аудио.
   - Интеграция в `detection-ensemble-service`.
   - Бенчмарк на `free-v1` корпусе (v0.2).

2. **Stage-gate 1→2 не открыт**  
   `DETECTOR_BENCHMARK.md` не обновлен после DS4. Критерии (P ≥ 85%, R ≥ 90%) неясны для текущего состояния. Формальный шлюз для перехода к TDOA / мультиузлу не может быть закрыт.

3. **Prisma миграции** — теперь разделены по пакетам, но CI-тесты требуют изоляции. Риск race-condition при параллельных миграциях `background-cabinet` и `background-media` на одной БД (решено, но требует постоянного внимания).

### Архитектурные нарушения (не обнаружены)

Граф зависимостей соблюдается:
- `sample-playback-service` → `@membrana/core` + `audio-engine` ✅ (foundation-правило)
- Cabinet → `sample-playback-service` ✅ (client может зависеть от сервисов)
- Детекторы → `detector-base` + `audio-engine` ✅ (специальное правило для семейства)

### Известные ограничения WHITE_PAPER

1. **Синхронизация времени между узлами** (§5.2) — для TDOA нужен джиттер < 1 мс. Сейчас нет `TimeSyncProvider`; это тип, зарезервированный как `@experimental @stage 2`.

2. **Многолучёвость и отражения** (§9, таблица рисков) — решение через GCC-PHAT и geometry redundancy отложено до stage-gate.

3. **Скорость звука зависит от погоды** (§5.3) — адаптивная модель на узле требует `weather-sensor` или простой приближающей функции; это не критично для Этапа 1.A (одиночная детекция).

---

## 4. План на следующий день

### Задача 4.1 — Реализовать `harmonic-detector-service` на чистом TypeScript

**Цель:** Детектор, выделяющий гармонические пики в спектре (основной признак дрона: кратные частоты вращения винтов).

**Пакет / слой:** `packages/services/detectors/harmonic-detector-service` → analyzer.

**Связь с WHITE_PAPER:**  
- §1e (Этап 1.A — DSP-эшелон, один узел)
- §5.1 (Акустический портрет: 80–250 Гц + гармоники до 2–5 кГц)
- White Paper §8, stage-gate 1→2

**Definition of Done:**
1. Класс `HarmonicDetectorService` в `src/service.ts`:
   - Метод `detect(spectrum: Float32Array, sampleRate: number): DetectionResult`
   - На входе спектр (из `fft-analyzer`), на выходе `{ isDetected: boolean, confidence: 0–1, fundamentals: number[] }`
   - Логика: поиск пиков выше SNR-threshold, группировка в гармонические ряды
2. Unit-тесты в `src/service.test.ts`:
   - Synthetic drone spectrum (4 гармоники 100 Гц) → обнаруживает
   - White noise → не обнаруживает
   - Птица (непериодический шум) → не обнаруживает или confidence < 0.5
3. React hook `useHarmonicDetector(config)` в `src/hooks.ts`
4. Экспорт в `src/index.ts` контрактов `DroneDetector`, `DetectionResult`, `HarmonicConfig`

**Роль:** Математик (реализация ядра), Структурщик (scaffold + тесты).

**Размер:** M (чистая математика без сложных зависимостей, ~300 LOC).

---

### Задача 4.2 — Реализовать `cepstral-detector-service` на чистом TypeScript

**Цель:** Детектор на основе cepstrum-анализа — более робастный к окружающему шуму, чем гармонический.

**Пакет / слой:** `packages/services/detectors/cepstral-detector-service` → analyzer.

**Связь с WHITE_PAPER:**  
- §1e (Этап 1.A, независимая реализация)
- §8 (DSP-эшелон, объяснимые признаки)

**Definition of Done:**
1. Класс `CepstralDetectorService`:
   - Метод `detect(spectrum: Float32Array, ...): DetectionResult`
   - Преобразование: спектр → log-спектр → IFFT (cepstrum) → поиск пиков в cepstral domain
   - Выход: гармонический период (в семплах), confidence
2. Unit-тесты:
   - Синтетический дрон → период обнаружен верно
   - Птица → период не найден или шум
3. Hook `useCepstralDetector(config)`
4. Экспорт в `index.ts`

**Роль:** Математик.

**Размер:** M (cepstrum классический алгоритм, но реализация требует аккуратности с IFFT).

---

### Задача 4.3 — Запустить benchmark детекторов на `free-v1` корпусе (v0.2)

**Цель:** Получить метрики Precision, Recall, F1 для каждого детектора на реальном корпусе из DS1, заполнить `DETECTOR_BENCHMARK.md`.

**Пакет / слой:** `scripts/benchmark-detectors.mjs` + `docs/DETECTOR_BENCHMARK.md`.

**Связь с WHITE_PAPER:**  
- §8 (Stage-gate 1→2: precision ≥ 85%, recall ≥ 90%)
- §11 (метрики успеха: доля ложных тревог < 5%)

**Definition of Done:**
1. Обновить `benchmark-detectors.mjs`:
   - Загрузить корпус из `data/detectors-benchmark/v0.2/` (уже есть после DS4)
   - Для каждого детектора (`harmonic-`, `cepstral-`, `spectral-flux-`, позже `yamnet-`) запустить на всех семплах
   - Собрать TP, FP, FN, TN → вычислить P, R, F1
2. Заполнить таблицу в `DETECTOR_BENCHMARK.md`:
   ```
   | Детектор | Precision | Recall | F1 | Latency p95 (ms) |
   |----------|-----------|--------|-----|------------------|
   | harmonic | 0.87 | 0.91 | 0.89 | 45 |
   | ...      | ...  | ...  | ...  | .. |
   ```
3. Вывод: **Stage-gate открыт?** (Y/N) — если лучший детектор или ensemble ≥ P85, R90 → Y, иначе N.
4. Фиксирование результатов в коммите (датой бенчмарка).

**Роль:** Структурщик (CI/инструменты), Математик (анализ метрик).

**Размер:** M (скрипт готов, нужна только интеграция новых детекторов).

---

### Задача 4.4 — Интегрировать детекторы в `detection-ensemble-service`

**Цель:** Один пакет, который вызывает все готовые детекторы и агрегирует результаты (среднее confidence, consensus).

**Пакет / слой:** `packages/services/detection-ensemble-service` → analyzer (plan, требует реализации).

**Связь с WHITE_PAPER:**  
- §8 (Этап 1.B перед Neural — DSP ensemble)
- §4.4 (Слияние модальностей — одна шина для всех аналайзеров)

**Definition of Done:**
1. Класс `DetectionEnsembleService`:
   - Поле `detectors: DroneDetector[]` (гармонический, cepstral, spectral-flux)
   - Метод `detect(spectrum, ...): DetectionResult` — вызывает все, агрегирует
   - Стратегия: `confidence = mean(det.confidence)` или взвешенная
2. Unit-тесты:
   - Все детекторы согласны → confidence ≈ 1.0
   - Один детектор False Positive → ensemble снижает confidence
3. Hook `useDetectionEnsemble(...)`
4. **Не добавлять** нейросетевые детекторы на этом этапе (они в 1.B).

**Роль:** Структурщик.

**Размер:** S (это просто агрегатор, логика простая).

---

### Задача 4.5 — Создать UI-плагин для просмотра результатов детекции в Cabinet SampleLibrary

**Цель:** При выборе семпла в таблице показывать боковую панель с результатами всех детекторов (гармонический: confidence 0.92, cepstral: 0.88, etc.).

**Пакет / слой:** `apps/cabinet/src/components/sample-library/` + новый плагин в `apps/cabinet/src/plugins/detection-results/`.

**Связь с WHITE_PAPER:**  
- §8, §1c (Плагины регистрируются через MembranaRegistry)
- Stage-gate 1→2 требует **визуализации** результатов для валидации

**Definition of Done:**
1. Компонент `DetectionResultsPanel.tsx`:
   - Таблица: детектор | confidence | fundamentals | latency (ms)
   - Color-код: зелёный (>0.85), жёлтый (0.5–0.85), красный (<0.5)
2. Плагин `detectionResultsPlugin.ts`:
   - Регистрация через `MembranaRegistry.registerPlugin()`
   - Lifecycle: `install()` → подписка на выбранный семпл, загрузка спектра, запуск ensemble
3. Integration in `CabinetSampleTable.tsx` (добавить колонку "Анализ" с кнопкой)
4. Smoke-тест: выбрать drone-семпл → panel открывается → confidence > 0.8 для большинства детекторов

**Роль:** Верстальщик (UI), Структурщик (плагин registration).

**Размер:** M (UI простой, но требует понимания plugin lifecycle).

---

### Задача 4.6 — Заполнить `DATASET.md` v0.2 финальными статистиками

**Цель:** Документировать корпус `free-v1` (количество, классы, продолжительность, source, license, metadata).

**Пакет / слой:** `docs/DATASET.md`.

**Связь с WHITE_PAPER:**  
- §8 (Принцип Single-Node Detection First опирается на датасет)
- §11 (Воспроизводимость метрик)

**Definition of Done:**
1. Таблица: Класс | Кол-во | Мин/макс длительность | Источник | Лицензия
   ```
   | drone (multi-rotor) | 45 | 4.8s–5.2s | DJI / Autel / ... | CC0 / proprietary |
   | drone (fixed-wing) | 8 | ... | ... | ... |
   | not-drone (bird) | 20 | ... | ... | ... |
   | not-drone (traffic) | 35 | ... | ... | ... |
   | not-drone (wind) | 12 | ... | ... | ... |
   ```
2. Итого: 120 семплов, 600 секунд аудио
3. Split рекомендуемый: train 60%, val 20%, test 20% (для будущих фаз)
4. Файлы: `data/detectors-benchmark/v0.2/manifest.json` (уже есть после DS1) + README в папке

**Роль:** Документалист (Teamlead).

**Размер:** S (сбор статистики, написание таблиц).

---

## 5. Что НЕ делаем на этом горизонте

1. **TDOA и многоузловая синхронизация**  
   Stage-gate 1→2 заморожен до достижения Precision ≥ 85%, Recall ≥ 90% на одиночном узле. Детекция дрона должна быть **надёжной**, прежде чем масштабировать сеть. (WHITE_PAPER §8, принцип Single-Node Detection First.)

2. **Нейросетевые детекторы (YAMNet, CLAP)**  
   Этап 1.B начинается только после завершения DSP-эшелона (4.1–4.3). Не добавляем deep learning на этапе 1.A.

3. **Локализацию и мультилатерацию**  
   TDOA-сервис, локализер, трекер остаются в консервации (`@experimental @stage 2` в core). Их ревью / реализация отложена.

4. **Расширение Cabinet на RF или видео**  
   Сейчас Cabinet ориентирован на образцы (`sample-library`) и телеметрию. Другие модальности (RF-приёмник, видео-верификация) — Этап 6, после успешного Этапа 4.

5. **Масштабирование UI до десятков узлов**  
   Ситуационная карта (раздел 4.6 WHITE_PAPER) остаётся skeleton'ом; real-time отрисовка треков и счётчик дронов — Этап 4+. Пока демонстрируем на одиночных данных.

---

## 6. Проверки в конце периода

1. **Три DSP-детектора реализованы и протестированы**  
   Коммиты в `packages/services/detectors/{harmonic,cepstral,spectral-flux}-detector-service/src/service.ts` содержат работающий код + unit-тесты. Каждый пакет имеет README с примерами использования. ✅ Артефакты: PRs #[N], код, тесты.

2. **Benchmark запущен на `free-v1`, метрики в `DETECTOR_BENCHMARK.md`**  
   Таблица с P/R/F1 для каждого детектора и ensemble. Вывод: "Stage-gate 1→2 готов к открытию (Y)" или "Требуется доработка (N, причина)". ✅ Артефакт: обновленный `DETECTOR_BENCHMARK.md`, коммит с датой бенчмарка.

3. **Cabinet Sample Library UI показывает результаты анализа**  
   При открытии SampleLibraryPage, выборе семпла и нажатии "Анализ" → боковая панель с таблицей детекторов и их confidence. Визуализация работает на реальных семплах из `free-v1`. ✅ Артефакт: скриншоты / видео, компоненты в `apps/cabinet/`.

4. **Detection Ensemble Service интегрирован**  
   Пакет `detection-ensemble-service` экспортирует `DroneDetector` и используется в UI-плагине. Вызовов к отдельным детекторам больше нет в клиенте; все идут через ensemble. ✅ Артефакт: импорты в `apps/cabinet/src/plugins/`, тесты в пакете.

5. **Граф зависимостей соблюдается (noncompliance ≈ 0)**  
   `yarn build` + `yarn test` выполняются без ошибок. Нет циклических зависимостей между детекторами. Prisma-клиенты изолированы. ✅ Артефакт: зелёный CI/CD.

6. **Документация актуальна**  
   `DATASET.md` v0.2 заполнен статистикой. `DETECTOR_BENCHMARK.md` содержит финальные метрики. `README.md` в каждом новом пакете объясняет, как его использовать. ✅ Артефакт: документация в `docs/`, в каждом пакете `README.md`.

---

## Заключение

**Период направлен на закрытие Этапа 1.A** (DSP-детекторы на одном узле) и **подготовку к stage-gate 1→2**. Инфра-работа (MP4–MP6, Cabinet) идёт параллельно, обеспечивая демо-возможности и production-readiness. Ключевой артефакт периода — **валидированный набор детекторов дрона на реальном корпусе**, который откроет путь к многоузловой архитектуре (Этапы 2–4).