# @membrana/cabinet

SPA личного кабинета Membrana (`cabinet.membrana.space`).

Эпик: [#67](https://github.com/officefish/Membrana/issues/67) · MP1: login + shell.

## Запуск

```bash
yarn cabinet:db:up
yarn cabinet:migrate
yarn cabinet:seed
yarn cabinet:dev          # API :3020
yarn workspace @membrana/cabinet dev   # UI :5174
```

В dev UI проксирует `/api` → `http://localhost:3020`.

## Демо

| Login | Password |
|-------|----------|
| `demo` | `demo12345` |

## Prod (Docker)

```bash
# build-time API URL baked into SPA image
VITE_CABINET_API_URL=https://cabinet-api.membrana.space
```

См. [`docs/deploy/BACKGROUND_CABINET_DEPLOY.md`](../../docs/deploy/BACKGROUND_CABINET_DEPLOY.md).
