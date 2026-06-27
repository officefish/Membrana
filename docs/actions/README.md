# docs/actions — долгоживущие процессы (agent + human)

Каталог **операционных регламентов**, runbooks, lessons learned, smoke-чеклистов и sign-off — в отличие от временных task-промптов в [`docs/prompts/`](../prompts/).

---

## Taxonomy

| Слой | Путь | Роль |
|------|------|------|
| **Actions (process)** | `docs/actions/**` | Регламенты, smoke, cookbooks, LGTM — канон процесса |
| **Task prompts** | `docs/prompts/*_PROMPT.md` | Epic/sprint specs с DoD |
| **Role prompts** | `docs/virtual-team/PROMPT_*.md` | Личности виртуальной команды |
| **Skills** | `.cursor/skills/membrana-*/SKILL.md` | Thin pointers → actions |
| **Architecture** | `docs/ARCHITECTURE.md`, `packages/*/README.md` | Дизайн системы |
| **Fixtures** | `docs/device-board-scripts/` | JSON UserCase, golden, logs |

---

## Домены

| Домен | Hub |
|-------|-----|
| **device-board** | [`device-board/`](./device-board/) — UserCase generation, lessons L*, ST*, smoke, logs parsing |

Follow-up (не в фазе A): `actions/ritual/`, `actions/rag/`.

---

## Device-board routing

| Процесс | Путь | Skill |
|---------|------|-------|
| UserCase generation (normative) | [`device-board/USERCASE_GENERATION_REGULATION.md`](./device-board/USERCASE_GENERATION_REGULATION.md) | `membrana-usercase-generation` |
| Competition lessons L1–L23 | [`device-board/USERCASE_COMPETITION_LESSONS.md`](./device-board/USERCASE_COMPETITION_LESSONS.md) | `membrana-usercase-generation` |
| Studio host lessons ST1–ST9 | [`device-board/STUDIO_HOST_LESSONS.md`](./device-board/STUDIO_HOST_LESSONS.md) | `membrana-client-logs-parsing` |
| Client logs parsing | [`device-board/CLIENT_LOGS_PARSING.md`](./device-board/CLIENT_LOGS_PARSING.md) | `membrana-client-logs-parsing` |
| Server-first prod smoke | [`device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE.md`](./device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE.md) | — |
| Scenario chain cookbook | [`device-board/cookbooks/SCENARIO_CHAIN_LOG_COOKBOOK.md`](./device-board/cookbooks/SCENARIO_CHAIN_LOG_COOKBOOK.md) | `membrana-client-logs-parsing` |
| UserCase fixtures | [`../device-board-scripts/`](../device-board-scripts/) | `membrana-usercase-generation` |

Task prompt (workflow): [`docs/prompts/DEVICE_BOARD_USERCASE_GENERATION_PROMPT.md`](../prompts/DEVICE_BOARD_USERCASE_GENERATION_PROMPT.md).

---

## Миграция (фаза A)

Старые пути `docs/device-board-scripts/*.md` (кроме `README.md`) — **redirect-stubs** до ≥ 2026-07-26.

Sprint: [`docs/prompts/DOCS_ACTIONS_PHASE_A_SPRINT_PROMPT.md`](../prompts/DOCS_ACTIONS_PHASE_A_SPRINT_PROMPT.md) · Issue [#182](https://github.com/officefish/Membrana/issues/182).
