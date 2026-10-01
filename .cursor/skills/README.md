# Membrana project agent skills

Project-scoped skills for Cursor Agent and Claude Code (mirror in `.claude/skills/`).

**Conventions:** one skill = one workflow. Rules live in `.cursorrules` / `AGENTS.md` (always-on). Skills are playbooks with triggers in YAML `description`.

| Skill | Status | Triggers (summary) |
|-------|--------|-------------------|
| [`membrana-anthropic-cli`](./membrana-anthropic-cli/SKILL.md) | `missing` | `yarn anthropic:*`, API smoke, file audit via Anthropic |
| [`membrana-opencode-proxy`](./membrana-opencode-proxy/SKILL.md) | `missing` | `yarn opencode:*`, OpenRouter/FreeModel proxy, `.env.llm-proxy` |
| [`membrana-developer-rhythm`](./membrana-developer-rhythm/SKILL.md) | `live` | ритм дня, порядок чтения перед M/L-кодом; утро/вечер делегирует отдельным дверям |
| [`membrana-morning-ritual`](./membrana-morning-ritual/SKILL.md) | `live` | утро, утренний ритуал, `ritual:day`, standup, main-day-issue |
| [`membrana-evening-ritual`](./membrana-evening-ritual/SKILL.md) | `live` | вечер, вечерний ритуал, `ritual:evening`, `evening:gate`, закрыть день |
| [`membrana-leveling`](./membrana-leveling/SKILL.md) | `missing` | leveling, выравнивание, `membrana-leveling:*`, workspace-level, unnamed-trash; soft evening step; mirrored Claude/OpenCode |
| [`membrana-code-review`](./membrana-code-review/SKILL.md) | `missing` | code review, `yarn code-review`, PR LGTM, вечернее ревью |
| [`membrana-task-lifecycle`](./membrana-task-lifecycle/SKILL.md) | `missing` | M/L task, `task:archive`, closure, day-sprint phases |
| [`membrana-task-closure-review`](./membrana-task-closure-review/SKILL.md) | `missing` | automatic Teamlead review after push, exact-SHA LGTM/BLOCK, guarded finalize; mirrored to Claude/Codex |
| [`membrana-tasks-audit`](./membrana-tasks-audit/SKILL.md) | `missing` | ревизия устаревших карточек: `tasks:audit` → свидетельство по main на каждую → `task:archive --notes`; зонтики повердиктно read-only аудиторами; mirrored to Claude |
| [`membrana-tasks-workshop`](./membrana-tasks-workshop/SKILL.md) | `missing` | инвентарь primary-мастерской `docs/tasks`: `yarn task:tools` → таблица + `--doc`; кит `kits/tasks-master`; ≠ audit/decompose; mirrored Claude/Agents/OpenCode |
| [`membrana-pr-audit`](./membrana-pr-audit/SKILL.md) | `missing` | ревизия открытых PR: параллельные read-only аудиторы → вердикты merge-ready/close-superseded/low-value/needs-work со свидетельством-в-main; устаревшие → `pr:recreate`; мердж проверять `pr:verify`; mirrored to Claude |
| [`membrana-containerization-master`](./membrana-containerization-master/SKILL.md) | `missing` | cold-start крафта контейнеров/китов: 2 паттерна + `kits/containerization-master` + процедура `containerization`; не путать с `procedure-frames` (#900); mirrored to Claude |
| [`membrana-branch-audit`](./membrana-branch-audit/SKILL.md) | `missing` | инвентарь веток vs `origin/main`: `yarn repo:branches` → таблицы ahead/behind + бакеты; не `branch --merged`; agent/container: [`docs/audit/git/`](../../docs/audit/git/README.md); mirrored to Claude |
| [`membrana-branch-decompose`](./membrana-branch-decompose/SKILL.md) | `missing` | декомпозиция веток в 7 hygiene-категорий: `yarn repo:branches:decompose`; не auto-delete; agent entry: [`AGENT_PROMPT.md`](../../docs/audit/git/AGENT_PROMPT.md); mirrored to Claude |
| [`membrana-branch-salvage`](./membrana-branch-salvage/SKILL.md) | `missing` | исполнение ратифицированного exact-tip плана: reconcile → одна ref-мутация → ADR-0020 post-check → fail-closed closeout; без semantic verdict и удаления worktree; mirrored to Claude/Agents |
| [`membrana-tasks-decompose`](./membrana-tasks-decompose/SKILL.md) | `missing` | декомпозиция реестра: `tasks:decompose` — категории из конфига, обязательная markdown-таблица долей, «вне категорий» = дополнить конфиг; mirrored to Claude |
| [`membrana-virtual-team`](./membrana-virtual-team/SKILL.md) | `missing` | `/architect`, `/refactor`, `/math`, `/ui`, `/audio`, `/review`, 5 roles |
| [`membrana-audio-engine-guard`](./membrana-audio-engine-guard/SKILL.md) | `missing` | mic, Web Audio, plugins, `AudioContext`, detectors |
| [`membrana-service-scaffold`](./membrana-service-scaffold/SKILL.md) | `missing` | `/service`, new `@membrana/*-service` |
| [`membrana-device-board-edit`](./membrana-device-board-edit/SKILL.md) | `missing` | device-board edit, undo, branch navigation, RevertPolicy |
| [`membrana-docs-sync`](./membrana-docs-sync/SKILL.md) | `missing` | Mintlify, catalog, `docs:lint`, RAG index ritual |
| [`membrana-usercase-lessons`](./membrana-usercase-lessons/SKILL.md) | `missing` | журнал недочётов сценариев: читать ДО сборки UserCase, L-записи при отладке Run, live-Run чеклист |
| [`membrana-usercase-generation`](./membrana-usercase-generation/SKILL.md) | `missing` | usercase pack, collapse, `node scripts/usercase.mjs` |
| [`membrana-competition-packaging`](./membrana-competition-packaging/SKILL.md) | `missing` | `comp:publish-catalog`, post-sprint picker, operator debug |
| [`membrana-insight`](./membrana-insight/SKILL.md) | `missing` | `yarn insight:*`, strategic ideas; гид: [`INSIGHT_LIFECYCLE_FOR_AGENTS.md`](../../docs/prompts/INSIGHT_LIFECYCLE_FOR_AGENTS.md) |
| [`membrana-insight-to-sprint`](./membrana-insight-to-sprint/SKILL.md) | `missing` | adopted инсайт → спринт: task-промпт, реестр `insightId`, точка входа новой сессии |
| [`membrana-insight-lifecycle`](./membrana-insight-lifecycle/SKILL.md) | `missing` | exact D/L/O/V, evidence reconciliation, visibility, correction/reopen/migration |
| [`membrana-insight-overview`](./membrana-insight-overview/SKILL.md) | `missing` | все insights тезисами, evidence gaps, личный top-3 и objective candidate (read-only; mirrored Claude/Codex/OpenCode) |
| [`membrana-client-logs-parsing`](./membrana-client-logs-parsing/SKILL.md) | `missing` | «читай лог», `yarn logs:parse`, gate-true / reports vs tracks |
| [`membrana-background-servers`](./membrana-background-servers/SKILL.md) | `missing` | background-office vs media vs cabinet |
| [`membrana-office-vds-deploy`](./membrana-office-vds-deploy/SKILL.md) | `missing` | деплой office на MSK-VDS office.mmbrn.tech, фильтр сети / SSH виснет / LE timeout / build 429 / rag-контекст, OM3 |
| [`membrana-consilium`](./membrana-consilium/SKILL.md) | `missing` | `yarn consilium`, архитектурный спор, ≥20 реплик |
| [`membrana-adr`](./membrana-adr/SKILL.md) | `missing` | ADR — лёгкая запись решения ниже консилиум-гейта, `docs/adr/` |
| [`membrana-team-evening-feedback`](./membrana-team-evening-feedback/SKILL.md) | `missing` | `yarn team-evening-feedback`, вечерняя ретроспектива, `ritual:evening` |
| [`membrana-tooling-needs`](./membrana-tooling-needs/SKILL.md) | `missing` | «tooling needs», трудности сессии → предложения скриптов/хуков/скиллов с evidence (read-only) |
| *(нет отдельного skill — entry контейнера)* | группа `scripts/`: [`scripts/AGENT_PROMPT.md`](../../scripts/AGENT_PROMPT.md) · `yarn scripts:registry --report` · не плодить `docs/audit/scripts/` |
| [`membrana-truth-crystallization`](./membrana-truth-crystallization/SKILL.md) | `missing` | «кристаллизация правды», «токены правды», бриф при закрытии сессии: до 3 вопросов владельцу о невыводимых фактах → синтез парами (только дедукция); mirrored to Claude |
| [`membrana-telegram-swallow`](./membrana-telegram-swallow/SKILL.md) | `missing` | «ласточка»; тон — линза Ожегова; кликабельность — `yarn live-links` (отдельно); mirrored Claude/Codex |
| [`membrana-cowork`](./membrana-cowork/SKILL.md) | `missing` | коворк, `yarn cowork:open` — 3 изолированных блока одной разработки → Interface Consilium → интеграция адаптерами; mirrored to Claude/Codex |
| [`membrana-local-sprint`](./membrana-local-sprint/SKILL.md) | `missing` | локальный спринт, честный спринт, нарезка задачи, гейт исполнения — единый local sprint-route; `yarn sprint:cut` / `sprint:gate` / `sprint:experience` + `procedure-run:journal`; mirrored to Claude / Codex agents / Opencode |
| [`membrana-hackathon`](./membrana-hackathon/SKILL.md) | `missing` | хакатон, hackathon, H1-H4 relay — строгая эстафета четырёх передач с `stage-completion-checklist`, финальным аудитом и возвратом к ритму; mirrored to Claude / Codex agents / Opencode |
| [`membrana-case-mining`](./membrana-case-mining/SKILL.md) | `missing` | добыча кейсов из JSONL-транскриптов: `yarn sessions:scan/extract`, Raw только с указателями {sessionId, uuid, timestamp} и побайтовой сверкой; кандидаты по форме M4/case-meta-1; печать — слово капитана; mirrored to Claude |
| [`membrana-bridge`](./membrana-bridge/SKILL.md) | `missing` | мостик, «идём на мостик», зови попугая, долги мостика — комната капитана (Ангелина + Фаррелл + попугай): `yarn bridge open` (явно) / `tools` (инструментарий ведущей из кита `kits/angelina-bridge`) / `debt …`; закрытие — вечерним ритуалом, руками нельзя; mirrored Claude/Agents/OpenCode |
| [`membrana-storm`](./membrana-storm/SKILL.md) | `missing` | шторм, storm, «пошумим», породить тезисы, конспект будущего доклада — дивергентный формат: беседа → тезисы (Ангелина + 5 персон + питомец); регламент `STORM_REGULATION.md`; ≠ заседание; mirrored to Claude/Codex |
| [`membrana-night-sprint`](./membrana-night-sprint/SKILL.md) | `missing` | `night:open`, Night Build, handoff |
| [`membrana-always-yes`](./membrana-always-yes/SKILL.md) | `missing` | `yarn always-yes:on\|off`, scoped auto-yes (ADR-0009 Р7), «отойти от компьютера», default в ночном спринте |
| [`membrana-worktree`](./membrana-worktree/SKILL.md) | `missing` | отдельный worktree + `yarn worktree:bootstrap` (modules/.env), параллельная сессия |
| [`membrana-rag-operator`](./membrana-rag-operator/SKILL.md) | `missing` | `yarn rag:index`, `rag:query` (**stub** until RAG in main) |
| [`membrana-detector-benchmark`](./membrana-detector-benchmark/SKILL.md) | `missing` | `benchmark:detectors`, calibration (**stub** partial) |
| [`membrana-mcp-workstation`](./membrana-mcp-workstation/SKILL.md) | `missing` | `mcp:phase-*`, `mcp:verify-bootstrap` (**stub** partial) |

**Authoring:** Cursor built-in `create-skill` conventions; max ~120 lines per `SKILL.md`; link to `docs/` instead of copying canon.
