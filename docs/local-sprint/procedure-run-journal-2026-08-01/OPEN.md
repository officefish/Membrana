# Membrana Local Sprint OPEN: procedure-run-journal-2026-08-01

| Поле | Значение |
|------|----------|
| Sprint | `procedure-run-journal-2026-08-01` |
| Procedure | `membrana-local-sprint` |
| Registry epic | `procedure-run-journal-2026-08-01` |
| Prompt | [`PROCEDURE_RUN_JOURNAL_SPRINT_PROMPT.md`](../../prompts/PROCEDURE_RUN_JOURNAL_SPRINT_PROMPT.md) |
| Lead | vesnin |
| Support | dynin · ozhegov |
| Status | F1 code pass · review-sprint gate pass |

## Зачем

Хендоф 2026-08-01 поставил первым номером журнал прогона процедур: механизм
должен помнить, какой предмет он обещал покрыть, какие evidence предъявил и где
остались gaps. Без этого вечерние/ревью-процедуры могут быть механически зелёными
и предметно слепыми.

## Фазы

| Фаза | Карточка | Lead | Статус | Выход |
|------|----------|------|--------|-------|
| F1 | `procedure-run-journal-f1-local-trail` | dynin | code pass + reviewed | local JSONL trail + CLI + tests · [`F1_REPORT.md`](./F1_REPORT.md) |
| F2 | _(не заведена)_ | vesnin | planned | wire one real procedure into trail |
| F3 | _(не заведена)_ | dynin | planned | server/checkpoint or replay decision |

## F1 Definition of Done

- `docs/procedure-runs/README.md`
- `scripts/lib/procedure-run-journal.mjs`
- `scripts/procedure-run-journal.mjs`
- `scripts/procedure-run-journal.test.mjs`
- `package.json` script `procedure-run:journal`
- `node --test scripts/procedure-run-journal.test.mjs scripts/run-ledger.test.mjs`

F1 report: [`F1_REPORT.md`](./F1_REPORT.md). Исходный процедурный проход был
blocked: предрабочая нарезка, ратификация владельца и подключение команды не
состоялись. Закрывающий review-sprint прошёл отдельно:
[`procedure-run-journal-2026-08-01-code-review`](../../sprint/cut/procedure-run-journal-2026-08-01-code-review.json)
→ [`sprint:gate trail`](../../sprint/trail/procedure-run-journal-2026-08-01-code-review.jsonl).

## Не делаем в F1

- Не строим проигрыватель процедур.
- Не подписываем серверный checkpoint.
- Не проводим все существующие процедуры.
