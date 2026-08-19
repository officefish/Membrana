# Промпт: Мост media → office для результатов плагинов (RunRecord в plugin-results без скрипта)

> Карточка `plugin-results-bridge` (M, `membrana-local-sprint`, lead vesnin, support ozhegov),
> фаза эпика `server-plugin-foundation` (#1961 — упоминается, не закрывается).
> Точка входа сессии: `SESSION_B_RESULTS_BRIDGE_SPRINT_2026-08-19.md` (на ветке магистрали 19.08).
> Нарезка: `docs/sprint/cut/plugin-results-bridge.json` · прогон: `docs/local-sprint/plugin-results-bridge/`.

## Контекст

Первая волна серверных плагинов принята 18.08: хост `collections` в `background-media`
(`CollectionsPluginHostService`, `FirstWavePluginsRegistrar`), дом результатов `plugin-results`
в Mongo `background-office` (`PluginResultsService.writeRun`, `MongoPluginResultsStore`),
первый живой `membrana.handler.mfcc` с настоящим `RunRecord`
(`docs/plugins/first-live-run-2026-08-18.md`, runId `01a0150f-…`).

**Зазор:** результат рождается в media, дом результатов живёт в office; провода между ними
нет. 18.08 запись сделал скрипт `yarn plugin:run:mfcc --host collections --tunnel office`,
повторяя код офиса и поднимая SSH-туннель к Mongo. Внутри сервисов сид `onResult` в
`FirstWavePluginsRegistrar` пишет только сводку в лог. Второй зазор, найденный разведкой 19.08:
**в media нет входа, который звал бы `host.request`/`host.notify`** — хост вызывался только из
скрипта (`new CollectionsPluginHostService()` из dist). «Живой прогон без скрипта» требует
такого входа внутри сервиса.

## Словарь (поимённо, `@membrana/plugin-contracts`, не переоткрывать)

`RunRecord { address: RunAddress, fingerprints: RunFingerprints, resumeMode, completedAt, kind }`;
`RunAddress { pluginId, version, collectionId, runId, mountTarget }`; `RunFingerprints { inputHash,
configHash }`; дома `background-office/journal` · `background-media/collections`; хост результат
`execute` не возвращает (сид `onResult`). Норма #1950: плагины пишут **только** в `plugin-results`.

## Границы пакетов

media и office — разные процессы и хосты; office достижим снаружи через `office.mmbrn.tech`,
Mongo офиса наружу не опубликована. Ключи — класс `X-Membrana-Token` (`API_INTERNAL_TOKEN`,
у office есть `MEDIA_API_TOKEN` того же класса для обратного направления).

## Блоки — см. план нарезки; код только после ратификации владельца

Не трогать `packages/agenda` и клиент; скрипт `plugin:run:mfcc` остаётся лабораторным путём.
