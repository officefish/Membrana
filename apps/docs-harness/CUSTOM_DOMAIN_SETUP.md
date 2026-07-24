# Публикация harness docs на custom-домене (harness.mmbrn.tech)

Чек-лист подключения **второго** Mintlify-проекта (`@membrana/docs-harness`) к
`harness.mmbrn.tech`. Product-сайт (`docs.mmbrn.tech`) — отдельно:
[`apps/docs/CUSTOM_DOMAIN_SETUP.md`](../docs/CUSTOM_DOMAIN_SETUP.md).

Спринт: [`dual-mintlify-docs`](../../docs/day-sprint/dual-mintlify-docs-2026-07-24/OPEN.md).
W0 lock: subdomain **`harness.mmbrn.tech`** (владелец может переименовать в `ops.mmbrn.tech`).

> **W2 / agent boundary:** этот файл — **owner checklist**. Успех дашборда Mintlify /
> DNS **не** блокирует archive фазы `dmd-w2-wires`. Фактический DNS и создание
> второго Mintlify project — шаги владельца (закрытие эпика — W4).

## Предусловия

- [ ] **Второй Mintlify project** создан владельцем (отдельно от product `membrana`).
- [ ] GitHub App / deploy path указывает на корень **`apps/docs-harness`** (не `apps/docs`).
- [ ] Тариф позволяет второй project + custom domain (свериться в billing).
- [ ] Доступ к дашборду Mintlify и DNS-зоне `mmbrn.tech`.

## Шаг 1 — Mintlify dashboard (harness project)

1. Settings → **Custom Domain**.
2. Добавить `harness.mmbrn.tech` (или выбранный rename → `ops.mmbrn.tech`).
3. Записать **CNAME** и **TXT** из дашборда (значения могут отличаться от примеров).

## Шаг 2 — DNS в зоне `mmbrn.tech`

- [ ] `CNAME  harness  →  <цель из дашборда>` (напр. `cname.mintlify-dns.com`).
- [ ] `TXT  _acme-challenge.harness  →  <значение из дашборда>`.
- [ ] `TXT  _cf-custom-hostname.harness  →  <значение>` (если просят).

**Не трогать** `docs.mmbrn.tech`, `office.mmbrn.tech`, корень `mmbrn.tech`.

## Шаг 3 — Верификация (owner)

- [ ] DNS propagation + Retry validation в дашборде.
- [ ] `https://harness.mmbrn.tech/tooling/containers` отдаёт атлас по HTTPS.
- [ ] Fallback `*.mintlify.app` harness-проекта работает, пока custom domain не готов.

## Граница публичности

- Mintlify harness публикует **только `apps/docs-harness/`**.
- Agent-truth (`docs/catalog/`, `docs/procedures`, raw audit) **не** публикуется.
- Страница `tooling/containers` — агрегированный digest имён контейнеров (как на
  старом product-fork); первая строка README контейнера должна быть публично-безопасной.

## Deploy notes (репо)

| Команда | Назначение |
|---------|------------|
| `yarn docs-harness:dev` | preview `:3334` |
| `yarn docs-harness:build` / `lint` | CI-safe verify одного корня |
| `yarn docs:verify:all` | оба `docs.json` (product + harness) |
| `yarn tooling:atlas --render` | пишет `apps/docs-harness/tooling/containers.mdx` |

Panel URL (`ToolingAtlasBoard` → harness) — фаза **W3**, не этот чеклист.
