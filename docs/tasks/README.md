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
| `media-library-a3-mic-recorder` | Media library A3: mic buffer recorder plugin | M | [`MEDIA_LIBRARY_A3_MIC_RECORDER_PROMPT.md`](../docs/prompts/MEDIA_LIBRARY_A3_MIC_RECORDER_PROMPT.md) | — |
| `media-library-a4-sample-player` | Media library A4: sample playback, export, and waveform player plugin | M | [`MEDIA_LIBRARY_A4_SAMPLE_PLAYER_PROMPT.md`](../docs/prompts/MEDIA_LIBRARY_A4_SAMPLE_PLAYER_PROMPT.md) | — |
| `trends-fft-template-editor` | Редактор пользовательских шаблонов trends-fft | L | [`TRENDS_FFT_TEMPLATE_EDITOR_PROMPT.md`](../docs/prompts/TRENDS_FFT_TEMPLATE_EDITOR_PROMPT.md) | [#57](https://github.com/officefish/Membrana/issues/57) |

---

## Архив

| ID | Название | Архивировано | Промпт | GitHub | Карточка |
|----|----------|--------------|--------|--------|----------|
| `analyzer-frame-feed-refactor` | Анализаторы: AudioFrameFeed и миграция fft-threshold-test + harmonic-detector-viz | 2026-06-11 | [`ANALYZER_FRAME_FEED_REFACTOR_PROMPT.md`](../docs/prompts/ANALYZER_FRAME_FEED_REFACTOR_PROMPT.md) | #55 | [карточка](./archive/analyzer-frame-feed-refactor.md) |
| `trends-fft-microphone-plugin` | Плагин микрофона: анализатор тенденций FFT (trends-fft-analyzer) | 2026-06-11 | [`TRENDS_FFT_MICROPHONE_PLUGIN_PROMPT.md`](../docs/prompts/TRENDS_FFT_MICROPHONE_PLUGIN_PROMPT.md) | #56 | [карточка](./archive/trends-fft-microphone-plugin.md) |
| `detection-base-contract` | Detection: detector-base contract and metrics types | 2026-06-10 | [`DETECTION_BASE_CONTRACT_PROMPT.md`](../docs/prompts/DETECTION_BASE_CONTRACT_PROMPT.md) | #47 | [карточка](./archive/detection-base-contract.md) |
| `detection-dataset-v01` | Detection: DATASET.md and synthetic v0.1 manifest | 2026-06-10 | [`DETECTION_DATASET_V01_PROMPT.md`](../docs/prompts/DETECTION_DATASET_V01_PROMPT.md) | #47 | [карточка](./archive/detection-dataset-v01.md) |
| `detection-benchmark-runner` | Detection: yarn benchmark:detectors runner and DETECTOR_BENCHMARK.md | 2026-06-10 | [`DETECTION_BENCHMARK_RUNNER_PROMPT.md`](../docs/prompts/DETECTION_BENCHMARK_RUNNER_PROMPT.md) | #47 | [карточка](./archive/detection-benchmark-runner.md) |
| `detection-harmonic-gate` | Detection: harmonic-detector v0.1 on benchmark | 2026-06-10 | [`DETECTION_HARMONIC_GATE_PROMPT.md`](../docs/prompts/DETECTION_HARMONIC_GATE_PROMPT.md) | #47 | [карточка](./archive/detection-harmonic-gate.md) |
| `detection-architecture-freeze` | Detection: Single-Node freeze in ARCHITECTURE and PR checklist | 2026-06-10 | [`DETECTION_ARCHITECTURE_FREEZE_PROMPT.md`](../docs/prompts/DETECTION_ARCHITECTURE_FREEZE_PROMPT.md) | #47 | [карточка](./archive/detection-architecture-freeze.md) |
| `mcp-repo-bootstrap` | MCP repo bootstrap: example configs, gitignore, verify script | 2026-06-09 | [`MCP_REPO_BOOTSTRAP_PROMPT.md`](../docs/prompts/MCP_REPO_BOOTSTRAP_PROMPT.md) | #50 | [карточка](./archive/mcp-repo-bootstrap.md) |
| `mcp-workstation-phase-a` | MCP phase A: gitnexus, Git, Filesystem on workstation | 2026-06-09 | [`MCP_WORKSTATION_PHASE_A_PROMPT.md`](../docs/prompts/MCP_WORKSTATION_PHASE_A_PROMPT.md) | #51 | [карточка](./archive/mcp-workstation-phase-a.md) |
| `media-library-a1-storage` | Media library A1: storage backend and domain service | 2026-06-09 | [`MEDIA_LIBRARY_A1_STORAGE_PROMPT.md`](../docs/prompts/MEDIA_LIBRARY_A1_STORAGE_PROMPT.md) | — | [карточка](./archive/media-library-a1-storage.md) |
| `media-library-a2-ui` | Media library A2: sample library UI and quota banner | 2026-06-09 | [`MEDIA_LIBRARY_A2_UI_PROMPT.md`](../docs/prompts/MEDIA_LIBRARY_A2_UI_PROMPT.md) | — | [карточка](./archive/media-library-a2-ui.md) |
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

*Файл обновлён автоматически: 2026-06-11.*
