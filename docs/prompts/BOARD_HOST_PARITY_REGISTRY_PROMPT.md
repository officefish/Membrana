# Эпик: @membrana/client-board-registry — паритет палитры борда

> Размер **L** (3 M-фазы = 3 PR). Консилиум-гейт пройден:
> [`device-board-host-parity-shared-modules-2026-07-16`](../seanses/device-board-host-parity-shared-modules-2026-07-16.md).
> Канон решения: [ADR-0011](../adr/ADR-0011-client-board-registry-layer.md) (контракт, границы, DoD).
> **Спор НЕ переоткрывать.**

## Проблема

Кабинет и electron-студия не зовут `registerClientModules()` → борд у них без 16 клиентских
plugin-узлов (плагины в `apps/client/src/plugins/*`, недоступны другим хостам). Отлаживали
только песочницу client. Нужен паритет палитры на всех трёх хостах.

## Инварианты (ADR-0011)

- Новый пакет `@membrana/client-board-registry` (регистрационный слой, НЕ device-board/сервис).
- `declareBoardPalette(): PluginDescriptor[]` (чистая) + `mountBoardPalette(registry, palette, {runtime})`.
- Board-state контроллер **host-side**, инжектится (`runtime`); кабинет без mic-рантайма.
- Паритет: все 16 плагинов на трёх хостах; mic-узел без потока — видимый бейдж, не падение.
- Границы: зависит от `agenda` + `*-service`, НЕ от `apps/*`; `device-board` core-only не тронут.

## Фазы (3 коммита миграции = 3 PR)

1. **BHP1 — скаффолд + контракт** (аддитивно, ничего не ломает):
   `packages/client-board-registry` (composite tsconfig, lib-build); `PluginDescriptor` +
   `declareBoardPalette` + `mountBoardPalette` + инвариант-тест-харнесс. Плагины ещё в client.
2. **BHP2 — физперенос** плагинов `apps/client/src/plugins/*` → пакет; `registerClientModules`
   client переписан через `mountBoardPalette` (паритет client сохранён; `grep 'src/plugins/'` пуст).
3. **BHP3 — bootstrap хостов**: cabinet + electron зовут `mountBoardPalette` с host `runtime`;
   тест-инвариант паритета на хост; smoke (нет роста `AudioContext`); чистка.

## Порядок ролей

Vesnin (гейты/LGTM) · Ozhegov (пакет/контракт/границы, BHP1-2) · Dynin (инвариант-тест) ·
Rodchenko (bootstrap хостов, mic-деградация UI, BHP3) · Kuryokhin (smoke AudioContext, паритет).

## DoD — см. ADR-0011.

## Связь
Магистраль после разведки §5 (S2 закрыт): борд-паритет — часть «борд в кабинете/electron» из
трёх задач до выпуска (+ landing + downloads). Отдельно: верификация захвата устройства cabinet.
