# Archive Notary

Archive Notary is the only write path for task closure records.

Endpoint:

```text
POST /v1/task-archive/closures
```

Headers:

```text
X-Membrana-Token: <API_INTERNAL_TOKEN class token>
Content-Type: application/json
```

Behavior:

- validates `task-closure-record/1`
- derives `task_closure:<taskId>` when `idempotencyKey` is absent
- inserts the record once
- returns `existing_equiv` for an identical retry
- returns `409 TASK_ARCHIVE_RECORD_CONFLICT` for a rewrite attempt

Smoke:

```bash
node scripts/task-archive-notary-smoke.mjs --record path/to/task-closure-record.json
```

`OFFICE_API_URL` defaults to `http://localhost:3000`; token comes from `OFFICE_API_TOKEN` or
`API_INTERNAL_TOKEN`.
