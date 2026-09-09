# Membrana Local Sprint OPEN: tariff-matrix-2333

| Поле | Значение |
|------|----------|
| Sprint | `tariff-matrix-2333` |
| Procedure | `membrana-local-sprint` |
| Registry epic | `tariff-matrix-2333` |
| GitHub Issue | [#2333](https://github.com/officefish/Membrana/issues/2333) |
| Prompt | [`TARIFF_MATRIX_2333_SERVER_ADAPTATION_PROMPT.md`](../../prompts/TARIFF_MATRIX_2333_SERVER_ADAPTATION_PROMPT.md) |
| Cut | [`tariff-matrix-2333.json`](../../sprint/cut/tariff-matrix-2333.json) |
| Lead | vesnin |
| Support | dynin · ozhegov |
| Status | implementation checks pass; awaiting review/PR |

## Зачем

Принятый вердикт M1 комнаты `tariff-single-truth` требует адаптировать сервер к матрице
тарифов: добавить версию контракта на носителях, проекцию сетка -> база кабинета,
зубы сетка<->база и база<->запись прибора, проход разноски по всем мембранам и один
рубильник правды вместо `TARIFF_GRID_MODE`/`tariff-cutover`.

## Фазы

| Фаза | Карточка | Lead | Статус | Выход |
|------|----------|------|--------|-------|
| v1 | `contract-version-carriers` | vesnin | checks pass | version field on cabinet Tariff and media Device; fanout and `/quota` carry it |
| v2 | `grid-to-cabinet-projection` | ozhegov | checks pass | one projection command, tooth 2, seed/scalars no longer author quotas, no `ensureFreeTariff` |
| v3 | `device-tariff-tooth-and-fanout` | dynin | checks pass | tooth 3 by field pairs, not counters; idempotent fanout pass for all membranes |
| v4 | `single-truth-switch` | vesnin | checks pass | mode env removed from packages/scripts; cutover predicates mirror teeth; package scripts wired |

## Проверка 2026-09-08

- `vitest` focused: 10 files, 81 tests passed.
- `node --test` focused: 7 files, 40 tests passed.
- `node scripts/tariff-grid-validate.mjs`: passed, 3 tariffs, 33 cells.
- `node scripts/tariff-cutover-check.mjs`: all 9 carriers and 4 teeth green.
- `node scripts/sprint-experience.mjs --plan ... --traces ... --segments ...`: hit, 4/4 blocks.
- `node scripts/execution-gate.mjs --plan ... --traces ...`: gate pass, 4/4 `honest_pair`, 0 findings.
- `rg TARIFF_GRID_MODE packages scripts`: empty.
- `git diff --check`: clean.
- `yarn turbo run typecheck --filter=@membrana/background-cabinet --filter=@membrana/background-media`: pass, 20/20 tasks successful.

## Ратификация

Нарезка готовится через `node scripts/sprint-cut-check.mjs --plan docs/sprint/cut/tariff-matrix-2333.json`.
До явного слова владельца "ратифицирую" ожидаемый результат — единственная находка
`plan_unratified`. После слова владельца отметку ставит инструмент:

```bash
node scripts/sprint-cut-check.mjs --plan docs/sprint/cut/tariff-matrix-2333.json --ratify --at <ISO-8601-with-offset>
```

## Границы

- Не строим доступную квоту и M2-M5.
- Не строим релиз, форму гранул, `tariff:reseed`, зуб 1 и пересев сетки — это Б/#2331.
- `docs/tariffs/tariff-scalars.json` остаётся замороженной seed-epoch: #2333 фиксирует только
  снятие роли автора квот для кабинета, а содержательные правки S0/follow-up #2331 не смешиваются
  с этим PR.
- Не трогаем прибор-край версии #2323 и носитель эпизода переполнения #2319.
- Правила downgrade/overflow остаются follow-up после M1: #2333 переносит поля сетки и
  версию контракта, но не принимает серверную политику понижений, перерасхода или
  доступной квоты.
- Не вводим второй флаг правды, новый протокол вместо разноски или runtime-реестр `quota-ledger`.
- Живая проверка после выкатки — только по отдельному слову владельца.
