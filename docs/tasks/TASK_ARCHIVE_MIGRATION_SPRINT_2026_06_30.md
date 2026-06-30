# Task archive migration sprint — 2026-06-30

## Context

The earlier `task-registry-hotfix-archive-refactor-2026-06-30` sprint introduced
`docs/tasks/archive.jsonl`, but did not finish the full two-tier storage goal:
`docs/tasks/registry.json` still contained legacy closed rows.

This sprint completes the storage split:

- `docs/tasks/registry.json` — hot registry for open/deferred work only.
- `docs/tasks/archive.jsonl` — cold append-only history for closed work.
- `docs/tasks/backups/registry-20260630.json` — exact pre-migration backup.
- `docs/tasks/migrations/task-archive-migration-2026-06-30.json` — manifest with ids and checksums.

## Phase result

| Phase | Result |
| --- | --- |
| R0 preflight | Created backup + manifest on a clean tree. |
| R1 migration | Moved 355 legacy `archived` / `closed` / `completed` rows to `archive.jsonl`. |
| R2 idempotency / rollback | Added manifest-driven migrate and rollback commands; covered by unit tests. |
| R3 strict gate | `yarn tasks:audit:verify --strict` passes with zero legacy closed rows. |
| R4 CLI compatibility | Task commands read hot registry + cold archive through shared helpers. |
| R5 ritual smoke | `yarn main-day-issue --dry-run --no-rag` passes after migration. |
| R6 docs | Storage contract and this sprint brief document the new invariant. |

## Final counts

```text
registry.json: 162 rows
  active: 155
  deferred: 7

archive.jsonl: 356 rows
legacy closed rows in registry: 0
```

## Commands

```bash
yarn tasks:migrate-archive:preflight
yarn tasks:migrate-archive:preflight --write
yarn tasks:migrate-archive
yarn tasks:migrate-archive:rollback
yarn tasks:audit:verify --strict
```

## Verification

```text
yarn tasks:audit:verify --strict
node --test scripts/task-registry.test.mjs
yarn test:scripts
yarn main-day-issue --dry-run --no-rag
git diff --check
```

## Rollback note

Rollback is manifest-driven and should only be run on a clean tree:

```bash
yarn tasks:migrate-archive:rollback
```

The manifest preserves source ids, source statuses and checksums. Archive records
created from legacy `closed` / `completed` rows keep `originalStatus` for historical
traceability.
