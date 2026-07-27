# Архив: Гард незавершённого слияния перед пушем: тихий отказ хука не выдаёт себя за успех

| Поле | Значение |
|------|----------|
| **ID** | `ship-merge-state-guard` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-07-26 |
| **Архивирована** | 2026-07-27 |
| **GitHub Issue** | #1321 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/SHIP_MERGE_STATE_GUARD_PROMPT.md`](../../docs/prompts/SHIP_MERGE_STATE_GUARD_PROMPT.md) |

## Заметки при закрытии

PR #1327 (в main e833ba70, автослияние сервером): гард MERGE_HEAD в pr:ship до отправки И посадки, путь через git rev-parse --git-path (worktree-aware); красный доказан живым висящим слиянием (стоп exit 1 с текстом ремонта), после merge --abort флоу проходит; issue #1321 закрыт

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
