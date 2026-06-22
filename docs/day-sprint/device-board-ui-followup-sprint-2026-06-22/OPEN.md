# Day sprint open — device-board-ui-followup-sprint-2026-06-22

| Поле | Значение |
|------|----------|
| **Epic id** | `device-board-ui-followup-sprint-2026-06-22` |
| **Kind** | day-sprint |
| **Opened** | 2026-06-22 |
| **Status** | **closed** |
| **Predecessor** | `device-board-function-modal-sprint-2026-06-22` (PR #139) |

## Goal

UX follow-up после #139 + **модель отката** редактирования: deletable global getters, Ctrl+Z (1 step), branch navigation → saved snapshot.

## Phases (recommended order)

| Phase | Task id | Size | Focus |
|-------|---------|------|-------|
| F6 | `db-ui-f6-global-getter-deletable` | S | GetDevice/GetServer deletable; Event stays locked |
| F7 | `db-ui-f7-branch-snapshot-restore` | M | Switch handler while dirty → restore last saved document |
| F3 | `db-ui-f3-undo-ctrl-z` | M | One-step undo via Ctrl+Z / Cmd+Z |
| F1 | `db-ui-f1-context-breadcrumbs` | S | Header breadcrumbs |
| F2 | `db-ui-f2-direct-function-edit` | S | List click → editor без modal |
| F4 | `db-ui-f4-pin-limit-meter` | S | `n/9` pins |
| F5 | `db-ui-f5-runtime-exec-highlight` | S | Exec chain at runtime |

**Prompt:** [`DEVICE_BOARD_UI_FOLLOWUP_SPRINT_PROMPT.md`](../../prompts/DEVICE_BOARD_UI_FOLLOWUP_SPRINT_PROMPT.md)

## Out of scope

- Full undo/redo stack (depth > 1)
- Nested functions, marketplace UserCases
- Core changes without `vesnin` (except future `server-global`)
