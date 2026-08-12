# Архив: agent-tooling-friction-3: 5 фиксов трения сессии + мета-документы (инвентарь тулинга протух)

| Поле | Значение |
|------|----------|
| **ID** | `agent-tooling-friction-3` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-07-16 |
| **Архивирована** | 2026-08-11 |
| **GitHub Issue** | #554 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/AGENT_TOOLING_FRICTION_3_PROMPT.md`](../../docs/prompts/AGENT_TOOLING_FRICTION_3_PROMPT.md) |

## Заметки при закрытии

Все семь позиций доставлены: TF-2..TF-6 — PR #555 (748e81a0), TF-1 и TF-7 — PR #556 (a672384e). Инвентарь переведён на генерацию из источника (scripts/tooling-overview.mjs, yarn tooling:overview; позже --report→SCRIPTS_LIST в PR #812), archive-task получил --dry-run и отказ на неизвестный флаг, раздел рукописных граблей закреплён в AGENTS.md. Иссью #554 закрыть при task:close-github.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
