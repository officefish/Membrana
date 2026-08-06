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
- `ledger.leafHash`: `run-ledger.leafHash@1` leaf hash записи

`pass` без evidence запрещён: журнал должен доказывать покрытие предмета, а не
только факт запуска механизма.

`run-ledger.leafHash@1` — не заглушка. Носитель алгоритма:
[`scripts/lib/run-ledger/canonical.mjs`](../../scripts/lib/run-ledger/canonical.mjs),
экспорт через [`scripts/lib/run-ledger/index.mjs`](../../scripts/lib/run-ledger/index.mjs).
Журнал пересчитывает hash в
[`scripts/lib/procedure-run-journal.mjs`](../../scripts/lib/procedure-run-journal.mjs);
контракт покрыт [`scripts/run-ledger.test.mjs`](../../scripts/run-ledger.test.mjs).

## CLI

```bash
node scripts/procedure-run-journal.mjs append --procedure ritual-evening --run-id ritual-evening-2026-08-01 --status blocked --subject "delivery frame" --gap "bridge digest missing"
node scripts/procedure-run-journal.mjs check --trail docs/procedure-runs/trail/2026-08-01.jsonl
node scripts/procedure-run-journal.mjs report --trail docs/procedure-runs/trail/2026-08-01.jsonl
```

## Ленивое закрытие и его ОБЛАСТЬ (обязательна, умолчания нет)

Обрыв прогона ловится не в момент обрыва — журнал не ясновидящий, — а следующим
открытием: `openProcedureRun` перед новой записью закрывает незакрытые прогоны как
сирот (`fail`, gap `orphaned`, ссылка `orphanedBy` на вытеснившую запись).

**Круг сирот называет вызывающий** — параметр `lazyCloseScope`, у него нет умолчания:

| Область | Что закрывает | Кто объявляет |
|---------|---------------|---------------|
| `procedure` | любые незакрытые прогоны ЭТОЙ процедуры | ритуалы и разовые процедуры, где живой прогон один по построению (`procedure-run-record.mjs`) |
| `run` | только сирот с ТЕМ ЖЕ `runId` | спринты и всё, где несколько прогонов живут разом законно (`sprint-run.mjs`) |

Вызов без области **бросает на месте**: область — часть контракта, а не поле метаданных;
мягкий отказ («записать с пометкой») сделал бы журнал советующим, и следующий читатель
гадал бы, полна ли запись.

**Почему так (вещдок 04.08, [#1705](https://github.com/officefish/Membrana/issues/1705)):**
до разделения областей ратификация второго спринта закрывала open первого как сироту —
в журнале появлялся `fail` у спринта, который ещё не начинался. «Незакрытый прогон той же
процедуры» и «мой оборванный прогон» — разные вещи, и слиты они были молча.

Не описан намеренно: межпроцедурная область (закрыть сирот нескольких связанных процедур
одним актом). Пока такого случая в зубах нет; когда появится — честнее явный
`across: [...]`, чем расширение `run` (разбор держателя 06.08).

## Честный предел

Локальный журнал не исполняет процедуру и не подписывает серверный чекпойнт. Он
даёт предъявимый след. Защита истории остаётся в `scripts/lib/run-ledger/`, а
автоматический проигрыватель процедур — следующий слой.
