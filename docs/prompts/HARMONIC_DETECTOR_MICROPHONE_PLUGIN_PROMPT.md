# Промпт: плагин микрофона «Гармонический детектор» (normal + fullscreen)

> **Task-промпт для агента-разработчика** · фаза **3** Issue [#45](https://github.com/officefish/Membrana/issues/45).  
> **Статус:** подготовка постановки — **код не начинать**, пока Teamlead не даст команду «старт разработки».  
> Размер: **M–L** · артефакт: **1 PR** (плагин + координация захвата микрофона + hub).  
> Реестр: **`dsp-drone-detector`** (тот же `id`, не новая задача) — см. [`issue-45-harmonic-bridge.md`](../discussions/issue-45-harmonic-bridge.md).

---

## Контекст

| Готово | Где |
|--------|-----|
| Сервис `@membrana/harmonic-detector-service` | `packages/services/detectors/harmonic/` |
| Standalone demo + `LIVE_DETECTION_UI` | `harmonic/demo/`, [`LIVE_DETECTION_UI.md`](../LIVE_DETECTION_UI.md) |
| UX-анализ Replit lab | [`HARMONIC_DEMO_APPS_DEMOS_ANALYSIS_PROMPT.md`](./HARMONIC_DEMO_APPS_DEMOS_ANALYSIS_PROMPT.md) |
| Датчик в шапке + `droneDetectionHub` | `DroneDetectionHeaderSensor`, `publishDroneDetected` |
| Модуль «Микрофон» + `microphoneStreamHub` | `MicrophoneModule.tsx` |

**Остаётся:** плагин клиента с **двумя режимами UI** и **единым состоянием** захвата микрофона и детекции.

**Пакет:** только `@membrana/harmonic-detector-service` (не `dsp-drone-detector-service`).

**Плагин id (рекомендация):** `harmonic-detector-viz` · подпись в UI: «Гармонический детектор БПЛА».

---

## Решение команды: одна задача vs новая

| Вариант | Решение |
|---------|---------|
| Новый `id` в `registry.json` | **Не создаём** — фаза 3 уже в scope `dsp-drone-detector` / #45 |
| Этот файл | Детализация фазы 3; при старте агент читает **этот промпт** + мост #45 |
| GitHub | Комментарий/обновление #45 со ссылкой на постановку fullscreen; закрытие Issue — после merge PR-3 |

---

## Продукт

### Режимы UI

```text
┌─────────────────────────────────────────────────────────────┐
│  NORMAL (панель в модуле «Микрофон»)                        │
│  • Компактный блок: статус, confidence, гармоники, порог  │
│  • Кнопка «На весь экран» → fullscreen                    │
│  • Захват микрофона — синхрон с кнопкой модуля «Запустить»  │
│  • Детекция — синхрон с датчиком в шапке (через hub)        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  FULLSCREEN (overlay / portal, 100% viewport)               │
│  • Паритет с harmonic/demo (lab layout, LIVE_DETECTION_UI)  │
│  • Свои кнопки «Старт/Стоп» и индикатор детектора           │
│  • Те же действия, что модуль + шапка (не второй поток)     │
└─────────────────────────────────────────────────────────────┘
```

### Синхронизация (обязательные правила)

| Сущность | Источник истины | Поведение |
|----------|-----------------|-----------|
| **MediaStream / «слушаем»** | Модуль `microphone` (`MicrophoneModule`) | Один `MediaStream` на модуль; плагин **не** создаёт параллельный `getUserMedia` |
| **Кнопки Старт/Стоп** | Координатор захвата (см. § Архитектура) | Fullscreen и (опционально) compact — вызывают **те же** `start`/`stop`, что основная кнопка модуля |
| **Анализ кадров** | `plugin.install()` + `LiveSampler` | Один sampler на активный плагин; UI normal/fullscreen только подписывается |
| **Сглаженный статус «дрон»** | `DetectionSmoother` (порт из demo) | Один snapshot на плагин; оба режима читают одни данные |
| **Шапка приложения** | `droneDetectionHub` | Публикация при **переходе** `stableIsDrone: false → true` (не каждый кадр); `sourceId: 'harmonic-detector-viz'` |

**Запрещено:** второй микрофонный поток «для fullscreen»; рассинхрон «в fullscreen дрон есть, в шапке нет».

---

## Архитектура

### 1. Координатор захвата микрофона (новый, тонкий)

Файл (рекомендация): `apps/client/src/modules/microphone/microphoneCaptureCoordinator.ts`

```ts
export interface MicrophoneCaptureSnapshot {
  readonly isLive: boolean;
  readonly error: string | null;
}

/** Регистрирует модуль как единственного владельца MediaStream. */
export function registerMicrophoneCaptureOwner(handlers: {
  start: () => Promise<void>;
  stop: () => void;
  getSnapshot: () => MicrophoneCaptureSnapshot;
}): () => void;

export function requestMicrophoneStart(): Promise<void>;
export function requestMicrophoneStop(): void;
export function subscribeMicrophoneCapture(listener: () => void): () => void;
export function getMicrophoneCaptureSnapshot(): MicrophoneCaptureSnapshot;
```

- `MicrophoneModule` при mount регистрирует свои `startStream` / `stopStream`.
- Плагин harmonic и fullscreen UI вызывают только `requestMicrophoneStart/Stop`.
- Состояние `isLive` для бейджей — из `getMicrophoneCaptureSnapshot()` + `useSyncExternalStore`.

### 2. Runtime детектора плагина (singleton)

По образцу `micStreamPluginState.ts`:

```text
apps/client/src/plugins/harmonic-detector-viz/
├── harmonicDetectorPluginState.ts   # snapshot + subscribe
├── useHarmonicDetectorAnalysis.ts   # useSyncExternalStore
├── harmonicDetectorVizPlugin.ts     # install: hub stream → LiveSampler → detect
```

В `install()`:

1. `subscribeMicrophoneStream(moduleId, onStream)`.
2. При `stream != null` — `LiveSampler` + `createHarmonicDetector()`.
3. На кадр: `detector.detect(window)` → `DetectionSmoother.update()` → обновить state.
4. На rising edge `stableIsDrone` → `publishDroneDetected({ sourceId, sourceLabel, confidence })`.
5. Teardown: отписка, `sampler.stop()`, сброс smoother.

**Не** дублировать FFT/math в плагине.

### 3. Два UI-слоя

| Компонент | Режим |
|-----------|--------|
| `HarmonicDetectorVizPanel.tsx` | Normal — в `MicrophoneModule` при `activeIds.includes(HARMONIC_DETECTOR_VIZ_PLUGIN_ID)` |
| `HarmonicDetectorFullscreen.tsx` | Fullscreen — `createPortal` в `document.body`, `fixed inset-0 z-[…]` |
| `HarmonicDetectorFullscreenGate.tsx` | Кнопка входа / Esc / overlay close |

Fullscreen:

- `html/body` overflow hidden на время показа (как demo `index.css`).
- Выход: кнопка «Закрыть», **Esc**, опционально backdrop click (LGTM).
- Внутри — порт компонентов из demo: `DetectionStatus`, `ConfidenceMeter`, `DetectionDetails` / chips (см. анализ apps/demos).

### 4. Схема потоков

```mermaid
flowchart TB
  subgraph module [MicrophoneModule]
    BTN[Запустить / Остановить поток]
    REG[registerMicrophoneCaptureOwner]
  end

  subgraph coord [microphoneCaptureCoordinator]
    REQ[requestStart / requestStop]
    SNAP[isLive snapshot]
  end

  subgraph plugin [harmonic-detector-viz install]
    HUB[microphoneStreamHub]
    SAM[LiveSampler]
    DET[@membrana/harmonic-detector-service]
    SM[DetectionSmoother]
    STATE[harmonicDetectorPluginState]
  end

  subgraph ui [UI]
    PANEL[Normal panel]
    FS[Fullscreen overlay]
    HDR[droneDetectionHub → Header sensor]
  end

  BTN --> REG
  REG --> coord
  REQ --> BTN
  HUB --> SAM --> DET --> SM --> STATE
  STATE --> PANEL
  STATE --> FS
  SM -->|stableIsDrone ↑| HDR
  REQ --> PANEL
  REQ --> FS
  SNAP --> PANEL
  SNAP --> FS
```

---

## Структура файлов (целевая)

```text
apps/client/src/plugins/harmonic-detector-viz/
├── index.ts
├── types.ts
├── constants.ts
├── harmonicDetectorVizPlugin.ts
├── harmonicDetectorPluginState.ts
├── detection-smooth.ts              # порт из harmonic/demo (или shared позже)
├── useHarmonicDetectorAnalysis.ts
├── HarmonicDetectorVizPanel.tsx
├── HarmonicDetectorFullscreen.tsx
├── HarmonicDetectorFullscreenGate.tsx
├── HarmonicDetectorSidebar.tsx        # порог confidence (pluginSidebarDetails)
└── components/
    ├── DetectionStatus.tsx            # адаптация из demo
    ├── ConfidenceMeter.tsx            # + маркер порога (P0 из анализа)
    ├── DetectionDetails.tsx
    ├── HarmonicChip.tsx               # опционально P1
    └── HarmonicChipList.tsx
```

Регистрация:

```ts
// registerClientModules.ts
MembranaRegistry.registerPlugin('microphone', createHarmonicDetectorVizPlugin());
```

`MicrophoneModule.tsx` — импорт панели + не дублировать логику потока (только coordinator).

`pluginSidebarDetails.tsx` — ветка для `harmonic-detector-viz`.

---

## UI и регламенты

| Документ | Применение |
|----------|------------|
| [`LIVE_DETECTION_UI.md`](../LIVE_DETECTION_UI.md) | EMA + гистерезис + 3/6 кадров; без collapse; fullscreen height |
| [`HARMONIC_DEMO_APPS_DEMOS_ANALYSIS_PROMPT.md`](./HARMONIC_DEMO_APPS_DEMOS_ANALYSIS_PROMPT.md) | P0: маркер порога, бейджи mic, подзаголовок статуса; P1: chips |
| [`MODULE_AND_PLUGIN_UI.md`](../MODULE_AND_PLUGIN_UI.md) | install/teardown, без заголовка в панели |
| [`DESIGN.md`](../DESIGN.md) | DaisyUI, a11y, transitions 400–500 ms |

**Normal vs fullscreen:**

| Элемент | Normal | Fullscreen |
|---------|--------|------------|
| Статус дрон/не дрон | Да, compact | Да, крупно (как demo) |
| Confidence | Полоса + % | Полоса + % + маркер порога |
| Гармоники / reasoning | 2 строки или chips | То же, больше воздуха |
| Порог | Sidebar или inline slider | Slider в footer controls |
| Старт/Стоп mic | Опционально дублировать; **обязательно** синхрон | Да, через coordinator |
| Кнопка fullscreen | «На весь экран» | «Закрыть» |

---

## Расширение API сервиса (опционально, P1)

Если в том же PR — по [`HARMONIC_DEMO_APPS_DEMOS_ANALYSIS_PROMPT.md`](./HARMONIC_DEMO_APPS_DEMOS_ANALYSIS_PROMPT.md):

- `harmonicsHz?: readonly number[]` в `HarmonicSpectrumResult` / `DetectionResult`.
- UI: `HarmonicChipList` в обоих режимах.

Иначе — отдельный маленький PR до плагина.

---

## Промпт целиком (для агента после команды «старт»)

### Кто ты

Senior TS/React в Membrana. Читаешь этот файл, [`issue-45-harmonic-bridge.md`](../discussions/issue-45-harmonic-bridge.md), эталон `harmonic/demo/`. План → LGTM на coordinator API → код.

### Задача

1. Реализовать `harmonic-detector-viz` с **normal panel** и **fullscreen overlay**.
2. Ввести `microphoneCaptureCoordinator` и подключить `MicrophoneModule` + плагин.
3. Один `LiveSampler` + `DetectionSmoother` + `publishDroneDetected` для шапки.
4. Порт UI из demo; P0 из анализа apps/demos.
5. Тесты: coordinator, plugin state edge, hub publish debounce; не ломать соседние плагины микрофона.

### DoD

- [ ] Плагин включается в сайдбаре модуля «Микрофон», install/teardown без утечек.
- [ ] Normal: детекция live при общем потоке; старт/стоп с модулем синхронен.
- [ ] Fullscreen: lab UI; старт/стоп меняет тот же поток; Esc закрывает overlay.
- [ ] Шапка загорается при `stableIsDrone` (источник «Гармонический детектор»).
- [ ] `yarn workspace @membrana/client typecheck` + тесты зелёные.
- [ ] `yarn turbo run lint typecheck test build --continue` зелёный.
- [ ] README плагина или § в `harmonic/README.md` — ручная приёмка (тишина / дрон-sample).

### Out of scope

- Телеметрия в `@membrana/telemetry-service`.
- Новый fullscreen framework в `@membrana/agenda` (только portal в клиенте).
- `apps/demos/` в репозитории.
- ML / YAMNet / TDOA.

---

## Чеклист перед «старт разработки» (Teamlead)

- [ ] Подтверждён id плагина `harmonic-detector-viz`.
- [ ] Решено: P1 `harmonicsHz` в том же PR или отдельно.
- [ ] В #45 добавлен комментарий со ссылкой на этот промпт.
- [ ] Команда выдала явную команду агенту начать код.
- [ ] Ветка: `techies68` или согласованная feature-ветка.

После merge PR-3:

- [ ] Обновить чеклист в [`issue-45-harmonic-bridge.md`](../discussions/issue-45-harmonic-bridge.md).
- [ ] `yarn task:archive dsp-drone-detector` — только когда закрыты фазы 1–3 и Issue #45.

---

## Связанные документы

| Документ | Зачем |
|----------|--------|
| [`DSP_DRONE_DETECTOR_PROMPT.md`](./DSP_DRONE_DETECTOR_PROMPT.md) | Сквозная L-задача, фазы 1–3 |
| [`HARMONIC_DETECTOR_IMPLEMENTATION_PROMPT.md`](./HARMONIC_DETECTOR_IMPLEMENTATION_PROMPT.md) | Фаза 1 |
| [`HARMONIC_DETECTOR_STANDALONE_DEMO_PROMPT.md`](./HARMONIC_DETECTOR_STANDALONE_DEMO_PROMPT.md) | Фаза 2 |
| [`DRONE_DETECTION_HEADER_SENSOR_PROMPT.md`](./DRONE_DETECTION_HEADER_SENSOR_PROMPT.md) | Контракт hub |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Hub-паттерны |
