# Архив: background-office O4: Linear webhook и приёмка прода

| Поле | Значение |
|------|----------|
| **ID** | `background-office-o4-webhook-acceptance` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-06-13 |
| **Архивирована** | 2026-06-13 |
| **GitHub Issue** | #61 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/BACKGROUND_OFFICE_O4_WEBHOOK_ACCEPTANCE_PROMPT.md`](../../docs/prompts/BACKGROUND_OFFICE_O4_WEBHOOK_ACCEPTANCE_PROMPT.md) |

## Отчёт о выполнении

**Что сделано.** O3: Caddy `office.caddy`, LE для `office.membrana.space`. O4: Linear webhook зарегистрирован, секрет из корневого `.env` → VPS (`_sync-office-env-from-root.mjs`), signed webhook → 200, Claude ask → 200. Регламент Linear↔GitHub: `LINEAR_GITHUB_SYNC_REGULATION.md`.

**PRs.** — (сессионная приёмка, PR pending).

**Linear ticket.** Webhook endpoint принимает события; ticket в Linear UI привязать к #61 (R1, неблокирующий).

**Связь со стратегией.** Приём webhook'ов Linear в проде — prerequisite для реактивных сценариев office.

**Реестр.** `background-office-o3-tls-deploy`, `background-office-o4-webhook-acceptance` archived 2026-06-13.

**Известные нюансы / отложено.** PR; `yarn task:close-github` для #61.

## Заметки при закрытии

Linear webhook prod, smoke 5OK, sync-env; PR pending

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
