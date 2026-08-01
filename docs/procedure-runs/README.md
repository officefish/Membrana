# procedure-runs — журнал прогонов процедур

Дом локального следа исполнения процедур. `docs/procedures/` хранит определения,
а здесь лежат инстансы: что запускали, какой предмет обещали покрыть, какие
evidence и gaps оставил прогон.

## Trail

`trail/<YYYY-MM-DD>.jsonl` — append-only JSONL. Одна строка = один record
`procedure-run-journal@1`.

Минимальные поля:

- `procedureId`, `runId`, `sequence`, `at`
- `status`: `pass`, `fail`, `blocked`, `skipped`
- `subject`: предмет, который прогон обещал покрыть
- `coverage.evidence[]`: named artifacts/facts
- `coverage.gaps[]`: named gaps, если предмет не покрыт полностью
- `ledger.leafHash`: `run-ledger` leaf hash записи

`pass` без evidence запрещён: журнал должен доказывать покрытие предмета, а не
только факт запуска механизма.

## CLI

```bash
node scripts/procedure-run-journal.mjs append --procedure ritual-evening --run-id ritual-evening-2026-08-01 --status blocked --subject "delivery frame" --gap "bridge digest missing"
node scripts/procedure-run-journal.mjs check --trail docs/procedure-runs/trail/2026-08-01.jsonl
node scripts/procedure-run-journal.mjs report --trail docs/procedure-runs/trail/2026-08-01.jsonl
```

## Честный предел

Локальный журнал не исполняет процедуру и не подписывает серверный чекпойнт. Он
даёт предъявимый след. Защита истории остаётся в `scripts/lib/run-ledger/`, а
автоматический проигрыватель процедур — следующий слой.
