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

- [x] **Второй Mintlify project** создан владельцем (`membrana-harness`, отдельно от product).
- [x] GitHub App / deploy path указывает на корень **`apps/docs-harness`** (не `apps/docs`).
- [x] Тариф позволяет второй project + custom domain (свериться в billing).
- [x] Доступ к дашборду Mintlify и DNS-зоне `mmbrn.tech`.

## Шаг 1 — Mintlify dashboard (harness project)

1. Settings → **Custom Domain**.
2. Добавить `harness.mmbrn.tech` (или выбранный rename → `ops.mmbrn.tech`).
3. Записать **CNAME** и **TXT** из дашборда (значения могут отличаться от примеров).

## Шаг 2 — DNS в зоне `mmbrn.tech`

- [x] `CNAME  harness  →  cname.mintlify.builders`.
- [x] `TXT  _acme-challenge.harness  →  <значение из дашборда>` (в Timeweb: хост
      «Ввести вручную»; значение копировать целиком — `1`/`l` и `0`/`O` путаются).
- [x] `TXT  _cf-custom-hostname.harness  →  <значение>`.

**Не трогать** `docs.mmbrn.tech`, `office.mmbrn.tech`, корень `mmbrn.tech`.
Не привязывать `harness` к App Platform / office — только DNS CNAME на Mintlify.

## Шаг 3 — Верификация (owner)

- [x] DNS propagation + Retry validation в дашборде.
- [x] `https://harness.mmbrn.tech/tooling/containers` отдаёт атлас по HTTPS (2026-07-24).
- [x] Fallback: `https://membrana-harness.mintlify.app/tooling/containers`.

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

Panel URL (`ToolingAtlasBoard` → harness) — фаза **W3** (`dmd-w3-surface`).
