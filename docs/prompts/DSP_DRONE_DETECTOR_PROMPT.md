# Промпт: DSP-детектор дрона (сервис, демо-приложение, плагин микрофона)

> **Исполнение фазы 1 (2026-05-16):** пакет `@membrana/dsp-drone-detector-service` **не создаём** — фаза 1 Issue [#45](https://github.com/officefish/Membrana/issues/45) идёт в [`@membrana/harmonic-detector-service`](../packages/services/detectors/harmonic/) по [`HARMONIC_DETECTOR_IMPLEMENTATION_PROMPT.md`](./HARMONIC_DETECTOR_IMPLEMENTATION_PROMPT.md) и мосту [`issue-45-harmonic-bridge.md`](../discussions/issue-45-harmonic-bridge.md). Ниже — полная спецификация фаз 2–3 и исторический контракт ADR.

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **L**.
> Ожидаемый артефакт: **3 PR** (рекомендуется по фазам; допустим 1 PR после согласования с Teamlead).
> Реестр: `id` = **`dsp-drone-detector`** в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Этап 1 дорожной карты WHITE_PAPER — **«Одинокий слушатель»**: один микрофон, бинарный ответ «похоже на аэро-источник / нет» с уровнем уверенности. Эшелон **0.1** в [`INTEGRATIONS_STRATEGY.md`](../INTEGRATIONS_STRATEGY.md) — чистый DSP на готовых FFT-кадрах, **без** обучения и **без** ML в v1.

Уже есть:

| Компонент | Назначение |
|-----------|------------|
| `@membrana/audio-engine-service` | кадры `AudioSampleFrame`, `LiveSampler` |
| `@membrana/fft-analyzer-service` | БПФ, magnitudes, вспомогательные метрики |
| [`docs/discussions/dsp-drone-detector-v0.1.md`](../discussions/dsp-drone-detector-v0.1.md) | контракт API, окно FFT, hop 50 % |
| [`docs/SERVICES.md`](../SERVICES.md) § Параметры захвата v0.1 | 48 kHz, fftSize 2048, overlap |
| Плагины `fft-indices-viz`, `sound-quality-viz`, `fft-threshold-test` | паттерны `install` / hub / панель |

**Не путать с:**

- `packages/temp/fft/FFTDroneDetectorService` — centroid/flux/RMS голосование; **reference only**, не переносить в prod.
- `fft-threshold-test` — пороговый **тест** с отчётами в телеметрии; другой продукт.
- YAMNet / CLAP / MFCC — **out of scope** этой задачи (отдельные analyzer-сервисы позже).

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md) | Постановка и закрытие |
| [`TASK_CLOSURE_REGULATION.md`](./TASK_CLOSURE_REGULATION.md) | Архивация, GitHub |
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Сервисы, hub, плагины |
| [`SERVICES.md`](../SERVICES.md) | Структура analyzer-пакета |
| [`DESIGN.md`](../DESIGN.md) | UI демо и плагина |
| [`MODULE_AND_PLUGIN_UI.md`](../MODULE_AND_PLUGIN_UI.md) | Регистрация, сайдбар |
| [`WHITE_PAPER.md`](../WHITE_PAPER.md) | §5.1 портрет дрона, Этап 1 |
| [`INTEGRATIONS_STRATEGY.md`](../INTEGRATIONS_STRATEGY.md) | Эшелон 0.1, `drone-analyzer-board` |
| [`DRONE_DETECTION_HEADER_SENSOR_PROMPT.md`](./DRONE_DETECTION_HEADER_SENSOR_PROMPT.md) | Глобальный датчик (follow-up / опциональная интеграция в фазе 3) |

**GitHub Issue:** создать `wish` «Реализовать dsp-drone-detector-service, демо и плагин микрофона»; в Issue указать `id: dsp-drone-detector` и ссылку на этот файл.

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом каждой фазы — план (1–2 абзаца + список файлов) и **явное LGTM** на контракт, если меняется публичный API.

Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md), [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md), [`SERVICES.md`](../SERVICES.md). Математика — **pure TS** в `src/math/`. React только в `hooks/` и UI.

---

### Цель задачи (продукт)

Поставить **production-ready** цепочку:

```text
микрофон → audio-engine → fft-analyzer → dsp-drone-detector → UI
```

в трёх артефактах:

1. **Сервис** `@membrana/dsp-drone-detector-service` — классификатор по гармоникам на magnitudes.
2. **Демо-приложение** — standalone Vite+React внутри пакета сервиса для отладки без полного клиента Membrana.
3. **Плагин** модуля «Микрофон» — тот же UX, что отработан в демо, через `plugin.install()` и `microphoneStreamHub`.

---

## Фаза 1 — Сервис `@membrana/dsp-drone-detector-service`

### Продукт

Реализовать analyzer-сервис: на вход **спектр** (magnitudes + meta), на выход **`DetectionResult`** по ADR [`dsp-drone-detector-v0.1.md`](../discussions/dsp-drone-detector-v0.1.md).

| Поле выхода | Тип | Смысл |
|-------------|-----|--------|
| `isDrone` | `boolean` | итог порога по confidence |
| `confidence` | `number` | 0..1 |
| `reasoning` | `string` | кратко на русском для UI/логов |
| `fundamentals?` | `number[]` | Гц, найденные несущие/гармоники |

### Алгоритм (Математик)

- **Ядро:** гармонический стек — поиск устойчивых пиков в полосе **80–250 Hz** (несущая) и кратных **2f, 3f, …** до **~5 kHz** (WHITE_PAPER §5.1).
- **Вход:** линейные magnitudes БПФ (не mel, не MFCC).
- **Вспомогательно:** `spectralCentroid`, `rms`, `lowEnergyPercent` из fft-analyzer — только в `reasoning`, **не** как единственный критерий.
- **Агрегация кадров:** ring buffer 2–3 последних спектров или hop **N/2** (см. ADR); параметр в `DetectorConfig`.

Pure-функции в `src/math/`:

- `classifySpectrum(magnitudes, sampleRate, fftSize, config?)` → `DetectionResult`
- вспомогательные: `findSpectralPeaks`, `scoreHarmonicStack`, `mergeFundamentals` (имена по согласованию Teamlead)

### Структура пакета (Структурщик)

```
packages/services/dsp-drone-detector/
├── README.md
├── package.json          # @membrana/dsp-drone-detector-service
├── tsconfig.json
├── vite.config.ts        # library mode (как fft-analyzer)
└── src/
    ├── index.ts          # единая точка входа
    ├── types.ts
    ├── constants.ts      # DEFAULT_DETECTOR_CONFIG
    ├── math/
    │   ├── classifier.ts
    │   ├── harmonics.ts
    │   └── *.test.ts
    ├── core/
    │   └── spectrum-aggregator.ts   # ring buffer magnitudes, hop
    └── hooks/
        └── use-dsp-drone-detector.ts  # live: fft frames → detection
```

**Зависимости:** `@membrana/core`, `@membrana/fft-analyzer-service` (и транзитивно audio-engine только в demo/hooks, не в math).

**Запрещено:**

- зависимость от других analyzer-сервисов;
- React/DOM/Web Audio в `src/math/`;
- импорт `apps/client`, `@membrana/agenda`, telemetry;
- копирование логики centroid/flux/RMS-voting из `packages/temp/fft`.

### Хук `useDspDroneDetector`

- Принимает поток кадров от `useFftAnalyzer` / `LiveSampler` или callback `onFrame`.
- Внутри: FFT уже снаружи → получает magnitudes (включить `advancedAnalysis.calculateSpectrum: true` в конфиге fft-analyzer).
- Возвращает: `lastDetection`, `isRunning`, `start`/`stop` при необходимости, стабильные коллбэки.
- Документировать в README сервиса пример live-цепочки.

### Тесты (фаза 1)

| Кейс | Ожидание |
|------|----------|
| Синтетический «дрон» (пики f, 2f, 3f) | `isDrone === true`, confidence выше порога |
| Белый шум | confidence низкий |
| Тишина / нулевой спектр | confidence ≈ 0 |
| Птица-подобный широкополосный спектр | контролируемая ложная тревога (задокументировать) |
| Регрессия aggregator | hop / ring buffer не ломает длину массивов |

Команда: `yarn workspace @membrana/dsp-drone-detector-service test typecheck build`.

### DoD фазы 1

- [ ] Пакет в workspace, alias в `apps/client/vite.config.ts` и `tsconfig.app.json` (подготовка к фазе 3).
- [ ] README: API, примеры, ссылка на ADR.
- [ ] ≥5 unit-тестов math, зелёный CI scope сервиса.
- [ ] Teamlead LGTM на контракт `DetectionResult` и пороги по умолчанию.

---

## Фаза 2 — Демо-приложение (standalone)

### Продукт

Отдельное **демо-приложение** внутри пакета сервиса — для Математика, Музыканта и ревью без запуска всего Membrana client.

```
packages/services/dsp-drone-detector/demo/
├── index.html
├── main.tsx
├── DemoApp.tsx
└── components/
    ├── DroneDetectionIndicator.tsx   # главный виджет
    ├── ConfidenceMeter.tsx
    ├── SpectrumPeek.tsx              # опционально: мини-спектр или список fundamentals
    └── DemoControls.tsx              # start/stop mic, порог confidence
```

### Поведение демо

| Элемент | Требование |
|---------|------------|
| Захват | `LiveSampler` + `FftAnalyzer` + `useDspDroneDetector` (эталонная цепочка v0.1) |
| Индикатор | «Дрон» / «Нет дрона», confidence %, цвет success/neutral по DESIGN.md |
| Reasoning | Сворачиваемый блок с текстом из `reasoning` |
| Fundamentals | Список частот (Гц) при развороте |
| Тема | DaisyUI / те же токены, что клиент (`data-theme`, минимум `forest` + `dark`) |
| Порт dev | отдельный от client (например **5178**), `yarn workspace @membrana/dsp-drone-detector-service dev:demo` |

### Техника

- Vite: либо `demo/vite.config.ts`, либо корневой config с `root: 'demo'` для команды `dev:demo`.
- Demo **импортирует только** публичный API сервиса + audio-engine + fft-analyzer — не `apps/client`.
- UI-компоненты демо — источник истины для **внешнего вида**; в фазе 3 переносятся в плагин (копия структуры с адаптацией props, не обязательно shared package).

### DoD фазы 2

- [ ] `yarn dev:demo` (или документированная команда) открывает UI, микрофон запрашивается, индикатор обновляется live.
- [ ] README § Demo: как запустить, что проверить вручную (тишина / речь / воспроизведение drone-sample если есть).
- [ ] Скриншот или короткая запись в PR description (опционально).
- [ ] Нет `motion.*` в JSX.

---

## Фаза 3 — Плагин модуля «Микрофон»

### Продукт

Плагин **`dsp-drone-detector-viz`** (id согласован с реестром задач):

```
apps/client/src/plugins/dsp-drone-detector-viz/
├── index.ts
├── types.ts
├── dspDroneDetectorVizPlugin.ts    # install / teardown
├── dspDroneDetectorPluginState.ts  # singleton + useSyncExternalStore
├── useDspDroneDetectorAnalysis.ts
├── DspDroneDetectorVizPanel.tsx
├── components/                     # порт UI из demo (фаза 2)
└── DspDroneDetectorSidebar.tsx     # опционально: порог, сглаживание
```

### Интеграция

| Шаг | Действие |
|-----|----------|
| Hub | `subscribeMicrophoneStream` — как `fft-indices-viz` / `sound-quality-viz` |
| Цепочка | hub → LiveSampler/FftAnalyzer frames → `useDspDroneDetector` |
| Регистрация | `MembranaRegistry.registerPlugin('microphone', createDspDroneDetectorVizPlugin())` в `registerClientModules.ts` |
| UI | Панель в `MicrophoneModule` (паттерн `MicStreamVizPluginPanel`) |
| Сайдбар | Ветка в `pluginSidebarDetails.tsx` при наличии настроек |

### Поведение плагина

- Визуальный паритет с **демо фазы 2** (те же компоненты/отступы/цвета).
- `plugin.install()`: подписка на hub при `active`; teardown — отписка, останов sampler, без утечек.
- **Не** писать в `@membrana/telemetry-service` в v1 (опционально follow-up).
- **Опционально (если успеваем):** публикация в `droneDetectionHub` для [`DRONE_DETECTION_HEADER_SENSOR_PROMPT.md`](./DRONE_DETECTION_HEADER_SENSOR_PROMPT.md) — согласовать с Teamlead; иначе отдельная задача.

### Запрещено

- прямой импорт других плагинов;
- дублирование FFT-математики в плагине (только вызов сервиса);
- `setInterval` в компонентах вместо потока кадров.

### DoD фазы 3

- [ ] Плагин в списке микрофона, включается/выключается, UI live.
- [ ] `yarn workspace @membrana/client typecheck` + тесты плагина при наличии.
- [ ] Ручная приёмка: микрофон + fft-threshold-test / sound-quality не ломаются (регресс соседних плагинов — одна строка в PR).
- [ ] Полный CI: `yarn turbo run lint typecheck test build --continue` зелёный.

---

## Сквозной Definition of Done (вся задача L)

- [ ] Все три фазы завершены; три PR с `Closes #<issue>` или один PR с тремя логическими коммитами.
- [ ] Контракт сервиса совпадает с [`dsp-drone-detector-v0.1.md`](../discussions/dsp-drone-detector-v0.1.md).
- [ ] Демо воспроизводимо по README без `.env`.
- [ ] Плагин зарегистрирован, UX согласован с DESIGN.md.
- [ ] `yarn task:archive dsp-drone-detector` после merge и отчёта в Issue.

---

## Out of scope (явно)

- Обучение моделей, MFCC/Mel-CNN, YAMNet, CLAP, ONNX sidecar.
- TDOA, второй узел, карта.
- `drone-analyzer-board` (сравнение нескольких детекторов) — отдельная задача после YAMNet baseline.
- Полевой корпус `test/audio-samples/` и `scripts/test-detector-on-samples.mjs` — отдельная M-задача (DAY_ISSUES фаза E).
- Изменение `fft-threshold-test` / телеметрии, кроме опционального hub-события.
- RF-признаки.

---

## Порядок работы ролей

| Порядок | Роль | Фазы |
|---------|------|------|
| 1 | **Teamlead** | Утверждение ADR, порогов, разбиение PR |
| 2 | **Математик** | Фаза 1: math + тесты |
| 3 | **Структурщик** | Фаза 1: пакет, hooks, turbo; фаза 3: hub, install |
| 4 | **Музыкант** | Фаза 2–3: цепочка 48k/2048/hop, ручная приёмка микрофона |
| 5 | **Верстальщик** | Фаза 2–3: DemoApp + панель плагина, a11y |
| 6 | **Teamlead** | LGTM, merge, архив |

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

## Рекомендуемые PR

| PR | Содержание | Closes |
|----|------------|--------|
| **PR-1** | Фаза 1 — сервис + тесты + README | часть Issue |
| **PR-2** | Фаза 2 — demo app | часть Issue |
| **PR-3** | Фаза 3 — плагин + регистрация | Closes #N |

В описании каждого PR: `id: dsp-drone-detector`, ссылка на этот промпт.

---

## Заметки для человека-постановщика

1. Создать GitHub Issue (`wish`): «DSP-детектор дрона: сервис, демо, плагин микрофона».
2. Запись в реестре уже добавлена: `dsp-drone-detector`, `status: active`, size **L**.
3. После merge: отчёт в Issue → `yarn task:archive dsp-drone-detector --notes "PR #…"`.
4. Связанные follow-up: `DRONE_DETECTION_HEADER_SENSOR_PROMPT`, `drone-analyzer-board`, полевые сэмплы.

### Проверка после merge

```bash
yarn workspace @membrana/dsp-drone-detector-service test typecheck build
# после фазы 2:
yarn workspace @membrana/dsp-drone-detector-service dev:demo
# после фазы 3:
yarn workspace @membrana/client dev
yarn turbo run lint typecheck test build --continue
```

---

## Связь с дорожной картой

- **WHITE_PAPER** § Этап 1 — Одинокий слушатель: `drone-detector-service` + UI индикатор.
- **INTEGRATIONS_STRATEGY** эшелон 0.1 — baseline для сравнения с YAMNet/CLAP.
- **DAY_ISSUES** — снятие оценки «лёгкая S-задача»; полный вертикальный срез.
