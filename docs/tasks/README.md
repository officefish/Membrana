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

| ID | Название | Размер | Промпт | GitHub |
|----|----------|--------|--------|--------|
| `single-node-detection-first` | Single-Node Detection First: пересмотр дорожной карты и scaffolding детекторов | L | [`SINGLE_NODE_DETECTION_FIRST_PROMPT.md`](../docs/prompts/SINGLE_NODE_DETECTION_FIRST_PROMPT.md) | [#47](https://github.com/officefish/Membrana/issues/47) |
| `mcp-workstation-phase-a` | MCP phase A: gitnexus, Git, Filesystem on workstation | S | [`MCP_WORKSTATION_PHASE_A_PROMPT.md`](../docs/prompts/MCP_WORKSTATION_PHASE_A_PROMPT.md) | [#51](https://github.com/officefish/Membrana/issues/51) |

---

## Архив

| ID | Название | Архивировано | Промпт | GitHub | Карточка |
|----|----------|--------------|--------|--------|----------|
| `mcp-repo-bootstrap` | MCP repo bootstrap: example configs, gitignore, verify script | 2026-06-09 | [`MCP_REPO_BOOTSTRAP_PROMPT.md`](../docs/prompts/MCP_REPO_BOOTSTRAP_PROMPT.md) | #50 (Issue открыт) | [карточка](./archive/mcp-repo-bootstrap.md) |
| `dsp-drone-detector` | DSP-детектор дрона: сервис, демо-приложение, плагин микрофона | 2026-05-16 | [`DSP_DRONE_DETECTOR_PROMPT.md`](../docs/prompts/DSP_DRONE_DETECTOR_PROMPT.md) | #45 | [карточка](./archive/dsp-drone-detector.md) |
| `fft-indices-viz` | Плагин микрофона: live-визуализация FFT-индексов | 2026-05-15 | [`FFT_INDICES_VIZ_PLUGIN_PROMPT.md`](../docs/prompts/FFT_INDICES_VIZ_PLUGIN_PROMPT.md) | #41 | [карточка](./archive/fft-indices-viz.md) |
| `sound-quality-viz` | Плагин микрофона: мониторинг качества звука | 2026-05-15 | [`SOUND_QUALITY_VIZ_PLUGIN_PROMPT.md`](../docs/prompts/SOUND_QUALITY_VIZ_PLUGIN_PROMPT.md) | #42 | [карточка](./archive/sound-quality-viz.md) |
| `telemetry-journal-report-viz` | Журнал телеметрии: визуализация отчётов анализа | 2026-05-15 | [`TELEMETRY_JOURNAL_REPORT_VIZ_PROMPT.md`](../docs/prompts/TELEMETRY_JOURNAL_REPORT_VIZ_PROMPT.md) | #43 | [карточка](./archive/telemetry-journal-report-viz.md) |

---

## Как добавить задачу

1. GitHub Issue → [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md).
2. Скопировать [`TASK_PROMPT_TEMPLATE.md`](../prompts/TASK_PROMPT_TEMPLATE.md) в `docs/prompts/<SLUG>_PROMPT.md`.
3. Добавить объект в `registry.json` (`"status": "active"`).
4. `yarn task:sync-readme`.

*Файл обновлён автоматически: 2026-06-09.*
