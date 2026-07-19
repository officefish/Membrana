# Membrana project agent skills

Project-scoped skills for Cursor Agent and Claude Code (mirror in `.claude/skills/`).

**Conventions:** one skill = one workflow. Rules live in `.cursorrules` / `AGENTS.md` (always-on). Skills are playbooks with triggers in YAML `description`.

| Skill | Triggers (summary) |
|-------|-------------------|
| [`membrana-anthropic-cli`](./membrana-anthropic-cli/SKILL.md) | `yarn anthropic:*`, API smoke, file audit via Anthropic |
| [`membrana-opencode-proxy`](./membrana-opencode-proxy/SKILL.md) | `yarn opencode:*`, OpenRouter/FreeModel proxy, `.env.llm-proxy` |
| [`membrana-developer-rhythm`](./membrana-developer-rhythm/SKILL.md) | утро, вечер, `ritual:day`, `ritual:evening`, standup, main-day-issue |
| [`membrana-code-review`](./membrana-code-review/SKILL.md) | code review, `yarn code-review`, PR LGTM, вечернее ревью |
| [`membrana-task-lifecycle`](./membrana-task-lifecycle/SKILL.md) | M/L task, `task:archive`, closure, day-sprint phases |
| [`membrana-task-closure-review`](./membrana-task-closure-review/SKILL.md) | automatic Teamlead review after push, exact-SHA LGTM/BLOCK, guarded finalize; mirrored to Claude/Codex |
| [`membrana-virtual-team`](./membrana-virtual-team/SKILL.md) | `/architect`, `/refactor`, `/math`, `/ui`, `/audio`, `/review`, 5 roles |
| [`membrana-audio-engine-guard`](./membrana-audio-engine-guard/SKILL.md) | mic, Web Audio, plugins, `AudioContext`, detectors |
| [`membrana-service-scaffold`](./membrana-service-scaffold/SKILL.md) | `/service`, new `@membrana/*-service` |
| [`membrana-device-board-edit`](./membrana-device-board-edit/SKILL.md) | device-board edit, undo, branch navigation, RevertPolicy |
| [`membrana-docs-sync`](./membrana-docs-sync/SKILL.md) | Mintlify, catalog, `docs:lint`, RAG index ritual |
| [`membrana-usercase-lessons`](./membrana-usercase-lessons/SKILL.md) | журнал недочётов сценариев: читать ДО сборки UserCase, L-записи при отладке Run, live-Run чеклист |
| [`membrana-usercase-generation`](./membrana-usercase-generation/SKILL.md) | usercase pack, collapse, `node scripts/usercase.mjs` |
| [`membrana-competition-packaging`](./membrana-competition-packaging/SKILL.md) | `comp:publish-catalog`, post-sprint picker, operator debug |
| [`membrana-insight`](./membrana-insight/SKILL.md) | `yarn insight:*`, strategic ideas, Perplexity cascade, weekly weight |
| [`membrana-insight-to-sprint`](./membrana-insight-to-sprint/SKILL.md) | adopted инсайт → спринт: task-промпт, реестр `insightId`, точка входа новой сессии |
| [`membrana-insight-lifecycle`](./membrana-insight-lifecycle/SKILL.md) | exact D/L/O/V, evidence reconciliation, visibility, correction/reopen/migration |
| [`membrana-insight-overview`](./membrana-insight-overview/SKILL.md) | все insights тезисами, evidence gaps, личный top-3 и objective candidate |
| [`membrana-insight-overview`](./membrana-insight-overview/SKILL.md) | полный тезисный обзор всех инсайтов, личный top-3 агента + объективный кандидат (read-only; mirrored to Claude/Codex) |
| [`membrana-client-logs-parsing`](./membrana-client-logs-parsing/SKILL.md) | «читай лог», `yarn logs:parse`, gate-true / reports vs tracks |
| [`membrana-background-servers`](./membrana-background-servers/SKILL.md) | background-office vs media vs cabinet |
| [`membrana-office-vds-deploy`](./membrana-office-vds-deploy/SKILL.md) | деплой office на MSK-VDS office.mmbrn.tech, фильтр сети / SSH виснет / LE timeout / build 429 / rag-контекст, OM3 |
| [`membrana-consilium`](./membrana-consilium/SKILL.md) | `yarn consilium`, архитектурный спор, ≥20 реплик |
| [`membrana-adr`](./membrana-adr/SKILL.md) | ADR — лёгкая запись решения ниже консилиум-гейта, `docs/adr/` |
| [`membrana-team-evening-feedback`](./membrana-team-evening-feedback/SKILL.md) | `yarn team-evening-feedback`, вечерняя ретроспектива, `ritual:evening` |
| [`membrana-tooling-needs`](./membrana-tooling-needs/SKILL.md) | «tooling needs», трудности сессии → предложения скриптов/хуков/скиллов с evidence (read-only) |
| [`membrana-truth-crystallization`](./membrana-truth-crystallization/SKILL.md) | «кристаллизация правды», «токены правды», бриф при закрытии сессии: до 3 вопросов владельцу о невыводимых фактах → синтез парами (только дедукция); mirrored to Claude |
| [`membrana-telegram-swallow`](./membrana-telegram-swallow/SKILL.md) | «ласточка», «отправь союзникам», `yarn telegram:swallow` — разовое сообщение в группу по команде владельца; mirrored to Claude/Codex |
| [`membrana-cowork`](./membrana-cowork/SKILL.md) | коворк, `yarn cowork:open` — 3 изолированных блока одной разработки → Interface Consilium → интеграция адаптерами; mirrored to Claude/Codex |
| [`membrana-night-sprint`](./membrana-night-sprint/SKILL.md) | `night:open`, Night Build, handoff |
| [`membrana-always-yes`](./membrana-always-yes/SKILL.md) | `yarn always-yes:on\|off`, scoped auto-yes (ADR-0009 Р7), «отойти от компьютера», default в ночном спринте |
| [`membrana-worktree`](./membrana-worktree/SKILL.md) | отдельный worktree, параллельная сессия, разведи сессии, `git worktree add` |
| [`membrana-rag-operator`](./membrana-rag-operator/SKILL.md) | `yarn rag:index`, `rag:query` (**stub** until RAG in main) |
| [`membrana-detector-benchmark`](./membrana-detector-benchmark/SKILL.md) | `benchmark:detectors`, calibration (**stub** partial) |
| [`membrana-mcp-workstation`](./membrana-mcp-workstation/SKILL.md) | `mcp:phase-*`, `mcp:verify-bootstrap` (**stub** partial) |

**Authoring:** Cursor built-in `create-skill` conventions; max ~120 lines per `SKILL.md`; link to `docs/` instead of copying canon.
