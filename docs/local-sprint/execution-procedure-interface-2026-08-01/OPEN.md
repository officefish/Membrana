# Membrana Local Sprint OPEN: execution-procedure-interface-2026-08-01

| Поле | Значение |
|------|----------|
| Sprint | `execution-procedure-interface-2026-08-01` |
| Procedure | `membrana-local-sprint` |
| Prompt | `origin/main:docs/prompts/EXECUTION_PROCEDURE_INTERFACE_2026_08_01_PROMPT.md` |
| Branch | `codex/execution-procedure-interface` |
| Base | stacked on `origin/codex/hackathon-procedure` / PR #1607 |
| Lead | vesnin |
| Support | ozhegov · dynin · angelina |
| Status | execution done · review repair in progress |

## Зачем

В стволе появился task-prompt для `EXECUTION_PROCEDURE`: вывести интерфейс
маршрутов разработки не из одного хакатона, а проверкой опровержением на всех
прожитых маршрутах. Главная граница: обязательным становится только поле,
которое заполняется для всех семи прожитых маршрутов; марафон исключён как
непрожитый.

Выход спринта: одна редакция `EXECUTION_PROCEDURE`, отдельный отчёт о выводе,
зуб `validateProcedure` только для процедур рода `разработка`, род у всех
записей реестра с машинной раскладкой `разработка 7 / решение 4 / ритм 12`, и
контейнер процедуры `adr`.

## Обзор до нарезки

- `origin/main` уже содержит prompt и ADR-0021 (`ACCEPTED`, 2026-08-01), но
  PR #1607 с `docs/procedures/hackathon/` ещё открыт.
- Рабочая ветка поэтому stacked поверх `origin/codex/hackathon-procedure`: так
  `hackathon` доступен как один из пяти манифестных образцов, а новый PR может
  ревьюиться отдельно от предыдущего.
- Материал с манифестами: `one-shot`, `membrana-local-sprint`, `hackathon`,
  `containerization`, `day-sprint`.
- Безманифестный материал для проверки: `docs/cowork-sprint/`,
  `docs/COMPETITION_SPRINT_REGULATION.md` + `docs/competition-sprint/`,
  `membrana-night-sprint` + `night:open` / `night:close`.
- Запреты prompt: не строить `marathon`, не заводить манифесты `cowork`,
  `competition`, `night-sprint`, не проектировать интерфейс решения, не
  переопределять форму 21.07.

## Cut

Канонический план: [`docs/sprint/cut/execution-procedure-interface-2026-08-01.json`](../../sprint/cut/execution-procedure-interface-2026-08-01.json).

## Gates

1. Owner ratification of cut.
2. `node scripts/sprint-cut-check.mjs --plan docs/sprint/cut/execution-procedure-interface-2026-08-01.json`.
3. Execution evidence per block, including explicit contradiction samples.
4. `validateProcedure` tests for development kind vs decision/rhythm non-application.
5. `procedure-run:journal` record with evidence and gaps.
6. Profile review by assigned responsible personas before PR is marked ready.

## Review Evidence

| Block | Persona | Evidence |
|-------|---------|----------|
| `execution-interface-derivation` | ozhegov | [`reviews/ozhegov-interface-derivation-review.md`](./reviews/ozhegov-interface-derivation-review.md) |
| `procedure-kind-registry-adr` | vesnin | [`reviews/vesnin-registry-adr-review.md`](./reviews/vesnin-registry-adr-review.md) |
| `validate-procedure-execution-tooth` | dynin | [`reviews/dynin-validation-evidence-review-v1.md`](./reviews/dynin-validation-evidence-review-v1.md) · [`reviews/dynin-validation-evidence-review-v2.md`](./reviews/dynin-validation-evidence-review-v2.md) |
| `execution-interface-gate-journal-review` | angelina | [`reviews/angelina-gate-journal-review.md`](./reviews/angelina-gate-journal-review.md) |

## Current Findings

- Dynin v1 BLOCK found evidence gaps, not code gaps: stale status, missing
  sprint trail, missing procedure-run journal entry. This repair addresses them
  before `sprint:gate`.
- The prompt's `7/4/12` count does not match this stacked corpus after PR #1607:
  the implemented registry check uses `8/4/12` and the derivation report names
  the contradiction explicitly.
- Dynin v2 LGTM removed the evidence BLOCK after OPEN, trail and journal repair.
