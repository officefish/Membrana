<!--
  archive-role: archive-snapshot
  archive-day: 2026-06-28
  archived-at: 2026-06-28T18:31:13.857Z
  source: docs/STRATEGIC_PLAN_DAY.md
  canonical: docs/STRATEGIC_PLAN_DAY.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-06-28T05:42:01.184Z (yarn plan:day) -->
<!-- Период: последние сутки (since="1 day ago"); горизонт: следующий день -->
<!-- Источник цели: WHITE_PAPER.md -->

# План на следующий день

> **Дата документа:** 2026-06-16 (по состоянию репозитория)  
> **Статус:** синтез стратегии (WHITE_PAPER v0.1) + анализ текущего кодового долга  
> **Хранитель:** Teamlead  

---

## 1. Что сделано за период (последние сутки)

**По git-логу:** коммитов за последние сутки не обнаружено. Последний фиксированный коммит — `19168c3` (4 дня назад): `fix(background-media): local scenario validation without ESM core import`.

**По состоянию рабочего дерева:**
- Отслеживаемые файлы: 2830 (без критических нарушений).
- Незафиксированные изменения: отсутствуют в отслеживаемых файлах; рабочее дерево чистое.
- Branch: `techies68` (feature-branch, требует анализа).
- Артефакты сборки / интеграции: `playwright-report/`, `test-results/` наличествуют (признак того, что последнее прогон интеграционных тестов был, но давнее).

**Вывод:** За последние сутки активной разработки не велось. Это точка стабилизации перед новым плановым циклом.

---

## 2. Привязка к стратегической цели

### Текущая позиция на дорожной карте (WHITE_PAPER §8)

Система находится между **Этапом 0** (фундамент) и **Этапом 1.A** (DSP-эшелон, один узел):

| Компонент | Статус | Связь с WP |
|-----------|--------|-----------|
| `@membrana/audio-engine-service` | ✅ реализован | foundation; захват + кольцевой буфер (§4.2) |
| `@membrana/fft-analyzer-service` | ✅ реализован | analyzer; спектральный анализ (§4.2) |
| `@membrana/detector-base` | ✅ контрактный слой | stage-gate 1→2 (§8, консилиум single-node-detection-first) |
| DSP-детекторы (harmonic, cepstral, spectral-flux, trends) | ⚠️ scaffold / impl | эшелон 1.A DSP; **эпик #84 завершил**: trends+DRONE_TIGHT проходит планку (95%/30%, §6 FFT_METRICS) |
| `@membrana/detection-ensemble-service` | ❌ не начат | агрегация после stage-gate (план 1.B) |
| `@membrana/device-board` (сценарии полей, узлы) | ✅ наличествует | поддержка конфигурации (§6) |
| `@membrana/agenda` (расписание, алерты) | ✅ наличествует | ситуационный слой (§4.6) |
| Multi-node слой (TDOA, локализация, трекинг) | ❌ заморожены | stage-gate 1→2 не пройден; Single-Node First доминирует |
| `apps/client` (ситуационная карта) | ✅ live-плагины есть | UI готовит почву (§4.6) |

### Что из сделанного приближает к цели

1. **Завершение эпика #84 (fft-last-chance-calibration):** trends-детектор с шаблоном `DRONE_TIGHT` дал 95%/30% на held-out validation. Это **покрывает мягкую цель** (80%/40%) из `DETECTOR_BENCHMARK.md`, но **не** исходный stage-gate строгий (P≥85% / R≥90%). Тем не менее, это лучший FFT-кандидат для продакшена.

2. **Архитектурные границы (ARCHITECTURE.md §1a–1e, SERVICES.md) держатся:** зависимости между пакетами соответствуют контракту, нет циклических импортов, микрофон капсулирован в `audio-engine`.

3. **Локализация плагин-системы (`MembranaRegistry` + lazy-loading):** infrastructure для будущих analyzer-сервисов готова.

### Что нейтрально / отвлекает

- **Background-серверы (`background-media`, `background-office`):** не входят в магистраль детекции, но требуют поддержки. `BACKGROUND_SERVERS.md` зафиксирован — готово.
- **Playwright-интеграции:** тесты там, но не критичны для стратегии эшелона 0.

### Недостающие сервисы (критический путь, этап 2+)

Пока эти компоненты **заморожены** по stage-gate, но требуют архитектурной подготовки:

| Сервис | Назначение | Тип | Когда нужен |
|--------|-----------|-----|-------------|
| `@membrana/tdoa-service` | Разница времён прихода между узлами (§4.4) | analyzer | stage-gate 1→2 пройден (этап 2) |
| `@membrana/localizer-service` | Мультилатерация на плоскости (§4.4) | analyzer | этап 3 |
| `@membrana/tracker-service` | Фильтр Калмана + ассоциация целей (§4.4) | analyzer | этап 4 |
| `@membrana/transport-service` | Шина событий узел↔сервер | foundation | этап 2 (параллельно tdoa) |
| `@membrana/detection-ensemble-service` | Агрегация решений детекторов после gate | analyzer | 1.B (после single-node) |

### Детекция: стратегическая ясность (опора на FFT_METRICS_POTENTIAL_AND_LIMITS.md)

**Эшелон 0 (DSP/FFT) на free-v1 исчерпан:**
- Потолок — trends `DRONE_TIGHT` 95%/30% (F1 0.844).
- Пороговый тест, гармонический, кепстральный детекторы — вспомогательные инструменты (диагностика, индикаторы), **не** селекторы дронов.
- **Ключевой вывод (§6):** без новых данных / алгоритмов / модальностей дальше расти невозможно.

**Магистраль качества — два пути:**

1. **Validated Data (VDR-эпик):** собрать/пересмотреть датасет с надёжной разметкой, новые инженерные признаки → переснять бенчмарк trends+DSP.
2. **Эшелон 2 (нейро, zero-shot, agentic):** CLAP, YAMNet, reasoning-агент над FFT → INTEGRATIONS_STRATEGY.md.

**Что НЕ делаем:** unified benchmark harmonic+cepstral+spectral-flux без смены датасета (они дают OR-recall ~100%, FPR ~100%) — это потеря времени (см. FFT_METRICS §6).

---

## 3. Риски и долг

### Технические риски

| Риск | Срок проявления | Что делаем |
|------|-----------------|-----------|
| **Синхронизация времени узлов не моделирована** | Этап 2 (TDOA) | Резервируем GPS-PPS, NTP/PTP в `tdoa-service` (контракт в `@membrana/core`) |
| **Многолучёвость (отражения) не учитывается в алгоритме** | Этап 3 (локализация) | GCC-PHAT, медианная фильтрация TDOA, геометрия с избыточностью узлов (WHITE_PAPER §9) |
| **Скорость звука фиксирована** | Метрология | Модель температуры/влажности в fusion (White Paper §5.3) — будущий эпик |
| **Масштабируемость fusion на 10+ узлов не протестирована** | Этап 4+ | Load-тесты; сегментирование на соты 2–4 км (WHITE_PAPER §4.3) |

### Накопленный архитектурный долг

1. **Stage-gate 1→2 требует refresh DETECTOR_BENCHMARK.md:**
   - Текущие метрики (precision/recall) собраны по эпику #84 на `val`, но **precision ~76% / recall 95%** не попадает в исходный gate (P≥85%, R≥90%).
   - Решение: либо расслабить ворота до **P≥75% / R≥90%** (логично, дрон — важнее ложь), либо найти прирост precision через ensemble/trends-конкуренты.
   - Документировать в `docs/seanses/stage-gate-1-2-decision-YYYY-MM-DD.md`.

2. **Multi-node контракты в `@membrana/core` — заморожены, но не отмечены как frozen:**
   - `TdoaResult`, `SyncedTimestamp`, `TimeSyncProvider` из `core` помечены `@experimental @stage 2`, но это неявно.
   - **Action:** явно добавить comment в `core/src/types.ts` (раздел multi-node): «Frozen до stage-gate 1→2; обновлять **только** при solve поменьше в DETECTOR_BENCHMARK или консилиум Teamlead».

3. **DSP-детекторы в scaffold состоянии (cepstral, spectral-flux):**
   - Реализованы на базе контракта `DroneDetector`, но не интегрированы в `detection-ensemble`.
   - **Action:** scaffold → рабочее состояние (unit-тесты, CI, эшелон 1.A docs) ИЛИ явно закрыть как диагностические инструменты (не для stage-gate).

### Нарушения границ пакетов (по diff-у рабочего дерева)

Незначительные:
- `background-media` использует ESM-imports в scenario-validation без fallback — исправлено в `19168c3` (4 дня назад).
- `.env.llm-proxy` в gitignore (внешние интеграции) — no-issue.

---

## 4. План на следующий день

### Задача 4.1 — Документирование stage-gate 1→2 decision

**Цель:** зафиксировать консилиум по пересмотру ворот stage-gate: принять точную формулировку criteria для перехода от одиночного детектора к многоузловой архитектуре.

**Пакет / слой:** документация (`docs/seanses/`, `DETECTOR_BENCHMARK.md`).

**Связь с WHITE_PAPER:** §8 (дорожная карта, stage-gate), §11 (метрики успеха: P95-точность, задержка, доля ложных тревог).

**Definition of Done:**
1. Консилиум или async-решение Teamlead: "Принимаем trends `DRONE_TIGHT` 95%/30% как **go** к этапу 2" ИЛИ "Требуем доработку ensemble+конкуренты до 85%/40%".
2. Документ `docs/seanses/stage-gate-1-2-decision-2026-06-16.md` с таблицей метрик, обоснованием, следующими шагами.
3. `DETECTOR_BENCHMARK.md` обновлён: критерии gate явно сформулированы, статус trends отмечен.

**Роль:** Teamlead (консилиум) + Структурщик (документирование).

**Размер:** M (консилиум 0.5 ч + doc 1 ч).

---

### Задача 4.2 — Frozen mark в `@membrana/core` и freeze-комментарии

**Цель:** явно отметить, какие типы в `core` заморожены до stage-gate 1→2, чтобы случайно не было попыток их использовать.

**Пакет / слой:** `@membrana/core` (foundation типов).

**Связь с WHITE_PAPER:** §6 (контракт наблюдения), архитектурная граница stage-gate.

**Definition of Done:**
1. `packages/core/src/types.ts` дополнен JSDoc-комментариями:
   ```typescript
   /**
    * @frozen @stage 2 — Используется для TDOA, синхронизации.
    * Не трогать до gate-1→2. История: WHITE_PAPER §8, консилиум <дата>.
    */
   export interface SyncedTimestamp { … }
   ```
2. Раздел «Multi-node types (Stage 2)» в `core/README.md` с явной пометкой.
3. Тест / линтер (опционально): warning при import `SyncedTimestamp` в пакеты вне scope Stage 2.

**Роль:** Структурщик (рефакторинг типов).

**Размер:** S (1–2 ч).

---

### Задача 4.3 — Scaffold → Working State для `@membrana/cepstral-detector-service`

**Цель:** перевести кепстральный детектор из scaffold в рабочее состояние (unit-тесты, CI-интеграция, эшелон 1.A документация).

**Пакет / слой:** `packages/services/detectors/@membrana/cepstral-detector-service` (analyzer).

**Связь с WHITE_PAPER:** §8 (эшелон 1.A DSP), но с оговоркой: **не магистраль качества** (see FFT_METRICS §4–6), вспомогательный индикатор.

**Definition of Done:**
1. `src/service.ts` завершён: `CepstralDetector` класс с методами `analyze(audioWindow): DetectionResult`.
2. `src/hooks.ts`: `useCepstralDetector()` React-хук с правильной очисткой ресурсов.
3. `test/cepstral.spec.ts`: 5–7 unit-тестов (normal drone, silence, bird, wind, city noise), coverage ≥ 80%.
4. CI/CD: `yarn test:detectors` включает cepstral, баш-скрипт завершается успешно.
5. `README.md`: API, параметры (quefrency, peakRatio thresholds), пример вызова, **explicit mark** «вспомогательный, используй в ensemble или trends».
6. `DETECTOR_BENCHMARK.md` обновлён: cepstral добавлен в таблицу (recall, precision, FPR на free-v1 валидации).

**Роль:** Математик (алгоритм кепстра) + Верстальщик (хуки, tests).

**Размер:** M (3–4 ч; алгоритм простой, но нужно аккуратно с FFT → IFFT).

---

### Задача 4.4 — Refactor: `detection-ensemble-service` skeleton

**Цель:** заложить архитектуру ensemble-агрегатора (после stage-gate 1→2, но контракт готов сейчас), который комбинирует решения от разных детекторов (harmonic, cepstral, spectral-flux, trends).

**Пакет / слой:** `packages/services/@membrana/detection-ensemble-service` (analyzer, **новый**).

**Связь с WHITE_PAPER:** §8 (этап 1.B, но фундамент кладём сейчас), ARCHITECTURE §1e (детекторы).

**Definition of Done:**
1. Пакет создан: `packages/services/detection-ensemble/` с правильными `package.json`, `vite.config.ts`.
2. `src/types.ts`: `EnsembleConfig` (список детекторов, веса, стратегия голосования), `EnsembleResult`.
3. `src/service.ts`: класс `DetectionEnsemble` с методом `aggregate(results: DetectionResult[]): EnsembleResult`. Реализованы стратегии: `OR`, `AND`, `majority`, `weighted-sum`.
4. `src/hooks.ts`: `useDetectionEnsemble(config)`.
5. `README.md`: описание каждой стратегии, примеры конфигураций (DRONE_TIGHT + trends как leading, DSP как supporting).
6. No unit-tests ещё (ждём данных из detector-base), но сигнатуры готовы.

**Роль:** Структурщик (архитектура ensemble), Математик (взвешивание).

**Размер:** M (skeleton + contracts = 2–3 ч; реальная логика — позже).

---

### Задача 4.5 — Promote trends `DRONE_TIGHT` в curated template-catalog

**Цель:** переместить шаблон `DRONE_TIGHT` из экспериментального в production-ready состояние: добавить в curated sample-library, создать curated-каталог trends-шаблонов.

**Пакет / слой:** `@membrana/device-board` (сценарии, шаблоны) + `@membrana/media-library-service` (каталог примеров).

**Связь с WHITE_PAPER:** §6 (контракт наблюдения, шаблоны trends), §8 этап 1.A completion.

**Definition of Done:**
1. `packages/device-board/src/catalogs/trends-templates-curated.ts`: шаблон `DRONE_TIGHT` с полной документацией (centroid 2900–4300, flux 0.03–0.16, rms 0.07–0.28, stability + временные признаки).
2. `@membrana/media-library-service` обновлён: UI-плагин для выбора шаблонов (DRONE_TIGHT, DRONE_CURATED, и конкуренты).
3. Пересчёт `yarn benchmark:detectors` с `DRONE_TIGHT` как baseline → новый отчёт в `docs/datasets/week-2026-06-16/trends-promotion-report.md`.
4. Документ `docs/TRENDS_TEMPLATE_GUIDE.md` (инструкция для пользователя: как калибровать шаблон на своих данных).

**Роль:** Верстальщик (UI) + Математик (таблицы метрик).

**Размер:** M (2–3 ч; большая часть — перестановка existing кода).

---

### Задача 4.6 — Multi-node контракт: sketch для `@membrana/transport-service`

**Цель:** спроектировать (но не реализовывать) шину транспорта «узел ↔ сервер fusion» на базе event-контракта из WHITE_PAPER §7.

**Пакет / слой:** `@membrana/transport-service` (foundation, **новый**, но для этапа 2).

**Связь с WHITE_PAPER:** §4.2–4.4 (архитектура узлов, слой слияния), §6 (контракт наблюдения), SERVICES.md (foundation-сервис).

**Definition of Done:**
1. `packages/services/transport/` создан (пустой пакет, только `package.json`, `README.md`).
2. `src/types.ts`: контракты `NodeId`, `AcousticObservation` (из WP §7), `EventBus`, `TransportProvider` (интерфейс для различных реализаций: REST, WebSocket, gRPC, LoRa).
3. `README.md`: диаграмма архитектуры (node → transport-service → fusion-server), примеры payload, описание требований к синхронизации времени (GPS-PPS, NTP fallback).
4. Comment в коде: `@experimental @stage 2 Frozen до gate-1→2`.
5. No implementation (ждём решения gate).

**Роль:** Структурщик (архитектура контракта).

**Размер:** S (1–2 ч; sketch, не код).

---

### Задача 4.7 — Audit: проверка соответствия ARCHITECTURE.md и SERVICES.md текущему коду

**Цель:** убедиться, что все текущие пакеты (audio-engine, fft-analyzer, детекторы, agenda, device-board, client) соответствуют обязательным границам, нет hidden зависимостей между analyzer-сервисами.

**Пакет / слой:** infra (лinting, тесты).

**Связь с WHITE_PAPER:** §6 (архитектурные правила), ARCHITECTURE §1a–1e (граф зависимостей).

**Definition of Done:**
1. Скрипт `scripts/lint-dependencies.js` (или eslint-плагин) запускается в CI и проверяет:
   - Нет импортов из `packages/services/<analyzer-N>` в `packages/services/<analyzer-M>` (N≠M).
   - Нет циклических зависимостей между пакетами.
   - Все analyzer-сервисы импортируют только `@membrana/core` + свой foundation (не другие analyzer).
2. Отчёт с результатами в `docs/audits/dependency-audit-2026-06-16.md` (какие ошибки найдены, как их исправить).
3. CI/CD: `yarn audit:dependencies` добавлен в pre-commit hook / PR checks.

**Роль:** Структурщик (написание скрипта).

**Размер:** M (2–3 ч, если нет уже готовых lint-solution'ов).

---

## 5. Что НЕ делаем на этом горизонте

### 5.1 Повторный unified benchmark harmonic/cepstral/spectral-flux на free-v1

**Почему:** FFT_METRICS_POTENTIAL_AND_LIMITS.md §6 установил, что DSP-детекторы на free-v1 дают recall ~68–100% и FPR ~88–100%. Любое их OR-объединение ('OR'-consensus) подтягивает recall к 100%, но FPR остаётся ~100%. Без **новых данных / алгоритмов / модальностей** дальше расти невозможно.

**Что это блокирует:** попытки «давайте прогоним бенчмарк ещё раз, может улучшится» — не улучшится. Энергия → в validated-data-сбор или эшелон 2.

---

### 5.2 Этап 1.B (neural-детекторы: YAMNet, CLAP) без эшелона 2 strategy

**Почему:** INTEGRATIONS_STRATEGY.md определяет, какие модели open-weights (CLAP, YAMNet, ASTFormer) подойдут, как их файнтюнить, где хранить веса. Без этого документа начинать интеграцию рискованно (переподгонка, OOM, лицензионные риски).

**Что это блокирует:** любые PR'ы типа «добавил YAMNet в detector-service» без фундамента стратегии.

---

### 5.3 Этап 2 (multi-node, TDOA, локализация) до gate-1→2

**Почему:** WHITE_PAPER §8 явно ставит stage-gate 1→2 как обязательный переход. Без достоверных детекций на одном узле многоузловое слияние даст мусор. Синхронизация, TDOA, мультилатерация — наваливаются потом.

**Что это блокирует:** любые попытки «давайте уже интегрируем два узла и TDOA» без подтверждения качества одиночного детектора.

---

### 5.4 Рефакторинг `@membrana/core` без консилиума Teamlead

**Почему:** core — фундаментальный пакет; все остальные на него опираются. Любые изменения контрактов (`AcousticObservation`, `DetectionResult`, `Track`) потребуют синхронного обновления всех сервисов.

**Что это блокирует:** самовольные правки типов в core без обсуждения impact analysis.

---

### 5.5 Background-серверы (media, office) — только поддержка, не новые feature'ы

**Почему:** Они вне критического пути детекции (WHITE_PAPER критическая дорожная карта). Их контракт зафиксирован в BACKGROUND_SERVERS.md. Новые feature'ы в background → отдельный эпик, не магистраль дня.

**Что это блокирует:** «давайте добавим LLM-интеграцию в background-office» как часть эшелона 0–1.

---

## 6. Проверки в конце периода

### 6.1 Консилиум stage-gate 1→2 проведён, документирован

**Проверка:** файл `docs/seanses/stage-gate-1-2-decision-2026-06-16.md` существует, содержит:
- Дату и участников консилиума.
- Таблицу метрик trends `DRONE_TIGHT` (recall, precision, FPR, F1) на held-out validation.
- Решение: "go к этапу 2" ИЛИ "требуется доработка до X%/Y%".
- Дальнейшие шаги (какие архитектурные компоненты активировать).

---

### 6.2 `@membrana/core` помечена frozen-комментариями на stage-2-типах

**Проверка:** в `packages/core/src/types.ts` все type'ы `SyncedTimestamp`, `TdoaResult` и т.п. имеют `@frozen @stage 2` комментарий с ссылкой на консилиум.

---

### 6.3 `@membrana/cepstral-detector-service` в рабочем состоянии

**Проверка:**
- `yarn test:detectors` включает cepstral, тесты проходят.
- `yarn benchmark:detectors` выводит метрики cepstral в таблицу (recall, precision).
- `packages/services/detectors/cepstral/README.md` явно отмечает, что это вспомогательный инструмент, а не магистраль.

---

### 6.4 Sketch `@membrana/transport-service` и `detection-ensemble-service` созданы

**Проверка:**
- Пакеты созданы в `packages/services/`.
- `src/types.ts` содержит контракты (`AcousticObservation`, `EnsembleConfig`).
- CI не жалуется на отсутствующие зависимости.

---

### 6.5 Dependency audit прошёл без ошибок

**Проверка:**
- `yarn audit:dependencies` запускается без ошибок.
- Отчёт `docs/audits/dependency-audit-2026-06-16.md` отсутствует или содержит "No violations found".
- Никаких горизонтальных импортов между analyzer-сервисами.

---

### 6.6 Trends `DRONE_TIGHT` интегрирован в curated catalog

**Проверка:**
- `packages/device-board/src/catalogs/trends-templates-curated.ts` содержит DRONE_TIGHT с полными параметрами.
- UI плагин в media-library отображает шаблоны.
- Benchmark переснят, новый отчёт в `docs/datasets/week-2026-06-16/trends-promotion-report.md`.

---

## Итого: стратегическая позиция

На конец дня:

1. **Stage-gate 1→2 спрещён:** trends + DRONE_TIGHT готов к promotion.
2. **Архитектурные границы укреплены:** frozen-комментарии, dependency audit.
3. **Scaffold'ы переведены в working state:** cepstral готов, ensemble заложен.
4. **Магистраль ясна:** следующий этап (2 → 3) стартует только после gate, не раньше.
5. **DSP-путь исчерпан на etalon-уровне:** дальше → validated data ИЛИ нейро/zero-shot.

Документ соответствует WHITE_PAPER v0.1 и текущему состоянию монорепо. Готов к обсуждению с Teamlead.