<!-- Сгенерировано: 2026-06-15T06:20:20.778Z (yarn standup) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, GitHub Issues (25), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->

# DAILY_STANDUP — 2026-06-15

<!-- Сгенерировано: 2026-06-15T06:30:00.000Z (yarn standup) -->
<!-- Период: вчерашний вечер (DAILY_CODE_REVIEW) + стратегический план (STRATEGIC_PLAN_DAY) -->
<!-- Горизонт: сегодня (2026-06-15) -->

## Резюме дня

**Переломный день: от инфраструктуры к детекторам дрона.** Вчера завершили ночную сборку MP4–MP6 (платформа стабильна); сегодня закладываем фундамент Этапа 1.A — контрактный слой детекторов, синтетический датасет v0.1, гармоник-детектор и инфраструктура бенчмарка. **Главный риск:** разрушить слабую связанность при интеграции детекторов в реестр; детекторы должны быть чистыми функциями, без React и Web Audio. **Критерий успеха к вечеру:** `@membrana/detector-base` экспортирует типы, `harmonic-detector-service` реализована с unit-тестами ≥70%, `DETECTOR_BENCHMARK.md` готова, синтетический датасет v0.1 собран, `yarn benchmark:detectors` запускается без ошибок.

---

## Входные артефакты

| Источник | Актуальность | Что берём |
|----------|--------------|----------|
| **STRATEGIC_PLAN_DAY.md** | ✅ Свежо (генерировано вчера утром) | Задачи 4.1–4.6: детекторы, бенчмарк, UI результатов, датасет. Stage-gate 1→2 критерии (P ≥ 85%, R ≥ 90%). |
| **DAILY_CODE_REVIEW.md** (вчерашний вечер) | ✅ Актуален | Граф зависимостей чист; MembraneRegistry готов; Docker image растёт — проверить. Линтер `client` падает (срочно). Математик: `audio-engine` и `fft-analyzer` требуют проверки. |
| **GitHub Issues** (25 открытых) | ⚠️ Большая часть не в скоупе дня | Активные: #47 (single-node-detection-first, центральный), #58–#64 (background-media v1). Отложены: #49 (UI микрофона), #25–#36 (code-review issues). |
| **MAIN_DAY_ISSUE.md** (2026-06-10, предыдущий) | 📦 Архив | Для контекста: статус stage-gate 1→2, что был сделано на 2026-06-10. |
| **packages/temp** | ❌ Пусто (0 файлов) | Нечего подмешивать. |

---

## Порядок работы

**Цепочка ролей:**

1. **Teamlead** (09:00–10:00) — форма, контракт, LGTM на границы.
2. **Структурщик + Математик** (10:00–11:30) — `detector-base`, типы, mock-реализация.
3. **Математик** (11:30–14:00) — ядро гармоник, unit-тесты.
4. **Структурщик + Музыкант** (14:00–16:00) — benchmark-скрипт, регистрация детектора, синтетический датасет v0.1.
5. **Структурщик + Верстальщик** (16:00–17:30) — UI-плагин в Cabinet (detection-results), интеграция ensemble.
6. **Teamlead** (17:30–19:00) — документация, LGTM, архив дня.

---

## [Teamlead]

### Стратегический фокус

**Главное:** Сегодня переходим от инфраструктурных задач (MP4–MP6, Cabinet, Media Library) к **первому конкретному алгоритму детекции дрона**. Это критический момент для WHITE_PAPER: нужно **явно заморозить** многоузловую архитектуру (TDOA, localizer, tracker) до stage-gate, установить ясный контракт на детекторы и создать демонстрируемую систему для валидации.

**LGTM-границы на сегодня:**

- ✅ `@membrana/detector-base` — новый пакет в `packages/services/detectors/` с типами `DroneDetector`, `DetectionResult`, `AudioWindow`, `DetectionMetrics`. Типы должны быть экспортированы из `@membrana/core/index.ts` для удобства.
- ✅ `harmonic-detector-service` — первая реализация, чистые функции только (вход: Float32Array спектра, выход: `DetectionResult`), ноль React/Web Audio/побочных эффектов.
- ✅ `DETECTOR_BENCHMARK.md` + `DATASET.md` — документы готовы, содержат регламент, примеры, требования к данным.
- ✅ Синтетический датасет v0.1 — 9 WAV-файлов (3 дрона, 3 дрона+фон, 3 фона) в `data/detectors-benchmark/v0.1/`.
- ✅ `yarn benchmark:detectors` — скрипт запускается, выдаёт JSON + markdown-таблицу.
- ✅ `ARCHITECTURE.md` §1e — явный запрет на `tdoa-service`, `localizer-service`, `tracker-service` до stage-gate 1→2; ссылка на `DETECTOR_BENCHMARK.md`.

**Что НЕ делаем сегодня:**

- ❌ Второй и третий детекторы (`spectral-flux-`, `cepstral-`) — отдельные task-промпты на завтра/послезавтра.
- ❌ YAMNet/CLAP нейросетевые детекторы — Этап 1.B, после stage-gate.
- ❌ Полевая валидация — на следующей неделе (dataset v0.2+).
- ❌ Многоузловая архитектура и синхронизация между узлами.
- ❌ Расширение Cabinet UI сверх просмотра результатов анализа семплов.

### Приоритизация GitHub Issues

| Issue | Метка | Статус сегодня | Action |
|-------|-------|----------------|--------|
| **#47** | single-node-detection | 🟢 **В СКОУПЕ** | Центральный фокус: контрактный слой + гармоник-детектор + бенчмарк-инфра. |
| **#58** | background-media-v1 | 🟡 Отложена | Следует за stage-gate; не препятствует сегодня, но A5c (Deploy) не запускаем. |
| **#64** | background-media: Swagger docs | 🟡 Отложена | После A5c; сегодня не активируем. |
| **#59** | background-media Deploy (A5c) | 🟡 Отложена | Требует завершения A5a/A5b; сегодня не работаем. |
| **#57** | trends-fft-template-editor | 🟡 Отложена | UI — после детекторов; не в скоупе. |
| **#54** | MCP rollout acceptance | 🟡 Отложена | После фаз A–C; сегодня не трогаем. |
| **#49** | MicrophoneCapturePanel (консилиум) | 🟡 Отложена | После stage-gate 1→2; UI микрофона не критична для детекции. |
| **#28–#36** | code-review issues | 🟡 Backlog | Тесты, a11y, grafs — после стабилизации детекторов. |
| **#37** | code-review index | 📦 Архив | Только справка. |
| **#9–#12** | imperfection tests | 🟡 Backlog | Unit-тесты в очереди; сегодня низкий приоритет. |

**Срочно перед началом дня:**

- [ ] Проверить линтер: `yarn lint --filter=@membrana/client` (падает по DAILY_CODE_REVIEW). Если блокирует — исправить до 09:30.
- [ ] `yarn test` глобально — убедиться, что зелень на `main`.

---

## [Структурщик]

### Граф зависимостей и интеграция

**Статус:** Вчерашний code review выявил потенциальный риск в граве (cabinet → background-media → background-office). Сегодня начинаем новую линию зависимостей: детекторы → `@membrana/core` (типы) + `audio-engine` (чистые функции обработки).

**Правила слабой связанности на сегодня:**

1. ✅ `@membrana/detector-base` создаётся как *отдельный* пакет, экспортирует типы только (нет реализации).
2. ✅ `harmonic-detector-service` — зависит от `@membrana/core` + `@membrana/audio-engine` (чистые функции FFT, spektrum), **не зависит** от React/плагинов.
3. ✅ Детекторы регистрируются в `detection-ensemble-service` через контракт `DroneDetector`, а не через прямые импорты.
4. ✅ Cabinet UI получает результаты через HTTP/RPC, не импортирует детекторы напрямую.

**Артефакты, которые создаём:**

```
packages/services/detectors/
├── detector-base/                    # Новый пакет
│   ├── src/
│   │   ├── index.ts                  # Экспорт типов DroneDetector, DetectionResult, ...
│   │   ├── types.ts                  # Контрактные интерфейсы
│   │   └── mock.ts                   # Mock-реализация для тестирования
│   ├── package.json
│   └── README.md
├── harmonic-detector-service/        # Реализация
│   ├── src/
│   │   ├── index.ts
│   │   ├── service.ts                # Класс HarmonicDetectorService
│   │   ├── math/
│   │   │   ├── index.ts
│   │   │   └── harmonicAnalyzer.ts   # Чистые функции
│   │   ├── hooks.ts                  # React hook useHarmonicDetector (опционально)
│   │   └── *.test.ts                 # Unit-тесты ≥70%
│   ├── package.json (зависимость: detector-base)
│   └── README.md
└── detection-ensemble-service/       # Агрегатор (следует за гармоник-детектором)
    └── ...
```

**Проверка перед слиянием:**

```bash
# Граф зависимостей
yarn workspaces info | grep -E "(detector-base|harmonic-detector|ensemble)"

# Нет циклических зависимостей
yarn workspaces info | grep -i "cycle"  # Должна быть пустая строка

# Импорты в порядке
rg "import.*harmonic" packages/services --type ts | grep -v node_modules
```

---

## [Математик]

### Контракт и ядро

**Главное:** Сегодня создаём первый **чистый детектор** — функцию без побочных эффектов, которая на входе получает Float32Array спектра, на выходе возвращает `DetectionResult` с уверенностью и признаками.

**Контракт `DroneDetector`:**

```typescript
interface DroneDetector {
  name: string;
  version: string;
  
  detect(spectrum: Float32Array, sampleRate: number): DetectionResult;
}

interface DetectionResult {
  isDetected: boolean;
  confidence: number;  // 0–1
  fundamentals: number[];  // Frequencies в Гц
  latency_ms?: number;
  metadata?: Record<string, unknown>;
}
```

**Ядро HarmonicDetectorService:**

Алгоритм:
1. На входе спектр (из `fft-analyzer-service`, уже вычисленный FFT).
2. Поиск пиков выше SNR-threshold (например, 10 dB выше floor).
3. Группировка пиков в гармонические ряды (основная частота + кратные).
4. Проверка: если найдено ≥ 3 гармоник с ratio близким к целым числам → дрон (confidence высокая).
5. Выход: `{ isDetected, confidence, fundamentals }`.

**Тесты (≥70% покрытие):**

- [ ] Синтетический дрон (4 гармоники 100 Гц) → обнаруживает, confidence > 0.8.
- [ ] White noise → не обнаруживает, confidence < 0.3.
- [ ] Птица (непериодический шум) → confidence < 0.5.
- [ ] Edge case: пустой спектр → не падает, confidence = 0.
- [ ] Edge case: спектр с NaN/Infinity → валидирует, не падает.

**Важные граничные условия:**

- Детектор **не знает** о Web Audio, React, плагинах.
- Детектор **не сохраняет** state (stateless функция или класс с методом, но без instance-переменных между вызовами).
- Тесты запускаются чистым `vitest`, без браузерного контекста.

---

## [Музыкант]

### Аудиопоток и синтез датасета

**Статус:** Сегодня синтезируем v0.1 датасета (9 WAV-файлов) для локального бенчмарка. Это **синтетические** данные, реальные дроны будут позже (v0.2+).

**Синтетический датасет v0.1:**

```
data/detectors-benchmark/v0.1/
├── manifest.json              # Metadata: label, length, source, license
├── drone_01.wav              # Синтетический дрон (4 гармоники 100 Гц, 5s, 48 kHz)
├── drone_02.wav              # Другой дрон (3 гармоники 120 Гц)
├── drone_03.wav              # Третий дрон (5 гармоник 85 Гц)
├── drone_with_bg_01.wav      # Дрон + фоновый шум 40 dB
├── drone_with_bg_02.wav
├── drone_with_bg_03.wav
├── background_01.wav         # Чистый фон (улица, ветер, птицы)
├── background_02.wav         # Фон (помещение, кондиционер)
└── background_03.wav         # Фон (парк, шум листвы)
```

**Производство WAV:**

- Инструмент: `scripts/synth-drone-dataset.mjs` (новый скрипт, использует `tone.js` или Web Audio API в Node.js).
- Спецификация: 48 kHz, mono, 16 bit, 5s длина, метаданные в JSON.
- Лицензия: CC0 (синтетические данные).

**Что проверить:**

- [ ] Все 9 файлов генерируются за < 30 сек.
- [ ] `manifest.json` содержит label (drone / not-drone), продолжительность, sampleRate.
- [ ] Файлы воспроизводятся в аудиоплеере (Cabinet Sample Library, если успеваем).

---

## [Верстальщик]

### UI и интеграция в Cabinet

**Статус:** После реализации детекторов (Математик + Структурщик) создаём UI-плагин для визуализации результатов анализа в Cabinet Sample Library.

**Компонент DetectionResultsPanel:**

```tsx
// apps/cabinet/src/components/sample-library/DetectionResultsPanel.tsx
// Таблица: детектор | confidence | fundamentals | latency
// Color-код: зелёный (>0.85), жёлтый (0.5–0.85), красный (<0.5)

interface DetectionResultsPanelProps {
  sampleId: string;
  spectrum: Float32Array;
  sampleRate: number;
}
```

**Плагин integration:**

```typescript
// apps/cabinet/src/plugins/detection-results/plugin.ts
export const detectionResultsPlugin = {
  name: 'detection-results',
  install(registry: MembranaRegistry) {
    registry.registerPlugin({
      type: 'sample-analysis',
      component: DetectionResultsPanel,
      label: 'Анализ детекции',
    });
  },
};
```

**Что НЕ переносим из packages/temp:**

(packages/temp пусто, но правило: не переносим прототипы UI без DESIGN.md контракта и unit-тестов.)

**Проверка DESIGN.md соответствия:**

- [ ] Цвета confidence: зелёный/жёлтый/красный согласованы с DESIGN.md palette.
- [ ] Шрифты моноширинные для чисел (frequency in Hz).
- [ ] A11y: таблица имеет `role="table"`, заголовки — `role="columnheader"`, данные — `role="cell"`.
- [ ] Адаптив: на мобиле таблица остаётся читаемой (scroll horizontal или stack вертикально).

---

## План на сегодня

| Блок | Размер | Задача | Definition of Done | GitHub Issue |
|------|--------|--------|-------------------|--------------|
| **A. Контракт + scaffold** | M | `@membrana/detector-base` + типы + mock | Пакет создан, типы экспортируются из core, mock-тесты pass | #47 |
| **B. Ядро гармоник** | M | `harmonic-detector-service` реализация + unit-тесты ≥70% | Класс работает, 4 теста pass (drone, noise, bird, edge cases) | #47 |
| **C. Бенчмарк-инфра** | M | `DETECTOR_BENCHMARK.md` + скрипт `yarn benchmark:detectors` | Документ готов, скрипт выдаёт JSON + markdown-таблицу | #47 |
| **D. Синтетический датасет** | S | `data/detectors-benchmark/v0.1/` + `DATASET.md` | 9 WAV-файлов, manifest.json, документ заполнен | #47 |
| **E. Интеграция ensemble** | S | `detection-ensemble-service` scaffold (агрегатор детекторов) | Пакет создан, вызывает harmonic-детектор, тесты есть | #47 |
| **F. UI в Cabinet + плагин** | M | `DetectionResultsPanel` + регистрация в MembranaRegistry | Компонент рендерится, таблица результатов видна, плагин загружается | #47 |

---

## Матрица Issues ↔ задачи дня

| Задача дня | GitHub Issues | Связь |
|------------|---------------|-------|
| **A. Контракт** | #47 | Основной фокус: single-node-detection-first |
| **B. Гармоник-детектор** | #47, #10 (unit-тесты на math) | Проверяем чистоту функций |
| **C. Бенчмарк-инфра** | #47 | Stage-gate 1→2 требует репортинга метрик |
| **D. Датасет v0.1** | #47 | Тестирование синтетикой перед полевыми данными |
| **E. Ensemble** | #47 | Подготовка к добавлению 2-го и 3-го детекторов |
| **F. UI + плагин** | #47, #49 (микрофон UI) | Демонстрация результатов в Cabinet, не блокирует #49 |

---

## Итоговый артефакт

**Новые файлы и изменения:**

```
packages/services/detectors/
├── detector-base/
│   ├── src/{index,types,mock}.ts
│   ├── package.json
│   ├── README.md
│   └── tsconfig.json
├── harmonic-detector-service/
│   ├── src/{index,service}.ts
│   ├── src/math/{index,harmonicAnalyzer}.ts
│   ├── src/*.test.ts
│   ├── package.json
│   ├── README.md
│   └── tsconfig.json
└── detection-ensemble-service/
    ├── src/{index,service}.ts
    ├── src/*.test.ts
    ├── package.json
    └── README.md

data/detectors-benchmark/v0.1/
├── {drone,background}_*.wav (9 файлов)
├── manifest.json
└── README.md

apps/cabinet/src/
├── components/sample-library/DetectionResultsPanel.tsx
└── plugins/detection-results/plugin.ts

scripts/
├── synth-drone-dataset.mjs (новый)
└── benchmark-detectors.mjs (обновлён)

docs/
├── DETECTOR_BENCHMARK.md (новая)
├── DATASET.md (новая)
└── ARCHITECTURE.md (§1e обновлена)

packages/core/src/
└── index.ts (экспорт DroneDetector, DetectionResult, ...)
```

**Обновления:**

- `ARCHITECTURE.md` §1e: явный запрет на TDOA/localizer/tracker до stage-gate.
- `turbo.json`: добавить три новых пакета в build/test pipeline.
- `.github/workflows/ci.yml`: убедиться, что `yarn test` покрывает новые пакеты.

---

## Definition of Done (день)

- [ ] `@membrana/detector-base` создана, типы экспортируются из `@membrana/core`, mock-реализация работает.
- [ ] `@membrana/harmonic-detector-service` реализована, unit-тесты ≥70% pass, не имеет побочных эффектов.
- [ ] `DETECTOR_BENCHMARK.md` и `DATASET.md` написаны, содержат регламент и примеры.
- [ ] Синтетический датасет v0.1 собран (9 WAV-файлов в `data/detectors-benchmark/v0.1/`).
- [ ] `yarn benchmark:detectors` запускается, выдаёт JSON-отчёт и markdown-таблицу без ошибок.
- [ ] `DetectionResultsPanel` рендерится в Cabinet, плагин загружается через MembranaRegistry.
- [ ] `ARCHITECTURE.md` §1e обновлена: запрет на многоузловую архитектуру до stage-gate, ссылки на DETECTOR_BENCHMARK.md.
- [ ] `yarn lint` и `yarn test` проходят во всех затронутых пакетах; нет циклических зависимостей.

---

## Риски

1. **Граф зависимостей:** Если детекторы случайно импортируют плагины или UI, разрушится слабая связанность. **Что срезать первым:** UI-плагин (блок F); детекторы должны быть готовы сначала.

2. **Линтер падает:** По DAILY_CODE_REVIEW линтер `@membrana/client` выходит с ошибкой. **Action:** Исправить ДО 09:30 или отложить все UI работы.

3. **Unit-тесты ≥70% для гармоник-детектора:** Если напишем только 2–3 теста, coverage упадёт. **Action:** Mathematic должен написать ≥ 4 основных случая (drone, noise, bird, edge case) + edge cases.

4. **Производство синтетического датасета:** Скрипт `synth-drone-dataset.mjs` требует работающей библиотеки для синтеза (tone.js или Web Audio Node.js обёртка). **Fallback:** использовать готовые открытые синтезированные семплы (e.g., из примеров web-audio-api).

5. **Перегруженность плана:** Если тесты гармоник-детектора не pass к 14:00, не стараться спешить benchmark. **Срезаем:** UI-плагин (блок F), поднимаем на завтра. Детекторы важнее UI.

---

## Команды для быстрого старта

```bash
# Убедиться, что зелень на main перед началом
git switch main && git pull origin main
yarn install
yarn lint
yarn test

# Начать работу на ветке
git switch -b feat/detector-stage-1a

# Создать пакеты (scaffold)
mkdir -p packages/services/detectors/{detector-base,harmonic-detector-service,detection-ensemble-service}

# К концу дня: merge проверка
yarn build
yarn test
git diff --name-only main
```

---

**Хранитель дня:** Teamlead (Vesnin).  
**Ветка:** `feat/detector-stage-1a`.  
**Архив:** `docs/archive/daily-day/2026-06-15/` (вечер, после `yarn archive:daily-day`).