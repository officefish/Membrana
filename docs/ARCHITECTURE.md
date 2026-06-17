# Архитектура (Membrana + аудио-подсистема)

Документ задаёт **стратегические** правила для человеческих и AI-агентов. Детали монорепо согласованы с корневыми правилами Cursor (`.cursorrules`). Фоновые NestJS-серверы (`background-office`, `background-media`) — [`BACKGROUND_SERVERS.md`](./BACKGROUND_SERVERS.md).

## 1. Монорепо Membrana (обязательное)

- Менеджер пакетов и сборка: как в корневом `package.json` / Turbo (не дублировать политику здесь полностью).
- **Зависимости между пакетами**:
  - `@membrana/core` не зависит от других пакетов проекта.
  - `@membrana/agenda` и `@membrana/device-board` зависят только от `@membrana/core`, **не друг от друга**.
  - `apps/client` может зависеть от любых внутренних пакетов.
- Публичное API пакета — только через `src/index.ts`; межпакетные импорты — через алиасы `@membrana/*`.
- Именование файлов и типов — как в `.cursorrules`.

Аудио-функциональность, когда появится, размещается в **отдельных пакетах** (например, `@membrana/audio-analysis`, `@membrana/audio-dsp`), не нарушая перечисленный граф зависимостей.

### 1a. Раздел `packages/services/*` — пакеты-сервисы

Самостоятельные **vite-ts-react** пакеты с чистой бизнес-логикой и тонким React-слоем. Подробные правила: [SERVICES.md](./SERVICES.md).

- Каждый сервис лежит в `packages/services/<имя>/` и имеет собственные `package.json`, `tsconfig.json`, `vite.config.ts`.
- Имя пакета: `@membrana/<имя>-service` (например, `@membrana/audio-engine-service`, `@membrana/fft-analyzer-service`).
- Допустимые зависимости: **только** `@membrana/core` + внешние npm-пакеты;
  **исключение:** пакеты в `packages/services/detectors/*` — см. §1e (`detector-base`
  + `audio-engine-service` для типов окна).
- **Нельзя**: зависеть от других сервисов, от `@membrana/agenda` / `@membrana/device-board` / `apps/client`.
- Публичный API — через `src/index.ts`. Внутреннее деление: `service.ts` (чистая логика), `hooks.ts` (React-обёртка), `types.ts`.
- Клиент потребляет сервисы через alias в `apps/client/vite.config.ts` (на исходники) — без шага сборки в dev.

Эталоны: `packages/services/audio-engine/` (foundation) + `packages/services/fft-analyzer/` (analyzer).
Разделение **foundation ↔ analyzer** позволяет переиспользовать одну инфраструктуру для разных видов анализа (FFT, нейросети, LLM).

### 1b. Центральный узел первичной обработки аудио

`@membrana/audio-engine-service` — **единственный** узел, который имеет право обращаться к Web Audio API напрямую (`AudioContext`, `AnalyserNode`, `getUserMedia`, `decodeAudioData`, `MediaStream`). Все клиентские модули и плагины используют только публичный API engine'а:

| Сценарий | Через что |
|----------|-----------|
| Получить список input-устройств | `getAudioInputDevices()` |
| Захватить микрофон | `acquireMicrophone()` |
| Освободить MediaStream | `releaseMediaStream()` |
| Декодировать файл в `AudioBuffer` | `loadAudioBuffer()` / `useAudioFile()` |
| Получать кадры с потока | `LiveSampler` / `useLiveSampler()` / `useMicrophone()` |
| Прямой `AnalyserNode` (для виджетов аудио-визуализации) | `LiveSampler.getAnalyserNode()` / `useLiveSampler().analyserNode` |

**Запрет.** Новые модули и плагины **не** пишут `new AudioContext()`, `navigator.mediaDevices.getUserMedia(...)`, `createAnalyser()` и подобное напрямую. Это работа engine'а.

**Реализованный эталон.** Модуль `apps/client/src/modules/microphone/MicrophoneModule.tsx` + плагин `apps/client/src/plugins/microphone-stream-viz/*` — паттерн, на который ориентируется любая будущая аудио-фича: модуль через engine добывает `MediaStream`, публикует его в hub; плагин(ы) подписываются на hub и поднимают `LiveSampler` на этом stream для своих метрик/визуализаций.

### 1c. Регистрация модулей и плагинов клиента

Канонический фасад регистрации — **`MembranaRegistry`** из `@membrana/agenda` (`packages/agenda/src/core/registry.ts`).

- Все модули клиента регистрируются как **lazy** через `MembranaRegistry.registerLazyModule({ ..., loader })`. Фасад сам оборачивает loader в `React.lazy` — чанк Vite приходит только при монтировании модуля.
- Плагины регистрируются через `MembranaRegistry.registerPlugin(moduleId, factory())`.
- В конце фазы регистрации вызывается `MembranaRegistry.finalizeRegistration()` — единая публичная точка сброса `pendingModulePrefs`.
- **Прямой `useMembranaStore.getState().registerModule(...)` запрещён** — обходит фасад и привязывает клиента к внутреннему API store.

Точка входа: `apps/client/src/modules/registerClientModules.ts` (вызывается один раз из `apps/client/src/main.tsx`).

Подробный процесс и чек-лист — [MODULE_AND_PLUGIN_UI.md §0](./MODULE_AND_PLUGIN_UI.md#0-регистрация-модулей-и-lazy-loading).

**Lifecycle `plugin.install()` / teardown:** контракт `Plugin.install(ctx) => teardown?` реализован в `packages/agenda/src/core/plugin-lifecycle.ts`. Store вызывает `install` при активации (включая повторную регистрацию активного плагина после rehydrate) и teardown при деактивации. Эталон — `apps/client/src/plugins/microphone-stream-viz/micStreamVizPlugin.ts`: подписка на `microphoneStreamHub` и поднятие `LiveSampler` живут в `install()`, UI-компонент только читает singleton-state через `useSyncExternalStore`.

### 1e. Семейства детекторов (`packages/services/detectors/*`)

Стратегия **Single-Node Detection First** (см. [`WHITE_PAPER.md`](./WHITE_PAPER.md) §8,
консилиум `docs/seanses/single-node-detection-first-2026-05-16.md`): до stage-gate 1→2
все усилия на **качество детекции на одном узле**; TDOA и мультиузел — после шлюза.

| Пакет | Статус | Семейство |
|-------|--------|-----------|
| `@membrana/detector-base` | **stable v0.1** | контракты `DroneDetector`, `DetectionResult`, `AudioWindow`, `DetectionMetrics` |
| `@membrana/harmonic-detector-service` | implemented v0.1 | dsp |
| `@membrana/cepstral-detector-service` | scaffold | dsp |
| `@membrana/spectral-flux-detector-service` | scaffold | dsp |
| `@membrana/template-match-detector-service` | implemented v0.1 | trends (FFT template-match) |
| `@membrana/yamnet-detector-service` | scaffold | neural |
| `@membrana/clap-detector-service` | scaffold | neural |
| `@membrana/agentic-detector-service` | scaffold | agentic |
| `@membrana/detection-ensemble-service` | план (после gate) | агрегатор |
| `@membrana/tdoa-service` | frozen @stage 2 | сеть |
| `@membrana/localizer-service` | frozen @stage 2 | сеть |
| `@membrana/tracker-service` | frozen @stage 2 | сеть |
| `@membrana/transport-service` | frozen @stage 2 | сеть |

**Заморозка до stage-gate 1→2:** пакеты `tdoa-service`, `localizer-service`, `tracker-service`,
`transport-service` не реализуются и не подключаются в клиент до precision ≥85% и recall ≥90%
на бенчмарке ([`DETECTOR_BENCHMARK.md`](./DETECTOR_BENCHMARK.md)).

**Контракт (единый для всех детекторов):**

```typescript
interface DroneDetector {
  readonly name: string;
  readonly family: 'dsp' | 'neural' | 'agentic';
  detect(window: AudioWindow): Promise<DetectionResult>;
}

interface DetectionResult {
  isDrone: boolean;
  confidence: number; // 0..1, калибровано (порог / softmax / модель)
  reasoning?: string; // обязательно для agentic
  features?: Record<string, number>;
  latencyMs: number;
}

interface DetectionMetrics {
  precision: number;
  recall: number;
  f1: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  sampleCount: number;
}

interface AudioWindow {
  readonly samples: Float32Array;
  readonly sampleRate: number;
  readonly timestamp: number; // мс от начала потока
  readonly durationSec: number;
}
```

`AudioWindow` строится из кадров `@membrana/audio-engine-service` (`AudioSampleFrame`);
детекторы **не** обращаются к Web Audio напрямую.

**Правила зависимостей:**

- `@membrana/detector-base` → `@membrana/core`, `@membrana/audio-engine-service`.
- Каждый `*-detector-service` → `@membrana/core`, `@membrana/detector-base` **только**.
- **Запрещены** импорты между детекторами (harmonic ↔ yamnet и т.д.).
- Analyzer-сервисы вне `detectors/` (например `fft-analyzer`) не импортируют детекторы.

**Stage-gate 1→2:** precision ≥ 85%, recall ≥ 90% на тестовом наборе;
протокол — [`DETECTOR_BENCHMARK.md`](./DETECTOR_BENCHMARK.md).

**Ensemble:** `@membrana/detection-ensemble-service` — отдельный пакет после ranking
одиночных детекторов; не блокирует gate.

#### Калибровка DRONE_TIGHT (shipped curated + client facade)

После эпика fft-last-chance (#84) **production-кандидат эшелона 0** — trends/template-match
с шаблоном `DRONE_TIGHT` (см. [`FFT_METRICS_POTENTIAL_AND_LIMITS.md`](./prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md)).
Источник чисел и temporal-паттернов — **не** client и **не** `background-media` для shipped-каталога.

| Слой | Где живёт истина | Роль |
|------|------------------|------|
| **Shipped curated `DRONE_*`** | `packages/services/detectors/template-match/src/data/curated-drone-templates.json` | единственный канон порогов и temporal для `DRONE_TIGHT` |
| **Benchmark sync** | `data/detectors-benchmark/v0.2/curated-drone-templates.json` | тот же JSON для `yarn benchmark:detectors` (держать в sync с пакетом) |
| **Client defaults** | `apps/client/src/lib/droneTightCalibration.ts` | thin facade: дефолты плагинов mic/sample-library, `mergeDroneTightTrendsTemplates()`; **без** дублирования чисел |
| **User trends-шаблоны (remote)** | `@membrana/background-media` per `deviceId` | только пользовательские шаблоны при `ServerStorageBackend`; не подменяют shipped `DRONE_TIGHT` |
| **Journal UI** | `@membrana/journal-report-views` | рендер отчётов FFT/trends; client — композиция |

**Правила для `apps/client`:**

- Импорт curated-каталога — **только** через публичный API `@membrana/template-match-detector-service` (`createDefaultTemplateMatchCatalog`, `DEFAULT_CURATED_DRONE_TEMPLATES`, `collectMetricSamples`, …).
- **Запрещено:** импорт `curated-drone-templates.json` / `fft-last-chance-best-template.json` из client; локальные копии порогов в plugin `types.ts`.
- Trends scoring — `@membrana/trends-detector-service` (`classifyTrends`); mic FFT metrics — `@membrana/fft-analyzer-service`.
- Проверка границы: `apps/client/src/lib/droneTightImportBoundary.test.ts` (CI).

### 1d. Семейство `packages/background-*` — фоновые Node-серверы

Автономные **NestJS**-приложения вне графа `packages/services/*`: не зависят от `@membrana/core`, `@membrana/agenda`, `@membrana/device-board`, `apps/client`. Каноническое описание ролей, границ и чеклист «куда класть фичу» — [`BACKGROUND_SERVERS.md`](./BACKGROUND_SERVERS.md).

| Пакет | Роль | Stateful |
|-------|------|----------|
| `@membrana/background-office` | Интеграции: Claude, Linear, GitHub webhooks | Нет |
| `@membrana/background-media` | Data-plane веб-клиента: сэмплы, trends-шаблоны, `deviceId` | PostgreSQL + blob volume |

**Не смешивать:** пользовательские WAV и шаблоны trends — только **media**; секреты LLM/тикетов и webhook'и — только **office**.

#### `background-office` — интеграционный HTTP-шлюз

`@membrana/background-office` (порт dev **3000**): вызовы Anthropic (Claude), Linear GraphQL, приём подписанных Linear webhooks, чтение GitHub Issues для persona-контекста. Auth: `X-Membrana-Token` на `/v1/*`. README: `packages/background-office/README.md`.

#### `background-media` — data-plane для sample library и шаблонов

`@membrana/background-media` (порт dev **3010**, эпик [#58](https://github.com/officefish/Membrana/issues/58)): REST API для `@membrana/media-library-service` (`ServerStorageBackend`), хранение trends-шаблонов (JSON), изоляция данных по **`deviceId`**. Стек: **NestJS + Fastify** (не Express — office остаётся на Express для webhooks), **Prisma + PostgreSQL**, blob volume (мультиформат audio: wav/mp3/flac/ogg). Auth: `X-Membrana-Token` + scope по device. Спецификация: [`BACKGROUND_SERVERS.md`](./BACKGROUND_SERVERS.md), [`MEDIA_LIBRARY_ARCHITECTURE.md`](./MEDIA_LIBRARY_ARCHITECTURE.md) §4.2.

Клиент при недоступности media-server: `browser-limited-fallback` (IndexedDB) — см. `MEDIA_LIBRARY_ARCHITECTURE.md` §4.3.

### 1f. Визуальный граф прибора (`@membrana/device-board`)

Пакет `@membrana/device-board` — редактор **signal graph** (топология захват →
анализ → observation) и **scenario graph** (visual scripting: initial, loops,
триггеры). Ноды signal-слоя = зарегистрированные плагины, рёбра = подписки
на shared-хабы. Scenario-слой исполняется **scenario runtime** (чистое ядро
пакета), вызывающим существующие engine/плагины/journal — **не** второй
AudioContext и **не** Rete/DataflowEngine для сигнала.

| Правило | Смысл |
| ------- | ----- |
| UI-стек | `@xyflow/react`; вкладки Signal / Scenario (см. [`DEVICE_BOARD_CONCEPT.md`](../packages/device-board/DEVICE_BOARD_CONCEPT.md) v0.3) |
| Источник истины | `MembranaRegistry` + persisted JSON (`device-scenario` v1) |
| Signal исполнение | `audio-engine-service`, shared-хабы, `plugin.install` / teardown |
| Scenario исполнение | `ScenarioRuntime` в `device-board`; оркестрация без обхода engine |
| Настройки нод | сайдбар плагинов (`MODULE_AND_PLUGIN_UI.md` §3) |

Полный концепт: [`packages/device-board/DEVICE_BOARD_CONCEPT.md`](../packages/device-board/DEVICE_BOARD_CONCEPT.md).

## 2. Плагины и слабая связанность (домен аудио)

- **Запрещены прямые импорты между плагинами** друг друга.
- Разрешены только:
  - **шина событий** (подписка по типам событий / темам), или
  - **фасады** из ядра приложения / composition root, которые регистрируют плагины и пробрасывают контракты.
- Плагин общается с остальной системой через:
  - интерфейсы, объявленные в core / audio-host пакете;
  - DTO/простые структуры данных;
  - события, а не прямые ссылки на классы другого плагина.

## 3. Слои

| Слой | Ответственность | Где живёт |
|------|-----------------|-----------|
| **Чистые вычисления** | FFT, спектр, вейвлеты, детекторы — без UI и без знания о драйвере вывода. | `packages/services/*/src/service.ts` |
| **DSP / эффекты** | Реальный аудио-поток, эффекты, ресемплинг, защита от клиппинга. | `apps/client/src/plugins/` или `packages/services/<dsp>/` |
| **Сервисные хуки** | Тонкая обёртка над сервисом для React-потребителей. | `packages/services/*/src/hooks.ts` |
| **Интеграция** | Структурщик: хуки, сторы, связывание шины и фасадов. | `packages/agenda` / `device-board` |
| **Презентация** | Верстальщик: только отображение и ввод; данные через props / контекст / хуки сервисов. | `apps/client/src/`, `packages/agenda/src/ui/` |

## 4. Математика и внешние библиотеки

- Предпочтение: **минимум зависимостей**; Python: `numpy`, `scipy`, `librosa` или чистый Python; TS: явно согласованные модули, без «толсты» UI-зависимостей в вычислительном слое.
- Тяжёлые преобразования — **мемоизация** / кэш по параметрам (размер окна, sample rate), если иначе нарушается интерактивность.

## 5. Качество аудио

- Целевые характеристики цепочки: **48 kHz**, **24 bit** там, где это контролируется приложением.
- Обязательная проверка на артефакты (алиасинг, щёлчки при смене буфера) на стороне **Музыканта**; метрики — по согласованию в PR.

## 6. Ревью и LGTM

- **Teamlead** (человек или агент с этой ролью) фиксирует в PR: соответствие разделам 1–5, отсутствие запрещённых импортов между плагинами, соблюдение границ пакетов.
- Слияние по процессу виртуальной команды без пометки **LGTM** от роли Teamlead не рекомендуется.
