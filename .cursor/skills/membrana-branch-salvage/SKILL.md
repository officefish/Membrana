---
name: membrana-branch-salvage
description: >-
  Execute owner-ratified branch-ref cleanup through the six-frame controlled
  salvage procedure: frozen inventory, reconcile, exact-tip plan, one-ref
  mutation, ADR-0020 post-check, and fail-closed closeout. Use when the user
  asks to execute a branch verdict ledger, safely delete ratified refs, resume
  an interrupted branch cleanup, or close out branch salvage. Do NOT use to
  decide whether work is obsolete, delete worktrees, or run batch cleanup.
---

# Membrana controlled branch salvage

Canonical procedure:
[`docs/audit/git/CONTROLLED_SALVAGE_PROCEDURE.md`](../../../docs/audit/git/CONTROLLED_SALVAGE_PROCEDURE.md).

## Scope

This skill executes decisions already ratified by the owner. It does not infer
semantic overlap, create verdicts, replay code, delete worktrees, or force-push.

## Six frames

1. Freeze: `yarn repo:branches --json --report <snapshot>`.
2. Reconcile: `yarn repo:branches:reconcile --snapshot <snapshot> --report <report>`.
3. Ratify: validate full tips, evidence, protected refs and
   `ownerGate.status=ratified`.
4. Prepare one ref: exact-tip/worktree/protected guards, live-tree snapshot,
   atomic `prepared` journal event.
5. Mutate one ref: `apply-plan` with exactly one `--target` or `--next`.
6. Post-check and closeout: ref absent, protected unchanged, every live tree
   checked, terminal event present.

## Commands

Dry-run is default:

```powershell
yarn repo:branches:apply-plan --plan <plan.json> --journal <journal.json> --target <full-ref>
```

Execute one target:

```powershell
yarn repo:branches:apply-plan --plan <plan.json> --journal <journal.json> --target <full-ref> --execute --report <report.md>
```

Closeout:

```powershell
yarn repo:branches:closeout --plan <plan.json> --journal <journal.json> --report <closeout.md>
```

Use files under `docs/audit/git/cache/` for live snapshots, plans, journals and
reports. They are local evidence and must not be committed. The tracked schema
example is
[`controlled-salvage-plan.example.json`](../../../docs/audit/git/examples/controlled-salvage-plan.example.json).

## Stop conditions

- Plan is not ratified or its hash differs from the journal.
- Any SHA is short, current target tip moved, or a twin moved.
- Target is held by a worktree.
- Protected ref changed.
- A live-tree post-check reports missing/error/new tracked deletion.
- An unresolved `prepared` or failed terminal event remains.

On a crash after delete, rerun the same target. The journal-bound recovery path
performs post-check and records `recovered-deleted`; it does not delete again.

Never loop over targets. Never remove a worktree. Never continue after an
ADR-0020 finding.
