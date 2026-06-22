# Day sprint open — cursor-agent-skills-sprint-2026-06-22

| Поле | Значение |
|------|----------|
| **Epic id** | `cursor-agent-skills-sprint-2026-06-22` |
| **Kind** | day-sprint |
| **Opened** | 2026-06-22 |
| **Status** | **closed** |
| **Predecessor** | skills gap analysis · docs sprint closed |

## Goal

Внедрить project agent skills (Cursor + Claude Code mirror) для операционных и domain workflow Membrana — без дублирования rules и generic review.

## Phases

| Phase | Task id | Size | Focus |
|-------|---------|------|-------|
| S0 | `cs-sk-s0-index-bootstrap` | S | `.cursor/skills/README.md`, AGENTS pointer |
| S1 | `cs-sk-s1-developer-rhythm` | M | `membrana-developer-rhythm` |
| S2 | `cs-sk-s2-task-lifecycle` | M | `membrana-task-lifecycle` |
| S3 | `cs-sk-s3-virtual-team-guards` | M | virtual-team + audio-engine-guard |
| S4 | `cs-sk-s4-service-scaffold` | S | `membrana-service-scaffold` |
| S5 | `cs-sk-s5-domain-docs` | M | device-board-edit + docs-sync |
| S6 | `cs-sk-s6-ops-workflows` | M | usercase, servers, consilium, night |
| S7 | `cs-sk-s7-claude-mirror` | S | `.claude/` mirror |
| S8 | `cs-sk-s8-deferred-stubs` | S | RAG, detectors, MCP stubs |

**Prompt:** [`CURSOR_AGENT_SKILLS_SPRINT_PROMPT.md`](../../prompts/CURSOR_AGENT_SKILLS_SPRINT_PROMPT.md)

## Out of scope

Personal `~/.cursor/skills/`, new yarn scripts, RAG index run, vesnin/core contract changes.
