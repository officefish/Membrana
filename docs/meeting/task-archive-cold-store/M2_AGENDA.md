# M2 — Evidence contract для `task-archive-cold-store`

**P3 —** Какие closure evidence обязаны попасть в канонический cold-record закрытой
задачи при SoT-модели M1 (**hybrid: `background-office`/MongoDB — канон records, git —
checkpoint/export carrier**): task snapshot, PR, SHA, review artifact, issue state,
actor/requestId/sourceCommit, schemaVersion и другие обязательные поля; что считается
недопустимым hint вместо доказательства? Вердикт обязан назвать минимальный контракт
evidence для архивной записи, отделить обязательные поля от derived/optional полей,
назвать forbidden hints, и перечислить полный список посылок. **Не решать Q2 checkpoint
shape/hash fields, Q5 writer/idempotency/API, Q4 recovery procedure, Q6 migration и Q7
insight lifecycle по существу.**

Общее задание — [`BRIEF.md`](BRIEF.md).

## Уже ратифицировано / закрыто

M0 установил и владелец ратифицировал порядок:

```text
Q1 -> Q3 -> Q2 -> Q5 -> Q4 -> Q6 -> Q7
```

M1 закрыл Q1 Source of truth:

- SoT model: **hybrid**.
- Canonical home: `background-office` MongoDB append-only collection.
- Repo: checkpoint/export carrier, не steady-state SoT.
- Forbidden: cold archive как mutable task table, repo JSONL как штатный SoT,
  `background-media` как home, silent dual-write как два SoT.

M2 соответствует Q3 из M0: **Evidence contract**.

## Границы вопроса

Нужно решить только:

- минимальный состав канонического cold-record закрытой задачи;
- какие evidence являются обязательными для истины закрытия;
- какие поля optional или derived;
- какие hints запрещены как недостаточное доказательство;
- как evidence contract сохраняет связь task/PR/SHA/review/issue без вывода L/O инсайта.

Не решать здесь:

- форму repo checkpoint, Merkle/root hash, sequence range;
- конкретный API writer и idempotency key;
- recovery/export/restore command;
- migration map старых markdown/archive/registry;
- правила обновления `insight-task-archive-storage`.

## Входы

- M1 verdict: hybrid SoT; office MongoDB — канон records; repo — checkpoint/export carrier.
- Владелец: cold archive может жить вне git, repo хранит небольшой проверяемый слепок.
- `docs/insights/insight-task-archive-storage/REVIEW.md`: обязательны atomic write,
  `timestamp`, `epic_id`; прежний server API считался избыточным.
- Текущий task lifecycle требует закрывать карточки доказательно: registry/archive,
  PR/SHA/review/issue state должны не превращаться в “на память”.

## Требуемая форма вердикта

Таблица:

| Поле | Решение |
| --- | --- |
| Required evidence | ... |
| Optional/derived evidence | ... |
| Forbidden hints | ... |
| Evidence not proving insight L/O | ... |
| Boundary deferred to later rooms | ... |

После таблицы — обязательная секция **Список посылок**.
