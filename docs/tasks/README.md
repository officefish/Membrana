# Реестр задач (task prompts)

Актуальные **активные** и **архивные** задачи по стандарту
[`TASK_PROMPT_WORKFLOW.md`](../prompts/TASK_PROMPT_WORKFLOW.md).

Машиночитаемый источник: [`registry.json`](./registry.json).

| Команда | Действие |
|---------|----------|
| `yarn task:list` | Список в терминале |
| `yarn task:sync-readme` | Пересобрать этот файл |
| `yarn task:archive <id>` | Закрыть задачу в реестре |
| `yarn task:close-github` | Закрыть Issues по очереди из архива (вечером) |

---

## Активные задачи

_Нет активных задач. Новую добавь в `registry.json` (см. workflow)._

---

## Архив

| ID | Название | Архивировано | Промпт | GitHub | Карточка |
|----|----------|--------------|--------|--------|----------|
| `fft-indices-viz` | Плагин микрофона: live-визуализация FFT-индексов | 2026-05-15 | [`FFT_INDICES_VIZ_PLUGIN_PROMPT.md`](../docs/prompts/FFT_INDICES_VIZ_PLUGIN_PROMPT.md) | #41 | [карточка](./archive/fft-indices-viz.md) |
| `sound-quality-viz` | Плагин микрофона: мониторинг качества звука | 2026-05-15 | [`SOUND_QUALITY_VIZ_PLUGIN_PROMPT.md`](../docs/prompts/SOUND_QUALITY_VIZ_PLUGIN_PROMPT.md) | #42 | [карточка](./archive/sound-quality-viz.md) |
| `telemetry-journal-report-viz` | Журнал телеметрии: визуализация отчётов анализа | 2026-05-15 | [`TELEMETRY_JOURNAL_REPORT_VIZ_PROMPT.md`](../docs/prompts/TELEMETRY_JOURNAL_REPORT_VIZ_PROMPT.md) | #43 (Issue открыт) | [карточка](./archive/telemetry-journal-report-viz.md) |

---

## Как добавить задачу

1. GitHub Issue → [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md).
2. Скопировать [`TASK_PROMPT_TEMPLATE.md`](../prompts/TASK_PROMPT_TEMPLATE.md) в `docs/prompts/<SLUG>_PROMPT.md`.
3. Добавить объект в `registry.json` (`"status": "active"`).
4. `yarn task:sync-readme`.

*Файл обновлён автоматически: 2026-05-15.*
