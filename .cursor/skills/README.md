# Membrana project agent skills

Project-scoped skills for Cursor Agent and Claude Code (mirror in `.claude/skills/`).

**Conventions:** one skill = one workflow. Rules live in `.cursorrules` / `AGENTS.md` (always-on). Skills are playbooks with triggers in YAML `description`.

| Skill | Triggers (summary) |
|-------|-------------------|
| [`membrana-anthropic-cli`](./membrana-anthropic-cli/SKILL.md) | `yarn anthropic:*`, API smoke, file audit via Anthropic |
| [`membrana-developer-rhythm`](./membrana-developer-rhythm/SKILL.md) | утро, вечер, `ritual:day`, `ritual:evening`, standup, main-day-issue |
| [`membrana-code-review`](./membrana-code-review/SKILL.md) | code review, `yarn code-review`, PR LGTM, вечернее ревью |
| [`membrana-task-lifecycle`](./membrana-task-lifecycle/SKILL.md) | M/L task, `task:archive`, closure, day-sprint phases |
| [`membrana-virtual-team`](./membrana-virtual-team/SKILL.md) | `/architect`, `/refactor`, `/math`, `/ui`, `/audio`, `/review`, 5 roles |
| [`membrana-audio-engine-guard`](./membrana-audio-engine-guard/SKILL.md) | mic, Web Audio, plugins, `AudioContext`, detectors |
| [`membrana-service-scaffold`](./membrana-service-scaffold/SKILL.md) | `/service`, new `@membrana/*-service` |
| [`membrana-device-board-edit`](./membrana-device-board-edit/SKILL.md) | device-board edit, undo, branch navigation, RevertPolicy |
| [`membrana-docs-sync`](./membrana-docs-sync/SKILL.md) | Mintlify, catalog, `docs:lint`, RAG index ritual |
| [`membrana-usercase-generation`](./membrana-usercase-generation/SKILL.md) | usercase pack, collapse, `node scripts/usercase.mjs` |
| [`membrana-background-servers`](./membrana-background-servers/SKILL.md) | background-office vs media vs cabinet |
| [`membrana-consilium`](./membrana-consilium/SKILL.md) | `yarn consilium`, архитектурный спор, ≥20 реплик |
| [`membrana-night-sprint`](./membrana-night-sprint/SKILL.md) | `night:open`, Night Build, handoff |
| [`membrana-rag-operator`](./membrana-rag-operator/SKILL.md) | `yarn rag:index`, `rag:query` (**stub** until RAG in main) |
| [`membrana-detector-benchmark`](./membrana-detector-benchmark/SKILL.md) | `benchmark:detectors`, calibration (**stub** partial) |
| [`membrana-mcp-workstation`](./membrana-mcp-workstation/SKILL.md) | `mcp:phase-*`, `mcp:verify-bootstrap` (**stub** partial) |

**Authoring:** Cursor built-in `create-skill` conventions; max ~120 lines per `SKILL.md`; link to `docs/` instead of copying canon.
