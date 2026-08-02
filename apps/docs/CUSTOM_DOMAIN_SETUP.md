# Публикация Product docs на custom-домене (product.mmbrn.tech)

Чек-лист подключения mintlify-сайта `@membrana/docs` (Device Board, узлы, тарифы) к `product.mmbrn.tech`.
Родом из инсайта [`insight-docs-custom-domain`](../../docs/insights/insight-docs-custom-domain/INSIGHT.md).

Harness (tooling / bestiary / llm-calls / git) — **отдельный** Mintlify-проект:
[`apps/docs-harness/CUSTOM_DOMAIN_SETUP.md`](../docs-harness/CUSTOM_DOMAIN_SETUP.md) →
цель **`harness.mmbrn.tech`**. Атлас `tooling/containers` живёт там, **не** на product.

## Предусловия (проверить до начала)

- [ ] **Тариф Mintlify** — доступен ли custom domain на текущем плане. Источники расходятся
  (free vs платный ~$250–300/мес); свериться на странице billing/pricing аккаунта.
  Если недоступен — развилка: платить или жить на служебном `*.mintlify.app`.
- [ ] **GitHub App Mintlify** подключён к репозиторию; deploy path / root =
  **`apps/docs`** (product only).
- [ ] Доступ у владельца: и к **дашборду Mintlify**, и к **DNS-зоне `mmbrn.tech`**.

## Шаг 1 — Mintlify dashboard

1. Settings → **Custom Domain** (или Domain Setup).
2. Добавить `product.mmbrn.tech`.
3. Дашборд покажет **целевой CNAME** (обычно вида `cname.mintlify-dns.com`) и **TXT-записи
   верификации** (обычно `_acme-challenge.product...` и `_cf-custom-hostname.product...`).
   **Записать точные значения из дашборда** — они могут отличаться от примеров.

## Шаг 2 — DNS в зоне `mmbrn.tech`

Добавить **ровно то, что показал дашборд**:

- [ ] `CNAME  product  →  <цель из дашборда>` (напр. `cname.mintlify-dns.com`).
- [ ] `TXT  _acme-challenge.product  →  <значение из дашборда>` (SSL/ACME).
- [ ] `TXT  _cf-custom-hostname.product  →  <значение>` (если дашборд просит).

**Не трогать** существующие записи `office.mmbrn.tech`, `harness.mmbrn.tech` и
корень `mmbrn.tech`.

## Шаг 3 — Верификация

- [ ] Дождаться DNS-propagation (5 мин – 24 ч, зависит от провайдера).
- [ ] В дашборде — **Retry validation**; дождаться авто-выпуска TLS (Mintlify сам).
- [ ] Открыть `https://product.mmbrn.tech` — Product docs по HTTPS.
- [ ] Убедиться, что `/tooling/containers` **не** ожидается на product (это harness).
- [ ] Проверить, что нет «полу-подключено» (домен резолвит, но проект не привязан → 404/чужой
  сертификат): статус в дашборде должен быть «connected/verified».

## Граница публичности

- Mintlify product публикует **только `apps/docs/`**: страницы `docs.json` резолвятся внутри
  `apps/docs`, ни одной ссылки на `docs/catalog/` или внутренние `docs/`, симлинков нет.
  **Агент-truth (`docs/catalog/`, `docs/procedures`, `docs/audit`, …) наружу НЕ идёт.**
- Harness digest (имена контейнеров) публикуется из `apps/docs-harness` — см. harness setup.

## После подключения

- Обновить `apps/docs/README.md` и `docs/DOCUMENTATION_WORKFLOW.md` ссылкой на публичный URL.
- Атлас туллинга: `https://harness.mmbrn.tech/tooling/containers` (harness live; panel W3).
