# apps/comms-studio — контур внешних коммуникаций

Leaf-воркспейс для партнёра по внешним коммуникациям (презентации, лендинги, брендбук,
инфографика). Топология — **Вариант A** (INSIGHT [`insight-comms-contour-topology`](../../docs/insights/insight-comms-contour-topology/INSIGHT.md),
adopted). Спринт — [`COMMS_CONTOUR_ENVIRONMENT_SPRINT_PROMPT.md`](../../docs/prompts/COMMS_CONTOUR_ENVIRONMENT_SPRINT_PROMPT.md).

## Инвариант: сток, а не исток

- **Читает много, пишет мало.** Контур читает весь актуальный канон проекта живьём, но пишет
  ТОЛЬКО в `out/`.
- **Изоляция по записи, не по чтению.** Инвариант держится запретом *исходящих* рёбер к контуру
  (`yarn check:boundaries`), а не запретом чтения.
- **Чтение ≠ импорт.** Канон читается через `fs`-read рабочей копии, **не** через
  `import @membrana/*`. Импорт создал бы ребро зависимости → блок границ. Поэтому копии канона
  не создаётся, синхронизации нет по построению (single source of truth).

## Источники канона

Объявлены в [`src/canon-sources.ts`](./src/canon-sources.ts): Слой 1 (истина) + Слой 2 (форма)
существуют и читаются живьём; Слой 3 (`FACTS_SHEET`, `GLOSSARY`, `BRAND_TOKENS`) создаётся в
`docs/comms/canon/` в рамках спринта (CC5–CC7).

## Партнёр как узел (тонкий срез)

Партнёр касается контура **тонким срезом**: монитор каталога `out/**` + экспорт в Drive для
ручной правки. Прямого доступа к git нет. Обратный импорт из Drive в git запрещён — правки
переносятся вручную через changelog.

## Non-goals

- Не деплоит боевой лендинг `membrana.space` (хостинг — отдельное stage-gate-решение).
- Не второй источник истины — только потребитель канона.
- Не импортирует `@membrana/*` и не пишет за пределы `out/`.

## Скрипты

| Скрипт | Действие |
|--------|----------|
| `yarn workspace @membrana/comms-studio typecheck` | `tsc --noEmit` |
| `yarn workspace @membrana/comms-studio lint` | ESLint `src/` |
| `yarn workspace @membrana/comms-studio test` | Vitest |

> Агент живого чтения (CC8) и первый выход v0.1 (CC9) — следующие задачи спринта.
