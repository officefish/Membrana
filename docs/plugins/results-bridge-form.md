# Мост media → office для результатов плагинов — форма

> Блок b1 спринта `plugin-results-bridge` (фаза эпика #1961). Решение архитектора (Веснин,
> контекст резчика 19.08: `docs/discussions/plugin-results-bridge-cut.md`). Класс по M1 —
> non-breaking: ни одно имя `@membrana/plugin-contracts` не меняется, ADR и консилиум не нужны —
> решение выводится из уже принятых вердиктов M2/M3/M3′/M4.

## Что соединяется

Результат плагина рождается в **media** — хост `background-media/collections`
(`CollectionsPluginHostService`), сид `onResult` в `FirstWavePluginsRegistrar`. Дом
результатов `plugin-results` живёт в **office** — Mongo офиса, `PluginResultsService.writeRun`
(M3). Хост результат `execute` не возвращает (M2/M4): единственная точка, где `RunRecord`
может уйти из media, — сид. 18.08 запись сделал скрипт `plugin:run:mfcc --tunnel office`,
повторив код офиса и подняв SSH-туннель к его Mongo. Это вещдок обхода, не образец.

## Решение: HTTP push media → office

```
media: onResult(manifest, ctx, result)
   → RunRecord { …result, address: ctx.address, fingerprints: ctx.fingerprints, resumeMode: ctx.resumeMode }
   → PluginResultsBridgeService.send(record)            // POST, X-Membrana-Token, таймаут 10 с (константа b3)
office: POST /plugin-results/runs  (ApiTokenGuard)
   → PluginResultsService.writeRun(record)              // тот же путь, что у дома
   → Mongo plugin-results, уникальный индекс { pluginId, version, collectionId, runId }
```

- **Граница дома сохранена.** Media знает только URL офиса и контракт `RunRecord`; Mongo
  офиса, индексы, транзакция границы окна (`RunRecord`+`StateRecord` одной транзакцией, M3)
  остаются за office. Один писатель в дом — сам дом.
- **Ключ — тем же классом, что у обратного направления.** Office уже держит
  `MEDIA_API_TOKEN` (класс `X-Membrana-Token`, умолчание `API_INTERNAL_TOKEN`) для вызовов
  office → media; мост использует тот же класс в обратную сторону: media получает
  `OFFICE_API_URL` + `OFFICE_API_TOKEN`. Новый класс секретов не вводится.
- **Идемпотентность — у дома.** Повтор того же `runId` — upsert по `{pluginId, version, collectionId,
  runId}` (уникальный индекс M3′): приёмник отвечает тем же `200 { ok: true, runId }`, что и на первую
  запись, — повтор для media неотличим от `sent`, и это намеренно: ретрай безопасен и не требует от
  отправителя ветки «дубль». Отдельный код дубля (409/`duplicate`) не вводится (ревью b1: правка 1 —
  ответ назван).

## Против альтернатив

| Альтернатива | Почему нет |
|---|---|
| **Очередь** (Redis/брокер) между media и office | Лишняя инфраструктура под «один писатель, один читатель, редкие события»; M4 уже отверг Redis для событий как лишнюю инфраструктуру. Вернуться, когда появятся вторая волна и backpressure. |
| **Прямая запись media в Mongo офиса** (как скрипт 18.08) | Чужой писатель в доме: media пришлось бы знать индексы, схему и транзакцию границы окна — нарушение M2/M3. Mongo офиса наружу не опубликована, скрипт жил на SSH-туннеле — не рабочий путь сервиса. |
| **Pull: office опрашивает media** | Media пришлось бы хранить результаты до опроса — второй дом результатов де-факто, против #1950 («плагины пишут только в `plugin-results`»). |

## Словарь исходов отправки (закрыт)

`sent` · `office-not-configured` (нет `OFFICE_API_URL`/`OFFICE_API_TOKEN` — сервис стартует,
результат остаётся в логе именем) · `office-unreachable` (сеть/таймаут 10 с — константа отправителя, не env: второй рукоятки для одного числа
не заводится) · `office-rejected`
(4xx/5xx с телом ответа). Повторов-до-бесконечности нет: одна попытка и одна повторная на
`office-unreachable`, дальше — именованный отказ в лог media с `runId`. Буфер не вводится
(M4: выключенный плагин живой сигнал теряет; тот же принцип — мост не очередь). Потерянный
результат воспроизводим: прогон детерминирован, `request` повторяется.

## Вход без скрипта

Сегодня `host.request`/`notify` из сервиса media не зовёт никто — хост 18.08 собирался
скриптом из dist. «Живой прогон без скрипта» требует входа внутри сервиса: `POST
/collections/:collectionId/plugins/:pluginId/request` (ApiTokenGuard media) собирает
`PluginContext` — `runId` UUID v7 (перенос из скрипта в `@membrana/plugin-handlers`),
отпечатки тем же чтением, что у прогона, `resumeMode: 'fresh'`, `trigger` из закрытого
`PLUGIN_TRIGGERS` — и зовёт `host.request`. Это блок b4; форма здесь названа, чтобы b2/b3/b4
не разошлись.

## Порядок деплоя и риски

1. **Office первым** (приёмник без клиента — мёртвый, но безвредный код), **media вторым**
   (клиент без приёмника — поток `office-rejected 404`). Прод-деплой — по слову владельца.
2. До деплоя media — пробросить `OFFICE_API_URL`/`OFFICE_API_TOKEN` в его окружение.
3. Лабораторная дорожка приёмки: оба сервиса локально, office с Mongo по туннелю (как 18.08).
   Без Mongo URI office сам поднимает `MemoryPluginResultsStore` (существующий fallback модуля
   `plugin-results`, не штатный режим и не отдельный сервис) — тогда вещдок только о проводе, не о доме.
   19.08 дорожка недоступна: локально ни Postgres, ни Docker — media без БД не поднимается.
4. Скрипт `plugin:run:mfcc` остаётся лабораторным путём и не удаляется.
