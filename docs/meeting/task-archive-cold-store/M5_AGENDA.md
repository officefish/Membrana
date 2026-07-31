# M5 — Recovery and audit для `task-archive-cold-store`

**P6 —** Как проверять, восстанавливать и разбирать расхождения cold archive после
закрытых M1/M2/M3/M4: какие проверки делают `ColdArchiveCheckpoint` и Mongo SoT
сходящимися, какой export/backup достаточно иметь, что делать при hash mismatch,
missing checkpoint, повреждённом/недоступном office, и какие recovery действия
разрешены без переписывания append-only истории? Вердикт обязан назвать audit checks,
restore/export requirements, mismatch triage, emergency repo SoT boundary, forbidden
healing, и полный список посылок. **Не решать Q6 migration legacy archive и Q7 insight
lifecycle по существу.**

Общее задание — [`BRIEF.md`](BRIEF.md).

## Уже закрыто

M0 порядок:

```text
Q1 -> Q3 -> Q2 -> Q5 -> Q4 -> Q6 -> Q7
```

M1 Source of truth:

- hybrid SoT;
- canonical records: `background-office` MongoDB append-only collection;
- repo: checkpoint/export carrier, не steady-state SoT;
- repo emergency SoT возможен только при явно объявленном recovery.

M2 Evidence contract:

- cold-record `task_closure` содержит required fields и `proof`;
- hints/notes/branch/chat/screenshot/hot-registry/repo JSONL are not proof;
- archive evidence не доказывает insight L/O.

M3 Repo checkpoint:

- artifact: `ColdArchiveCheckpoint`;
- identity: recompute H over canonical records from Mongo SoT and compare
  `recordCount + contentHash`;
- sanity samples are not records/proof/SoT.

M4 Write path:

- writers: ArchiveNotary, CheckpointExporter, RepoAgent/Human, Close initiator;
- normal sequence: valid proof → notarize → derive checkpoint from Mongo → repo commit/PR;
- idempotency key: `(recordType=task_closure, taskId)`;
- partial: Mongo ok + repo fail leaves Mongo canonical; retry export/commit, no delete.

M5 corresponds to Q4 from M0: **Recovery and audit**.

## Границы вопроса

Нужно решить только:

- какие audit checks доказывают, что repo checkpoint соответствует Mongo SoT;
- что является достаточным export/backup material для восстановления;
- что делать при mismatch count/hash/canonicalization;
- где проходит emergency boundary, когда repo/export может временно стать источником;
- какие healing actions запрещены, потому что переписывают append-only историю;
- какие статусы audit/recovery должны быть reportable.

Не решать здесь:

- migration map legacy markdown/archive/registry;
- insight lifecycle status;
- exact implementation code / CLI flags.

## Входы

- Владелец: repo содержит небольшой проверяемый слепок, не весь архив.
- M1/M2/M3/M4 verdicts above.
- M4 partial failure: hash mismatch is not license to write cold archive to repo or delete
  Mongo records.
- Git artifacts are durable only after commit/review; local dirty export is not recovery.

## Требуемая форма вердикта

Таблица:

| Поле | Решение |
| --- | --- |
| Audit checks | ... |
| Export / backup requirements | ... |
| Mismatch triage | ... |
| Emergency repo SoT boundary | ... |
| Forbidden healing | ... |
| Reportable statuses | ... |
| Boundary deferred to later rooms | ... |

После таблицы — обязательная секция **Список посылок**.
