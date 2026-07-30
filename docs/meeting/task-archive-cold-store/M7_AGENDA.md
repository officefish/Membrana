# M7 — Insight/task lifecycle integration для `task-archive-cold-store`

**P8 —** Как обновить `insight-task-archive-storage` и task lifecycle после вердиктов
M1–M6: что становится новой ревизией/решением инсайта, что является task work, какие
последующие задачи нужно завести, и почему сам факт нового cold archive / migration
planning не доказывает Learned/Operationalized (L/O) по инсайту? Вердикт обязан назвать
insight update policy, task work boundary, required follow-up tasks, L/O non-proof rule,
review/ratification path, и полный список посылок.

Общее задание — [`BRIEF.md`](BRIEF.md).

## Уже закрыто

M0 порядок:

```text
Q1 -> Q3 -> Q2 -> Q5 -> Q4 -> Q6 -> Q7
```

M1: hybrid SoT; records live in `background-office` Mongo; repo is checkpoint/export carrier.

M2: cold-record evidence contract; evidence record proves task closure, not insight L/O.

M3: `ColdArchiveCheckpoint`; repo manifest proves identity by count/hash, not SoT records.

M4: write path; ArchiveNotary is sole writer; key `(task_closure, taskId)`; partial policy.

M5: recovery/audit; steady-state Mongo wins; emergency only explicit with sufficient backup.

M6: migration path; legacy markdown is candidate/hint, not proof; import only through Notary;
stubs/link map preserve links; no git history rewrite.

M7 corresponds to Q7 from M0: **Insight/task lifecycle integration**.

## Границы вопроса

Нужно решить только:

- как записать новую ревизию/решение для `insight-task-archive-storage`;
- что из M1–M6 становится canonical decision, а что remains task work backlog;
- какие follow-up task cards/implementation slices естественно завести;
- почему cold archive design/protocol/migration plan не доказывает L/O insight;
- кто/что должно review/ratify before implementation tasks are considered done.

Не решать здесь:

- actual implementation code;
- migration execution;
- closing the insight as L/O without implementation evidence.

## Входы

- `docs/insights/insight-task-archive-storage/INSIGHT.md` previously suggested repo JSONL
  as cold SoT.
- Owner changed premise: cold archive can live server-side; repo should keep only small
  hash/checkpoint snapshot.
- M1–M6 verdicts above.
- M2 explicitly: archive evidence does not prove insight L/O.

## Требуемая форма вердикта

Таблица:

| Поле | Решение |
| --- | --- |
| Insight update policy | ... |
| Task work boundary | ... |
| Follow-up tasks | ... |
| L/O non-proof rule | ... |
| Review / ratification path | ... |
| Forbidden interpretation | ... |

После таблицы — обязательная секция **Список посылок**.
