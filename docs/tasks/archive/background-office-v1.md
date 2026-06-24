# Архив: background-office v1: продовый деплой (эпик)

| Поле | Значение |
|------|----------|
| **ID** | `background-office-v1` |
| **Статус** | archived |
| **Размер** | L |
| **Создана** | 2026-06-13 |
| **Архивирована** | 2026-06-13 |
| **GitHub Issue** | #60 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/BACKGROUND_OFFICE_V1_EPIC_PROMPT.md`](../../docs/prompts/BACKGROUND_OFFICE_V1_EPIC_PROMPT.md) |

## Отчёт о выполнении

**Что сделано.** Эпик O1–O4: Docker-образ `background-office`, prod compose на VPS `72.56.27.58`, TLS `https://office.membrana.space`, Linear webhook `POST /webhooks/linear`, smoke 5 OK. Документация: `docs/deploy/BACKGROUND_OFFICE_DEPLOY.md`, README Production deployment, `_sync-office-env-from-root.mjs`, SSH helpers.

**PRs.** Код в workspace; PR в `main` — по запросу (исключение TASK_CLOSURE_REGULATION §4).

**Linear ticket.** Webhook создан в Linear UI; R1/R3 (привязка ticket ↔ #60) — по [`LINEAR_GITHUB_SYNC_REGULATION.md`](../../docs/prompts/LINEAR_GITHUB_SYNC_REGULATION.md) (неблокирующий).

**Связь со стратегией.** Операционная зрелость `background-office` v0.1 — публичный HTTPS-шлюз интеграций (этап 5 журнала).

**Реестр.** O1–O4 + epic archived 2026-06-13.

**Известные нюансы / отложено.** PR merge; `yarn task:close-github` для #60; `linearId` в registry при triage.

## Заметки при закрытии

Epic O1-O4: https://office.membrana.space prod; PR pending

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
