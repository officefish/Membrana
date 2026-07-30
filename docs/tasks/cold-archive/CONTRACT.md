# Task Archive Cold Store Contract

The task cold archive stores closed task cards outside the repository.

## Source Of Truth

Canonical records live in `background-office` MongoDB. The repository may carry checkpoints,
exports, docs, and task cards, but those files are not the steady-state archive.

Local development may run without `TASK_ARCHIVE_MONGO_URI`; in that case `background-office`
uses an in-memory store and must not be treated as durable.

## Closure Record

Each closure is one `task-closure-record/1` object:

- `recordType`: `task_closure`
- `taskId`: registry task id
- `epic_id`: owning epic/container id
- `status`: `closed`
- `closedAt`: ISO datetime
- `actor`: writer identity
- `idempotencyKey`: `task_closure:<taskId>`; optional on input, derived by Notary
- `taskSnapshot`: self-contained card snapshot
- `proof`: evidence bundle

The proof is sufficient only when it contains one of:

- `prRef` + full 40-character `commitSha`
- full 40-character `commitSha` + `reviewRef`
- terminal `issueRef` + terminal `issueState` + `reviewRef`

Terminal issue states are `closed`, `completed`, and `done`.

## Hash

Records are canonicalized with sorted-key JSON (`json-stable-stringify/v1`) and hashed with
SHA-256. Equivalent retries return the same stored record; different payload for the same task
closure is a conflict, not an overwrite.
