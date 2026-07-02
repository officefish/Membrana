---
name: membrana-tailwind-coverage
description: >-
  Keeps monorepo Tailwind coverage intact: each app (apps/client, apps/cabinet) must scan
  the src/ of every @membrana UI package it imports, or that package's classes are dropped
  and its layout collapses (the device-board-in-cabinet regression). Use when adding a UI
  package, wiring a new app, editing a tailwind.config, or when a shared component renders
  unstyled/overlapping in one app but fine in another. Do NOT use for app-local CSS or
  non-Tailwind styling.
---

# Membrana tailwind coverage

Канон: [`docs/prompts/TAILWIND_COVERAGE_HARDENING_PROMPT.md`](../../../docs/prompts/TAILWIND_COVERAGE_HARDENING_PROMPT.md) ·
консилиум: [`docs/seanses/deploy-friction-consilium-2026-07-02.md`](../../../docs/seanses/deploy-friction-consilium-2026-07-02.md).

## Проблема, которую предотвращает

UI-пакеты (`@membrana/device-board`, `agenda`, `journal-report-views`, `audio-data-viz`) —
**headless**: экспортируют React-компоненты с Tailwind/daisyUI-классами, но не поставляют
свой CSS. Если хост-приложение не сканирует `src/` пакета в `tailwind.config` `content`,
эти утилиты не генерируются → узлы борда/мини-карта разъезжаются. Так был сломан
device-board в кабинете (client работал, cabinet — нет).

## Источник правды

Машиночитаемый фронтматтер в `README.md` каждого UI-пакета:

```markdown
## Tailwind Integration

<!-- tailwind-content: ["./src/**/*.{ts,tsx}"] -->
```

## Команды

| Задача | Команда |
|--------|---------|
| Проверить покрытие (CI-гейт) | `yarn verify:tailwind-coverage` |
| Дописать недостающие пути | `yarn tailwind:configs:fix` |

`verify:tailwind-coverage` входит в `yarn test:scripts` → гоняется в CI. Падает, если
приложение не покрывает импортируемый UI-пакет.

## Когда что делать

1. **Добавляешь UI-пакет с Tailwind-классами** → впиши секцию `## Tailwind Integration`
   с фронтматтером в его `README.md`, затем `yarn tailwind:configs:fix`.
2. **Добавляешь новое приложение** → внеси его в `TAILWIND_APPS`
   (`scripts/lib/tailwind-coverage.mjs`), затем `yarn tailwind:configs:fix`.
3. **Компонент рендерится без стилей в одном app, но ок в другом** → почти всегда
   недосканированный пакет: `yarn verify:tailwind-coverage` покажет пропущенные пути.
4. **Перед prod-деплоем приложения с UI** → `yarn verify:tailwind-coverage` зелёный.

## Не заменяет

- app-local CSS / theme / daisyui настройки в самом `tailwind.config`.
- сборку (`yarn build`) — это только coverage-проверка `content`.
