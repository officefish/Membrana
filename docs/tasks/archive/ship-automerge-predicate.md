# Архив: Предикат автослияния спрашивает галку вместо правил защиты ветки

| Поле | Значение |
|------|----------|
| **ID** | `ship-automerge-predicate` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-07-26 |
| **Архивирована** | 2026-08-11 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/SHIP_AUTOMERGE_PREDICATE_PROMPT.md`](../../docs/prompts/SHIP_AUTOMERGE_PREDICATE_PROMPT.md) |

## Заметки при закрытии

Закрыто PR #1279 (41017c8c): предикат автослияния спрашивает правила защиты base (readRequiredChecks + autoMergeDecision), а не галку allow_auto_merge; ненастроенная защита даёт честный откат на обычный хвост, --merge-only отказывается громко через headSyncProblem вместо мерджа чужого содержания из origin. Кейс «Protected branch rules not configured» зафиксирован в pr-ship.test.mjs.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
