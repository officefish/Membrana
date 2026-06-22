# CURRENT_TASK — device-board pause runtime

> **Active epic:** `device-board-pause-runtime-v07`  
> **Prompt:** [`docs/prompts/DEVICE_BOARD_PAUSE_RUNTIME_EPIC_PROMPT.md`](./prompts/DEVICE_BOARD_PAUSE_RUNTIME_EPIC_PROMPT.md)  
> **GitHub Issue:** [#142](https://github.com/officefish/Membrana/issues/142)  
> **First phase:** `dbp-0-runtime-pause-core` (DBP0)

## Goal

**Pause/Resume** scenario runtime — freeze exec без `onStop`. Отдельно от `loopTickPauseMs` и от **Stop**.

## Phases

| Phase | id | Status |
|-------|-----|--------|
| DBP0 | `dbp-0-runtime-pause-core` | **next** |
| DBP1 | `dbp-1-ui-toolbar` | pending |
| DBP2 | `dbp-2-pause-runtime-node` | pending |
| DBP3 | `dbp-3-docs-scenario-runtime` | pending |
| DBP4 | `dbp-4-teamlead-closure` | pending |

## Verify (after DBP0)

```bash
yarn workspace @membrana/device-board test
```

## Closed context

- `db-doc-v04-mvp` — PR #140 merged
- Code review v0.2 — commit `b04f9fe`
