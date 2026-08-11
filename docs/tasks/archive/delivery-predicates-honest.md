# Архив: Три предиката контура доставки: ролап против объявленного, момент выбора магистрали, порядок шагов pr-land

| Поле | Значение |
|------|----------|
| **ID** | `delivery-predicates-honest` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-08-07 |
| **Архивирована** | 2026-08-11 |
| **GitHub Issue** | #1764 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/DELIVERY_PREDICATES_HONEST_PROMPT.md`](../../docs/prompts/DELIVERY_PREDICATES_HONEST_PROMPT.md) |

## Заметки при закрытии

Блоки A (rollup-vs-declared) и C (pr-land-order) доставлены PR #1765 (9abf5084): pr:wait сверяет ролап с объявленным в branch-protection-policy.json (род incomplete отдельно от running), pr-land не подрывает свой вердикт (гейт свежести в lib/task-pr-land.mjs). Блок B вынут ратифицированной нарезкой в ADR-0024 (ACCEPTED 07.08) и несётся карточками morning-gates-two-moments / swallow-own-moment. Иссью #1764 закрыть при вечернем task:close-github.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
