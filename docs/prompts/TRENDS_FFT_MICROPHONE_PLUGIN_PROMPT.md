# Промпт: плагин микрофона «Trends FFT» — классификация акустических сцен

> **Task-промпт для агента-разработчика** · размер **M–L**  
> Ожидаемый артефакт: **1 PR** — `@membrana/trends-detector-service` + плагин `trends-fft-analyzer` на модуле «Микрофон».  
> Реестр: `trends-fft-microphone-plugin` · **зависит от** `analyzer-frame-feed-refactor`.  
---

## Контекст

**Анализатор тенденций FFT**: сбор серии кадров (centroid, flux, RMS), вычисление временных паттернов, fuzzy-классификация по шаблонам сцен (ветер, тишина, трафик, дрон-bootstrap и т.д.). В отличие от `fft-threshold-test` (pass/fail по порогам) — **многоклассовая** классификация с весом ~70% temporal / ~30% spectral. Каноническая реализация: `@membrana/trends-detector-service` + плагин `trends-fft-analyzer`.

Продуктовая модель (зафиксирована постановщиком):

| Режим | Задача |
|-------|--------|
| Live микрофон | **эта задача (v1)** |
| Текущий сэмпл библиотеки | задача C (после v1) |
| Device board | контракт `nodeKind` в v1; executor — D1 |

**Обязательная зависимость:** `analyzer-frame-feed-refactor` — плагин использует `AudioFrameFeed` (`MicFrameFeed`), не дублирует `subscribeMicrophoneStream`.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`ANALYZER_FRAME_FEED_REFACTOR_PROMPT.md`](./ANALYZER_FRAME_FEED_REFACTOR_PROMPT.md) | AudioFrameFeed, блокирующая задача |
| [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md) | Процесс |
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | §1b, §1e detectors |
| [`SERVICES.md`](../SERVICES.md) | analyzer-сервисы, pure TS |
| [`MODULE_AND_PLUGIN_UI.md`](../MODULE_AND_PLUGIN_UI.md) | Плагин на микрофоне |
| [`DESIGN.md`](../DESIGN.md) | DaisyUI, a11y |
| [`FFT_THRESHOLD_TEST_PLUGIN_PROMPT.md`](./FFT_THRESHOLD_TEST_PLUGIN_PROMPT.md) | Паттерн тиков, auto/manual, телеметрия |
| [`packages/device-board/DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) | `Detection` socket |
| [`single-node-detection-first`](../tasks/README.md) | #47 — trends = scene tagging, не stage-gate harmonic |

**Референс UX/математики:** `packages/services/trends-detector/` (`classifyTrends`, `system-templates.ts`) и `apps/client/src/plugins/trends-fft-analyzer/`.

**GitHub Issue:** [#56](https://github.com/officefish/Membrana/issues/56) · блокируется [#55](https://github.com/officefish/Membrana/issues/55).

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом — план (1–2 абзаца + список файлов). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md). **Не начинать**, пока `analyzer-frame-feed-refactor` не в main (или явно согласованная ветка с `audioAnalysis/`).

---

### Что построить (продуктовое описание)

#### 1. Сервис `@membrana/trends-detector-service`

Новый пакет: `packages/services/trends-detector/` (или `packages/services/analyzers/trends-detector/` — по конвенции `SERVICES.md`, эталон `fft-analyzer`).

Pure TypeScript, **без** React/DOM/Web Audio.

**Публичное API (минимум):**

```ts
interface MetricSample {
  readonly timestamp: number;
  readonly centroid: number;
  readonly flux: number;
  readonly rms: number;
}

interface PatternTemplate {
  readonly key: string;
  readonly name: string;
  readonly thresholds: { centroid: Bounds; flux: Bounds; rms: Bounds };
  readonly temporalPatterns: TemporalPatternSpec; // из демо
}

interface TrendsDetectionResult {
  readonly detectedState: string;
  readonly confidence: number;
  readonly samples: readonly MetricSample[];
  readonly isDetected: boolean;
}

function computeTemporalFeatures(samples: readonly MetricSample[]): TemporalFeatures;
function scoreTemplate(features: TemporalFeatures, template: PatternTemplate): number;
function classifyTrends(
  samples: readonly MetricSample[],
  templates: readonly PatternTemplate[],
): TrendsDetectionResult;
```

- Математика в `packages/services/trends-detector/src/` — **один** канонический набор весов (70% temporal / 30% spectral).
- Системные шаблоны в `src/data/system-templates.ts` — WIND, QUIET, TRAFFIC, DRONE-bootstrap, BIRDS, VOICE и др.
- Unit-тесты: синус, белый шум, стабильный шум (ветер-like), пустое окно.

#### 2. Плагин `trends-fft-analyzer` (модуль «Микрофон»)

- ID: `trends-fft-analyzer`
- Подпись UI: «Анализатор тенденций FFT» (или согласовать с Teamlead)
- Регистрация: `MembranaRegistry.registerPlugin('microphone', createTrendsFftAnalyzerPlugin())`

**Поведение (live mic, v1):**

1. `AudioFrameFeed` (`MicFrameFeed`) → на каждый кадр (с интервалом `intervalMs` из config): `FftAnalyzer.analyzeFrame` → `MetricSample`.
2. После `measurementsCount` сэмплов (default 100) → `classifyTrends` по **включённым** шаблонам.
3. Режимы **auto** / **manual** (как `fft-threshold-test`): auto — перезапуск через паузу после детекции.
4. UI: tick-bar прогресса, имя/иконка класса, confidence, кнопки старт/стоп.
5. Отчёт в `@membrana/telemetry-service`: `reportKind: 'trends-fft'` (согласовать payload с `telemetry-journal-report-viz` — минимум JSON + текст; карточка в журнале — follow-up при необходимости).

**Конфиг плагина (persisted):**

- `intervalMs`, `measurementsCount`, `minRms`, `detectionMode: 'auto' | 'manual'`
- `analysisSource: 'microphone'` only в v1 (поле зарезервировано для sample-library)
- список включённых system template keys

**Шаблоны v1:** только системные (без редактора и zustand persist из демо).

#### 3. Device-board (контракт только)

- `nodeKind`: `category: 'analyzer'`, `deviceKinds: ['microphone']`
- `inputs: [{ type: 'AudioFrame', handle: 'audio-in' }]`
- `outputs: [{ type: 'Detection', handle: 'detection-out' }]` — `kind` = detected scene key, `confidence`, `features` = temporal summary
- Регистрация в registry — типы + comment; UI доски — out of scope

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Engine | `@membrana/audio-engine-service` | Кадры через feed |
| FFT metrics | `@membrana/fft-analyzer-service` | `FftAnalyzer`, centroid/flux/RMS |
| Trends math | `@membrana/trends-detector-service` | classify, templates, tests |
| Feed | `apps/client/src/lib/audioAnalysis/` | `MicFrameFeed` (из задачи A) |
| Plugin state | `trendsFftPluginState.ts` | `useSyncExternalStore` / snapshot |
| Plugin | `apps/client/src/plugins/trends-fft-analyzer/` | install, panel, sidebar, telemetry |
| Telemetry | `trendsFftTelemetry.ts` | journal adapter |

**Запрещено:**

- Прямой `subscribeMicrophoneStream` в плагине (только feed).
- `new AudioContext()` в client.
- Замена `harmonic-detector-viz` или публикация в `droneDetectionHub` при каждом кадре.
- Тяжёлый редактор шаблонов и import/export JSON в v1 (follow-up #57).

**Связь с #47:** trends-классификация — **scene tagging** для датасета и оператора; **не** stage-gate детектора БПЛА.

---

### Визуальный дизайн

- Панель плагина: DaisyUI `card`, tick-bar (референс `fft-threshold-test/components/FrameTicks.tsx`).
- Статус детекции: `role="status"`, иконка + название класса из шаблона.
- Sidebar: interval, count, mode, minRms, чекбоксы системных шаблонов.
- `h-full min-h-0` — без прыгающего scrollbar ([`MODULE_AND_PLUGIN_UI.md`](../MODULE_AND_PLUGIN_UI.md)).

---

### Тесты

| Область | Минимум |
|---------|---------|
| `@membrana/trends-detector-service` | `classifyTrends` на fixtures; `computeTemporalFeatures` детерминизм |
| Plugin report builder | unit-тест payload (если вынесен) |
| Client | smoke import plugin registration |

Ручная проверка: live mic — ветер/кондиционер vs тишина vs речь; auto-restart не спамит журнал (>1 отчёт/5с без детекции).

---

### Definition of Done

- [ ] Пакет `@membrana/trends-detector-service` собирается, экспортирует API, ≥5 unit-тестов
- [ ] Плагин `trends-fft-analyzer` зарегистрирован на `microphone`
- [ ] Live mic: окно сэмплов → класс с confidence + tick UI
- [ ] Auto/manual режимы работают
- [ ] Отчёт `trends-fft` пишется в telemetry journal при успешной классификации
- [ ] Использует `AudioFrameFeed` из `audioAnalysis/`
- [ ] `nodeKind` задокументирован в types плагина
- [ ] `yarn workspace @membrana/trends-detector-service test` + client test/typecheck green
- [ ] `yarn turbo run lint typecheck test build --filter=@membrana/trends-detector-service --filter=@membrana/client --continue` — зелёный
- [ ] LGTM Teamlead

---

### Out of scope

- Режим `sample-library` и «создать шаблон из сэмпла» (задача C)
- Полный редактор пользовательских шаблонов (follow-up #57, `TrendsTemplateEditor`)
- UI device-board
- ML / neural classifier
- Интеграция с `droneDetectionHub` (кроме явного решения Teamlead)
- Рефакторинг `fft-indices-viz` / `sound-quality-viz`

---

### Порядок работы ролей

1. **Teamlead** — scope v1, Issue, согласование `reportKind`.
2. **Структурщик** — новый пакет в workspace, границы feed → fft → trends.
3. **Математик** — порт scoring, калибровка весов, fixtures.
4. **Музыкант** — ручной smoke, ограничения headless.
5. **Верстальщик** — tick-bar, sidebar, a11y.

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

1. GitHub Issue (`wish`): «Trends FFT analyzer plugin + trends-detector-service» + ссылки на этот промпт и `analyzer-frame-feed-refactor`.
2. Старт разработки **после merge** `analyzer-frame-feed-refactor`.
3. Follow-up задачи (не в реестре v1): `trends-fft-sample-library`, device-board D1 nodes.
4. После merge: `yarn task:archive trends-fft-microphone-plugin --notes "PR #…"`.

### Проверка после PR

```bash
yarn workspace @membrana/trends-detector-service test
yarn workspace @membrana/client test
yarn turbo run lint typecheck test build --filter=@membrana/trends-detector-service --filter=@membrana/client --continue
```

---

## Связь с дорожной картой

- Продуктовое продолжение анализа сэмплов в Media Library (после A4).
- Подготовка analyzer-ноды для device-board (`Detection` out).
- Датасет / labeling (#47) — опциональная интеграция отчётов trends в benchmark pipeline (out of scope v1).
