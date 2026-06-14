# Промпт: история отчётов FFT-теста + телеметрия (плагин `fft-threshold-test`)

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — локальная история отчётов в плагине (5 записей), UI свёрнуто/развёрнуто, экспорт JSON + текст, запись полного payload в `TelemetryJournal`.
>
> **Предпосылка:** базовый плагин порогового FFT-теста уже реализован ([`FFT_THRESHOLD_TEST_PLUGIN_PROMPT.md`](./FFT_THRESHOLD_TEST_PLUGIN_PROMPT.md)): сбор кадров, такты, пороги, шкала метрик как в `packages/temp/three-param-analyzer`, `evaluateThresholdTest` в `fft-analyzer-service`.

---

## Контекст

После каждого завершённого прогона теста пользователю нужно:

1. **Видеть историю** последних результатов **внутри плагина** (не в журнале телеметрии).
2. **Сохранять факт детекции** в **журнал телеметрии** (машиночитаемый payload для будущего рендера).
3. **Экспортировать** любой отчёт в файл (JSON и человекочитаемый текст).

**Отдельная задача (out of scope здесь):** кастомный рендер карточки отчёта в модуле «Журнал телеметрии» — свой React-компонент по `schema` + `data`. В этом PR достаточно стабильного payload **v0.2** и появления записи типа `analysis` в списке журнала (как сейчас).

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, порядок работы |
| [`DESIGN.md`](../DESIGN.md) | UI, a11y, не только цвет |
| [`MODULE_AND_PLUGIN_UI.md`](../MODULE_AND_PLUGIN_UI.md) | Плагины, панель микрофона |
| [`packages/services/telemetry/README.md`](../../packages/services/telemetry/README.md) | `addReportEntry`, дедуп по `reportUniqueId` |
| [`FFT_THRESHOLD_TEST_PLUGIN_PROMPT.md`](./FFT_THRESHOLD_TEST_PLUGIN_PROMPT.md) | Базовый плагин, типы `ThresholdTestResult` |
| `apps/client/src/plugins/fft-threshold-test/` | Текущая реализация, `fftThresholdTelemetry.ts` (schema v0.1) |
| `apps/client/src/plugins/fft-threshold-test/normalizeMetrics.ts` | Нормализация 0…1 (÷5000, ÷1, ÷0.35) |

---

## Промпт целиком (для вставки агенту)

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом — краткий план (1–2 абзаца + список файлов). Математика нормализации уже в плагине; **новую** pure-логику выноси в `fft-analyzer-service` только если это переиспользуемое преобразование `ThresholdTestResult` → DTO отчёта.

---

### Что построить (продуктовое описание)

Расширить плагин **`fft-threshold-test`** (модуль `microphone`):

#### 1. Локальная история отчётов (в памяти плагина)

- Хранить **не более 5** последних завершённых отчётов (FIFO: новый в начало, при 6-м — удалить самый старый).
- **Не** писать историю в `localStorage` / IndexedDB / backend (out of scope).
- История сбрасывается при `teardown` плагина (как и остальной singleton-state).
- Источник данных: `ThresholdTestResult` из `evaluateThresholdTest` + обогащение нормализованными полями (см. § Модель отчёта).

#### 2. UI истории в `FftThresholdTestPanel`

Блок **«История отчётов»** под текущим прогоном / итогом:

| Правило | Поведение |
|---------|-----------|
| Порядок | Новый отчёт сверху |
| Последний (индекс 0) | **Развёрнут по умолчанию** |
| Остальные (до 4) | **Свёрнуты**; клик по заголовку — expand/collapse |
| Пустая история | Текст «Отчётов пока нет» (после первого теста — появляется карточка) |

**Свёрнутый вид** одной карточки:

- Время окончания теста (локаль `ru-RU`, кратко).
- Ряд из **N галочек/крестиков** — по одному на кадр (`framePassed`), визуально как промежуточные такты (`FrameTicks`, но компактнее).
- Итог: **«Обнаружено»** / **«Не обнаружено»** + `passedCount/frameCount` и %.
- Две кнопки экспорта (иконка или текст «JSON» / «Текст») — не раскрывают карточку.

**Развёрнутый вид**:

- Всё из свёрнутого +
- **Матрица результатов** (таблица, `overflow-x-auto` на узких экранах):
  - Строки: кадры `0 … N-1` + опционально строка **«Итог»**.
  - Столбцы (минимум):
    - № кадра
    - Центроид: **сырое** (Гц), **норм.** (0…1), ✓/✗ по порогу
    - Поток: сырое, норм., ✓/✗
    - Громкость (RMS): сырое, норм., ✓/✗
    - **Кадр пройден** (✓/✗)
  - Форматирование сырых: как в `formatRawCentroid` / `formatRawFlux` / `formatRawLoudness`.
  - Нормализация: функции из `normalizeMetrics.ts` (те же делители, что в UI настроек).
- Мета: режим (авто/ручной), строгость, `intervalMs`, пороги (сырые или кратко).
- Кнопки экспорта.

**A11y:** `aria-expanded` на заголовке карточки; итог теста — `role="status"`; таблица — `<table>` с `<th scope="col">`.

#### 3. Запись в журнал телеметрии

После **каждого** завершённого теста (уже вызывается `logFftThresholdTestResult`) — обновить адаптер:

- `schema`: **`fft-threshold-test/v0.2`**
- Payload **полный** (для будущего рендера в журнале), без PCM:
  - все поля `ThresholdTestResult`;
  - для каждого кадра — **сырые и нормализованные** метрики + флаги `*InRange`, `framePassed`;
  - `normalization`: константы из `METRIC_NORM` (версия шкалы).
- `reportUniqueId`: `fft-test-${testId}` (без изменений).
- `tags`: `['fft', 'threshold-test', detected|not-detected]`.

**Не** делать в этом PR: компонент `TelemetryReportRenderer` для `v0.2`.

#### 4. Экспорт отчёта

Для **каждой** записи истории — скачивание файла в браузере (`Blob` + `<a download>`):

| Формат | Имя файла (пример) | Содержимое |
|--------|-------------------|------------|
| **JSON** | `fft-threshold-test_{testId}.json` | Полный объект отчёта (DTO), `JSON.stringify(..., null, 2)`, UTF-8 |
| **Текст** | `fft-threshold-test_{testId}.txt` | Человекочитаемый отчёт: заголовок, мета, таблица кадров (сырое + норм.), итог. Markdown-подобная разметка допустима, расширение `.txt` |

Pure-функции экспорта — в отдельном файле, например `exportFftThresholdReport.ts` (без React), с unit-тестами на стабильные снимки строк (хотя бы 1 кейс JSON + 1 текст).

---

### Модель отчёта (TypeScript)

Рекомендуемый DTO в плагине (имена можно уточнить):

```ts
interface FftThresholdFrameReportRow {
  readonly index: number;
  readonly timestamp: number;
  readonly centroidHz: number;
  readonly centroidNorm: number;
  readonly fluxRaw: number;
  readonly fluxNorm: number;
  readonly rmsRaw: number;
  readonly rmsNorm: number;
  readonly centroidInRange: boolean;
  readonly fluxInRange: boolean;
  readonly rmsInRange: boolean;
  readonly framePassed: boolean;
}

interface FftThresholdTestReport {
  readonly testId: string;
  readonly startedAt: number;
  readonly finishedAt: number;
  readonly isDetected: boolean;
  readonly passedCount: number;
  readonly passRate: number;
  readonly frameCount: number;
  readonly strictness: StrictnessLevel;
  readonly mode: ThresholdTestMode;
  readonly intervalMs: number;
  readonly thresholds: ThresholdTestThresholds;
  readonly normalization: {
    readonly centroidHzMax: number;
    readonly fluxRefMax: number;
    readonly loudnessRefMax: number;
  };
  readonly frames: readonly FftThresholdFrameReportRow[];
}
```

Фабрика:

```ts
function buildFftThresholdTestReport(result: ThresholdTestResult): FftThresholdTestReport
```

Размещение: `apps/client/src/plugins/fft-threshold-test/buildFftThresholdTestReport.ts` (или `fft-analyzer-service`, если Teamlead решит переиспользовать вне клиента).

---

### Архитектура (Teamlead + Структурщик)

| Слой | Путь | Ответственность |
|------|------|-----------------|
| DTO + build | `.../buildFftThresholdTestReport.ts` | `ThresholdTestResult` → report |
| История | `.../fftThresholdReportHistory.ts` | Кольцевой буфер на 5, `subscribe` / `getReports()` |
| Экспорт | `.../exportFftThresholdReport.ts` | `toJsonString`, `toPlainText` |
| Телеметрия | `.../fftThresholdTelemetry.ts` | v0.2 payload из `FftThresholdTestReport` |
| UI | `.../components/ReportHistory.tsx`, `ReportCard.tsx`, `ReportMatrix.tsx` | Список, collapse, таблица |
| Панель | `FftThresholdTestPanel.tsx` | Вставить `<ReportHistory />` |
| Плагин | `fftThresholdTestPlugin.ts` | После `finishTest` → `pushReport` + telemetry |

**Поток:**

```
finishCollection → evaluateThresholdTest
  → buildFftThresholdTestReport
  → reportHistory.push (max 5)
  → fftThresholdPluginState.finishTest (как сейчас)
  → logFftThresholdTestResult(report)  // v0.2
  → UI re-render via subscribe
```

- История — **отдельный** singleton или часть `fftThresholdPluginState` (Teamlead: один источник правды, без дублирования `lastResult`).
- Текущий блок «итог последнего теста» можно **слить** с верхней карточкой истории (последний отчёт = тот же объект) — по согласованию в PR, без двойного отображения одних данных.

---

### Контракт телеметрии v0.2

```ts
// data — TelemetryEntryPayload
{
  reportUniqueId: `fft-test-${testId}`,
  schema: 'fft-threshold-test/v0.2',
  isDetected: boolean,
  passRate: number,
  passedCount: number,
  frameCount: number,
  strictness: 'easy' | 'normal' | 'strict',
  mode: 'manual' | 'auto',
  intervalMs: number,
  thresholds: ThresholdTestThresholds,
  startedAt: number,
  finishedAt: number,
  normalization: { centroidHzMax, fluxRefMax, loudnessRefMax },
  frames: FftThresholdFrameReportRow[],  // полный массив
}
```

Обратная совместимость: записи v0.1 в журнале не ломать; новые — только v0.2.

---

### UI / DESIGN (Верстальщик)

- Карточки: `rounded-box`, `border-base-300`, DaisyUI `collapse` **или** кастомный toggle — единообразно с панелью плагина.
- Свёрнутый ряд галочек: переиспользовать стили/логику `FrameTicks` (можно вынести `FrameTickStrip` с `size="sm"`).
- Матрица: `text-xs`, `font-mono`, `tabular-nums`; ✓ `text-success`, ✗ `text-error`; не полагаться только на цвет (`aria-label`).
- Экспорт: `btn btn-ghost btn-xs`, `min-h-10` (touch target).

---

### Аудио / данные (Музыкант)

- В отчёт попадают **фактические** значения кадров после финального `analyzeFrame` с `collectionFluxTracker` (межзамерный flux).
- Проверить на live-микрофоне: в развёрнутой матрице 7 кадров — осмысленные сырые (flux ~0.1–1.5, RMS ~0.02–0.35).
- Телеметрия и JSON-экспорт содержат **одинаковые** числа, что UI.

---

### Тесты

| Область | Минимум |
|---------|---------|
| `buildFftThresholdTestReport` | 1 тест: нормы совпадают с `normalizeMetrics` |
| `exportFftThresholdReport` | JSON parseable; текст содержит `Обнаружено` / `Не обнаружено` и N строк кадров |
| `reportHistory` | push 6 → length 5, порядок newest-first |
| Существующие | `yarn workspace @membrana/fft-analyzer-service test`, client typecheck |

---

### Definition of Done

- [ ] После каждого теста в плагине появляется запись в локальной истории (≤5).
- [ ] Последний отчёт развёрнут (матрица); предыдущие свёрнуты, раскрываются по клику.
- [ ] Свёрнутый вид: N галочек кадров + итог detected/not detected.
- [ ] Развёрнутый вид: таблица сырых + нормализованных значений и ✓/✗ по метрикам.
- [ ] Экспорт JSON и `.txt` для любой карточки.
- [ ] `addReportEntry` с `schema: fft-threshold-test/v0.2` и полным `frames[]`.
- [ ] Unit-тесты на build/export/history.
- [ ] `yarn turbo run lint typecheck test build --continue` — зелёный.
- [ ] LGTM Teamlead.

---

### Out of scope (отдельные задачи / Issue)

- **Рендер отчёта в модуле «Журнал телеметрии»** (`TelemetryJournalModule` + registry по `schema`).
- Персистентность истории между перезагрузками страницы.
- PDF / CSV экспорт.
- Отправка отчёта на `background-office` / Linear.
- Промежуточный отчёт **во время** сбора (partial) — только **завершённые** тесты; live-такты остаются как сейчас.

---

### Порядок работы ролей

1. **Teamlead** — утвердить DTO, слияние «итог теста» с историей, v0.2 vs UI-only history.
2. **Структурщик** — `buildFftThresholdTestReport`, history, telemetry v0.2, wire в plugin.
3. **Математик (Dynin)** — ревью консистентности raw/norm с `evaluateFrameVerdict` (при необходимости хелпер в fft-analyzer).
4. **Музыкант** — smoke на микрофоне, сверка telemetry ↔ UI ↔ JSON file.
5. **Верстальщик** — `ReportHistory`, collapse, matrix, export buttons, a11y.
6. **Teamlead** — LGTM, одна строка в `docs/prompts/README.md`.

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

## Сводка по ролям (контракт команды)

### [Teamlead] — Vesnin

- Граница: **история и экспорт** — плагин; **payload v0.2** — контракт для будущего журнала; рендер журнала — **не этот PR**.
- Запрещает дублировать `ThresholdTestResult` в третьем месте без `FftThresholdTestReport`.
- Принимает PR при зелёном CI и выполненном DoD.

### [Структурщик]

- Singleton history (5), интеграция в `finishCollection`, обновление `fftThresholdTelemetry.ts`.
- `exportFftThresholdReport.ts` + тесты, без DOM в экспорте.

### [Математик / Dynin]

- Проверка: нормализованные поля в отчёте = те же формулы, что пороги в UI (`normalizeMetrics.ts`).
- Опционально: экспорт `buildFrameReportRow` в fft-analyzer, если понадобится в telemetry-сервисе позже.

### [Музыкант]

- Валидация live: матрица читаема, flux/RMS в ожидаемых диапазонах офиса/музыки.
- Подтверждение: телеметрия не содержит лишних больших бинарных данных.

### [Верстальщик]

- История отчётов в панели микрофона, collapse, матрица, кнопки экспорта.
- Согласованность с `DESIGN.md` и существующим `FrameTicks`.

---

## Заметки для человека-постановщика

- Зависимость: базовый плагин и шкала метрик (three-param-style) должны быть в main/ветке до старта.
- Issue в GitHub: «FFT threshold test — report history & telemetry v0.2», ссылка на этот файл.
- Следующий промпт: `FFT_THRESHOLD_TEST_TELEMETRY_UI_PROMPT.md` (рендер v0.2 в журнале) — создать после merge этого PR.
