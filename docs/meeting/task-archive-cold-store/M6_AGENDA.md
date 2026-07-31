# M6 — Migration path для `task-archive-cold-store`

**P7 —** Как перейти от текущих `docs/tasks/archive/*.md`, `docs/tasks/registry.json` и
README/derived витрин к server-side cold archive после M1–M5 без переписывания истории,
потери ссылок и подмены legacy hints на proof? Вердикт обязан назвать migration scope,
legacy material classification, import/write strategy, link preservation, rollback/stop
conditions, derived repo cleanup policy, и полный список посылок. **Не решать Q7 insight
lifecycle по существу.**

Общее задание — [`BRIEF.md`](BRIEF.md).

## Уже закрыто

M0 порядок:

```text
Q1 -> Q3 -> Q2 -> Q5 -> Q4 -> Q6 -> Q7
```

M1: hybrid SoT; records live in `background-office` Mongo; repo is checkpoint/export carrier.

M2: cold-record evidence contract; hints/notes/branch/chat/screenshot/hot-registry/repo
JSONL are not proof; archive evidence does not prove insight L/O.

M3: `ColdArchiveCheckpoint`; identity = recompute count/hash over Mongo canonical records;
sanity samples are not records/proof/SoT.

M4: write path; ArchiveNotary is sole create/idempotent-put writer; key
`(recordType=task_closure, taskId)`; partial repo lag does not roll back Mongo.

M5: recovery/audit; Mongo wins steady-state; full backup dump + identity manifest needed
for restore; checkpoint alone cannot restore records; forbidden healing rejects rewrite/delete
history.

M6 corresponds to Q6 from M0: **Migration path**.

## Границы вопроса

Нужно решить только:

- какие legacy материалы мигрируются как canonical cold-record candidates;
- какие legacy материалы остаются derived/read-only references;
- как импортировать старые archives through Notary/evidence rules, а не напрямую в Mongo;
- как сохранить ссылки на old markdown paths/GitHub Issues/PRs;
- какие случаи must stop вместо auto-import;
- что делать с repo archive markdown after migration: keep, redirect, regenerate, or freeze.

Не решать здесь:

- insight lifecycle status/update;
- exact implementation code / CLI flags;
- final archive of the insight itself.

## Входы

- Current legacy surfaces: `docs/tasks/archive/*.md`, `docs/tasks/registry.json`,
  README/index derived views.
- Owner premise: cold archive should not itself live in repo; repo may keep small
  hash/checkpoint snapshot.
- M1–M5 verdicts above.
- Existing closure bookkeeping problem: old cards and handoff truth can be stale; migration
  must not treat a stale card as proof without evidence.

## Требуемая форма вердикта

Таблица:

| Поле | Решение |
| --- | --- |
| Migration scope | ... |
| Legacy material classification | ... |
| Import/write strategy | ... |
| Link preservation | ... |
| Rollback / stop conditions | ... |
| Derived repo cleanup policy | ... |
| Boundary deferred to later rooms | ... |

После таблицы — обязательная секция **Список посылок**.
