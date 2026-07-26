# Архив: Ship перестаёт врать и проигрывать гонку: pr-wait бэкофф, pr-land на Windows, --auto, гард занятой base

| Поле | Значение |
|------|----------|
| **ID** | `friction6-ship-determinism` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-07-26 |
| **Архивирована** | 2026-07-26 |
| **GitHub Issue** | #1261 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/FRICTION6_SHIP_DETERMINISM_PROMPT.md`](../../docs/prompts/FRICTION6_SHIP_DETERMINISM_PROMPT.md) |

## Заметки при закрытии

PR #1269 (squash bb20e567), Closes #1261. Четыре дефекта: classifyGhFailure+бэкофф в pr:wait (сеть≠нет-PR), node-вход вместо шима yarn в task:pr-land (ENOENT→EINVAL→node), pr:ship --auto с опросом allow_auto_merge и откатом, guard base-free перечитывается в момент исполнения. Тесты 74. Настройка allow_auto_merge включена по слову владельца.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
