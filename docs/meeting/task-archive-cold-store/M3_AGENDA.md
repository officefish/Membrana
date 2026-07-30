# M3 — Repo checkpoint для `task-archive-cold-store`

**P4 —** Что именно остаётся в репозитории как проверяемый checkpoint/ledger/manifest
для серверного cold archive после закрытых M1 и M2: какие поля обязательны, как маленький
repo-слепок доказывает тождество серверного архива без хранения всего cold archive в git,
и какие элементы являются sanity-check, а не каноном records? Вердикт обязан назвать
форму repo checkpoint, обязательные поля, минимальную проверку тождества, forbidden
interpretation, и полный список посылок. **Не решать Q5 writer/idempotency/API, Q4
recovery/restore, Q6 migration и Q7 insight lifecycle по существу.**

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

M2 закрыл Q3 Evidence contract:

- Required cold-record: `schemaVersion`, `recordType=task_closure`, `taskId`, `epic_id`,
  `closedAt`, `status=closed`, self-contained `taskSnapshot`, `actor`, `proof`.
- `proof` должен удовлетворять `sufficient(proof)`:
  `(prRef && commitSha) || (commitSha && reviewRef) || (issueRef terminal && reviewRef)`.
- `notes`, branch name, chat LGTM, screenshot/call, hot-registry flip и repo JSONL как
  штатный SoT не являются proof.
- Evidence record не доказывает insight L/O.

M3 соответствует Q2 из M0: **Repo checkpoint**.

## Границы вопроса

Нужно решить только:

- файл или форма repo checkpoint/ledger/manifest;
- обязательные поля checkpoint;
- что именно связывает checkpoint с server-side Mongo archive;
- какие ids допустимы как sanity-check, но не как cold archive;
- какие проверки должны быть возможны без вытаскивания всего архива в git;
- что repo checkpoint не имеет права означать.

Не решать здесь:

- кто и когда пишет checkpoint;
- idempotency key writer/API;
- recovery restore/export procedure;
- migration path старых markdown/archive/registry;
- insight lifecycle update.

## Входы

- Владелец: в repo может быть только небольшой hash/checkpoint-слепок.
- M1: repo не steady-state SoT; Mongo office — canonical records.
- M2: cold-record evidence contract уже определён; checkpoint должен проверять архив
  таких records, а не придумывать другой состав записи.
- M0: checkpoint стоит после evidence и до write path/migration.

## Требуемая форма вердикта

Таблица:

| Поле | Решение |
| --- | --- |
| Checkpoint artifact | ... |
| Required fields | ... |
| Identity proof | ... |
| Sanity-check only | ... |
| Forbidden interpretation | ... |
| Boundary deferred to later rooms | ... |

После таблицы — обязательная секция **Список посылок**.
