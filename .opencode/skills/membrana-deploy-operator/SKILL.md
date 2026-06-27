---
name: membrana-deploy-operator
description: "Navigator for Membrana production deploys: which yarn script deploys which service (cabinet, device-board, background-office, background-media) plus prod docker build/up and smoke/rollback. Wraps existing package.json scripts only. Use when deploying to prod, building/starting prod docker, running a deploy smoke or rollback, or when the user mentions deploy, prod, docker prod, rollback, or smoke:prod. Do NOT actually execute a deploy on the user's behalf — present the command and let the operator run it. Do NOT use for local dev servers or CI (membrana-full-ci-operator)."
---
# Membrana deploy operator

Канон: [`docs/BACKGROUND_SERVERS.md`](../../../docs/BACKGROUND_SERVERS.md), `deploy/`, `deploy-artifacts/` · скрипты в корневом `package.json`.

**Владелец:** **Математик (Dynin)** — вторично Linux/Docker/деплой.

> **Безопасность:** скилл — **навигатор**. Не запускай prod-деплой/rollback за пользователя — показывай команду, оператор выполняет сам.

## When to use

- Нужно понять, какой скрипт деплоит нужный сервис в prod.
- Prod docker build/up; deploy smoke; rollback.
- Пользователь: «deploy», «prod», «docker prod», «rollback», «smoke:prod».

## When NOT to use

- Локальный dev (`yarn dev`, `*:docker:up`) — не prod.
- CI-прогон → `membrana-full-ci-operator`.
- Env/секреты/ключи → `membrana-env-secrets-guard`.

## Карта деплоя (service → script)

| Сервис | Цель | Команда |
|--------|------|---------|
| **Cabinet** | prod deploy | `yarn cabinet:deploy:prod` |
| Cabinet | image-based prod | `yarn cabinet:deploy:image:prod` |
| Cabinet | rollback | `yarn cabinet:rollback:prod` |
| Cabinet | smoke prod | `yarn cabinet:smoke:prod` |
| Cabinet | milestone deploys | `yarn cabinet:mp3:prod` · `:mp4:prod` · `:mp5:prod` · `:mp6:prod` · `:mp7:prod` · `:tj6:prod` · `:quota-refactor:prod` · `:u10-workspace:prod` |
| **Device-board** | prod | `yarn device-board:deploy:prod` |
| Device-board | to cabinet | `yarn device-board:deploy:cabinet` |
| **Background-office** | prod docker | `yarn office:docker:prod:build` → `yarn office:docker:prod:up` |
| **Background-media** | prod docker | `yarn media:docker:prod:build` → `yarn media:docker:prod:up` |
| Media | cors / catalog | `yarn media:cors:cabinet-prod` · `yarn media:provision-catalog` |

Локальный docker (не prod): `yarn {office,media,cabinet}:docker:{build,up,down,logs}`.

## Operator workflow

1. Определи сервис и цель (deploy / smoke / rollback).
2. Покажи точную команду из карты; для docker — сначала `:build`, затем `:up`.
3. После prod-деплоя — предложи соответствующий `*:smoke:prod`.
4. Env/секреты для prod — через `membrana-env-secrets-guard`; не печатай значения ключей.

## Инвариант

- Только обёртки **существующих** `package.json` скриптов (dangling = 0); новые скрипты — out of scope.
- Реальный запуск prod — действие человека-оператора.
