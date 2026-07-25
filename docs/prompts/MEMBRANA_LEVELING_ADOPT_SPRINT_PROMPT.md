# Промпт эпика: membrana-leveling adopt — кросс-агентский skill

> **L** · `membrana-leveling-adopt` · day-sprint · lead **ozhegov** (skill/rhythm) · craft **vesnin** (wires/evening/deliver)  
> Also open (Focus `tasks-workshop` **не затирать** — ATF4-2).  
> Основание: §8.1–§8.3 уже в `main`; этот спринт = **adopt**, не переписывание disposition/гейта.

## Цель

Сделать процедуру [`docs/procedures/membrana-leveling/`](../procedures/membrana-leveling/)
**исполняемой агентами по триггеру** (не только lib в `scripts/`), с мягким входом в
`ritual:evening` и честным отчётом. Реальный `pr:ship`-поезд — только по слову владельца
из скилла (`--execute` + inject), не авто в цепочке.

## Замок решений (не переоткрывать без слова)

| Решение | Значение |
|---------|----------|
| Вечер | **soft-first**: шаг `leveling-workspace`, `criticality: noncritical` (+ finding); hard-gate PASS = вне скоупа |
| main-fill в ритуале | только **план очереди** + статус в отчёте |
| Канон скилла | `.cursor/skills/membrana-leveling/SKILL.md`; thin mirrors Claude / OpenCode / `.agents` |
| Focus ACTIVE | не затирать — только **Also open** |

## Фазы

| Phase | id | size | lead | DoD |
|-------|-----|------|------|-----|
| **g0** | `ml-adopt-g0` | S | ozhegov | OPEN + этот промпт + registry epic/phases; §8 регламента → «реализовано → adopt» |
| **skill** | `ml-adopt-skill` | M | ozhegov | SKILL + mirrors + строка в `.cursor/skills/README.md` |
| **wires** | `ml-adopt-wires` | M | vesnin | dirty→ctx snapshot + `yarn membrana-leveling:snapshot`; без LLM |
| **evening** | `ml-adopt-evening` | M | vesnin | шаг в `evening-ritual-steps.json` **до** code-review; артефакт отчёта; noncritical |
| **deliver** | `ml-adopt-deliver` | S | vesnin | шов-ссылка в `HANDOFF.md` + отчёт/skill → HANDOFF |
| **rhythm** | `ml-adopt-rhythm` | S | ozhegov | проводка в `membrana-developer-rhythm` |
| **pilot** | `ml-adopt-pilot` | S | vesnin | `--dry` / `--only leveling-workspace`; CLOSURE |

Порядок: `g0 → skill ∥ wires → evening → deliver → rhythm → pilot`.

## Вне скоупа

- Hard-gate PASS leveling = блок всего `ritual:evening`
- Авто-merge ready без слова владельца
- UI приказа утра / badge (M5B UI)
- `segmentHash` пины (#900)
- Пересмотр T1–T13 / disposition order

## Канон (не копировать в скилл)

- Регламент: [`MEMBRANA_LEVELING_REGULATION.md`](./MEMBRANA_LEVELING_REGULATION.md)
- Процедура: [`docs/procedures/membrana-leveling/`](../procedures/membrana-leveling/) (`README` / `DISPOSITION` / `SCRIPTS`)
- CLI уже в main: `yarn membrana-leveling:main-fill` / `:workspace-level`
