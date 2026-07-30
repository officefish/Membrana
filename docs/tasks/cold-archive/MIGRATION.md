# Legacy Archive Migration

Legacy records in `docs/tasks/archive/` are evidence, not an automatic import queue.

Migration is owner-gated:

1. Build a reviewed manifest of legacy task ids.
2. Produce one `task-closure-record/1` JSON object per task.
3. Verify the proof bundle for every record.
4. Send records through Archive Notary.
5. Export a cold archive checkpoint.
6. Keep only compact checkpoint/export evidence in the repository.

`scripts/task-archive-migrate-legacy.mjs` is intentionally fail-closed until a reviewed manifest
format is ratified. This prevents a bulk import from laundering stale task-card truth into the
canonical archive.
