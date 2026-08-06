# Membrana Local Sprint OPEN: sprint-dictionary-to-lib

| Поле | Значение |
|------|----------|
| Sprint | `sprint-dictionary-to-lib` |
| Procedure | `membrana-local-sprint` |
| Registry card | `sprint-dictionary-to-lib` (#1681) |
| Plan | [`docs/sprint/cut/sprint-dictionary-to-lib.json`](../../sprint/cut/sprint-dictionary-to-lib.json) (v2, ратифицирован 04.08 12:33Z) |
| Prompt | [`SPRINT_DICTIONARY_TO_LIB_PROMPT.md`](../../prompts/SPRINT_DICTIONARY_TO_LIB_PROMPT.md) |
| Cutter | tarasov ([конспект](../../discussions/cut-run-journal-node-tarasov.md)) |
| Blocks | a1-dictionary-move (ozhegov) · a2-orphaned-by (vesnin) |
| Status | gate pass (2/2 honest_pair, 0 находок) |

## Зачем

Маршрут выбран владельцем 04.08 («делаем их тогда спринтами») после честного отказа
предиката S шоту — `capability_chaining` в семье `scripts/lib` (прецедент
[`2026-08-04-oneshot-1681-refusal-chain.md`](../../precedents/drafts/2026-08-04-oneshot-1681-refusal-chain.md)).
Долг класса acts-trail-reader (#1638): словарь прогона спринта жил в
`sprint-cut-check.mjs`, `execution-gate.mjs` тянул его скрипт-к-скрипту; кросс-файловое
ленивое закрытие несло ссылку строкой в evidence.

## Итог блоков

- **a1** — словарь (`SPRINT_PROCEDURE_ID`, `sprintTrailRelPath`, `ensureSprintRunOpen`)
  переехал в [`scripts/lib/sprint-cut/sprint-run.mjs`](../../../scripts/lib/sprint-cut/sprint-run.mjs);
  оба потребителя импортируют из lib; реэкспорты в `sprint-cut-check.mjs` — живые ссылки
  для существующих зубов. 88/88 зубов трёх семей.
- **a2** — `closeProcedureRun` проносит структурный `orphanedBy`; кросс-файловая сирота
  несёт `{runId, sequence, trail}` с фактическим номером open-записи (open теперь до
  кросс-закрытий); строка в evidence — человекочитаемый дубль. 33/33 зубов.

## Шероховатости (симптомы — в close-запись гейта; здесь список)

1. Второй прогон резчика уплыл из материала — дорезка транскрибирована из первого прогона.
2. Ратификация B при живом open A осиротила прогон A в журнале — ложный `fail` до старта;
   дефект заведён Issue #1705, close этого спринта в журнале невозможен («уже закрыт»).
3. Окна v1 назначены позже фактического старта работ — перерезка v2 (только окна),
   новая ратификация владельца.
