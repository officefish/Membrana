# Membrana Local Sprint OPEN: plugin-results-bridge

| Поле | Значение |
|------|----------|
| Sprint | `plugin-results-bridge` |
| Procedure | `membrana-local-sprint` |
| Registry epic | `server-plugin-foundation` (#1961 — упоминается, не закрывается) |
| Prompt | [`PLUGIN_RESULTS_BRIDGE_PROMPT.md`](../../prompts/PLUGIN_RESULTS_BRIDGE_PROMPT.md) · точка входа сессии `SESSION_B_RESULTS_BRIDGE_SPRINT_2026-08-19.md` |
| Cut plan | [`plugin-results-bridge.json`](../../sprint/cut/plugin-results-bridge.json) · ратифицирован владельцем 2026-08-19T08:25Z («Ратифицирую») |
| Cutter context | Веснин, `yarn ask vesnin` 19.08 11:18 → [`plugin-results-bridge-cut.md`](../../discussions/plugin-results-bridge-cut.md) |
| Lead | vesnin |
| Support | ozhegov · dynin |
| Status | open · execute |

## Зачем

Первая волна серверных плагинов принята 18.08, но результат рождается в media (хост
`collections`), а дом результатов `plugin-results` живёт в Mongo office. Провода нет:
18.08 запись сделал скрипт через SSH-туннель к Mongo офиса; сид `onResult` в сервисе
пишет только лог. Второй зазор, найденный разведкой: в media **нет входа**, зовущего
`host.request`/`notify` — хост вызывался только скриптом. Спринт закрывает оба: мост и вход.

## Форма моста (Веснин, контекст резчика)

**HTTP push media → office**: media `POST` RunRecord в модуль `plugin-results` офиса
(ключ класса `X-Membrana-Token`), office пишет через существующий
`PluginResultsService.writeRun`. Против: **очередь** — лишняя инфраструктура под «один
писатель, один читатель, редкие события» (M4 уже отверг Redis); **прямая Mongo из media** —
чужой писатель в доме ломает M2/M3 (индексы, транзакция границы окна), скрипт 18.08 —
временный обход, не образец; **pull office ← media** — media стала бы вторым домом
результатов де-факто, против #1950.

## Блоки

| Блок | Персона | Зона | Оценка | Статус |
|------|---------|------|-------:|--------|
| b1 форма моста (первым) | vesnin | `docs/plugins/results-bridge-form.md` | 80 | ждёт ратификации |
| b2 приёмник office | ozhegov | `packages/background-office/src/modules/plugin-results/` | 220 | ждёт |
| b3 отправитель media (∥ b2) | ozhegov | `…/background-media/src/modules/plugin-results-bridge/`, `env.schema.ts`, `app.module.ts` | 220 | ждёт |
| b4 вход request + провод сида (после b3) | dynin | `…/background-media/src/modules/collections/`, `packages/plugin-handlers/src/` | 260 | ждёт |
| b5 приёмка живым прогоном (после b2+b4) | vesnin | `docs/plugins/results-bridge-live-run-2026-08-19.md` | 70 | ждёт |

PR-план: PR-A = b1+b2 (office) · PR-B = b3+b4 (media + handlers) · PR-C = b5 (вещдок).
Каждый ≤400 строк; мердж `yarn pr:ship` после ревью тимлида.

## Риски, названные до кода

1. **Деплой.** Приёмка «без скрипта» требует, чтобы оба сервиса несли новый код: office
   первым (приёмник идемпотентен по уникальному индексу M3), затем media. Прод-деплой —
   по слову владельца; лабораторная дорожка — оба сервиса локально, office с Mongo по
   туннелю (как 18.08). Без деплоя b5 честно закроется «не состоялось».
2. **Секреты media.** `OFFICE_API_URL`/`OFFICE_API_TOKEN` в окружении media сегодня нет;
   без них мост отвечает именованным `office-not-configured`, сервис стартует.
3. **Отпечатки при `request`.** `configHash` плагино-специфичен; вход считает их тем же
   чтением, что прогон (`mfccFingerprintsOf`), через deps первой волны — не выдумывает.

## Ход исполнения

- **b1 done** — `docs/plugins/results-bridge-form.md`: форма A (HTTP push), три альтернативы с
  причинами, словарь исходов, вход `request`, порядок деплоя.
- **b2 done** — приёмник `POST/GET /plugin-results/runs` (ApiTokenGuard) → `writeRun`/`readRuns`;
  DTO выводится В контракт (типовой зуб `assertDtoMatchesContracts`, бренд `PluginId` на границе,
  `HomeName` satisfies); 8 зубов контроллера. Контекст Ожегова:
  [`plugin-results-bridge-b2.md`](../../discussions/plugin-results-bridge-b2.md).
  **Открытый P2 архитектору (Ожегов):** `.passthrough()` в `runRecordSchema` — «теневой словарь
  через POST». Оставлен сознательно: дом уже хранит документ целиком (`$set: {...run}`), запись
  18.08 несёт пробы/сводку исполнителя в корне; HTTP-путь беднее in-process дал бы два облика
  дома. Закрывается карманом `payload` на стороне `RunResult` решением Архитектора, не срезом в DTO.
  Не принято: переименование маршрута (`/plugin-results/runs` ↔ `writeRun/readRuns` дома);
  привязка токена к `pluginId` — вне предмета (M5′, границы авторизации).
