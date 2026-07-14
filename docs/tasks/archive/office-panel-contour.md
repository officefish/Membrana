# Архив: Epic: office-panel — подготовительный клиент panel.mmbrn.tech (OP1-OP5: scaffold, auth-уровни, welcome/shell, деплой, hardening)

| Поле | Значение |
|------|----------|
| **ID** | `office-panel-contour` |
| **Статус** | archived |
| **Размер** | L |
| **Создана** | 2026-07-14 |
| **Архивирована** | 2026-07-14 |
| **GitHub Issue** | #438 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/OFFICE_PANEL_CONTOUR_PROMPT.md`](../../docs/prompts/OFFICE_PANEL_CONTOUR_PROMPT.md) |

## Заметки при закрытии

Эпик закрыт целиком 2026-07-14: OP1-OP5 смёржены (PR #440-#450, closure LGTM каждой фазы), панель ЖИВАЯ на https://panel.mmbrn.tech (LE после dns-gate [go]); live-подтверждения: ally-вход по invite-коду (201->cookie->ally, operator-ручка 403, no-store), GitHub OAuth owner-вход подтверждён владельцем 14.07 (302->authorize->allowlist->owner). Секреты PANEL_* в office.env; деплой-скрипт scripts/_ssh-panel-deploy.mjs + runbook PANEL_DEPLOY.md. Потребители каркаса: борд detector-compare (#452, в работе) и drift-борд (#396).

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
