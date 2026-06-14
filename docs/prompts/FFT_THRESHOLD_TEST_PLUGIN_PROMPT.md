# Промпт: плагин порогового FFT-теста (микрофон + `@membrana/fft-analyzer-service`)

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M–L**.
> Ожидаемый артефакт: **1 PR** — чистая математика в `fft-analyzer-service`, плагин в `apps/client`, запись отчёта в журнал телеметрии, UI с визуализацией тактов.

---

## Контекст

Membrana строит акустический анализ поверх `@membrana/audio-engine-service` и `@membrana/fft-analyzer-service`. На микрофонном модуле уже есть плагин визуализации потока (`microphone-stream-viz`) с lifecycle `install` / teardown.

**Цель этой задачи:** плагин, который в **реальном времени** собирает кадры FFT-метрик (спектральный центроид, спектральный поток, RMS), прогоняет **тест** по настраиваемым порогам и показывает прогресс по тактам (кадрам). По завершении каждого теста — **отчёт** в `@membrana/telemetry-service`; детальный **формат отображения отчёта в UI журнала** — отдельная задача (здесь только контракт payload).

**Референс UX (не копировать архитектуру):** `packages/temp/fft/` — старый прототип (прямые legacy-сервисы, `localStorage`, polling в виджете). Брать оттуда только идеи UI: переключатель авто/ручной, «такты», блок результата.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, порядок работы, формат ответа |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Плагины, слабая связанность, audio pipeline |
| [`SERVICES.md`](../SERVICES.md) | Слои сервиса vs React |
| [`MODULE_AND_PLUGIN_UI.md`](../MODULE_AND_PLUGIN_UI.md) | `install`/`teardown`, сайдбар, lazy modules |
| [`DESIGN.md`](../DESIGN.md) | Токены UI, a11y |
| [`packages/services/fft-analyzer/README.md`](../../packages/services/fft-analyzer/README.md) | Метрики кадра, `FftAnalyzer`, хуки |

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana**, исполняющий задачу под руководством **Vesnin** (Teamlead). Перед кодом согласуй форму решения (1–2 абзаца + список модулей). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md): математика — pure TS; UI — по `DESIGN.md`; интеграция — через `plugin.install()` и hub микрофона, без прямых импортов между плагинами.

---

### Что построить (продуктовое описание)

**Плагин порогового FFT-теста** для модуля **«Микрофон»**:

1. **Два режима работы**
   - **Ручной** — один прогон теста по кнопке «Старт» (пока не набрано N кадров или пока пользователь не остановил).
   - **Автоматический** — после завершения теста сразу начинается следующий (цикл), пока плагин активен и есть поток с микрофона.

2. **Настройки теста** (сохраняются в `plugin.config` / persisted config модуля, **не** в `localStorage` напрямую)
   - Верхняя и нижняя граница для каждого параметра:
     - **Спектральный центроид** (Гц)
     - **Спектральный поток** (безразмерный, как в `fft-analyzer`)
     - **Громкость (RMS)**
   - **Интервал между кадрами** (`intervalMs`, мс) — как часто брать следующий кадр из live-потока.
   - **Количество кадров в одном тесте** — строго одно из: **3 | 5 | 7 | 10**.
   - **Уровень строгости** — **Лёгкий | Средний | Строгий** (см. математический контракт ниже).

3. **Визуализация во время теста**
   - Ряд «тактов» (по числу кадров): для каждого кадра — состояние `pending` | `passed` | `failed` (иконка/цвет по `DESIGN.md`, не только цвет).
   - Опционально: текущие значения трёх метрик и галочки «в диапазоне / вне диапазона» для активного кадра.
   - Итог последнего теста: **detected** / **not detected** + краткая сводка (сколько кадров прошло, какой порог строгости).

4. **Телеметрия**
   - После **каждого завершённого теста** — одна запись в журнал (`TelemetryJournal.addReportEntry` или `addEntry` с дедуп-ключом).
   - **Формат строки в модуле «Журнал телеметрии»** прорабатывается позже; в этой задаче — стабильный **JSON payload** + `reportUniqueId` (см. § Контракт телеметрии).

---

### Математический контракт (обязателен, pure TS)

Реализовать в `@membrana/fft-analyzer-service` (новый файл, например `src/math/threshold-test.ts`), **без React / DOM / Web Audio**.

#### Вход одного кадра

Использовать поля из `LiveFrameResult` (`centroid`, `flux`, `rms`) или эквивалент после `FftAnalyzer.analyzeFrame`.

#### Пороги

```ts
interface ThresholdBounds {
  readonly min: number;
  readonly max: number;
}

interface ThresholdTestThresholds {
  readonly centroid: ThresholdBounds;
  readonly flux: ThresholdBounds;
  readonly rms: ThresholdBounds;
}
```

Кадр **в диапазоне по метрике** ⟺ `min <= value <= max`.

#### Строгость **на уровне одного кадра**

Сколько метрик из трёх должны попасть в свой диапазон, чтобы кадр считался **пройденным** (`framePassed`):

| Уровень | Код | Метрик в диапазоне (из 3) |
|---------|-----|---------------------------|
| Лёгкий | `easy` | ≥ 1 |
| Средний | `normal` | ≥ 2 |
| Строгий | `strict` | 3 |

#### Итог **теста** (N кадров, N ∈ {3,5,7,10})

Пусть `passedCount` — число кадров с `framePassed === true`, `rate = passedCount / N`.

| Уровень | Тест **detected** ⟺ |
|---------|---------------------|
| Лёгкий | `rate >= 0.30` |
| Средний | `rate >= 0.60` |
| Строгий | `rate >= 0.90` |

**Важно:** пороги 30% / 60% / 90% относятся к **доле пройденных кадров**, а не к «доле совпавших параметров за весь тест». Пример: при N=3 и «Среднем» нужно минимум `ceil(0.6 * 3) = 2` пройденных кадра.

#### Выход теста (типы для экспорта из сервиса)

```ts
type StrictnessLevel = 'easy' | 'normal' | 'strict';

interface FrameVerdict {
  readonly index: number;           // 0 .. N-1
  readonly timestamp: number;
  readonly centroid: number;
  readonly flux: number;
  readonly rms: number;
  readonly centroidInRange: boolean;
  readonly fluxInRange: boolean;
  readonly rmsInRange: boolean;
  readonly metricsInRangeCount: number; // 0..3
  readonly framePassed: boolean;
}

interface ThresholdTestResult {
  readonly testId: string;            // uuid или monotonic id
  readonly startedAt: number;
  readonly finishedAt: number;
  readonly frameCount: number;      // 3 | 5 | 7 | 10
  readonly strictness: StrictnessLevel;
  readonly thresholds: ThresholdTestThresholds;
  readonly intervalMs: number;
  readonly frames: readonly FrameVerdict[];
  readonly passedCount: number;
  readonly passRate: number;        // passedCount / frameCount
  readonly isDetected: boolean;     // по таблице строгости
  readonly mode: 'manual' | 'auto';
}
```

Функции (имена можно уточнить, сигнатуры — нет):

- `evaluateFrame(metrics, thresholds, strictness): FrameVerdict` (без index/timestamp — добавляет вызывающий).
- `evaluateThresholdTest(frames: FrameVerdict[], strictness, frameCount): ThresholdTestResult` — валидирует `frames.length === frameCount`.

**Unit-тесты (Vitest)** в `fft-analyzer-service`: минимум 6 кейсов — по одному на каждый уровень строгости (кадр + тест), граничные 30%/60%/90%, N=3 и N=10.

---

### Архитектура (Teamlead + Структурщик)

#### Размещение кода

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Математика | `packages/services/fft-analyzer/src/math/threshold-test.ts` | Pure functions + типы |
| Публичный API | `packages/services/fft-analyzer/src/index.ts` | Re-export типов и функций |
| Плагин | `apps/client/src/plugins/fft-threshold-test/` | `createFftThresholdTestPlugin()`, state, telemetry adapter |
| UI | `.../FftThresholdTestPanel.tsx`, `.../components/FrameTicks.tsx` | Только презентация; данные из singleton + `useSyncExternalStore` |
| Регистрация | `apps/client/src/modules/registerClientModules.ts` | `registerPlugin('microphone', createFftThresholdTestPlugin())` |
| Сайдбар | `apps/client/src/pluginSidebarDetails.tsx` | Ветка настроек плагина (если нужна) |

**Идентификаторы (зафиксировать в PR):**

- `plugin.id`: `fft-threshold-test`
- `moduleId`: `microphone` (плагин модуля «Микрофон»)

#### Поток данных (канонический)

```
microphoneStreamHub
  → plugin.install: LiveSampler + FftAnalyzer (или useFftAnalyzer в install — без Web Audio в UI)
  → каждые intervalMs: кадр метрик
  → буфер до frameCount
  → evaluateThresholdTest → singleton state
  → UI (useSyncExternalStore)
  → telemetry addReportEntry
```

- **Не** импортировать другие плагины (`microphone-stream-viz` и т.д.).
- **Не** дублировать FFT в UI; метрики только из `fft-analyzer-service`.
- Телеметрия: тонкий адаптер `fftThresholdTelemetry.ts`, вызывающий `getDefaultTelemetryJournal()` — по образцу `micStreamTelemetry.ts`. Прямой импорт telemetry из виджета запрещён.

#### Состояние плагина (singleton)

По образцу `micStreamPluginState.ts`:

- `mode`: `'manual' | 'auto'`
- `phase`: `'idle' | 'collecting' | 'result'`
- `currentFrameIndex`, `tickStates[]`, `lastResult: ThresholdTestResult | null`
- `isStreamLive: boolean` (из hub)
- Подписка через `subscribe` / `getSnapshot` для React

**Ручной режим:** `idle` → по «Старт» → `collecting` → после N кадров → `result` → `idle`.

**Авто режим:** при появлении потока → цикл `collecting` → `result` → пауза (например 500 ms, константа в config) → снова `collecting`.

#### Конфиг плагина (TypeScript)

```ts
interface FftThresholdTestPluginConfig {
  readonly mode: 'manual' | 'auto';
  readonly intervalMs: number;
  readonly frameCount: 3 | 5 | 7 | 10;
  readonly strictness: 'easy' | 'normal' | 'strict';
  readonly thresholds: ThresholdTestThresholds;
  readonly autoRestartDelayMs: number; // default 500
}
```

Дефолты согласовать с `PRESETS.drone` в `fft-analyzer` (centroid 200–800 и т.д.) — зафиксировать в `defaultConfig` фабрики плагина.

---

### UI (Верстальщик)

- DaisyUI + токены из `DESIGN.md` (`--color-accent`, `--color-danger`, `tabular-nums` для метрик).
- Переключатель **Авто / Ручной** — сегментированный контрол, `aria-pressed`.
- Блок **тактов** (`FrameTicks`): N ячеек, состояния `pending` | `passed` | `failed`; легенда текстом (не только цвет).
- Кнопки **Старт / Стоп** — только в ручном режиме; `disabled`, если нет live-потока.
- Секция **настроек** (сворачиваемая): 6 инпутов min/max, `intervalMs`, выбор N кадров (4 кнопки), 3 кнопки строгости.
- Итог теста: крупный статус **Обнаружено / Не обнаружено** + `passRate` в процентах.
- **Запрещено:** `setInterval` в React-компоненте для логики сбора; polling UI допустим только для `useSyncExternalStore` snapshot (≤ 2 Hz) или подписка на state без опроса plugin API.

---

### Аудио (Музыкант)

- Sample rate — из `AudioContext` / engine (целевой 48 kHz; при 44.1 kHz — не падать, писать в telemetry `sampleRate`).
- `fftSize`: **2048**, `smoothingTimeConstant`: **0.8** (как в дефолте fft-analyzer), если не переопределено в config плагина.
- При отсутствии микрофона — `idle`, понятный текст «Ожидание микрофона», без ошибок в консоли.
- При клиппинге / тишине кадры всё равно собираются; в отчёте сохранять фактические RMS/centroid/flux.

---

### Контракт телеметрии (черновик v0.1)

Тип записи: `analysis`. Модуль: `moduleId` контекста микрофона. `moduleName`: `fft-threshold-test`.

```ts
// data — TelemetryEntryPayload
{
  reportUniqueId: `fft-test-${testId}`,  // дедуп
  schema: 'fft-threshold-test/v0.1',
  isDetected: boolean,
  passRate: number,
  passedCount: number,
  frameCount: number,
  strictness: 'easy' | 'normal' | 'strict',
  mode: 'manual' | 'auto',
  thresholds: { centroid: {min,max}, flux: {min,max}, rms: {min,max} },
  intervalMs: number,
  // без сырых PCM; frames — краткий массив или omit для экономии:
  framesSummary?: Array<{ framePassed: boolean; metricsInRangeCount: number }>,
}
```

`tags`: `['fft', 'threshold-test', isDetected ? 'detected' : 'not-detected']`.

**Out of scope:** кастомный рендер строки в `TelemetryJournalModule` — отдельный Issue; здесь достаточно, чтобы запись появлялась в списке с типом `analysis`.

---

### Definition of Done

- [ ] `evaluateFrame` / `evaluateThresholdTest` в `fft-analyzer-service`, покрыты unit-тестами.
- [ ] Плагин зарегистрирован на модуле `microphone`, lifecycle `install` / teardown корректно отписывается от hub и sampler.
- [ ] Ручной и автоматический режимы работают в `yarn workspace @membrana/client dev` с включённым микрофоном.
- [ ] UI: такты, настройки, итог теста; соответствие `DESIGN.md` и a11y (focus, aria-live на итоге).
- [ ] После каждого теста — запись в `TelemetryJournal`; видна в модуле «Журнал телеметрии».
- [ ] Нет прямых импортов между плагинами; нет `localStorage` для конфига.
- [ ] `yarn turbo run lint typecheck test build --continue` — зелёный.
- [ ] LGTM Teamlead (краткое ревью в PR: границы соблюдены / нарушения).

---

### Out of scope (не делать в этом PR)

- Детальный формат карточки отчёта в UI журнала телеметрии.
- Отдельный analyzer-сервис `dsp-drone-detector` / гармонический классификатор (см. `INTEGRATIONS_STRATEGY.md`).
- Перенос legacy-кода из `packages/temp/fft` «как есть».
- Сохранение истории тестов в IndexedDB / backend.
- Storybook (можно отдельным Issue).

---

### Порядок работы ролей (для агента)

1. **Teamlead** — утвердить таблицу путей и имена типов (этот документ).
2. **Математик (Dynin)** — `threshold-test.ts` + тесты.
3. **Структурщик** — плагин, state, hub, telemetry adapter, регистрация.
4. **Музыкант** — проверка цепочки engine → fft на live-потоке.
5. **Верстальщик** — панель и `FrameTicks`.
6. **Teamlead** — LGTM, обновить `packages/services/fft-analyzer/README.md` (§ API threshold test).

---

### Формат ответа координатора (если агент только планирует)

```text
[Teamlead]: …
[Структурщик]: …
[Математик]: …
[Музыкант]: …
[Верстальщик]: …

Итоговый артефакт: …
Definition of Done: …
```

---

## Сводка по ролям (контракт команды)

### [Teamlead] — Vesnin

- Фиксирует границу: **логика порогового теста** — в `fft-analyzer-service`; **оркестрация и UI** — в плагине клиента.
- Запрещает второй FFT-пайплайн и импорты `microphone-stream-viz` ↔ `fft-threshold-test`.
- Принимает PR только с LGTM и зелёным CI.
- Открывает GitHub Issue + Linear с ссылкой на этот файл; ветка: `vesnin` или feature-ветка по соглашению [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md).

### [Структурщик]

- Реализует `createFftThresholdTestPlugin()` с `install`/`teardown`.
- Singleton state + тонкий React-мост (`useSyncExternalStore`).
- `fftThresholdTelemetry.ts` — единственная точка записи в journal.
- Регистрация в `registerClientModules.ts` и при необходимости `pluginSidebarDetails.tsx`.

### [Математик] — Dynin

- Реализует и тестирует `threshold-test.ts` строго по таблицам строгости § «Математический контракт».
- Не смешивает «все три метрики в диапазоне на кадре» (старое поведение `LiveFrameResult.isDetected`) с новым правилом строгости — для теста использовать **только** `evaluateFrame`.

### [Музыкант]

- Подключает `LiveSampler` + `FftAnalyzer` в `install`, интервал кадров = `intervalMs` из config.
- Проверяет сценарии: тишина, речь, шум — тест завершается предсказуемо за `N * intervalMs` (± jitter).

### [Верстальщик]

- Компоненты по `DESIGN.md`; референс компоновки — `packages/temp/fft/widgets/DetectorFFTWidget.tsx` и `TickStatus.tsx` **только как wireframe**, не как источник стилей (`text-gray-400` → токены DaisyUI).

---

## Заметки для человека-постановщика

### Перед запуском агента

1. GitHub Issue (`wish` или `imperfection`) со ссылкой на `docs/prompts/FFT_THRESHOLD_TEST_PLUGIN_PROMPT.md`.
2. Linear-тикет с label математика/клиент по необходимости.
3. Убедиться, что на `main` есть: `fft-analyzer-service`, telemetry-service, lifecycle плагинов (`install`).

### Проверка после PR

```bash
yarn workspace @membrana/fft-analyzer-service test
yarn workspace @membrana/client dev
# Микрофон → включить плагин → ручной тест N=3 → журнал телеметрии
```

### Уточнения, зафиксированные с постановщиком

| Тема | Решение |
|------|---------|
| Название процесса | **Пороговый FFT-тест** / plugin `fft-threshold-test` |
| Строгость «Лёгкий» | ≥1 метрика в диапазоне **на кадр**; ≥30% кадров пройдено **на тест** |
| Строгость «Средний» | ≥2 метрики на кадр; ≥60% кадров |
| Строгость «Строгий» | 3 метрики на кадр; ≥90% кадров |
| Число кадров | Только 3, 5, 7, 10 |
| Формат журнала | Payload v0.1 в этой задаче; UI строки — позже |

---

## Связь с дорожной картой

- Не заменяет **Этап 1** (`dsp-drone-detector` / гармонический классификатор из `WHITE_PAPER.md`).
- Даёт **инструмент калибровки порогов** и демонстрацию `fft-analyzer-service` для оператора — полезно до полевых испытаний детектора дрона.
