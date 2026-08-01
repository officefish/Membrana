# Membrana Local Sprint OPEN: hackathon-procedure-2026-08-01

| Поле | Значение |
|------|----------|
| Sprint | `hackathon-procedure-2026-08-01` |
| Procedure | `membrana-local-sprint` |
| Prompt | [`HACKATHON_PROCEDURE_2026_08_01_PROMPT.md`](../../prompts/HACKATHON_PROCEDURE_2026_08_01_PROMPT.md) |
| Branch | `codex/hackathon-procedure` |
| Lead | vesnin |
| Support | ozhegov · dynin |
| Status | sprint:gate pass · team review LGTM |

## Зачем

PR #1601 доставил задание для сессии матрицы: сделать `hackathon` первым
маршрутом разработки, построенным уже после `DEVELOPMENT_MATRIX`, но не
изобретать общий интерфейс `EXECUTION_PROCEDURE` раньше заседания.

Выход спринта: процедура `docs/procedures/hackathon`, запись в
`docs/procedures/registry.json`, маршрутный скилл с зеркалами, разрешение
расхождения "четыре передачи" против "3-5 дней", отдельный отчёт о форме и
журнал прогона.

## Обзор до нарезки

- `docs/HACKATHON_REGULATION.md` уже существует как v0.1 регламент 2026-06-17:
  3-5 дней, ручные активные файлы, `hackathon:open` не реализован.
- `docs/procedures/registry.json` содержит 22 процедуры; `hackathon` отсутствует.
- `docs/containers/strategic-docs/releases/development-matrix/README.md`
  определяет `hackathon` как строгую эстафету четырёх стадий со
  `stage-completion-checklist`.
- Единственный прожитый хакатон в `docs/tasks/registry.json`:
  `device-board-hackathon-1`, H0 interview, H1a/H1b/H1c, H2a-H2d, H3a-H3c,
  H4 alarm close.
- Устаревший пункт prompt про `membrana-honest-sprint` уже разрешён стволом:
  после #1598 живой маршрут и скилл — `membrana-local-sprint`; в этой работе
  это нужно назвать как исторический разъезд, не наследовать.

## Cut

Канонический план: [`docs/sprint/cut/hackathon-procedure-2026-08-01.json`](../../sprint/cut/hackathon-procedure-2026-08-01.json).

## Gates

1. Owner ratification of cut.
2. `node scripts/sprint-cut-check.mjs --plan docs/sprint/cut/hackathon-procedure-2026-08-01.json`.
3. Execution evidence per block.
4. Procedure audit and registry generation.
5. `procedure-run:journal` record with evidence and gaps.

## Review Evidence

| Block | Persona | Evidence |
|-------|---------|----------|
| `hackathon-procedure-container` | vesnin | [`reviews/vesnin-procedure-container-review.md`](./reviews/vesnin-procedure-container-review.md) |
| `hackathon-route-skill` | vesnin | [`reviews/vesnin-procedure-container-review.md`](./reviews/vesnin-procedure-container-review.md) |
| `hackathon-lineage-form-report` | ozhegov | [`reviews/ozhegov-lineage-form-review.md`](./reviews/ozhegov-lineage-form-review.md) |
| `hackathon-validation-journal` | dynin | [`reviews/dynin-validation-journal-review-v1.md`](./reviews/dynin-validation-journal-review-v1.md) · [`reviews/dynin-validation-journal-review-v2.md`](./reviews/dynin-validation-journal-review-v2.md) |
