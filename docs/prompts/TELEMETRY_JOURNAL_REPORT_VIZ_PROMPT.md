# Промпт: визуализация отчётов в журнале телеметрии

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — кастомные карточки отчётов `analysis` в модуле «Журнал телеметрии» (свёрнуто/развёрнуто, JSON-view, экспорт, фильтры по тегам).
> Реестр: `id` = **`telemetry-journal-report-viz`** в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Плагин **`fft-threshold-test`** уже пишет полные отчёты в `@membrana/telemetry-service` (`schema: fft-threshold-test/v0.2`, `addReportEntry`) и показывает **локальную историю** в панели микрофона (`ReportHistory` / `ReportCard` — свёрнуто/развёрнуто, экспорт JSON + текст). В [`FFT_THRESHOLD_TEST_REPORTS_PROMPT.md`](./FFT_THRESHOLD_TEST_REPORTS_PROMPT.md) рендер в журнале был **явно отложен**.

Сейчас модуль **`telemetry-journal`** выводит все записи через универсальный `JournalEntryRow` (badge типа, сырой `JSON.stringify(data)`). Для отчётов анализа нужен **тот же UX**, что в истории плагина, плюс **интерактивный просмотр JSON** и **фильтрация по согласованным тегам**.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md) | Постановка и закрытие |
| [`TASK_CLOSURE_REGULATION.md`](./TASK_CLOSURE_REGULATION.md) | Архивация, GitHub |
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Клиент / сервисы |
| [`DESIGN.md`](../DESIGN.md) | DaisyUI, a11y |
| [`MODULE_AND_PLUGIN_UI.md`](../MODULE_AND_PLUGIN_UI.md) | Модули |
| [`packages/services/telemetry/README.md`](../../packages/services/telemetry/README.md) | `TelemetryEntry`, `addReportEntry` |
| [`FFT_THRESHOLD_TEST_REPORTS_PROMPT.md`](./FFT_THRESHOLD_TEST_REPORTS_PROMPT.md) | DTO отчёта, payload v0.2 |
| `apps/client/src/plugins/fft-threshold-test/components/ReportCard.tsx` | **Референс UI** (не копировать слепо) |
| `apps/client/src/plugins/fft-threshold-test/exportFftThresholdReport.ts` | **Референс экспорта** |
| `apps/client/src/modules/telemetry-journal/` | Текущий журнал |

**GitHub Issue:** [#43](https://github.com/officefish/Membrana/issues/43) — «Журнал телеметрии: визуализация отчётов анализа»; `id: telemetry-journal-report-viz`.

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом — краткий план (1–2 абзаца + список файлов). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md). Переиспользуй DTO и экспорт FFT-отчёта; не дублируй строки `toPlainText` / `toJsonString`.

---

### Что построить (продуктовое описание)

Расширить модуль **`telemetry-journal`**:

#### 1. Карточка отчёта (как в истории плагина)

Для записей `type: 'analysis'` с известным `data.schema` (первый потребитель: **`fft-threshold-test/v0.2`**) — **не** generic `JournalEntryRow`, а **`TelemetryReportCard`**:

| Режим | Поведение |
|--------|-----------|
| **Свёрнутый (по умолчанию)** | Все отчёты в журнале **свёрнуты** при первом показе (в отличие от истории плагина, где новейший развёрнут). |
| Заголовок | Время (`finishedAt` или `timestamp`), компактная полоса тактов (`FrameTickStrip` или аналог), итог «Обнаружено» / «Не обнаружено», `passedCount/frameCount`. |
| Развёрнутый | Мета (режим, строгость, интервал), матрица кадров (`ReportMatrix` или общий компонент), блок **JSON view** (см. §3). |
| Раскрытие | Клик по заголовку; `aria-expanded`. |

Визуальная рамка: как `ReportCard` — `border-success/30` при детекции, нейтральная иначе (токены DaisyUI, не hex из демо).

#### 2. Экспорт на карточке

На каждой карточке отчёта — кнопки **JSON** и **Текст** (как в `ReportCard`):

- Скачивание через `Blob` + `<a download>`.
- Имена файлов и содержимое — **те же pure-функции**, что в плагине (`exportFftThresholdReport.ts`), после восстановления `FftThresholdTestReport` из `TelemetryEntry.data` (адаптер `telemetryEntryToFftThresholdReport`).

Экспорт **всего журнала** (существующие кнопки в шапке модуля) **не удалять**; per-report экспорт — дополнение.

#### 3. React JSON View (новое в журнале)

В **развёрнутом** виде — секция «Данные (JSON)»:

- Зависимость: **`@uiw/react-json-view`** (или согласованная с Teamlead лёгкая альтернатива) только в `@membrana/client`.
- Показывать объект `entry.data` (или нормализованный DTO) с **сворачиванием узлов**, прокруткой, читаемым шрифтом (`font-mono`, `text-xs`).
- Тема: вписать в DaisyUI (`data-theme` / CSS variables), без «неонового» демо.
- **Не** использовать `motion.*` в JSX (правило репозитория).

#### 4. Теги и фильтрация

**Контракт тегов** для отчётов анализа (поле `TelemetryEntry.tags`, не только `data`):

| Тег | Когда |
|-----|--------|
| `analysis` | **Всегда** на `addReportEntry` с `type: 'analysis'`. |
| `detection` | Итог теста: дрон/сигнал **обнаружен** (`isDetected === true`). |
| `clear` | Итог: **не обнаружен** (`isDetected === false`). |

Дополнительные теги источника сохранить: `fft`, `threshold-test`, …

**Миграция в этом PR:** обновить `logFftThresholdTestResult` в `fftThresholdTelemetry.ts` — заменить `detected` / `not-detected` на **`detection` / `clear`**, добавить **`analysis`**.

**Фильтр в UI журнала** (селект или chip-группа):

| Значение | Показывает |
|----------|------------|
| `all` | Все записи (как сейчас + поиск). |
| `analysis` | Записи с тегом `analysis` (все отчёты анализа). |
| `detection` | Записи с тегом `detection`. |
| `clear` | Записи с тегом `clear`. |

Фильтр по тегам **комбинируется** с полем поиска. Старый фильтр по `TelemetryEntryType` (module_start, event, …) — оставить **или** свести в один UX (Teamlead: не ломать сценарий «только системные» — минимум сохранить `all` + теговые пресеты).

**Сервис телеметрии:** при необходимости расширить `getStats()` счётчиками `detection` / `clear` по **`entry.tags`** (сейчас `drone`/`calm` смотрят `data.tags` — устаревшее; выровнять или пометить deprecated в README telemetry).

#### 5. Диспетчер рендеров по schema

Расширяемая регистрация (без импорта всех плагинов в журнал напрямую, если возможно):

```ts
// apps/client/src/modules/telemetry-journal/reportRenderers/registry.ts
type ReportRenderer = (props: { entry: TelemetryEntry; expanded: boolean; onToggle: () => void }) => React.ReactNode;

function registerReportRenderer(schema: string, renderer: ReportRenderer): void;
function resolveReportRenderer(entry: TelemetryEntry): ReportRenderer | null;
```

Первый рендерер: `fft-threshold-test/v0.2` → `FftThresholdTelemetryReportCard`.

Записи без известного `schema` — прежний **`JournalEntryRow`**.

---

### Архитектура

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Адаптер payload → DTO | `telemetry-journal/adapters/fftThresholdReportFromEntry.ts` | `TelemetryEntry` → `FftThresholdTestReport`, валидация полей |
| Реестр рендеров | `telemetry-journal/reportRenderers/` | `registry.ts`, `FftThresholdTelemetryReportCard.tsx` |
| Общая оболочка | `telemetry-journal/components/TelemetryReportCard.tsx` | collapse, export buttons, JSON view slot |
| Список | `TelemetryJournalModule.tsx` | фильтр тегов, dispatch renderer |
| Legacy row | `JournalEntryRow.tsx` | event / module / неизвестный analysis |
| Теги источника | `fft-threshold-test/fftThresholdTelemetry.ts` | `analysis`, `detection`/`clear` |
| Экспорт | reuse `exportFftThresholdReport.ts` | без дублирования |
| Зависимость | `apps/client/package.json` | `@uiw/react-json-view` |

**Запрещено:**

- Дублировать `toPlainText` / `toJsonString` в модуле журнала.
- Хранить отдельную историю отчётов в журнале (источник — `TelemetryJournal`).
- Тянуть `LiveSampler` / FFT в журнал.
- Копировать весь `ReportCard` в плагин обратно — общие presentational-компоненты вынести в `telemetry-journal` **или** `apps/client/src/components/reports/` (Teamlead: один уровень, без циклических импортов plugin ↔ module).

**Рекомендуемый рефакторинг (в scope, если малый diff):** вынести `FrameTickStrip` + `ReportMatrix` в `apps/client/src/components/fft-reports/` и импортировать из плагина и журнала.

---

### Визуальный дизайн

- Компактные карточки в списке журнала (`space-y-2`, прокрутка как сейчас).
- Кнопки экспорта: `btn btn-ghost btn-xs`, `min-h-10`.
- JSON view: ограничить `max-h` (например `min(24rem, 40vh)`), `overflow-auto`.
- Итог детекции: `text-success` / нейтральный текст + **не только цвет** (подпись «Обнаружено»).
- `aria-live` не обязателен для статичного списка; `aria-expanded` на заголовке — обязателен.

---

### Тесты

| Область | Минимум |
|---------|---------|
| `fftThresholdReportFromEntry` | валидный v0.2 payload → DTO; битый payload → `null` / fallback на `JournalEntryRow` |
| Фильтр тегов | unit: `matchesTagFilter(entry, 'detection')` и т.д. |
| `fftThresholdTelemetry` | теги содержат `analysis` + `detection` или `clear` |
| Клиент | `yarn workspace @membrana/client typecheck` + `test` |

Storybook / e2e — не обязателен.

---

### Definition of Done

- [ ] Отчёты `fft-threshold-test/v0.2` в журнале отображаются карточкой, **по умолчанию свёрнуты**.
- [ ] Развёрнутый вид: матрица + **React JSON view** по `data`.
- [ ] Per-report экспорт **JSON** и **Текст** (те же файлы, что в плагине).
- [ ] Теги: `analysis`, `detection`, `clear` на новых записях; фильтры `all` / `analysis` / `detection` / `clear`.
- [ ] Неизвестные записи — прежний `JournalEntryRow`.
- [ ] `yarn workspace @membrana/client typecheck` и `test`; при изменении telemetry-service — его тесты.
- [ ] LGTM Teamlead; README telemetry — при необходимости § теги отчётов.

---

### Out of scope

- Backend / персистентность журнала между вкладками.
- Рендеры для `sound-quality-viz`, `fft-indices-viz` (отдельные задачи по `schema`).
- Редактирование / удаление одной записи из журнала.
- Экспорт PDF / CSV.

---

### Порядок работы ролей

1. **Teamlead** — контракт тегов, registry renderers, общие компоненты с плагином.
2. **Структурщик** — адаптер entry→DTO, wiring модуля, миграция тегов telemetry.
3. **Математик** — валидация payload (лёгкая, без новых формул).
4. **Музыкант** — прогон FFT-теста → карточка в журнале, фильтры, экспорт.
5. **Верстальщик** — collapse, JSON view theme, a11y.
6. **Teamlead** — LGTM.

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

1. **Отдельный** GitHub Issue (`wish`) и PR; зависит от merged `fft-threshold-test` v0.2 telemetry.
2. Запись в реестре: `telemetry-journal-report-viz`, `status: active`.
3. После merge: `yarn task:archive telemetry-journal-report-viz --notes "PR #…"`.

### Проверка после PR

```bash
yarn workspace @membrana/client dev
# Модуль «Микрофон» → fft-threshold-test → завершить тест
# Модуль «Журнал телеметрии» → карточка отчёта свёрнута → развернуть → JSON view
# Фильтры detection / clear; экспорт JSON и Текст с карточки
yarn workspace @membrana/client test
```

---

## Связь с дорожной картой

Завершает цикл «тест → телеметрия → операторский обзор» для порогового FFT: оператор видит тот же отчёт, что в панели микрофона, без возврата в плагин. Основа для будущих `schema` (качество звука, другие анализы).
