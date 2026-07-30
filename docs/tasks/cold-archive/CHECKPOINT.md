# Cold Archive Checkpoint

A checkpoint is a repo-portable recovery snapshot, not the archive source of truth.

Endpoint:

```text
GET /v1/task-archive/checkpoint
```

Schema: `cold-archive-checkpoint/1`.

Fields:

- `archiveHome`: `background-office/mongodb`
- `recordType`: `task_closure`
- `recordCount`: number of notarized closure records
- `hashAlg`: `sha256`
- `canonicalization`: `json-stable-stringify/v1`
- `contentHash`: SHA-256 of the ordered stored records
- `closedAtMin` / `closedAtMax`: covered closure window

Export:

```bash
node scripts/task-archive-checkpoint.mjs --out docs/tasks/cold-archive/checkpoints/latest.json
```

Audit:

```bash
node scripts/task-archive-audit.mjs --checkpoint docs/tasks/cold-archive/checkpoints/latest.json
```

Audit verdicts distinguish missing checkpoint, count mismatch, hash mismatch, and convergence.
