# docs/prompts — task-промпты

## С чего начать

**Любая новая крупная задача (M/L)** — сначала процесс:

| Документ | Назначение |
|----------|------------|
| **[`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)** | Стандарт постановки: Issue → реестр → промпт → PR → архив |
| **[`TASK_CLOSURE_REGULATION.md`](./TASK_CLOSURE_REGULATION.md)** | Регламент закрытия: DoD, отчёт в Issue, `task:archive` |
| **[`TASK_PROMPT_TEMPLATE.md`](./TASK_PROMPT_TEMPLATE.md)** | Шаблон нового `*_PROMPT.md` |
| **[`docs/tasks/README.md`](../tasks/README.md)** | Активные и архивные задачи |
| **[`CONSILIUM_PROMPT.md`](./CONSILIUM_PROMPT.md)** | Консилиум всех ролей → `docs/seanses/` |
| **[`../MCP_INTEGRATION_STRATEGY.md`](../MCP_INTEGRATION_STRATEGY.md)** | MCP в среде агента: когда указывать в task-промпте |

Команды: `yarn task:list`, `yarn task:sync-readme`, `yarn task:archive <id>`, `yarn consilium "<вопрос>"`.

---

Эта папка — для **task-промптов**: текстов-заданий для агента-разработчика. Они отличаются от **role-промптов** в [`../virtual-team/`](../virtual-team/):

| Категория | Где живёт | Зачем |
|-----------|-----------|-------|
| **Role-промпт** | `docs/virtual-team/PROMPT_*.md` | Личность и зона ответственности роли (Vesnin, Dynin, Boyarskiy, …). |
| **Task-промпт** | `docs/prompts/*.md` | Спецификация задачи: DoD, out of scope, архитектура. |
| **Реестр** | `docs/tasks/registry.json` | Статус задачи: active / archived |

Task-промпты не заменяют GitHub Issue ([`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md)); Issue ссылается на промпт и на `id` в реестре.

---

## Каталог промптов (спецификации)

| Файл | Что задаёт |
|------|------------|
| [`API_SERVER_BOOTSTRAP_PROMPT.md`](./API_SERVER_BOOTSTRAP_PROMPT.md) | Бутстрап `packages/background-office/` |
| [`SERVER_DEPLOYMENT_PROMPT.md`](./SERVER_DEPLOYMENT_PROMPT.md) | Продовый деплой |
| [`FFT_THRESHOLD_TEST_PLUGIN_PROMPT.md`](./FFT_THRESHOLD_TEST_PLUGIN_PROMPT.md) | Плагин порогового FFT-теста |
| [`FFT_THRESHOLD_TEST_REPORTS_PROMPT.md`](./FFT_THRESHOLD_TEST_REPORTS_PROMPT.md) | История отчётов плагина |
| [`DRONE_DETECTION_HEADER_SENSOR_PROMPT.md`](./DRONE_DETECTION_HEADER_SENSOR_PROMPT.md) | Датчик дрона в шапке |
| [`FFT_INDICES_VIZ_PLUGIN_PROMPT.md`](./FFT_INDICES_VIZ_PLUGIN_PROMPT.md) | Live FFT-индексы (`fft-indices-viz`, архив) |
| [`SOUND_QUALITY_VIZ_PLUGIN_PROMPT.md`](./SOUND_QUALITY_VIZ_PLUGIN_PROMPT.md) | Качество звука (`sound-quality-viz`, архив) |
| [`TELEMETRY_JOURNAL_REPORT_VIZ_PROMPT.md`](./TELEMETRY_JOURNAL_REPORT_VIZ_PROMPT.md) | Карточки отчётов в журнале (`telemetry-journal-report-viz`, архив) |
| [`DSP_DRONE_DETECTOR_PROMPT.md`](./DSP_DRONE_DETECTOR_PROMPT.md) | **Активная задача** `dsp-drone-detector` — сервис, демо, плагин (L, 3 фазы) |
| [`HARMONIC_DETECTOR_MICROPHONE_PLUGIN_PROMPT.md`](./HARMONIC_DETECTOR_MICROPHONE_PLUGIN_PROMPT.md) | **Фаза 3 #45** — плагин микрофона (normal + fullscreen), синхрон с шапкой |
| [`HARMONIC_DEMO_APPS_DEMOS_ANALYSIS_PROMPT.md`](./HARMONIC_DEMO_APPS_DEMOS_ANALYSIS_PROMPT.md) | UX-анализ Replit lab → demo/плагин |

### Цепочка внедрения MCP (2026-05-20)

План: [`MCP_ROLLOUT_PLAN.md`](../MCP_ROLLOUT_PLAN.md). Политика: [`MCP_INTEGRATION_STRATEGY.md`](../MCP_INTEGRATION_STRATEGY.md). **Старт:** `mcp-repo-bootstrap` → [#50](https://github.com/officefish/Membrana/issues/50).

| Файл | `id` реестра |
|------|----------------|
| [`MCP_REPO_BOOTSTRAP_PROMPT.md`](./MCP_REPO_BOOTSTRAP_PROMPT.md) | `mcp-repo-bootstrap` |
| [`MCP_WORKSTATION_PHASE_A_PROMPT.md`](./MCP_WORKSTATION_PHASE_A_PROMPT.md) | `mcp-workstation-phase-a` |
| [`MCP_WORKSTATION_PHASE_B_PROMPT.md`](./MCP_WORKSTATION_PHASE_B_PROMPT.md) | `mcp-workstation-phase-b` |
| [`MCP_WORKSTATION_PHASE_C_PROMPT.md`](./MCP_WORKSTATION_PHASE_C_PROMPT.md) | `mcp-workstation-phase-c` |
| [`MCP_ROLLOUT_ACCEPTANCE_PROMPT.md`](./MCP_ROLLOUT_ACCEPTANCE_PROMPT.md) | `mcp-rollout-acceptance` |

Статус active/archived — в [`docs/tasks/README.md`](../tasks/README.md).

Сквозной журнал `background-office` — [`../discussions/background-office-v0.1.md`](../discussions/background-office-v0.1.md).
