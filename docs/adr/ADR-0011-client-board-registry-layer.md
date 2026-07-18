# ADR-0011 — `@membrana/client-board-registry`: регистрационный слой палитры борда

> **Статус:** SUPERSEDED-by-ADR-0012 · 2026-07-16 (принят и заменён в тот же день)
> Реализует вердикт консилиума `device-board-host-parity-shared-modules-2026-07-16` (25 реплик).
>
> ⛔ **НЕ ИСПОЛНЯТЬ.** Премиса решения не подтвердилась проверкой кода 16.07 — см.
> [ADR-0012](./ADR-0012-membrana-device-build-profile.md). Кратко, три факта:
> 1. Палитра борда **не собирается из плагинов**: это захардкоженный `V04_PALETTE_NODE_KINDS`
>    (39 узлов) внутри `packages/device-board`; пакет не зависит от `@membrana/agenda` и
>    реестр спросить не может. Кабинет импортирует `DeviceBoardShell` напрямую → **палитра у
>    него уже та же**. Паритета, ради которого затевался вынос, не нарушено.
> 2. 16 плагинов — панели сайдбара модулей `microphone`/`sample-library`, узлов борда они не
>    объявляют. Их перенос не добавил бы кабинету ни одного узла.
> 3. Electron-студия **не третий хост**: `studio-build.mjs` копирует `apps/client/dist` →
>    `client-dist`, Studio = apps/client. Отдельного bootstrap, куда звать
>    `mountBoardPalette`, не существует.
>
> Реальная цель (слово владельца 16.07) — лёгкая настолка «только борд» = урезанный **профиль
> сборки** apps/client с единственным модулем борда. Пакет для этого не нужен.
>
> Документ сохранён как история решения; текст ниже — в редакции на момент ACCEPTED.

## Контекст

Палитра узлов борда device-board (16 плагинов: mic-detection, neural, trends, sample-library,
fft-*, harmonic-viz…) регистрируется в `MembranaRegistry` функцией
`registerClientModules()` в `apps/client/src/main.tsx`. **Кабинет и electron-студия эту
функцию НЕ зовут** (греп по `apps/cabinet/src` пуст) → их борд видит только базовые узлы
пакета `@membrana/device-board`, без клиентских plugin-узлов. Плагины физически лежат в
`apps/client/src/plugins/*` — локально в приложении, недоступны другим хостам.

Отлаживали только песочницу `apps/client`, туда всё и село. Нужен паритет палитры на всех
трёх хостах (client, cabinet, electron) без переноса mic-рантайма в смотрелку-кабинет.

## Наблюдаемое состояние (@2026-07-16)

| Факт | Где |
|------|-----|
| 16 `registerPlugin` + ~10 `registerLazyModule` + `finalizeRegistration()` | `apps/client/src/modules/registerClientModules.ts` |
| Кабинет не регистрирует модули/плагины | `apps/cabinet/src` (греп пуст) |
| Плагины app-local | `apps/client/src/plugins/*` |
| Board-state контроллеры host-specific | client `useServerFirstBoardState`; cabinet `useCabinetNodeRuntime` |
| Правило зависимостей: core без зав-тей; agenda/device-board → только core | `ARCHITECTURE.md §1` |

## Решение

### Р1 — Новый пакет `@membrana/client-board-registry` (регистрационный слой приложений)
НЕ сервис, НЕ `device-board`. Держит **декларацию палитры** и **обвязку монтирования**,
которые зовут все три хоста. Плагины физически **переезжают** сюда из
`apps/client/src/plugins/*`; хосты потребляют через workspace-зависимость.

### Р2 — Контракт: декларация отдельно от монтирования
- `declareBoardPalette(): PluginDescriptor[]` — **чистая** декларация (id, name, family,
  `moduleId`, `loader`, `install`-фабрика). Без побочных эффектов, тестируема.
- `mountBoardPalette(registry, palette, { runtime })` — обвязка: регистрирует дескрипторы в
  **переданный** `MembranaRegistry` (не синглтон-импорт). Зовётся из bootstrap каждого хоста.

### Р3 — Board-state контроллер остаётся host-side, инжектится
`useServerFirstBoardState` (client/electron) / `useCabinetNodeRuntime` (cabinet) не
переезжают — передаются в `mountBoardPalette` как `runtime`. **Следствие:** кабинет
получает определения узлов, но НЕ клиентский capture-рантайм.

### Р4 — Паритет по умолчанию; деградация видимая
Дефолт — **все 16 плагинов во всех трёх хостах** (тест-инвариант:
`registeredPluginIds(host) === declareBoardPalette().ids`). Фильтр
`isAvailable(descriptor, host)` — только под явным обоснованием. mic-узел без потока
(нет hub в кабинете) показывает бейдж «поток недоступен» (`aria-live="polite"`), не падает
и не молчит. `MicrophoneModule` в пакет НЕ тащим.

### Р5 — Границы зависимостей
Пакет зависит от `@membrana/agenda` (фасад `MembranaRegistry`) + нужных `@membrana/*-service`.
**Запрещено:** зависеть от `apps/*`; класть плагины в `@membrana/device-board` (граф
core-only не тронут); тянуть mic/Web-Audio/tfjs в бандл кабинета (рантайм за динамическим
импортом/capability-гейтом).

## Definition of Done
- [ ] `packages/client-board-registry` (composite tsconfig, library-build, dep `@membrana/agenda` + сервисы).
- [ ] Плагины перенесены из `apps/client/src/plugins/*` (`grep 'src/plugins/'` в client пуст).
- [ ] `declareBoardPalette()` (16 дескрипторов) + `mountBoardPalette(registry, palette, {runtime})`.
- [ ] Зовётся из bootstrap client + cabinet + electron; тест-инвариант паритета на хост.
- [ ] `install`/teardown плагинов не изменён; `microphoneStreamHub`/`LiveSampler` — синглтоны на окно.
- [ ] Smoke: переключение борда в кабинете/electron без роста активных `AudioContext`.
- [ ] `tsc --noEmit` зелёный по client/cabinet/electron; `device-board` без новых зав-тей.
- [ ] LGTM Teamlead (Vesnin).

## Миграция (3 коммита, консилиум)
1. Скаффолд пакета + контракт (`declareBoardPalette`/`mountBoardPalette`/`PluginDescriptor`) — аддитивно.
2. Физперенос плагинов в пакет; client потребляет из пакета (паритет client сохранён).
3. Bootstrap cabinet + electron через `mountBoardPalette`; инвариант-тест; чистка.

## Ссылки
- Консилиум: `docs/seanses/device-board-host-parity-shared-modules-2026-07-16.md`
- `apps/client/src/modules/registerClientModules.ts` · `packages/agenda/src/core/registry.ts`
