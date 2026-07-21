# Промпт: F2 — Mintlify pages с примерами

> **M** · `bme-f2-pages` · [#826](https://github.com/officefish/Membrana/issues/826) · lead **rodchenko**

## Промпт целиком

Верстальщик доков: страницы в `apps/docs/` (группа cookbooks / agent-git или
аналог) — инструкции с **конкретными примерами** по каталогу F1. Не дашборд:
один кейс — одна ясная страница или секция. Стиль существующих cookbooks
device-board.

**DoD:** ровно **5** страниц/секций-минимум (kind · формат-теги · persona-grammar ·
open-PR vs salvage · антипримеры `feature/*`/agent-prefix); доп. страницы — по
дырам каталога F1; `yarn docs:lint` зелёный.

## Статус (2026-07-21)

- [x] 5 MDX в `apps/docs/git/cookbooks/`
- [x] группа `Git — branch cases` в `docs.json`
- [x] `yarn docs:lint` → 56 pages OK
- [ ] Archive после ship
