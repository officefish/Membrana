# Task: Кабинет — фикс вёрстки device-board (tailwind content) + prod deploy

**Task id:** `cabinet-device-board-tailwind-fix`
**Lead:** Rodchenko (вёрстка) · **Support:** Ozhegov (структура), Vesnin (review/deploy)
**Связано:** `db3h-s2-cabinet-host` (device-board-three-hosts), демо server-first
**Дата:** 2026-07-02

## Проблема

При проверке трёх хостов device-board перед демо (`apps/client`, Electron Studio,
кабинет на сервере) на `cabinet.membrana.space` обнаружена сломанная вёрстка device-board:

1. Подписи портов узлов накладываются друг на друга (каша вида «& mideviphone»).
2. MiniMap React Flow рендерится серым боксом (стандартный светлый фон вместо тёмного).

В `apps/client` тот же борд рендерится корректно.

## Корневая причина

`apps/cabinet/tailwind.config.js` в `content` не сканировал `packages/device-board/src`
и `packages/core/src`. Кабинет рендерит борд через `@membrana/device-board`
(`DeviceBoardShell`), но Tailwind-утилиты его узлов (`flex`, `min-w-0`, `gap-1`,
`truncate`, `shrink-0`) и important-классы мини-карты (`!bg-base-100`,
`!border-base-300`, используются только в `board-flow-canvas.tsx`) не попадали в CSS
кабинета → раскладка схлопывалась. Клиент работает, потому что его tailwind сканирует
эти пакеты.

## Scope (In)

- Добавить `../../packages/device-board/src/**/*.{ts,tsx}` и `../../packages/core/src/**/*.{ts,tsx}`
  в `content` `apps/cabinet/tailwind.config.js`.
- Проверить, что пересобранный CSS кабинета содержит утилиты узлов и мини-карты.
- Prod deploy на `cabinet.membrana.space` в контексте closure-review.

## Out of scope

- Electron-хост (чёрный экран при входе в доску на сервере) — отдельная отладка.
- Изменения логики device-board / `@membrana/core` / контрактов.
- Server-first взаимодействие (edit-lease / capture) — работает (сквозной путь борд→сценарий→журнал подтверждён).

## DoD

- [ ] `content`-глобы добавлены; `yarn workspace @membrana/cabinet build` зелёный.
- [ ] Утилиты узлов (`truncate`, `shrink-0`, `min-w-0`) и мини-карты (`!bg-base-100`) присутствуют в собранном CSS.
- [ ] Closure-review LGTM на exact SHA.
- [ ] Задеплоено на прод; `yarn cabinet:smoke:prod` зелёный; визуально борд в кабинете корректен.
