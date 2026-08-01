# F1 report: local procedure run trail

| Поле | Значение |
|------|----------|
| Sprint | `procedure-run-journal-2026-08-01` |
| Procedure | `membrana-local-sprint` |
| Phase | `procedure-run-journal-f1-local-trail` |
| Lead | dynin |
| Status | code pass · review-sprint gate pass |

## Что закрыто как кодовый F1 DoD

- `docs/procedure-runs/README.md` описывает локальный JSONL-home и честное ограничение F1.
- `scripts/lib/procedure-run-journal.mjs` строит, валидирует, читает и суммирует записи.
- `scripts/procedure-run-journal.mjs` даёт CLI `append` / `check` / `report`.
- `package.json` содержит `procedure-run:journal`.
- `scripts/procedure-run-journal.test.mjs` покрывает pass/evidence, gaps, append/read и report.

## Что НЕ прошло как `membrana-local-sprint`

- Не было предрабочей нарезки плана через `sprint:cut`.
- Не было явной ратификации владельца до работы.
- Команда не была подключена как реальные профильные контексты по фреймам.
- `sprint:gate` не проверял четыре рода следа `contract_signature` / `session_prep` /
  `context_run` / `review_pass`.

Вердикт: F1 code DoD выполнен, но процедура `membrana-local-sprint` для этого
задания **не прошла все фреймы**. Называть её pass нельзя до отдельного честного
прогона с планом, ратификацией и следом команды.

## Отдельный честный review-sprint

После procedural BLOCK был открыт отдельный review-sprint:
[`procedure-run-journal-2026-08-01-code-review`](../../sprint/cut/procedure-run-journal-2026-08-01-code-review.json).
Его план несёт `mode: "explicit-honest"`: это не молчаливая вторая дверь, а
отдельный честный review-sprint с объявленным coverage-gap по ещё не построенным
`contract_signature` / `session_prep` носителям.

- План v1 ратифицирован владельцем, затем Веснин поставил `BLOCK`: в его зоне не
  было engine-файлов из `MANIFEST.json`.
- План v2 добавил engine-файлы Веснину, снял overlap и был заново ратифицирован.
  Веснин дал `LGTM`.
- Дынин v2 поставил `BLOCK` по `summarizeProcedureRunTrail()`: функция не
  валидировала входной контракт.
- План v3 зафиксировал исправление, был заново ратифицирован, Дынин дал `LGTM`.
- Ожегов повторно проверил registry/terminology под v3 и дал `LGTM`.
- `sprint:gate` по
  [`procedure-run-journal-2026-08-01-code-review.jsonl`](../../sprint/trail/procedure-run-journal-2026-08-01-code-review.jsonl)
  прошёл: 3/3 `honest_pair`, 6 вещдоков, находок 0.

## Проверки

- `node --test scripts/procedure-run-journal.test.mjs scripts/run-ledger.test.mjs` — 15/15 pass.
- `node scripts/procedure-run-journal.mjs check --trail docs/procedure-runs/trail/2026-08-01.jsonl` — ok, 7 records.
- `node scripts/procedure-run-journal.mjs report --trail docs/procedure-runs/trail/2026-08-01.jsonl` — total 7, pass 5, blocked 2; gaps name missing planning, ratification, team contexts and sprint gate.
- `node scripts/test-scripts-run.mjs --group tasks` — 555/555 pass.
- `node --test scripts/procedure-run-journal.test.mjs` — 6/6 pass after Дынин BLOCK fix.
- `node scripts/sprint-cut-check.mjs --plan docs/sprint/cut/procedure-run-journal-2026-08-01-code-review.json` — contract.
- `node scripts/execution-gate.mjs --plan docs/sprint/cut/procedure-run-journal-2026-08-01-code-review.json --traces docs/sprint/trail/procedure-run-journal-2026-08-01-code-review.jsonl` — exit 0.

## Честный предел

`membrana-local-sprint` был нормализован после первоначального старта F1, поэтому
исходный F1 не выдаётся за предрабочую ратификацию нарезки. Закрывающий review-sprint
прошёл процедуру отдельно и честно: план → ратификация → команда → исправление BLOCK
→ повторная ратификация → review-pass → `sprint:gate`.
