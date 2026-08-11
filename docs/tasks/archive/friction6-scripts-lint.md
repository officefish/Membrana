# Архив: scripts/*.mjs вне линтера: дать парсер ESM и назвать шум числом

| Поле | Значение |
|------|----------|
| **ID** | `friction6-scripts-lint` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-07-26 |
| **Архивирована** | 2026-08-11 |
| **GitHub Issue** | #1264 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/FRICTION6_SCRIPTS_LINT_PROMPT.md`](../../docs/prompts/FRICTION6_SCRIPTS_LINT_PROMPT.md) |

## Заметки при закрытии

PR #1848 (squash 54e394c8 в main), review LGTM; 1105 файлов под парсером, 133 находки названы (63 unused-vars/55 useless-escape/6 irregular-ws/5 regex-spaces/2 constant-condition/2 control-regex), порог warn+храповик --max-warnings=133 (число живёт ТОЛЬКО в package.json lint:scripts, в ci.yml — проза), гашение долга — продолжение #1264

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
