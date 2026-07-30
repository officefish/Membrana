# Итог заседания `task-archive-cold-store`

**Статус:** M0 ратифицирован владельцем; M1-M7 проведены; процедурный audit без
нарушений. Заседание решило архитектурную границу cold archive, но **не** реализовало
runtime, миграцию и L/O инсайта.

## Ратифицированный порядок

```text
Q1 -> Q3 -> Q2 -> Q5 -> Q4 -> Q6 -> Q7
```

## Вердикты

| Комната | Вопрос | Вердикт |
| --- | --- | --- |
| M1 | Source of truth | **Hybrid SoT**: canonical cold records live in `background-office` MongoDB append-only collection; repo is checkpoint/export carrier, not steady-state SoT. |
| M2 | Evidence contract | Cold-record `task_closure` requires schema/version/id/epic/time/status/snapshot/actor/proof; hints, notes, branch names, chat LGTM, screenshots, hot-registry flips and repo JSONL are not proof. |
| M3 | Repo checkpoint | Repo keeps one versioned JSON manifest `ColdArchiveCheckpoint` with count/hash/canonicalization fields; it proves identity by recomputing Mongo records, not by storing records in git. |
| M4 | Write path | `ArchiveNotary` is the sole create/idempotent-put writer; key is `(task_closure, taskId)`; normal order is valid proof -> notarize -> derive checkpoint -> commit/PR carrier. |
| M5 | Recovery and audit | Audit is read-only; steady-state Mongo wins; emergency repo/export authority requires explicit recovery mode plus sufficient full backup dump; checkpoint alone cannot restore records. |
| M6 | Migration path | Legacy markdown archive files are candidates/hints, not proof; import only through Notary; preserve links by stubs/link map; rollback halts without deleting Mongo history. |
| M7 | Insight lifecycle | `insight-task-archive-storage` gets a new decision revision superseding repo-JSONL SoT; status remains **Direction decided / Implementation pending**, not Learned/Operationalized. |

## Follow-up Work From M7

1. `insight-task-archive-storage-revision` — doc-only revision: supersede repo JSONL SoT,
   link M1-M7, keep L/O unproven.
2. `cold-archive-record-schema` — implement M2 schema/evidence contract.
3. `archive-notary-write-path` — implement M4 Notary writer and idempotency.
4. `cold-archive-checkpoint-export` — implement M3 checkpoint manifest/export.
5. `cold-archive-recovery-audit` — implement M5 audit/recovery statuses and drill.
6. `legacy-markdown-notary-import` — implement M6 dry-run/import/stub/link-map path.

## Non-Proof Rule

The meeting, design docs, checkpoint schema, migration plan, and task closure evidence do
not prove Learned/Operationalized for the insight. L/O needs a later review with live
implementation and operational evidence.
