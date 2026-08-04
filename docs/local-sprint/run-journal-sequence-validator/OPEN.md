# Membrana Local Sprint OPEN: run-journal-sequence-validator

| Поле | Значение |
|------|----------|
| Sprint | `run-journal-sequence-validator` |
| Procedure | `membrana-local-sprint` |
| Registry card | `run-journal-sequence-validator` (#1683) |
| Plan | [`docs/sprint/cut/run-journal-sequence-validator.json`](../../sprint/cut/run-journal-sequence-validator.json) (v2, ратифицирован 04.08 12:33Z) |
| Prompt | [`RUN_JOURNAL_SEQUENCE_VALIDATOR_PROMPT.md`](../../prompts/RUN_JOURNAL_SEQUENCE_VALIDATOR_PROMPT.md) |
| Cutter | tarasov ([конспект](../../discussions/cut-run-journal-node-tarasov.md)) |
| Blocks | b1-sequence-validator (dynin) |
| Status | gate pass (1/1 honest_pair, 0 находок) · журнал: close pass производителем |

## Зачем

Маршрут выбран владельцем 04.08 после честного отказа предиката S шоту
(`capability_chaining`, прецедент
[`2026-08-04-oneshot-1683-refusal-chain.md`](../../precedents/drafts/2026-08-04-oneshot-1683-refusal-chain.md)).
Долг P1 ревью 03.08 (PR #1682): библиотека валидировала запись, но не ленту —
повтор `sequence` внутри runId не ловился ничем.

## Итог блока

`validateProcedureRunTrail(records)` в
[`scripts/lib/procedure-run-journal.mjs`](../../../scripts/lib/procedure-run-journal.mjs):
append-порядок, соседние пары одного runId, находка `sequence_duplicate` /
`sequence_regression` с адресами обеих строк; лента не переписывается. Врезка в
`procedure-run:journal check` — находка даёт exit 1. Зубы 25/25. Стартовал после
мерджа спринта A (общий файл журнала) — на свежем контракте с `orphanedBy`.

## Шероховатости (симптомы — в close-записи гейта)

1. Вещдок-дубль `1,1,2` из ревью #1682 в стволе НЕ воспроизводится — лента 03.08
   чиста (видимо, выправлен до мерджа); класс покрыт синтетикой в зубах.
2. Конспект Дынина предлагал третий тест-файл вне зоны плана — отклонено
   координатором, зубы легли в существующий файл зоны.
