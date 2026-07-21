# Линза code review / ship — ассортимент веток

## Meta

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Sprint | `branch-assortment-sprint` Ф4 (#806) · lead **rodchenko** |
| Coverage | [`branch-assortment-coverage-2026-07-21.md`](./branch-assortment-coverage-2026-07-21.md) |
| Agent | [`../AGENT_PROMPT.md`](../AGENT_PROMPT.md) §8 |

## За 30 секунд

1. Жанр PR → таблица coverage (kind / формат / держатель).
2. Есть представитель? Сравни имя ветки с нормой покрытия.
3. Красные флаги имени (документарно, без движка Р4):
   - `feature/*` вместо `feat/`
   - агент-префикс `cursor/` `codex/` `claude/` как «держатель»
   - `night` как будто persona — это freeze-тег
4. Hygiene: open PR = cat.4; не путать leftover/salvage с «нормальной доставкой».

## Провод

- Контейнер: [`docs/audit/git/README.md`](../README.md)
- Процесс: [`docs/CONTRIBUTING.md`](../../CONTRIBUTING.md) → «Гигиена веток»
- Грамматика (канон, не код здесь): заседание procedural-layer Р4
