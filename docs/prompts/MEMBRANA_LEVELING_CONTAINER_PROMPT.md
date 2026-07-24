# Промпт: `membrana-leveling` §8.1 — контейнер процедурного слоя

> **СТАТУС: ЗАРЕГИСТРИРОВАНО, НЕ В РАБОТЕ.** Не начинать без явного слова владельца.
> Реестр: `id = membrana-leveling-container` в [`docs/tasks/registry.json`](../tasks/registry.json). Размер: **M**. Lead: **ozhegov**.
> Основание: [`MEMBRANA_LEVELING_REGULATION.md`](./MEMBRANA_LEVELING_REGULATION.md) v1.0 (ратифицирован 24.07), § 8.1.

---

## Контекст

Регламент `membrana-leveling` ратифицирован (заседание M0–M4). Процедура определена, но **не
заселена** в процедурный слой. Задача — завести контейнер `docs/procedures/membrana-leveling/`
по канону [`docs/procedures/`](../procedures/README.md) (подвид `manifest-only` паттерна
`GROUP_CONTAINERIZATION`): `README.md` (определение + держатель) + `MANIFEST.json`
(`id`, `leadPersona`, `engines[]`, `precedents[]`, **`frames[]`**). Кода в контейнере нет.

**Вход:** регламент §5 (фрейм-раскладка) — шесть фреймов уже определены вердиктом M4:

| Фрейм | Тег | Holder | Полоса |
|-------|-----|--------|--------|
| `leveling-wires` | служебный·провода | vesnin | preflight |
| `leveling-gate` | сюжетный | vesnin | preflight |
| `leveling-main-fill` | сюжетный | vesnin | frames |
| `leveling-workspace` | сюжетный | ozhegov | frames |
| `leveling-scratch` | служебный·времянки | dynin | frames |
| `leveling-deliver` | служебный·доставка | vesnin | post |

## Что построить

- `docs/procedures/membrana-leveling/README.md` — определение процедуры + держатель, ссылка на регламент.
- `docs/procedures/membrana-leveling/MANIFEST.json` — по схеме слоя; `frames[]` = шесть фреймов выше
  (`{id, holder, tag}` + полоса), `engines[]`/`precedents[]` — ссылки наружу (движки — плоский `scripts/`).
- Строка в реестре процедур ([`docs/procedures/registry.json`](../procedures/registry.json)), проекция `yarn procedures:registry`.

## Definition of Done

- [ ] `validateProcedure('docs/procedures/membrana-leveling')` зелёный (`resolvable ∧ readmeNonEmpty ∧ manifestSchemaOk`).
- [ ] Шесть `frames[]` совпадают с §5 регламента (id/holder/tag/полоса), тег «сюжетный»/«служебный» проставлен.
- [ ] Кода/тестов в контейнере нет (подвид `manifest-only`).
- [ ] LGTM держателя (ozhegov) + Teamlead.

## Out of scope

- Реализация `disposition` — карточка `membrana-leveling-disposition`.
- Скрипты `main-fill`/`workspace-level` — карточка `membrana-leveling-scripts`.
- Пин отрезков фреймов (`segmentHash`) — эпик `procedure-frames` (#900).
