---
name: membrana-tailwind-coverage
description: "Keeps monorepo Tailwind coverage intact: each app (apps/client, apps/cabinet) must scan the src/ of every @membrana UI package it imports, or that package's classes are dropped and its layout collapses. Use when adding a UI package, wiring a new app, editing a tailwind.config, or when a shared component renders unstyled/overlapping in one app but fine in another. Do NOT use for app-local CSS or non-Tailwind styling."
---
# Membrana tailwind coverage

Канон: [`docs/prompts/TAILWIND_COVERAGE_HARDENING_PROMPT.md`](../../../docs/prompts/TAILWIND_COVERAGE_HARDENING_PROMPT.md).

## Проблема

UI-пакеты (`@membrana/device-board`, `agenda`, `journal-report-views`, `audio-data-viz`) —
headless: экспортируют компоненты с Tailwind/daisyUI-классами без своего CSS. Если хост не
сканирует `src/` пакета в `tailwind.config` `content` — классы не генерируются, вёрстка
разъезжается (так был сломан device-board в кабинете).

## Источник правды

Фронтматтер в `README.md` каждого UI-пакета:

```markdown
## Tailwind Integration

<!-- tailwind-content: ["./src/**/*.{ts,tsx}"] -->
```

## Команды

| Задача | Команда |
|--------|---------|
| Проверить покрытие (CI-гейт, в `test:scripts`) | `yarn verify:tailwind-coverage` |
| Дописать недостающие пути | `yarn tailwind:configs:fix` |

## Когда

1. Добавляешь UI-пакет → секция `## Tailwind Integration` в README + `yarn tailwind:configs:fix`.
2. Новое приложение → внеси в `TAILWIND_APPS` (`scripts/lib/tailwind-coverage.mjs`) + fix.
3. Компонент без стилей в одном app → `yarn verify:tailwind-coverage` покажет пропуски.
4. Перед prod-деплоем app с UI → verify зелёный.
