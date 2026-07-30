# Task Archive Cold Store

`TaskArchiveModule` is the office-owned cold archive for closed task cards.

The steady-state source of truth is MongoDB behind `background-office`; repository files are recovery
checkpoints and human-readable exports. Without `TASK_ARCHIVE_MONGO_URI`, the module runs with an
in-memory store for local tests and dev smoke only.

Write path:

1. `POST /v1/task-archive/closures` accepts one `task-closure-record/1`.
2. `TaskArchiveService` validates the proof contract and derives `task_closure:<taskId>`.
3. The store inserts once, returns `existing_equiv` on identical retry, and returns `409` on rewrite.

Recovery path:

1. `GET /v1/task-archive/checkpoint` builds `cold-archive-checkpoint/1`.
2. Repo checkpoints compare `recordCount` and canonical `contentHash`.
3. If Mongo is unavailable, repo checkpoints are evidence for restore, not the canonical archive.
