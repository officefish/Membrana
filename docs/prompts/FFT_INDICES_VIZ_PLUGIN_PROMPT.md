# Промпт: плагин визуализации FFT-индексов (микрофон)

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — плагин live-визуализации трёх индексов (центроид, спектральный поток, RMS) в модуле «Микрофон».

---

## Контекст

В Membrana уже есть:

- `@membrana/fft-analyzer-service` — `FftAnalyzer.analyzeFrame`, `SpectralFluxTracker`, метрики кадра;
- плагин **`fft-threshold-test`** — пороговый тест, нормализация метрик (`normalizeMetrics.ts`, делители как в демо: ÷5000, ÷1, ÷0.35);
- плагин **`microphone-stream-viz`** — осциллограф/спектрограмма;
- хаб **`microphoneStreamHub`** — поток `MediaStream` для плагинов.

**Референс UX (идеи, не архитектура):** `packages/temp/three-param-analyzer` — блок «Визуализация параметров»:

- переключатель режимов: **радар** | **линейные индикаторы** | **треугольник**;
- три «легенды» с сырым значением, норм. %, полосой прогресса и **зелёной зоной дрона**;
- мини-график **истории спектрального потока** (`fluxCanvas`).

**Цель:** отдельный **микрофонный плагин** только для наглядного мониторинга трёх индексов в реальном времени — без порогового теста, без классификатора состояний (😴/💨/🗣️/🚁) из демо.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`FFT_THRESHOLD_TEST_PLUGIN_PROMPT.md`](./FFT_THRESHOLD_TEST_PLUGIN_PROMPT.md) | Паттерн плагина, `LiveSampler`, нормализация |
| [`DRONE_DETECTION_HEADER_SENSOR_PROMPT.md`](./DRONE_DETECTION_HEADER_SENSOR_PROMPT.md) | Публикация `publishDroneDetected` — **не** в scope этого плагина |
| [`MODULE_AND_PLUGIN_UI.md`](../MODULE_AND_PLUGIN_UI.md) | Lifecycle, сайдбар |
| [`DESIGN.md`](../DESIGN.md) | Токены DaisyUI, a11y |
| `packages/temp/three-param-analyzer/src/main.js` | § `drawRadar`, `drawGauges`, `drawTriangle`, `drawFluxHistory`, `updateParamDisplay` |

---

## Промпт целиком (для вставки агенту)

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Математика FFT — в `fft-analyzer-service`; оркестрация и canvas/React — в плагине клиента. **Не** дублируй вычисление центроида/flux/RMS в UI-слое.

---

### Что построить (продуктовое описание)

**Плагин `fft-indices-viz`** (рабочее имя; зафиксировать в `types.ts` как `FFT_INDICES_VIZ_PLUGIN_ID`):

1. **Подписка на поток микрофона** через `subscribeMicrophoneStream` + `LiveSampler` + `FftAnalyzer` (как `fft-threshold-test`).
2. **Обновление UI на каждом кадре анализа** (RAF или callback sampler; не блокировать main thread тяжёлой математикой).
3. **Три метрики** (сырые + нормализованные 0…1):
   - спектральный **центроид** (Гц);
   - **спектральный поток** (L2 на byte-спектре, `/10` — как в сервисе и демо);
   - **RMS** громкость.
4. **Визуализация** (минимум в v1):
   - переключатель режима: `radar` | `bars` | `triangle` (аналог демо);
   - под основным видом — **три строки-легенды** с полосой, % нормализации, сырым значением;
   - **зелёная зона** на полосах — опциональный оверлей «зоны дрона» из `plugin.config` (дефолт = `DEMO_DRONE_THRESHOLDS` из `fft-threshold-test/normalizeMetrics.ts` или вынесенный общий модуль).
   - **история flux** — лента последних ~200 нормализованных значений (canvas или SVG), зелёная полоса диапазона flux.
5. **Настройки в `plugin.config`** (persist через agenda):
   - режим визуализации по умолчанию;
   - показывать/скрывать зону дрона на полосах;
   - опционально: коэффициент сглаживания EMA (0…0.95, дефолт ~0.7 как в демо) — только для **отображения**, не для телеметрии теста.
6. **Статус:** «ожидание потока» / «анализ» / «нет микрофона» — `aria-live="polite"`.

**Не делать в этом плагине:** пороговый тест, такты, отчёты, классификатор IDLE/WIND/PEOPLE/DRONE, выбор устройства (это модуль микрофона).

---

### Архитектура (Teamlead + Структурщик)

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Сервис | `@membrana/fft-analyzer-service` | Только переиспользование; новый код — только если нужен общий `smoothMetrics` (опционально) |
| Нормализация | `apps/client/src/lib/fftMetricNormalize.ts` **или** реэкспорт из общего пакета | Единые делители с `fft-threshold-test` (÷5000, ÷1, ÷0.35) |
| Плагин | `apps/client/src/plugins/fft-indices-viz/` | `createFftIndicesVizPlugin`, state singleton, panel |
| UI canvas | `FftIndicesCanvas.tsx`, `FluxHistoryCanvas.tsx` | Отрисовка; `resizeObserver` / `devicePixelRatio` |
| Регистрация | `registerClientModules.ts`, `MicrophoneModule.tsx`, `pluginSidebarDetails.tsx` | Как у соседних плагинов |

**Запрещено:**

- Импорт UI других плагинов;
- Второй экземпляр `AudioContext` в обход `LiveSampler`;
- Копирование legacy из `packages/temp` без адаптации к React + DaisyUI.

**Рекомендуемая структура файлов:**

```
apps/client/src/plugins/fft-indices-viz/
  types.ts
  fftIndicesVizPlugin.ts      # install / teardown
  fftIndicesVizPluginState.ts # current metrics, flux ring buffer, viz mode
  useFftIndicesViz.ts
  FftIndicesVizPanel.tsx
  FftIndicesCanvas.tsx
  FluxHistoryCanvas.tsx
  ParamLegendRow.tsx
  index.ts
```

---

### Визуальный дизайн (Верстальщик)

- Референс компоновки: демо § `viz-container`, `param-legend`, `fluxCanvas` — **перевести** на токены `DESIGN.md` (`base-content`, `primary`, `success` для зоны дрона, `warning` при превышении шкалы).
- Предупреждение «>100% нормализации» — текст + иконка, не только красный цвет.
- Canvas: фон `base-200`, сетка приглушённая; основной полигон/точка — `primary` или `success`.
- Переключатель режима — `btn-group` / radio, `aria-pressed` на активной кнопке.
- Минимальная высота canvas на mobile — не ломать layout `MicrophoneModule`.

---

### Контракт данных (для state)

```ts
interface FftIndicesSnapshot {
  readonly centroidHz: number;
  readonly flux: number;
  readonly rms: number;
  readonly centroidNorm: number;
  readonly fluxNorm: number;
  readonly rmsNorm: number;
  readonly fluxHistory: readonly number[]; // нормализованные, max 200
  readonly streamActive: boolean;
}
```

Сглаживание (если включено в config): EMA по каждой метрике **после** `analyzeFrame`, до записи в snapshot.

---

### Телеметрия (опционально, не блокирует DoD)

Периодический снимок (например раз в 30 с при активном потоке) в journal с `schema: 'fft-indices-viz/v0.1'` — **Out of scope v1**, если не успеваете; достаточно заглушки `logFftIndicesSnapshot` за feature-flag в config.

---

### Тесты

| Область | Минимум |
|---------|---------|
| Нормализация | reuse / unit-тесты делителей (если вынесен общий модуль) |
| State | ring buffer flux, обрезка до 200 |
| Canvas | smoke: функция `drawRadar` не падает на нулевых значениях (pure helper в `.ts` без DOM — предпочтительно) |

---

### Definition of Done

- [ ] Плагин `fft-indices-viz` зарегистрирован на модуле `microphone`, корректный teardown.
- [ ] При активном микрофоне три метрики обновляются live; совпадают по порядку величины с `fft-threshold-test` / демо (не «крошечные» flux из-за другой формулы).
- [ ] Три режима визуализации переключаются; легенды показывают raw + norm%; зона дрона на полосах (если включена в config).
- [ ] История flux рисуется и движется.
- [ ] a11y: статус потока, подписи кнопок режима.
- [ ] `yarn workspace @membrana/client typecheck` и тесты — зелёные.
- [ ] LGTM Teamlead.

---

### Out of scope

- Пороговый тест и `evaluateThresholdTest`.
- Классификатор акустических сцен (ветер/люди/дрон) из демо `StateClassifier`.
- Блок «общее качество звука» — отдельный промпт [`SOUND_QUALITY_VIZ_PLUGIN_PROMPT.md`](./SOUND_QUALITY_VIZ_PLUGIN_PROMPT.md).
- Журнал отчётов каждые 3 с из демо.
- Storybook.

---

### Порядок работы ролей

1. **Teamlead** — утвердить id плагина и вынос `fftMetricNormalize` (если нужен).
2. **Структурщик** — plugin + state + sampler wiring.
3. **Музыкант** — сверка метрик с демо на live-микрофоне.
4. **Верстальщик** — panel + canvas + легенды.
5. **Teamlead** — LGTM.

---

## Заметки для человека-постановщика

- GitHub Issue: «Microphone plugin: FFT indices live visualization» + ссылка на этот файл.
- Зависимость: `fft-threshold-test` уже на main — переиспользовать `METRIC_NORM` / flux tracker pattern.
- После merge можно добавить ссылку на плагин в `docs/prompts/README.md`.

---

## Связь с дорожной картой

Инструмент **калибровки и обучения оператора** перед полевыми тестами; дополняет `fft-threshold-test`, не заменяет детектор в шапке.
