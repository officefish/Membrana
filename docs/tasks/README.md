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
| `real-dataset-live-calibration` | Real dataset v0.2: библиотеки → анализ → live matching → journal parity (неделя) | L | [`REAL_DATASET_LIVE_CALIBRATION_WEEK_PROMPT.md`](../docs/prompts/REAL_DATASET_LIVE_CALIBRATION_WEEK_PROMPT.md) | [#47](https://github.com/officefish/Membrana/issues/47) |
| `media-library-a3-mic-recorder` | Media library A3: mic buffer recorder plugin | M | [`MEDIA_LIBRARY_A3_MIC_RECORDER_PROMPT.md`](../docs/prompts/MEDIA_LIBRARY_A3_MIC_RECORDER_PROMPT.md) | — |
| `media-library-a4-sample-player` | Media library A4: sample playback, export, and waveform player plugin | M | [`MEDIA_LIBRARY_A4_SAMPLE_PLAYER_PROMPT.md`](../docs/prompts/MEDIA_LIBRARY_A4_SAMPLE_PLAYER_PROMPT.md) | — |
| `trends-fft-template-editor` | Редактор пользовательских шаблонов trends-fft | L | [`TRENDS_FFT_TEMPLATE_EDITOR_PROMPT.md`](../docs/prompts/TRENDS_FFT_TEMPLATE_EDITOR_PROMPT.md) | [#57](https://github.com/officefish/Membrana/issues/57) |
| `background-media-v1` | background-media v1: web data-plane (эпик) | L | [`BACKGROUND_MEDIA_V1_EPIC_PROMPT.md`](../docs/prompts/BACKGROUND_MEDIA_V1_EPIC_PROMPT.md) | [#58](https://github.com/officefish/Membrana/issues/58) |
| `background-media-a5a-server` | background-media A5a: NestJS API, PostgreSQL, client ServerStorageBackend | L | [`BACKGROUND_MEDIA_A5A_SERVER_PROMPT.md`](../docs/prompts/BACKGROUND_MEDIA_A5A_SERVER_PROMPT.md) | [#58](https://github.com/officefish/Membrana/issues/58) |
| `background-media-a5b-docker` | background-media A5b: Docker Compose (API + PostgreSQL + volumes) | M | [`BACKGROUND_MEDIA_A5B_DOCKER_PROMPT.md`](../docs/prompts/BACKGROUND_MEDIA_A5B_DOCKER_PROMPT.md) | [#58](https://github.com/officefish/Membrana/issues/58) |
| `background-media-a5c-deploy` | background-media A5c: продовый деплой (TLS, DNS, docs) | M | [`BACKGROUND_MEDIA_A5C_DEPLOY_PROMPT.md`](../docs/prompts/BACKGROUND_MEDIA_A5C_DEPLOY_PROMPT.md) | [#59](https://github.com/officefish/Membrana/issues/59) |
| `background-media-a5d-swagger` | background-media A5d: полная Swagger/OpenAPI документация | M | [`BACKGROUND_MEDIA_A5D_SWAGGER_PROMPT.md`](../docs/prompts/BACKGROUND_MEDIA_A5D_SWAGGER_PROMPT.md) | [#64](https://github.com/officefish/Membrana/issues/64) |
| `membrane-platform-v1` | Membrane Platform v1: cabinet, pairing, tariff, cloud journal (эпик) | L | [`MEMBRANE_PLATFORM_V1_EPIC_PROMPT.md`](../docs/prompts/MEMBRANE_PLATFORM_V1_EPIC_PROMPT.md) | [#67](https://github.com/officefish/Membrana/issues/67) |
| `cabinet-sample-library-v1` | Cabinet Sample Library v1: библиотека сэмплов в кабинете (эпик CSL1–CSL3) | L | [`CABINET_SAMPLE_LIBRARY_V1_EPIC_PROMPT.md`](../docs/prompts/CABINET_SAMPLE_LIBRARY_V1_EPIC_PROMPT.md) | [#67](https://github.com/officefish/Membrana/issues/67) |
| `cabinet-sample-library-csl1-api` | Cabinet Sample Library CSL1: membrane-scoped API + cabinet auth to media | M | [`CABINET_SAMPLE_LIBRARY_V1_EPIC_PROMPT.md`](../docs/prompts/CABINET_SAMPLE_LIBRARY_V1_EPIC_PROMPT.md) | [#67](https://github.com/officefish/Membrana/issues/67) |
| `cabinet-sample-library-csl2-ui` | Cabinet Sample Library CSL2: SampleLibraryPage + N-ready node picker | M | [`CABINET_SAMPLE_LIBRARY_V1_EPIC_PROMPT.md`](../docs/prompts/CABINET_SAMPLE_LIBRARY_V1_EPIC_PROMPT.md) | [#67](https://github.com/officefish/Membrana/issues/67) |
| `cabinet-sample-library-csl3-remote-ops` | Cabinet Sample Library CSL3: remote delete/move/import + offline empty states | M | [`CABINET_SAMPLE_LIBRARY_V1_EPIC_PROMPT.md`](../docs/prompts/CABINET_SAMPLE_LIBRARY_V1_EPIC_PROMPT.md) | [#67](https://github.com/officefish/Membrana/issues/67) |

---

## Архив

| ID | Название | Архивировано | Промпт | GitHub | Карточка |
|----|----------|--------------|--------|--------|----------|
| `tariff-dataset-v1` | Tariff Dataset v1: убрать benchmark, free-v1 корпус (эпик DS1–DS5) | 2026-06-14 | [`TARIFF_DATASET_V1_EPIC_PROMPT.md`](../docs/prompts/TARIFF_DATASET_V1_EPIC_PROMPT.md) | #47 | [карточка](./archive/tariff-dataset-v1.md) |
| `tariff-dataset-ds1-corpus` | Tariff Dataset DS1: корпус free-v1 и скрипты sync | 2026-06-14 | [`TARIFF_DATASET_DS1_CORPUS_PROMPT.md`](../docs/prompts/TARIFF_DATASET_DS1_CORPUS_PROMPT.md) | #47 | [карточка](./archive/tariff-dataset-ds1-corpus.md) |
| `tariff-dataset-ds2-domain` | Tariff Dataset DS2: domain model без benchmark | 2026-06-14 | [`TARIFF_DATASET_DS2_DOMAIN_PROMPT.md`](../docs/prompts/TARIFF_DATASET_DS2_DOMAIN_PROMPT.md) | #47 | [карточка](./archive/tariff-dataset-ds2-domain.md) |
| `tariff-dataset-ds3-client-bundled` | Tariff Dataset DS3: client bundled catalog и UI | 2026-06-14 | [`TARIFF_DATASET_DS3_CLIENT_BUNDLED_PROMPT.md`](../docs/prompts/TARIFF_DATASET_DS3_CLIENT_BUNDLED_PROMPT.md) | #47 | [карточка](./archive/tariff-dataset-ds3-client-bundled.md) |
| `tariff-dataset-ds4-benchmark-v02` | Tariff Dataset DS4: benchmark runner на v0.2 | 2026-06-14 | [`TARIFF_DATASET_DS4_BENCHMARK_V02_PROMPT.md`](../docs/prompts/TARIFF_DATASET_DS4_BENCHMARK_V02_PROMPT.md) | #47 | [карточка](./archive/tariff-dataset-ds4-benchmark-v02.md) |
| `tariff-dataset-ds5-server-provision` | Tariff Dataset DS5: provisioning каталога на media-server при pair | 2026-06-14 | [`TARIFF_DATASET_DS5_SERVER_PROVISION_PROMPT.md`](../docs/prompts/TARIFF_DATASET_DS5_SERVER_PROVISION_PROMPT.md) | #47 | [карточка](./archive/tariff-dataset-ds5-server-provision.md) |
| `membrane-platform-mp4-media-membrane` | Membrane Platform MP4: media scope по мембране, квоты userStorage/buffer, tariff dataset | 2026-06-14 | [`MEMBRANE_PLATFORM_V1_EPIC_PROMPT.md`](../docs/prompts/MEMBRANE_PLATFORM_V1_EPIC_PROMPT.md) | #67 (Issue открыт) | [карточка](./archive/membrane-platform-mp4-media-membrane.md) |
| `membrane-platform-mp5-telemetry-journal` | Membrane Platform MP5: TelemetryReport + LiveRecord, journal UI | 2026-06-14 | [`MEMBRANE_PLATFORM_V1_EPIC_PROMPT.md`](../docs/prompts/MEMBRANE_PLATFORM_V1_EPIC_PROMPT.md) | #67 (Issue открыт) | [карточка](./archive/membrane-platform-mp5-telemetry-journal.md) |
| `membrane-platform-mp6-prod-deploy` | Membrane Platform MP6: prod deploy cabinet.membrana.space | 2026-06-14 | [`MEMBRANE_PLATFORM_V1_EPIC_PROMPT.md`](../docs/prompts/MEMBRANE_PLATFORM_V1_EPIC_PROMPT.md) | #67 (Issue открыт) | [карточка](./archive/membrane-platform-mp6-prod-deploy.md) |
| `membrane-platform-mp0-domain` | Membrane Platform MP0: домен, глоссарий, MEMBRANE_PLATFORM.md | 2026-06-13 | [`MEMBRANE_PLATFORM_V1_EPIC_PROMPT.md`](../docs/prompts/MEMBRANE_PLATFORM_V1_EPIC_PROMPT.md) | #67 | [карточка](./archive/membrane-platform-mp0-domain.md) |
| `membrane-platform-mp1-auth-cabinet` | Membrane Platform MP1: background-cabinet auth + apps/cabinet shell | 2026-06-13 | [`MEMBRANE_PLATFORM_V1_EPIC_PROMPT.md`](../docs/prompts/MEMBRANE_PLATFORM_V1_EPIC_PROMPT.md) | #67 | [карточка](./archive/membrane-platform-mp1-auth-cabinet.md) |
| `membrane-platform-mp2-membrane-node-keys` | Membrane Platform MP2: Membrane, Tariff, Node, ключи TTL enum | 2026-06-13 | [`MEMBRANE_PLATFORM_V1_EPIC_PROMPT.md`](../docs/prompts/MEMBRANE_PLATFORM_V1_EPIC_PROMPT.md) | #67 | [карточка](./archive/membrane-platform-mp2-membrane-node-keys.md) |
| `membrane-platform-mp3-client-pairing` | Membrane Platform MP3: pairing + автономный режим узла в apps/client | 2026-06-13 | [`MEMBRANE_PLATFORM_V1_EPIC_PROMPT.md`](../docs/prompts/MEMBRANE_PLATFORM_V1_EPIC_PROMPT.md) | #67 | [карточка](./archive/membrane-platform-mp3-client-pairing.md) |
| `mcp-workstation-phase-b` | MCP phase B: Perplexity + Playwright on workstation | 2026-06-12 | [`MCP_WORKSTATION_PHASE_B_PROMPT.md`](../docs/prompts/MCP_WORKSTATION_PHASE_B_PROMPT.md) | #52 | [карточка](./archive/mcp-workstation-phase-b.md) |
| `mcp-workstation-phase-c` | MCP phase C: Glyph on workstation | 2026-06-12 | [`MCP_WORKSTATION_PHASE_C_PROMPT.md`](../docs/prompts/MCP_WORKSTATION_PHASE_C_PROMPT.md) | #53 | [карточка](./archive/mcp-workstation-phase-c.md) |
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

*Файл обновлён автоматически: 2026-06-14.*
