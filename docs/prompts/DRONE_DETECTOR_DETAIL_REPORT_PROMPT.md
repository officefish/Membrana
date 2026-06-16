# Промпт: подробный отчёт детекторов дрона (плагин `sample-library-drone-analysis`)

> **Task-эпик** (2–3 PR) · регламент [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр (предложение):** `id` = **`drone-detector-detail-report`** в [`docs/tasks/registry.json`](../tasks/registry.json)  
> **Размер:** **L** (можно дробить на DDR1–DDR4)  
> **Предпосылка:** плагин [`sample-library-drone-analysis`](../../apps/client/src/plugins/sample-library-drone-analysis/) — 4 детектора (harmonic, cepstral, spectral-flux, template-match), curated manifest, VDR эпик закрыт ([`vdr-epic-closure-2026-06-15.md`](../discussions/vdr-epic-closure-2026-06-15.md)).

---

## Контекст продукта

После анализа сэмпла пользователь видит **сводную таблицу** (детектор / дрон / уверенность). Нужна кнопка **«Подробный отчёт»**, раскрывающая **обоснование** решения: индексы, шаблоны, пороги, вероятности — в виде **таблиц**.

**Критичные требования заказчика:**

1. **Тот же рендер** позже используется в **журнале телеметрии** (не дублировать разметку в плагине и журнале).
2. Экспорт отчёта: **`.txt`** и **`.json`** (скачивание в браузере).
3. У каждого отчёта — **уникальный `reportId`** (UUID v4; опционально стабильный `contentHash` для дедупа).
4. В шапке отчёта — **дата и время по Москве** (`Europe/Moscow`), человекочитаемо (`ru-RU`).

**Связанные артефакты (переиспользовать, не копировать):**

| Артефакт | Зачем |
|----------|--------|
| [`TrendsMatchDetailTable.tsx`](../../apps/client/src/plugins/trends-fft-analyzer/components/TrendsMatchDetailTable.tsx) | Таблица полей шаблона (spectral/temporal, match %) |
| [`buildTemplateMatchBreakdown`](../../packages/services/trends-detector/src/math/matchBreakdown.ts) | Разбор template-match |
| [`FFT_THRESHOLD_TEST_REPORTS_PROMPT.md`](./FFT_THRESHOLD_TEST_REPORTS_PROMPT.md) | Паттерн: DTO, export, telemetry schema, shared render |
| [`packages/services/telemetry`](../../packages/services/telemetry/) | `addReportEntry`, `reportUniqueId` |
| [`analyzeSample`](../../packages/services/detectors/base/src/analyze-sample.ts) | Frame-level DSP; сейчас в verdict только агрегат |

**Out of scope этого эпика (следующий — рефакторинг журнала):**

- Полноценный кастомный `TelemetryReportRenderer` для новой schema в модуле журнала.
- Запись PCM / waveform в отчёт.
- MFCC / спектрограммы (тариф **`indie-v1`+** — см. [`TARIFF_MATRIX.md`](./TARIFF_MATRIX.md) §«Спектральный анализ сэмплов»).

---

## Мнение виртуальной команды (зафиксировано до кода)

```text
[Teamlead — Vesnin]:
Один канонический DTO `DroneDetectionReport` + один презентационный компонент `DroneDetectionReportView`.
Плагин и журнал — только потребители. UUID в `reportId`, Moscow time в метаданных при сборке DTO.
Этапы: (1) контракт + export, (2) сбор данных из детекторов, (3) UI плагина, (4) telemetry payload.
LGTM только если журнал сможет подключить тот же View без импорта из плагина.

[Структурщик — Ozhegov]:
Вынести DTO, build, export, format в пакет без React — предпочтительно
`packages/libs/detector-report/` или расширение `@membrana/detector-base` (только типы + pure).
UI: `packages/libs/detector-report-ui/` или `apps/client/src/components/detector-report/` — если только client;
лучше lib с peer dependency на React для journal + plugin.
Запрет: импорт `sample-library-drone-analysis` из журнала.

[Математик — Dynin]:
Отчёт = детерминированная проекция уже посчитанных метрик, не второй прогон FFT.
Для DSP: расширить `analyzeSample` опцией `includeFrameDetails: true` → массив кадров
(confidence, isDrone, features). Для template-match: `TrendsDetectionResult` + `buildTemplateMatchBreakdown`
по winning template. Таблица кадров harmonic: fundamental Hz, harmonics score, threshold pass.

[Музыкант]:
Контекст — offline 5 с сэмпл из библиотеки; live-микрофон out of scope.
В текстовом экспорте указать sampleId, title, sampleRate, durationSec.

[Верстальщик — Rodchenko]:
Кнопка «Подробный отчёт» под сводной таблицей; `collapse` с `aria-expanded`.
Таблицы: DaisyUI `table table-sm`, `overflow-x-auto`, `tabular-nums` для чисел.
Цвет match% — как в TrendsMatchDetailTable (success/warning/error), не только badge.
Шапка: reportId (моноширинный, усечённый + copy), дата/время МСК, sample title.
Кнопки «Скачать JSON» / «Скачать TXT» в шапке развёрнутого блока.
```

---

## Этапы (рекомендуемый merge-order)

| Этап | ID | PR | Содержание |
|------|-----|-----|------------|
| **DDR1** | `ddr1-report-contract` | 1 | DTO, Moscow time, UUID, `toJson` / `toPlainText`, unit-тесты |
| **DDR2** | `ddr2-report-data` | 2 | Сбор breakdown из 4 детекторов; расширение `analyzeSample` / template-match |
| **DDR3** | `ddr3-plugin-ui` | 3 | Кнопка, `DroneDetectionReportView`, интеграция в панель плагина |
| **DDR4** | `ddr4-telemetry-payload` | 3 или 4 | `schema: drone-detection-report/v1`, `addReportEntry` после анализа; без journal UI |

Этапы DDR3 и DDR4 можно объединить в один PR, если объём ≤ M.

---

## Промпт целиком (для вставки агенту)

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом — план (1–2 абзаца + таблица файлов). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md), [`DESIGN.md`](../DESIGN.md), [`SERVICES.md`](../SERVICES.md). Web Audio — только через существующие сервисы; новый UI-отчёт **не** считает FFT в компоненте.

---

### Что построить

#### 1. Каноническая модель отчёта

```ts
/** UUID v4, генерируется при завершении анализа */
interface DroneDetectionReportMeta {
  readonly reportId: string;
  readonly createdAtIso: string;       // UTC ISO-8601
  readonly createdAtMoscow: string;    // ru-RU, Europe/Moscow, например «15.06.2026, 16:42:03 МСК»
  readonly schemaVersion: 'drone-detection-report/v1';
  readonly sampleId: string;
  readonly sampleTitle: string | null;
  readonly sampleRate: number;
  readonly sampleDurationSec: number;
  readonly groundTruthLabel?: 'drone' | 'not-drone' | 'unlabeled';
}

interface DroneDetectorVerdictSection {
  readonly detectorName: string;
  readonly detectorFamily: 'dsp';
  readonly isDrone: boolean;
  readonly confidence: number;         // 0…1
  readonly aggregation?: string;       // any-frame | majority | min-ratio
  readonly sampleConfidenceThreshold?: number;
  readonly reasoning?: string;
  /** Discriminated union по detectorName — см. ниже */
  readonly breakdown: HarmonicBreakdown | CepstralBreakdown | SpectralFluxBreakdown | TemplateMatchBreakdown;
}

interface DroneDetectionReport {
  readonly meta: DroneDetectionReportMeta;
  readonly verdicts: readonly DroneDetectorVerdictSection[];
}
```

**Breakdown по детекторам (минимум):**

| Детектор | Таблицы в UI |
|----------|----------------|
| **harmonic** | Кадры: №, timestamp ms, max harmonic score, fundamental Hz, confidence, isDrone; итог агрегации |
| **cepstral** | Кадры: cepstrum peak, fundamental Hz, confidence, isDrone |
| **spectral-flux** | Кадры: flux, lowEnergy%, confidence, isDrone |
| **template-match** | Переиспользовать `MatchFieldBreakdown[]` (spectral + temporal); winner template key/name/score; scores[] top-3 templates |

Фабрика: `buildDroneDetectionReport(input): DroneDetectionReport` — pure, тестируемая.

**Время Москвы:**

```ts
function formatReportTimestampMoscow(date: Date): string
// Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', ... })
```

Unit-тест: фиксированный `Date` → стабильная строка (mock timezone).

**Идентификатор:**

- `reportId = crypto.randomUUID()` при создании отчёта.
- `reportUniqueId` для telemetry = `drone-report-${reportId}` (как `fft-test-${testId}`).

#### 2. Сбор данных (DDR2)

- Расширить [`analyzeSampleDetectors.ts`](../../apps/client/src/plugins/sample-library-drone-analysis/analyzeSampleDetectors.ts) → возвращать `{ verdicts, report }` или собирать report в plugin state после прогона.
- `analyzeSample`: опция `includeFrameVerdicts?: true` → в результате `frameVerdicts[]` (без breaking change для benchmark scripts).
- template-match: сохранять `TrendsDetectionResult` + вызывать `buildTemplateMatchBreakdown` для winner / `DRONE_CURATED`.
- Пороги калибровки из [`detectorCalibrationPreset.ts`](../../apps/client/src/plugins/sample-library-drone-analysis/detectorCalibrationPreset.ts) — включать в breakdown meta.

#### 3. UI плагина (DDR3)

В [`SampleLibraryDroneAnalysisPanel.tsx`](../../apps/client/src/plugins/sample-library-drone-analysis/SampleLibraryDroneAnalysisPanel.tsx):

- После сводной таблицы — кнопка **«Подробный отчёт»** (видна когда `showResults`).
- По клику — `collapse` блок с `<DroneDetectionReportView report={...} />`.
- Секции по детекторам (accordion или якоря); внутри — таблицы.
- **Переиспользовать** логику рендера строк из `TrendsMatchDetailTable` (вынести общие части в shared lib, не копировать `FIELD_LABELS`).

#### 4. Экспорт (DDR1)

Pure-функции в lib без React:

```ts
function exportDroneDetectionReportJson(report: DroneDetectionReport): string
function exportDroneDetectionReportTxt(report: DroneDetectionReport): string
function downloadDroneDetectionReport(report: DroneDetectionReport, format: 'json' | 'txt'): void
```

Имена файлов: `drone-detection-report_{reportId}.{json|txt}`.

TXT: шапка (ID, МСК, сэмпл), сводка по детекторам, таблицы в monospace-тексте (как FFT threshold export).

#### 5. Телеметрия (DDR4, payload only)

После `finishAnalysis` — `telemetryJournal.addReportEntry({ schema: 'drone-detection-report/v1', data: report, ... })`.

- Полный JSON report в `data` (без PCM).
- `reportUniqueId: drone-report-${reportId}`.
- tags: `['drone', 'sample-library', detected|not-detected']` по консенсусу детекторов или по template-match.

**Не делать** в этом эпике: React-рендер в `TelemetryJournalModule` — это задача **рефакторинга журнала**.

---

### Архитектура (таблица слоёв)

| Слой | Путь (предложение) | Ответственность |
|------|-------------------|-----------------|
| DTO + build | `packages/libs/detector-report/src/` | типы, `buildDroneDetectionReport`, Moscow format |
| Export | `packages/libs/detector-report/src/export*.ts` | JSON/TXT |
| UI | `packages/libs/detector-report-ui/src/DroneDetectionReportView.tsx` | Таблицы, export buttons |
| Расширение analyze | `@membrana/detector-base` | `includeFrameVerdicts` (опционально) |
| Плагин | `apps/client/.../sample-library-drone-analysis/` | кнопка, state, вызов build |
| Телеметрия | `.../droneAnalysisTelemetry.ts` | adapter v1 |

**Запрещённые импорты:**

- Журнал → плагин `sample-library-drone-analysis`.
- `detector-report` → `apps/client` plugins (только наоборот).

---

### Definition of Done (эпик)

- [ ] Кнопка «Подробный отчёт» раскрывает таблицы с обоснованием по всем 4 детекторам
- [ ] `reportId` (UUID) и дата/время **МСК** в UI и в экспорте
- [ ] Скачивание JSON и TXT работает для текущего отчёта
- [ ] `DroneDetectionReportView` живёт в **переиспользуемом** пакете/компоненте (документирован путь для журнала)
- [ ] Unit-тесты: Moscow time format, export snapshot (≥1 JSON + 1 TXT), build report from fixture
- [ ] Telemetry payload `drone-detection-report/v1` пишется после анализа (запись видна в журнале как JSON / generic card)
- [ ] `yarn typecheck` / `yarn lint` для затронутых пакетов
- [ ] README в новом lib-пакете

---

### Ручная проверка (DoD human)

1. Client → библиотека сэмплов → выбрать сэмпл → «Анализировать».
2. «Подробный отчёт» → таблицы по harmonic и template-match читаемы.
3. Экспорт JSON открывается, `reportId` и `createdAtMoscow` на месте.
4. Экспорт TXT — читаемый в блокноте.
5. В журнале телеметрии появилась запись с schema v1.

---

### Команды

```bash
yarn workspace @membrana/client dev
yarn test --filter=@membrana/detector-report   # после создания пакета
yarn typecheck
```

---

## Связь с рефакторингом журнала (следующий эпик)

После этого эпика:

1. Вынести registry рендереров по `schema` (`TelemetryReportRenderer`).
2. Подключить `DroneDetectionReportView` для `drone-detection-report/v1`.
3. Унифицировать с `fft-threshold-test/v0.2` и trends-отчётами.

Промпт журнала — отдельная задача; **не блокировать** DDR на полный journal UI.

---

## Issue / реестр

При создании GitHub Issue:

- Title: `feat(client): подробный отчёт детекторов дрона (DDR1–4)`
- Label: `rodchenko`, `ozhegov`, `sample-library`
- Registry: добавить `drone-detector-detail-report` со статусом `active` — **GitHub #78**
