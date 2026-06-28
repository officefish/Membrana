---
name: membrana-night-sprint
description: "Opens and closes Membrana Night Build sprints between evening and morning rituals (night:open, night:checkpoint, night:close). Use when user mentions Night Build, night sprint, or autonomous overnight epic work. Do NOT use for daytime M/L with prod-smoke (DEVELOPER_RHYTHM) or hackathon (HACKATHON_REGULATION)."
---
# Membrana Night Build

Канон: [`docs/NIGHT_SPRINT_REGULATION.md`](../../../docs/NIGHT_SPRINT_REGULATION.md).

## Lifecycle

```
yarn ritual:evening → night:open → agent NB0…NBn → night:checkpoint → night:close → morning merge
```

## Commands

```bash
yarn night:open --id <epic-id>
yarn night:checkpoint --phase NB0 --status pass --note "lint green"
yarn night:close --id <epic-id>
```

## Artifacts

| File | Role |
|------|------|
| `docs/NIGHT_BUILD_ACTIVE.md` | open epic |
| `docs/NIGHT_BUILD_LOG.md` | append checkpoints |
| `docs/archive/night-build/<date>/HANDOFF.md` | morning handoff |

## Preconditions

1. Evening ritual done (min. code-review archived).
2. Epic in registry with `sprintKind: "night-build"`.
3. Branch: `night/<epic-id>-<YYYY-MM-DD>` from **`techies68`**.

## Forbidden in Night Build

- Prod deploy/smoke (morning or separate PR).
- `@membrana/core` / `MembranaRegistry` changes without **vesnin** + LGTM.
- New Issue triage mid-night (blockers only).

## Morning after close

Read handoff → `yarn ritual:day` → review/merge PR.
