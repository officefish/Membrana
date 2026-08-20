# Архив: Санитария 20.08 через спринт: 6 вердиктов oversized-PR, e2e-smoke подъёма media/office в CI (#2009), гейт secret-parser-built

| Поле | Значение |
|------|----------|
| **ID** | `sanitation-2026-08-20` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-08-20 |
| **Архивирована** | 2026-08-20 |
| **GitHub Issue** | #2009 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/SESSION_G_SANITATION_SPRINT_2026-08-20.md`](../../docs/prompts/SESSION_G_SANITATION_SPRINT_2026-08-20.md) |

## Заметки при закрытии

Спринт 20.08 через membrana-local-sprint (нарезка 9 блоков ратифицирована владельцем 11:18Z). Ревью-долг: шесть отдельных прогонов code-review:pr — #1980/#1981/#1987/#2003/#2004/#2013 (HEAD-847 = 054e371a), 6/6 LGTM, P0 нет, находки → Issue #2020 (PR #2023, #2028). #2009: смоук подъёма графа DI для media и office + шаг App DI smoke в unit-tests.yml (судит dist — esbuild не эмитит design:paramtypes; compile() без БД; класс 19.08 воспроизведён намеренной поломкой), правило @Optional в ARCHITECTURE.md §1d (PR #2030, шаг отработал в CI). Веха secret-parser-built: критерии 1–2 закрыты (резак --redact поверх общего ядра, датированный проход на фикстуре, манифест rotation-manifest-2026-08-20.md, зубы 7/7), критерий 3 эскалирован владельцу с ценой — Issue #2022 (PR #2032). Гейт 9/9 honest_pair, прогноз↔исход hit.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
