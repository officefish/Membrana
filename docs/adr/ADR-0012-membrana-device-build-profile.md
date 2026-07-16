# ADR-0012 — Membrana Device: профиль сборки `apps/client`, а не регистрационный пакет

> **Статус:** ACCEPTED · 2026-07-16
> **Supersedes:** [ADR-0011](./ADR-0011-client-board-registry-layer.md) (`@membrana/client-board-registry`).
> Основание — проверка кода 16.07 (премиса ADR-0011 не подтвердилась) + уточнение цели владельцем.

## Контекст

ADR-0011 исходил из того, что палитра узлов борда собирается из 16 клиентских плагинов через
`registerClientModules()`, а кабинет и electron эту функцию не зовут — значит видят обеднённую
палитру. Отсюда следовал вынос плагинов в новый пакет и 3-коммитная миграция (эпик BHP1-3).

Разведка по коду 16.07 премису **не подтвердила**. Владелец уточнил реальную цель: убедиться,
что актуальная песочница работает у настоящих пользователей — с сервера (кабинет) и в
установленной настолке; а лёгкая настолка «только борд» = **урезанная версия Studio с
единственным модулем борда**, и такой ещё никогда не собиралось.

## Наблюдаемое состояние (@2026-07-16, грунтовано кодом)

| Факт | Где |
|------|-----|
| Палитра = `V04_PALETTE_NODE_KINDS` (39 узлов), **захардкожена**; `SCENARIO_V04_PALETTE` — статический маппинг | `packages/device-board/src/graph/palette-node.ts:110` · `src/types/board-ui.ts:115` |
| `@membrana/device-board` зависит только от `core` + `@xyflow/react` + dagre — **от `agenda` НЕ зависит**, реестр спросить не может | `packages/device-board/package.json` |
| Кабинет импортирует `DeviceBoardShell` напрямую → **палитра у него уже та же** | `apps/cabinet/src/pages/DeviceBoardPage.tsx:5` |
| 16 плагинов регистрируются в модули `microphone` (11) и `sample-library` (5); узлов борда не объявляют — это панели сайдбара | `apps/client/src/modules/registerClientModules.ts:172-191` · `docs/MODULE_AND_PLUGIN_UI.md §3` |
| Studio **не третий хост**: собирает `@membrana/client` и копирует `apps/client/dist` → `client-dist`, грузит `loadFile()`. Studio = apps/client | `scripts/studio-build.mjs:42-46` · `apps/membrana-studio/src/main.ts:59` |
| `apps/membrana-device` — **только README**, приложения нет | `apps/membrana-device/` |
| Журнал / медиа / playback / каталог UC — **уже отдельные сервисы**; модули клиента лишь UI-обёртки | `packages/services/{telemetry-journal,media-library,sample-playback,usercase-catalog}` |
| Плагины импортируются **статически** в шапке регистратора → сидят в главном бандле (3.1 МБ) вместе с ~16 МБ весов YAMNet | `apps/client/src/modules/registerClientModules.ts:2-17` |

## Решение

### Р1 — ADR-0011 отменяется
Пакет `@membrana/client-board-registry` **не создаётся**; `declareBoardPalette` /
`mountBoardPalette` не вводятся; 16 плагинов остаются в `apps/client/src/plugins/*`.
Перенос не добавил бы кабинету ни одного узла (палитра общая), не нужен Studio (паритет по
построению) и не нужен Device (который плагинов не хочет по определению).

### Р2 — Host-обвязку борда НЕ выносим
62 файла `apps/client/src/modules/device-board/*` (`createScenarioRuntimeHost`,
`useServerFirstBoardState`, workspace-хосты, persistence) остаются на месте: Device — профиль
сборки **самого** `apps/client`, а не отдельное приложение, импортирующее из него. Выносить
нечего.

### Р3 — Device = профиль сборки `apps/client`
Состав: pairing + список юзеркейсов (идентичный модульному, `DeviceBoardLauncher`) + борд по
загрузке юзеркейса. Регистрируется **один** модуль `device-board`, плагинов ноль.

### Р4 — Отдельная точка входа, НЕ рантайм-флаг
Плагины импортируются статически → рантайм-флаг «регистрируй один модуль» бандл не облегчит.
Нужны отдельные `registerDeviceModules` + свой `main`, чтобы Vite вытряс импорты плагинов и
веса YAMNet. Иначе «лёгкая» настолка весит как полная.

### Р5 — Журнал и библиотека: сервисы, не модули
Наружу UI не торчит; внутри рантайм борда продолжает использовать journal-мост и
sample-playback (сценарий пишет trace и отчёты). Мосты в `main` профиля Device остаются —
иначе борд онемеет. Что нужно оператору — представляется в борде либо настраивается с сервера.

### Р6 — Границы
`packages/device-board` не трогаем (core-only цел). Оболочка Device — копия студийной
(`main.ts`/`preload.ts`/`paths.ts`) + аналог `studio-build.mjs`; пути логов уже зафиксированы
в `apps/membrana-device/README.md` для наследования.

### Р7 — Studio и кабинет: работ нет, только верификация
Studio = apps/client → паритет по построению. Кабинет = смотрелка тарифа v2 (без локального
mic-рантайма намеренно). Проверяются смоуком, а не миграцией.

## Definition of Done (эпик Device)
- [ ] Профильная точка входа: `registerDeviceModules` (один модуль борда, ноль плагинов) + `main` профиля.
- [ ] Оболочка `apps/membrana-device` (копия студийной) + скрипт сборки → `device-dist`.
- [ ] Бандл Device **заметно легче** студийного (веса YAMNet и плагины вытрясены) — иначе Р4 не выполнен.
- [ ] Pairing + список UC + открытие борда работают; борд пишет trace/журнал через сервисы.
- [ ] `packages/device-board` без новых зависимостей; `apps/client` не деградировал (Studio собирается).
- [ ] LGTM Teamlead (Vesnin).

## Последствия
- Эпик `board-host-parity-registry` (L, 3 PR) заменяется на Device-профиль (M) — см. промпт.
- Консилиум `device-board-host-parity-shared-modules-2026-07-16` остаётся как история: вердикт
  был вынесен без проверки фактов под ним. Урок — консилиум-гейт не заменяет грунтовку кодом.
- Отладка продукта переносится **за** границу выпуска: полевые испытания владельца и партнёров,
  продукт сознательно сырой, не стадия коммерческой сборки.

## Ссылки
- Заменяет: [ADR-0011](./ADR-0011-client-board-registry-layer.md)
- Консилиум (история): `docs/seanses/device-board-host-parity-shared-modules-2026-07-16.md`
- Промпт эпика (действующий): [`MEMBRANA_DEVICE_BUILD_PROFILE_PROMPT.md`](../prompts/MEMBRANA_DEVICE_BUILD_PROFILE_PROMPT.md)
- Промпт отменённого BHP1-3 (надгробие): [`BOARD_HOST_PARITY_REGISTRY_PROMPT.md`](../prompts/BOARD_HOST_PARITY_REGISTRY_PROMPT.md)
- `apps/membrana-studio/README.md` (MS5 smoke, упаковка) · `apps/membrana-device/README.md` (логи Device)
