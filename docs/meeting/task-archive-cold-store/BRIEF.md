# Заседание task-archive-cold-store — общее задание

> Вход владельца 30.07: холодный архив задач не обязан лежать в репозитории. Вариант:
> `background-office` на `mmbrn.tech` + MongoDB как хранилище архива. В репозитории может
> быть только небольшой hash/checkpoint-слепок, по которому серверный архив можно
> проверить или восстановить.

## Задание

Пересмотреть инсайт `insight-task-archive-storage` после смены предпосылки:

- прежний INSIGHT предлагал `docs/tasks/archive.jsonl` как cold source of truth;
- новая гипотеза: server-side append-only архив в `background-office`/MongoDB, а git
  хранит только проверяемый слепок/ledger;
- нужно не «переименовать JSONL в Mongo», а выбрать границу истины: что является SoT,
  что является нотариальным checkpoint, чем доказывается восстановимость, и при каких
  условиях repo снова становится единственным источником.

## Исходный инсайт

`docs/insights/insight-task-archive-storage/INSIGHT.md`:

- горячий `registry.json` должен остаться лёгким;
- холодный архив нужен для закрытых задач;
- прежняя лестница: `registry.json` -> `archive.jsonl` -> generated index/SQLite -> Postgres;
- Postgres был признан избыточным, потому предполагалась последовательная запись без
  серверного read/write API.

`docs/insights/insight-task-archive-storage/REVIEW.md`:

- средний балл 7.6;
- Teamlead: adopted, реализация — неделя;
- обязательны atomic write и поля `timestamp`/`epic_id`;
- DuckDB поверх JSONL рассматривался как аналитический слой без отдельного сервиса.

## Новая гипотеза

Серверный архив:

- `background-office` на `mmbrn.tech`;
- MongoDB collection с immutable insert/event-семантикой;
- индексы по `taskId`, `archivedAt`, `githubIssue`, `epicId`, `leadPersona`,
  `insightId`, `schemaVersion`;
- запись содержит snapshot карточки, closure evidence, actor/requestId/sourceCommit,
  `prevHash`/`recordHash` или Merkle-compatible checkpoint.

Git-слепок:

- `docs/tasks/archive-ledger.json` или dated manifest;
- `exportedAt`, `fromSeq/toSeq`, `count`, `lastRecordHash`, `merkleRoot`,
  `schemaVersion`, `restoreCommand`, backup/export ref;
- несколько последних ids только как sanity-check, не весь cold archive.

## Ограничения

- Не превращать MongoDB в mutable task table: архив должен быть append-only по смыслу.
- Не выводить delivery/outcome инсайта из факта PR или task archive.
- Не раздувать `docs/tasks/registry.json` и не возвращать туда историю закрытых задач.
- Не класть Claude/Linear/media blobs в этот слой: это office/archive domain, не media.
- Не проектировать весь background-office заново; решить только границу archive storage.

## Что должно выйти из заседания

1. Порядок вопросов M1..Mn.
2. Затем, после ратификации владельцем, отдельные вердикты:
   - SoT: Mongo vs repo JSONL vs гибрид;
   - форма repo checkpoint;
   - evidence/recovery contract;
   - migration path от текущих markdown/archive/registry;
   - task/issue/insight lifecycle integration.
