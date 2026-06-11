# Промпт: рефакторинг анализаторов — единый AudioFrameFeed (микрофон + библиотека сэмплов)

> **Task-промпт для агента-разработчика** · размер **M**  
> Ожидаемый артефакт: **1 PR** — `AudioFrameFeed` в client + миграция `fft-threshold-test` и `harmonic-detector-viz`.  
> Реестр: `analyzer-frame-feed-refactor` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Микрофонные анализаторы **FFT пороговый тест** (`fft-threshold-test`) и **Гармонический детектор БПЛА** (`harmonic-detector-viz`) дублируют один каркас: `subscribeMicrophoneStream` → `LiveSampler` → `handleFrame`. Продуктовая цель — чтобы **любой** анализатор работал из трёх источников:

| Источник | Сейчас | После задачи |
|----------|--------|--------------|
| Live микрофон (модуль «Микрофон») | ✓ оба плагина | `MicFrameFeed` |
| Текущий сэмпл библиотеки (`sample-library`) | ✗ | `BufferFrameFeed` (offline-scan) |
| Device board (визуальный граф, будущий D1) | концепт | `GraphFrameFeed` (stub + типы) |

Задача **не** добавляет новую математику и **не** реализует UI device-board — только общий слой подачи `AudioSampleFrame` и миграцию двух эталонных плагинов.

Зависимости: `media-library-a4-sample-player` (hub `sampleLibraryPlaybackHub`) желательно в main; при конфликте веток — offline-scan через `getSampleBlob` + `loadAudioBuffer`.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md) | Процесс постановки |
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | §1b engine, §1c слабая связанность |
| [`SERVICES.md`](../SERVICES.md) | Слои foundation / analyzer |
| [`MODULE_AND_PLUGIN_UI.md`](../MODULE_AND_PLUGIN_UI.md) | `install` / teardown |
| [`packages/device-board/DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) | `AudioFrame`, `Detection`, `nodeKind` |
| [`FFT_THRESHOLD_TEST_PLUGIN_PROMPT.md`](./FFT_THRESHOLD_TEST_PLUGIN_PROMPT.md) | Исходная спецификация threshold-test |
| [`HARMONIC_DETECTOR_MICROPHONE_PLUGIN_PROMPT.md`](./HARMONIC_DETECTOR_MICROPHONE_PLUGIN_PROMPT.md) | Исходная спецификация harmonic-viz |
| [`MEDIA_LIBRARY_A4_SAMPLE_PLAYER_PROMPT.md`](./MEDIA_LIBRARY_A4_SAMPLE_PLAYER_PROMPT.md) | `sampleLibraryPlaybackHub` |

**Референс (не копировать):** дублирование `LiveSampler` в `fft-indices-viz`, `sound-quality-viz` — мигрируются в отдельной задаче.

**GitHub Issue:** [#55](https://github.com/officefish/Membrana/issues/55).

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом — план (1–2 абзаца + список файлов). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).

---

### Что построить (продуктовое описание)

#### 1. Общий слой `AudioFrameFeed`

Пакет/модуль в client: `apps/client/src/lib/audioAnalysis/`

```ts
type AnalysisSourceKind = 'microphone' | 'sample-library' | 'graph';

interface AudioFrameFeed {
  readonly sourceKind: AnalysisSourceKind;
  subscribe(handler: (frame: AudioSampleFrame) => void): () => void;
  start(): Promise<void>;
  stop(): Promise<void>;
}
```

Фабрики:

| Фабрика | Поведение |
|---------|-----------|
| `createMicFrameFeed(moduleId, options)` | `microphoneStreamHub` + `LiveSampler`; lifecycle как сейчас в плагинах |
| `createBufferFrameFeed(options)` | Offline-scan `AudioBuffer`: кадры `Float32Array` с шагом `bufferSize` (или по `hopSize`); эмит `AudioSampleFrame` с корректным `sampleRate` |
| `createGraphFrameFeed(handleId)` | **Stub v1:** registry + no-op / throw с понятным сообщением; API стабилен для device-board D1 |

Опции feed (общие): `bufferSize`, `smoothingTimeConstant`, `onStart` / `onStop` callbacks.

#### 2. Рефакторинг `fft-threshold-test`

- Заменить прямой `subscribeMicrophoneStream` + `LiveSampler` на `AudioFrameFeed`.
- Добавить в конфиг плагина: `analysisSource: 'microphone' | 'sample-library'` (default: `'microphone'`).
- При `sample-library`:
  - брать **текущий выбранный** сэмпл из `sampleLibraryPlaybackHub`;
  - декодировать через `loadAudioBuffer` (engine);
  - прогонять offline-scan через `BufferFrameFeed`;
  - логика окна N кадров, verdicts, отчёт в телеметрию — **без изменения семантики**.
- При публикации в `droneDetectionHub` (если есть) — `sourceId` с суффиксом `-sample` при анализе файла.

#### 3. Рефакторинг `harmonic-detector-viz`

- Тот же `AudioFrameFeed`; обработчик кадра сохраняет семантику: `audioWindowFromFrame` → `HarmonicDetector.detect()` → smoother → hub.
- Конфиг `analysisSource` аналогично threshold-test.
- При `sample-library`: sliding window / offline-scan по `AudioBuffer` (достаточно последовательных кадров с `DEFAULT_FFT_SIZE`).
- `publishDroneDetected`: при sample-mode — `sourceId` вида `harmonic-detector-viz-sample` (или документированный суффикс).

#### 4. Подготовка к device-board (только контракт)

- Типы `AnalysisSourceKind` — экспорт из `audioAnalysis/types.ts`.
- Для `harmonic-detector-viz` задокументировать (в types или comment) целевой `nodeKind`:
  - `category: 'detector'`
  - `inputs: [{ type: 'AudioFrame', handle: 'audio-in' }]`
  - `outputs: [{ type: 'Detection', handle: 'detection-out' }]`
- Для `fft-threshold-test` — `category: 'analyzer'`, вход `AudioFrame`, выход `Detection` (или `FftMetrics` до стабилизации каталога сокетов).
- Регистрация `nodeKind` в `MembranaRegistry` — **опционально в v1** (достаточно типов в файле плагина + TODO в промпте device-board).

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Engine | `@membrana/audio-engine-service` | `LiveSampler`, `AudioSampleFrame`, `loadAudioBuffer` |
| FFT | `@membrana/fft-analyzer-service` | Математика threshold-test (**не менять** без необходимости) |
| Detector | `@membrana/harmonic-detector-service` | `HarmonicDetector` (**не менять**) |
| Base | `@membrana/detector-base` | `audioWindowFromFrame` |
| Feed | `apps/client/src/lib/audioAnalysis/` | `AudioFrameFeed`, фабрики, unit-тесты |
| Hub mic | `microphoneStreamHub` | Источник для `MicFrameFeed` |
| Hub sample | `sampleLibraryPlaybackHub` | Выбор сэмпла + доступ к blob |
| Плагины | `fft-threshold-test/`, `harmonic-detector-viz/` | Тонкая оболочка: feed + state + UI |

**Запрещено:**

- Новый `AudioContext` в client (только engine).
- Импорт плагин → плагин.
- Дублирование `LiveSampler` boilerplate в двух плагинах после рефакторинга.
- Изменение UX harmonic (normal + fullscreen) кроме переключателя источника (если добавлен в sidebar).
- Реализация trends-fft или UI device-board в этом PR.

---

### Визуальный дизайн (минимальный)

- Переключатель источника **опционально v1**: достаточно `analysisSource` в sidebar/config без крупного UI; если добавляется — DaisyUI `select` / `tabs`, `aria-label="Источник анализа"`.
- Поведение live mic — **визуально идентично** текущему (регрессия недопустима).

---

### Тесты

| Область | Минимум |
|---------|---------|
| `createBufferFrameFeed` | детерминированное число кадров для синусоидального `AudioBuffer` (mock buffer) |
| `createMicFrameFeed` | smoke: subscribe/unsubscribe без утечек (unit с mock hub при возможности) |
| `fft-threshold-test` | существующие тесты отчётов/telemetry — green |
| Client | `yarn workspace @membrana/client test` |

Ручная проверка (Музыкант):

- Mic: threshold-test auto/manual; harmonic на дрон-сэмпле / тишине.
- Sample-library: выбрать WAV → threshold-test завершает прогон; harmonic даёт осмысленный результат на эталонном файле.

---

### Definition of Done

- [ ] `apps/client/src/lib/audioAnalysis/` с `AudioFrameFeed` + 3 фабрики (graph — stub)
- [ ] `fft-threshold-test` на mic — поведение как до рефакторинга
- [ ] `harmonic-detector-viz` на mic — поведение как до рефакторинга (smoother, hub, fullscreen)
- [ ] Оба плагина: режим `sample-library` для текущего выбранного сэмпла (offline-scan)
- [ ] Unit-тесты feed (минимум buffer-scan)
- [ ] Нет нового `AudioContext` в client
- [ ] `yarn workspace @membrana/client test` + `yarn turbo run lint typecheck test build --filter=@membrana/client --continue` — зелёный
- [ ] LGTM Teamlead

---

### Out of scope

- Плагин `trends-fft-analyzer` (задача `trends-fft-microphone-plugin`)
- UI модуля device-board, React Flow, `applyGraph`
- Live-follow кадров **во время** play сэмпла (v1.1; offline-scan достаточен)
- Рефакторинг `fft-indices-viz`, `sound-quality-viz`, `microphone-stream-viz`
- Изменение математики `@membrana/harmonic-detector-service` / `@membrana/fft-analyzer-service`

---

### Порядок работы ролей

1. **Teamlead** — согласовать API feed; Issue при triage.
2. **Структурщик** — границы `audioAnalysis/` vs hubs; запрет второго AudioContext.
3. **Математик** — корректность `AudioSampleFrame` при buffer-scan (sampleRate, длина кадра).
4. **Музыкант** — ручной smoke mic + sample-library на 2–3 файлах.
5. **Верстальщик** — если есть UI переключателя источника — DaisyUI + a11y.

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

1. GitHub Issue (`wish`): «Вынести AudioFrameFeed и мигрировать fft-threshold-test + harmonic-detector-viz» + ссылка на этот файл и `analyzer-frame-feed-refactor`.
2. Запись в `registry.json` уже есть (`status: active`).
3. **Блокирует** задачу `trends-fft-microphone-plugin` — не стартовать trends до merge этого PR (или согласованного rebase).
4. После merge: отчёт в Issue → `yarn task:archive analyzer-frame-feed-refactor --notes "PR #…"`.

### Проверка после PR

```bash
yarn workspace @membrana/client test
yarn turbo run lint typecheck test build --filter=@membrana/client --continue
```

---

## Связь с дорожной картой

- Подготовка к `@membrana/device-board` D1 (`DEVICE_BOARD_CONCEPT.md` §5 `AudioFrame`, §7 lifecycle).
- Единый вход для анализаторов в библиотеке сэмплов (после A4).
- Блокирующая задача для `trends-fft-microphone-plugin`.
