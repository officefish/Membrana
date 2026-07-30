# Заседание `task-archive-cold-store` — active state

**Статус:** M7 закрыта; заседание M0-M7 завершено.

## Общее задание

См. [`BRIEF.md`](BRIEF.md): пересмотреть `insight-task-archive-storage` после смены
предпосылки владельца — cold archive может жить в `background-office`/MongoDB, а repo
может хранить только проверяемый hash/checkpoint-слепок.

## Ратифицированный порядок

Владелец ратифицировал M0 после протокола
[`task-archive-cold-store-m0-order-2026-07-30.md`](../../seanses/task-archive-cold-store-m0-order-2026-07-30.md):

| Порядок | Q | Комната | Статус |
| --- | --- | --- | --- |
| 1 | Q1 | Source of truth | closed as M1 |
| 2 | Q3 | Evidence contract | closed as M2 |
| 3 | Q2 | Repo checkpoint | closed as M3 |
| 4 | Q5 | Write path and idempotency | closed as M4 |
| 5 | Q4 | Recovery and audit | closed as M5 |
| 6 | Q6 | Migration path | closed as M6 |
| 7 | Q7 | Insight/task lifecycle integration | closed as M7 |

## Протоколы

| Комната | Повестка | Протокол | Статус |
| --- | --- | --- | --- |
| M0 | [`M0_AGENDA.md`](M0_AGENDA.md) | [`task-archive-cold-store-m0-order-2026-07-30.md`](../../seanses/task-archive-cold-store-m0-order-2026-07-30.md) | ratified |
| M1 | [`M1_AGENDA.md`](M1_AGENDA.md) | [`task-archive-cold-store-m1-source-of-truth-2026-07-30.md`](../../seanses/task-archive-cold-store-m1-source-of-truth-2026-07-30.md) | closed |
| M2 | [`M2_AGENDA.md`](M2_AGENDA.md) | [`task-archive-cold-store-m2-evidence-contract-2026-07-30.md`](../../seanses/task-archive-cold-store-m2-evidence-contract-2026-07-30.md) | closed |
| M3 | [`M3_AGENDA.md`](M3_AGENDA.md) | [`task-archive-cold-store-m3-repo-checkpoint-2026-07-30.md`](../../seanses/task-archive-cold-store-m3-repo-checkpoint-2026-07-30.md) | closed |
| M4 | [`M4_AGENDA.md`](M4_AGENDA.md) | [`task-archive-cold-store-m4-write-path-idempotency-2026-07-30.md`](../../seanses/task-archive-cold-store-m4-write-path-idempotency-2026-07-30.md) | closed |
| M5 | [`M5_AGENDA.md`](M5_AGENDA.md) | [`task-archive-cold-store-m5-recovery-audit-2026-07-30.md`](../../seanses/task-archive-cold-store-m5-recovery-audit-2026-07-30.md) | closed |
| M6 | [`M6_AGENDA.md`](M6_AGENDA.md) | [`task-archive-cold-store-m6-migration-path-2026-07-30.md`](../../seanses/task-archive-cold-store-m6-migration-path-2026-07-30.md) | closed |
| M7 | [`M7_AGENDA.md`](M7_AGENDA.md) | [`task-archive-cold-store-m7-lifecycle-integration-2026-07-30.md`](../../seanses/task-archive-cold-store-m7-lifecycle-integration-2026-07-30.md) | closed |
