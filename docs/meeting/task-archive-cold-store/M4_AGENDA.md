# M4 — Write path and idempotency для `task-archive-cold-store`

**P5 —** Кто и когда пишет канонический cold-record и repo checkpoint при закрытии задачи
после M1/M2/M3, как защищаемся от дублей, частичной записи, повторного запроса и
расхождения локального git SHA с server-side record? Вердикт обязан назвать writer roles,
последовательность write/notarize на уровне процедуры, idempotency key, partial failure
policy, retry semantics, и полный список посылок. **Не решать Q4 recovery/restore
procedure, Q6 migration legacy archive и Q7 insight lifecycle по существу.**

Общее задание — [`BRIEF.md`](BRIEF.md).

## Уже закрыто

M0 порядок:

```text
Q1 -> Q3 -> Q2 -> Q5 -> Q4 -> Q6 -> Q7
```

M1 Source of truth:

- hybrid SoT;
- canonical records: `background-office` MongoDB append-only collection;
- repo: checkpoint/export carrier, не steady-state SoT.

M2 Evidence contract:

- required cold-record: `schemaVersion`, `recordType=task_closure`, `taskId`, `epic_id`,
  `closedAt`, `status=closed`, self-contained `taskSnapshot`, `actor`, `proof`;
- `proof` must satisfy
  `(prRef && commitSha) || (commitSha && reviewRef) || (issueRef terminal && reviewRef)`;
- hints/notes/branch/chat/screenshot/hot-registry/repo JSONL are not proof.

M3 Repo checkpoint:

- artifact: versioned JSON manifest `ColdArchiveCheckpoint`;
- required: checkpoint `schemaVersion`, `archiveHome`, `recordType=task_closure`,
  `recordCount`, `hashAlg=sha256`, `contentHash`, `canonicalization`, `closedAtMin`,
  `closedAtMax`, `checkpointAt`;
- identity: recompute H over canonical records from Mongo SoT and compare count/hash;
- sanity samples are not records/proof/SoT.

M4 corresponds to Q5 from M0: **Write path and idempotency**.

## Границы вопроса

Нужно решить только:

- кто имеет право создавать cold-record и checkpoint update;
- нормальный порядок шагов close → record → checkpoint → repo commit/PR or equivalent;
- idempotency key для archive write;
- что делать при duplicate/retry/partial server success/local repo failure;
- как не допустить расхождения локального git SHA с server-side record;
- какие состояния считаются BLOCK vs retryable.

Не решать здесь:

- restore/recovery procedure after mismatch;
- migration of old markdown/archive/registry;
- insight lifecycle status;
- exact implementation code.

## Входы

- Владелец: cold archive server-side, repo small checkpoint.
- M1/M2/M3 verdicts above.
- Existing task lifecycle: `task:archive` and evening batch must remain evidence-driven,
  not “на память”.
- Git/reporting грабля: repo artifacts must be committed/reviewed; uncommitted local
  files cannot be treated as durable truth.

## Требуемая форма вердикта

Таблица:

| Поле | Решение |
| --- | --- |
| Writers | ... |
| Normal write sequence | ... |
| Idempotency key | ... |
| Partial failure policy | ... |
| Retry semantics | ... |
| Git SHA consistency | ... |
| Forbidden interpretation | ... |
| Boundary deferred to later rooms | ... |

После таблицы — обязательная секция **Список посылок**.
