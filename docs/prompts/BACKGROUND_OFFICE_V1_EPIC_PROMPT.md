# Промпт (эпик): background-office v1 — продовый деплой

> **Task-промпт для координатора и постановщика** (не для одного PR).
> Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер эпика: **L** (4 последовательных PR).
> Реестр: `id` = `background-office-v1` в [`docs/tasks/registry.json`](../tasks/registry.json).
> Журнал бутстрапа: [`discussions/background-office-v0.1.md`](../discussions/background-office-v0.1.md).

---

## Контекст

Пакет `@membrana/background-office` (v0.1) реализован локально: Claude, Linear, GitHub, Linear webhooks на `:3000`. Секреты в `.env`, сервер **не доступен извне** — Linear не может слать webhook, клиент и CI не могут вызывать `/v1/*` без туннеля.

Домен **`membrana.space`** зарегистрирован; целевой URL — **`https://office.membrana.space`**. На том же VPS (`72.56.27.58`), что и `background-media`, через **Caddy + Let's Encrypt** (как для `media.membrana.space`).

**Не смешивать с media:** office — только интеграции; WAV, PostgreSQL под медиа, trends-шаблоны — в `background-media`. См. [`BACKGROUND_SERVERS.md`](../BACKGROUND_SERVERS.md).

**Подзадачи (строгий порядок):**

| Фаза | Реестр `id` | Промпт | PR |
|------|-------------|--------|-----|
| O1 Docker | `background-office-o1-docker` | [`BACKGROUND_OFFICE_O1_DOCKER_PROMPT.md`](./BACKGROUND_OFFICE_O1_DOCKER_PROMPT.md) | 1 |
| O2 Prod compose | `background-office-o2-prod-compose` | [`BACKGROUND_OFFICE_O2_PROD_COMPOSE_PROMPT.md`](./BACKGROUND_OFFICE_O2_PROD_COMPOSE_PROMPT.md) | 2 |
| O3 TLS + DNS | `background-office-o3-tls-deploy` | [`BACKGROUND_OFFICE_O3_TLS_DEPLOY_PROMPT.md`](./BACKGROUND_OFFICE_O3_TLS_DEPLOY_PROMPT.md) | 3 |
| O4 Webhook | `background-office-o4-webhook-acceptance` | [`BACKGROUND_OFFICE_O4_WEBHOOK_ACCEPTANCE_PROMPT.md`](./BACKGROUND_OFFICE_O4_WEBHOOK_ACCEPTANCE_PROMPT.md) | 4 |

Устаревший монолитный промпт [`SERVER_DEPLOYMENT_PROMPT.md`](./SERVER_DEPLOYMENT_PROMPT.md) — справочник; исполнение — только по фазам O1–O4.

**GitHub Issue:** [#60](https://github.com/officefish/Membrana/issues/60) (эпик); приёмка HTTPS/webhook — [#61](https://github.com/officefish/Membrana/issues/61).

---

## Definition of Done (эпик целиком)

- [ ] Все четыре подзадачи в реестре `archived` с отчётами в Issue.
- [ ] `https://office.membrana.space/health` → 200 извне.
- [ ] Linear webhook `https://office.membrana.space/webhooks/linear` — тестовый event → 200, подпись валидна.
- [ ] Секреты (`ANTHROPIC_API_KEY`, `LINEAR_*`, `API_INTERNAL_TOKEN`) только на VPS (`/etc/membrana/office.env`), не в git.
- [ ] `background-media` не содержит модулей Claude/Linear/webhooks.

---

## Out of scope (эпик)

- GitHub webhooks (v0.2).
- PaaS (Fly/Render) — выбран **VPS + Docker + Caddy** (как media).
- Staging / preview deploys.
- CI auto-deploy из `main` (follow-up).
- Multi-region, monitoring (Sentry/Uptime).

---

## Заметки для постановщика

1. Закрывать подзадачи по одной: `yarn task:archive background-office-o1-docker` и т.д.
2. Эпик `background-office-v1` архивировать после O4.
3. Секреты Anthropic/Linear в `/etc/membrana/office.env` вносит **человек**, не агент.
