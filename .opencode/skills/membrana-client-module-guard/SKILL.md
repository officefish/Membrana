---
name: membrana-client-module-guard
description: "Guards Membrana package & client-module boundaries: runs yarn check:boundaries (scripts/check-package-boundaries.mjs), enforces ARCHITECTURE.md import rules (no device-board imports in core, no runtime in agenda facades, client isolation from core). Use when adding a client module, moving code between packages, before a PR that touches imports, or when the user mentions package boundaries, forbidden imports, check:boundaries, or layering. Do NOT use for full CI (membrana-full-ci-operator) or generic code review (membrana-code-review)."
---
# Membrana client-module / package boundary guard

Канон: [`docs/ARCHITECTURE.md`](../../../docs/ARCHITECTURE.md) (слои и запрещённые импорты) · скрипт: [`scripts/check-package-boundaries.mjs`](../../../scripts/check-package-boundaries.mjs).

**Владелец:** **Структурщик** — раскладка пакетов, запрещённые импорты, изоляция клиента.

## When to use

- Добавляешь/переносишь клиентский модуль или код между пакетами.
- Перед PR, который трогает `import`'ы на границах `@membrana/core`, `@membrana/device-board`, `@membrana/agenda`, `apps/client`.
- Пользователь говорит «границы пакетов», «запрещённый импорт», «check:boundaries», «слои».

## When NOT to use

- Полный CI-прогон (lint/typecheck/test/build) → `membrana-full-ci-operator`.
- Общее ревью diff'а → `membrana-code-review`.
- Аудио-движок (AudioContext/один хаб) → `membrana-audio-engine-guard`.

## Commands

| Goal | Command |
|------|---------|
| Проверить границы | `yarn check:boundaries` |
| Точечный пакет | `node scripts/check-package-boundaries.mjs` (см. флаги в скрипте) |

## Инварианты слоёв (из ARCHITECTURE.md)

- `@membrana/core` — контракты, **без** импортов device-board / runtime.
- `@membrana/device-board` — runtime/store, **без** UI-импортов.
- `@membrana/agenda` — UI subscribe facade, **не** тянет runtime.
- `apps/client` host-bridge — изоляция от `core` внутренностей.

## Agent workflow

1. Запусти `yarn check:boundaries`; при ненулевом exit — разбери нарушения по списку.
2. Сопоставь с таблицей «слой → разрешённые зависимости» в `ARCHITECTURE.md`.
3. Не «чинить» переносом импорта в обход слоя — исправляй направление зависимости.
4. Для нового клиентского модуля — убедись, что он не импортирует приватные пути core.

## Output

- Зелёный `check:boundaries` — обязательное условие LGTM для PR, трогающих границы.
- Нарушения фиксируй в описании PR с указанием слоя и направления зависимости.
