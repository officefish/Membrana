# Промпт: плагин визуализации FFT-индексов (микрофон)

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — плагин live-визуализации трёх FFT-индексов в модуле «Микрофон».
> Реестр: `id` = **`fft-indices-viz`** в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

В Membrana уже есть `@membrana/fft-analyzer-service`, плагин **`fft-threshold-test`** (нормализация ÷5000 / ÷1 / ÷0.35), **`microphone-stream-viz`** и хаб **`microphoneStreamHub`**. Нужен отдельный плагин **только для наглядного мониторинга** центроида, спектрального потока и RMS — без порогового теста и без классификатора сцен из демо.

**Референс UX (идеи, не архитектура):** `packages/temp/three-param-analyzer` — радар / линейные полосы / треугольник, легенды с зоной дрона, история flux.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md) | Процесс постановки и закрытия |
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли команды |
| [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) | GitHub Issue / PR |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Плагины, hub |
| [`MODULE_AND_PLUGIN_UI.md`](../MODULE_AND_PLUGIN_UI.md) | `install` / teardown |
| [`DESIGN.md`](../DESIGN.md) | UI, a11y |
| [`FFT_THRESHOLD_TEST_PLUGIN_PROMPT.md`](./FFT_THRESHOLD_TEST_PLUGIN_PROMPT.md) | Паттерн sampler + нормализация |
| `packages/temp/three-param-analyzer/src/main.js` | `drawRadar`, `drawGauges`, `drawTriangle`, `drawFluxHistory` |

**GitHub Issue:** создать (`wish`) — «Добавить плагин live-визуализации FFT-индексов в модуль Микрофон»; в теле ссылка на этот файл и `id: fft-indices-viz`.

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом — краткий план (1–2 абзаца + список файлов). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md). Математика FFT — в сервисе; canvas/React — в плагине. **Не** дублируй вычисление центроида/flux/RMS в UI.

---

### Что построить (продуктовое описание)

**Плагин `fft-indices-viz`** (`FFT_INDICES_VIZ_PLUGIN_ID`):

1. Подписка на поток: `subscribeMicrophoneStream` + `LiveSampler` + `FftAnalyzer` (как `fft-threshold-test`).
2. Обновление UI на каждом кадре (без тяжёлой математики в RAF).
3. Три метрики — сырые + нормализованные 0…1: **центроид (Гц)**, **спектральный поток** (L2 byte-спектр, `/10`), **RMS**.
4. Визуализация v1:
   - режимы: `radar` | `bars` | `triangle`;
   - три строки-легенды: полоса, % норм., сырое значение, опциональная **зона дрона** (дефолт `DEMO_DRONE_THRESHOLDS`);
   - история flux (~200 норм. значений), зелёная полоса диапазона flux на графике.
5. `plugin.config` (persist): режим визуализации, показ зоны дрона, EMA-сглаживание отображения (0…0.95, дефолт ~0.7).
6. Статус потока: ожидание / анализ / нет микрофона — `aria-live="polite"`.

**Не в scope плагина:** пороговый тест, такты, отчёты, классификатор IDLE/WIND/PEOPLE/DRONE, выбор устройства, `publishDroneDetected`.

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Сервис | `@membrana/fft-analyzer-service` | `analyzeFrame`, `SpectralFluxTracker` — переиспользование |
| Нормализация | `apps/client/src/lib/fftMetricNormalize.ts` (или общий модуль) | ÷5000, ÷1, ÷0.35 — как `fft-threshold-test` |
| Плагин | `apps/client/src/plugins/fft-indices-viz/` | install, state, panel |
| UI | `FftIndicesCanvas.tsx`, `FluxHistoryCanvas.tsx`, `ParamLegendRow.tsx` | canvas + легенды |
| Регистрация | `registerClientModules.ts`, `MicrophoneModule.tsx`, `pluginSidebarDetails.tsx` | как у соседних плагинов |

```ts
interface FftIndicesSnapshot {
  readonly centroidHz: number;
  readonly flux: number;
  readonly rms: number;
  readonly centroidNorm: number;
  readonly fluxNorm: number;
  readonly rmsNorm: number;
  readonly fluxHistory: readonly number[]; // max 200, normalized
  readonly streamActive: boolean;
}
```

**Запрещено:**

- Импорт UI других плагинов;
- второй `AudioContext` в обход `LiveSampler`;
- копирование legacy из `packages/temp` без React + DaisyUI.

---

### Визуальный дизайн

- Токены `DESIGN.md`: `base-content`, `primary`, `success` (зона дрона), `warning` при >100% шкалы.
- Canvas: фон `base-200`; переключатель режима — `btn-group`, `aria-pressed`.
- Предупреждение о переполнении шкалы — текст + иконка, не только цвет.
- Компоновка по мотивам демо `viz-container` / `param-legend` / `fluxCanvas`.

---

### Тесты

| Область | Минимум |
|---------|---------|
| Нормализация | unit-тесты общего модуля (если вынесен) |
| State | ring buffer flux, обрезка 200 |
| Canvas helpers | pure TS: `drawRadar` / аналог не падает на нулях |

---

### Definition of Done

- [x] Плагин зарегистрирован на `microphone`, корректный teardown.
- [x] Live-метрики согласованы с `fft-threshold-test` / демо (flux не «микроскопический»).
- [x] Три режима визуализации, легенды активности, история flux; настройки в сайдбаре.
- [x] a11y: статус потока, подписи режимов.
- [x] `yarn workspace @membrana/client typecheck` и `test` — зелёный.
- [x] LGTM Teamlead (приёмка 2026-05-15).

---

### Out of scope

- `evaluateThresholdTest`, телеметрия тестов, датчик в шапке.
- Классификатор сцен из демо `StateClassifier`.
- Плагин качества звука — [`SOUND_QUALITY_VIZ_PLUGIN_PROMPT.md`](./SOUND_QUALITY_VIZ_PLUGIN_PROMPT.md) (отдельная задача `sound-quality-viz`).
- Журнал отчётов каждые 3 с из демо; Storybook.

---

### Порядок работы ролей

1. **Teamlead** — id плагина, вынос `fftMetricNormalize`.
2. **Структурщик** — plugin, state, hub, регистрация.
3. **Музыкант** — сверка live с демо.
4. **Верстальщик** — panel, canvas, легенды.
5. **Teamlead** — LGTM.

---

### Формат ответа координатора (планирование)

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

## Заметки для человека-постановщика

1. GitHub Issue (`wish`) + ссылка на этот промпт и `fft-indices-viz` в [`registry.json`](../tasks/registry.json).
2. Запись уже в реестре (`status: active`); при смене Issue — обновить `githubIssue`.
3. После merge PR: отчёт в Issue → `yarn task:archive fft-indices-viz --notes "PR #…"`.

### Проверка после PR

```bash
yarn workspace @membrana/client dev
# Микрофон → включить fft-indices-viz → сравнить метрики с fft-threshold-test / демо three-param-analyzer
yarn workspace @membrana/client typecheck
yarn workspace @membrana/client test
```

---

## Связь с дорожной картой

Инструмент калибровки и обучения оператора; дополняет `fft-threshold-test`, не заменяет глобальный датчик дрона.
