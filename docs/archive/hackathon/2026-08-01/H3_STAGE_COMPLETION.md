# H3 stage-completion-checklist — процедуры

**Держатель:** Ozhegov
**Принимает:** Dynin (truth boundary) + Rodchenko (reader path)
**Статус:** accepted

## Changed artifacts

- `workflow/procedures/overview.mdx` — интерфейс процедуры, состояния и семейства;
- `workflow/procedures/choosing.mdx` — матрица выбора с границей built/declared;
- `workflow/procedures/running.mdx` — кадры, гейты, evidence и ревью;
- `workflow/procedures/catalog.mdx` — 24 записи из генератора;
- `apps/docs/docs.json` — группа «Процедуры».

## Verification command / result

```powershell
node scripts/mintlify-workflow-docs.mjs --check
node scripts/verify-mintlify-docs.mjs --root apps/docs --links
```

Результат: workflow без дрейфа; Mintlify static verify OK, 59 страниц и ссылки.

## Truth boundaries

- `declared-not-built` нигде не назван исполнимой дверью;
- marathon описан матрицей, но процедура marathon не построена;
- портфолио формы не названо прожитым run;
- legacy-носитель не выдан за мигрированный контейнер;
- статическая проверка не названа browser render.

## Known gaps

- browser render desktop/mobile выполняется в H4;
- у 17 из 24 процедур нет портфолио, а у части портфолио нет lived evidence;
- читательская матрица не заменяет канонический release из гранул.

## Next-stage input

H4 получает 59-страничный Mintlify-корпус, обе навигационные группы, полный
каталог и явный backlog примеров для marathon-задачи.

## Handoff review v1

**BLOCK.** Инструкция называла несуществующий machine-ID `containerStatus`;
каноническое поле реестра — `buildState`. Литерал исправлен, H3 передан повторно.

## Handoff review v2

**LGTM.** Dynin подтвердил machine-ID и границы интерфейса. Вещдок:
[`reviews/H3_DYNIN_HANDOFF_REVIEW.md`](./reviews/H3_DYNIN_HANDOFF_REVIEW.md).
