# @membrana/panel

Операторская витрина office — **panel.mmbrn.tech** (эпик #438, OP1–OP5).
`panel` ≠ `cabinet`: панель — для оператора/владельца/союзников, кабинет — для
пользователей продукта. Консилиум:
[`office-panel-contour-2026-07-14.md`](../../docs/seanses/office-panel-contour-2026-07-14.md).

## Границы (консилиум, не нарушать)

- НЕ импортирует internals `apps/cabinet` и пакетов; максимум `@membrana/core`
  (сейчас — ноль зависимостей `@membrana/*`).
- Данные — только через HTTP `/v1/*` office (дев: vite-proxy; прод: Caddy reverse_proxy).
- Auth (OP2): GitHub OAuth + allowlist (operator/owner), HMAC invite-код (ally),
  httpOnly cookie, default-deny; office остаётся stateless.

## Команды

```bash
yarn workspace @membrana/panel dev        # http://localhost:5175 (proxy /v1 → office :3000)
yarn turbo run lint typecheck test build --filter=@membrana/panel
```

## Фазы

| Фаза | Что | Статус |
|------|-----|--------|
| OP1 | scaffold (этот пакет) | ✅ |
| OP2 | auth-контур (canAccess, OAuth/HMAC) | — |
| OP3 | welcome + shell разделов | — |
| OP4 | деплой panel.mmbrn.tech (Caddy, DNS-гейт → LE) | — |
| OP5 | Q3-hardening публичных API | — |
