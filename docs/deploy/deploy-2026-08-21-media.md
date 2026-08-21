# Выкатка media 21.08 — **отклонена, откат выполнен**

**Блок 2 `deploy-media` спринта `deploy-safestorage-2026-08-21`. Держатель: ozhegov.**
Правило владельца соблюдено буквально: **откат сначала, разбор потом**.

## Что делалось

| Шаг | Результат |
|---|---|
| 1. Метки отката (до сборки) | `membrana/background-media:rollback-2026-08-21` = `a22730e48c7d`; cabinet-образы помечены так же |
| 2. Прод-чекаут `/root/membrana` → ствол | `6df73034` → **`2693e1ff`** (выкатывался SHA, на котором зелёный гейт «App DI smoke»; дельта до tip `3e8f1136` — **только `docs/`**, проверено `git diff --name-only`) |
| 3. Сборка образа | `docker compose … build media-api` → `Image membrana/background-media:local Built` |
| 4. Подъём | контейнер стартовал, **миграция применилась**: `Applying migration 20260820111700_node_key_audience` |
| 5. Health | **не поднялся**: `Restarting (1)`, `curl: (7) Failed to connect` |
| 6. **Откат** | `docker tag …:rollback-2026-08-21 …:local` + `up -d --force-recreate --no-build` → `Up (healthy)`, `{"status":"ok","version":"0.1.0"}` |

## Почему упало (разбор после отката)

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@membrana/fft-analyzer-service'
  imported from /app/packages/plugin-handlers/dist/session-digest/executor.js
```

Runtime-стадия `packages/background-media/Dockerfile` копирует dist пакетов **поимённым
списком** (строки 48–55): `plugin-contracts`, `plugin-handlers`, `wav-decode`, `mfcc-analyzer`.
`node_modules/@membrana/*` в образе — симлинки в `/app/packages/*`, поэтому пакет, которого нет в
списке, даёт **висячую ссылку**, и любой его импорт падает уже в рантайме.

Сегодняшний PR #2041 (j2, плагин разбора сеанса) добавил в `plugin-handlers` статический импорт
`@membrana/fft-analyzer-service` — в списке его нет. Список отстал от графа зависимостей.

**Полный список пакетов, которых нет в рантайм-образе** (транзитивный граф зависимостей media,
посчитан по `package.json`, а не на глаз):

`audio-engine-service` · `cepstral-detector-service` · `core` · `detector-base` ·
`detector-report` · `drone-detection-orchestrator-service` · `fft-analyzer-service` ·
`harmonic-detector-service` · `spectral-flux-detector-service` · `template-match-detector-service` ·
`trends-detector-service`

Из них уже сегодня стреляет `fft-analyzer-service` (грузится на старте вместе с
`plugin-handlers`). Остальные — **спящая мина**: например, `drone-detection-orchestrator-service`
импортируется динамически в `samples.service.ts` при вызове `drone-detection-report`, и на
работающем сегодня проде этот вызов упал бы тем же `ERR_MODULE_NOT_FOUND`.

## Почему гейт #2009 этого не поймал (граница сторожа названа честно)

`App DI smoke` судит **локальный** `dist` в дереве, где `node_modules` полны: он проверяет, что
**граф DI разрешается**. Здесь граф в порядке — не хватает **файла в образе**. Это соседний
класс: «образ собран правильно» ≠ «граф собирается правильно». Сторож для него — сборка образа
и его подъём (docker build + run + health), а не vitest.

## Состояние прода на момент записи

media `Up (healthy)`, `{"status":"ok"}`; cabinet не трогался (`Up 5 недель`, healthy).
Схема БД: колонка `audience` **осталась** (`id, deviceId, keyHash, createdAt, revokedAt,
lastUsedAt, audience`) — это безопасно по preflight §3: старый код колонку не читает, сносить
её нельзя (уничтожило бы будущие `client`-ключи).

## Что требуется дальше (за пределами ратифицированной нарезки)

Починка — правка `packages/background-media/Dockerfile`, а нарезка запрещает правки сервисов ради
деплоя (`//out-of-scope`). Нужна **перерезка v2** с блоком: список COPY выводится из графа
зависимостей (или собирается один раз `yarn workspaces focus --production`), плюс зуб, который
ловит расхождение списка с графом до выкатки. Владельцу доложено; без ратификации не делается.

## Цена выкатки: дыра в живом сеансе владельца (21.08)

Выкатка шла в момент **живого часового сеанса записи**. Сервис перезапускался дважды — при
выкатке и при откате — и в потоке образовалась **дыра 09:48–09:50 UTC, потеряно около 25 треков**.
Сказано владельцем, зафиксировано здесь как вещдок, а не как фон.

Причина не в спешке, а в **отсутствующем стороже**: preflight проверяет гейт CI, образы и схему —
готовность *кода*; занятость *железа* контур не спрашивает ни на выкатке, ни на откате. Заведено
отдельным долгом: **Issue #2048** — предикат «на устройстве идёт живой сеанс», ответ словом
(`busy`/`idle`), молчание приравнивается к `busy`, умолчание деплоя — ждать.

**Решение владельца по остатку дня:** cabinet не трогать до **13:45 МСК** (конец сеанса); media
до тех пор не перезапускать — ни проверок с рестартом, ни повторного отката. Приёмка (блок 4) —
после. Текущее состояние прода на момент записи: media `Up (healthy)` на образе отката, cabinet
не тронут; ни одна команда к сервисам после этого решения не отправлялась.

## Пересборка образа под r1 (21.08, вечер)

Запрос: боевой вход `POST …/plugins/:pluginId/request` на проде оставался прежним — требовал
`sampleId`, потому что образ нёс код до r1 (манифест свода был подписан на `collections.sample_added`).

| Проверка перед пересборкой | Результат |
|---|---|
| Простой устройства (`now() - max("Sample"."createdAt")`) | **1 ч 20 мин** — живого сеанса нет (ручная проверка; предиката всё ещё нет, #2048) |
| Гейт «App DI smoke (#2009)» на выкатываемом SHA | **success** на `564b4719` |
| `yarn verify:image-workspace-deps` на `564b4719` | **зелёный** — образ несёт весь граф (зуб дня уже работает) |
| Метка отката до сборки | `membrana/background-media:rollback-r1-2026-08-21` |

Выкатка: чекаут `/root/membrana` → `564b4719`, пересборка, `up -d --force-recreate media-api`.
Итог: `Up (healthy)`, `{"status":"ok","version":"0.1.0"}`, семь плагинов зарегистрированы
(включая `membrana.report.session-digest`).

**Подтверждение, что r1 действительно на проде:** у входа в живой OpenAPI-схеме появились поля
окна — `trigger, sampleId, from, to`; `sampleId` перестал быть обязательным для свода сеанса
(он подписан на `collections.collection_created` и о пробе не спрашивает).

Прогон свода по окну `09:45:18 → 10:46 UTC` — блок r2 чужой нарезки (спринт `report-entry-gap`);
образ, которого он ждал, готов. Откат этой пересборки: `docker tag
membrana/background-media:rollback-r1-2026-08-21 membrana/background-media:local` и
`up -d --force-recreate --no-build media-api`.
