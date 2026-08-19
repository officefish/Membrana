# Мост media → office: первый прогон без скрипта — вещдок

> Блок b5 спринта `plugin-results-bridge` (фаза эпика #1961). Код моста в стволе:
> приёмник office — PR #1981 (`18ba21c4`), отправитель media — PR #1985 (`ca07071f`),
> вход `request` + провод сида — PR #1988 (`293f77d9`). Форма: `docs/plugins/results-bridge-form.md`.

## Статус — ЖДЁТ ДЕПЛОЯ (19.08, 13:30 МСК)

Прогон **не состоялся**: оба прода несут старый код — `POST office.mmbrn.tech/plugin-results/runs`
→ 404, `POST media.membrana.space/v1/devices/…/plugins/membrana.handler.mfcc/request` → 404
(проверено 19.08 ~13:20 МСК). Лабораторной дорожки нет: локально ни Postgres, ни Docker —
media без БД не поднимается, полевые записи живут в проде. Прод-деплой — слово владельца.

## Что нужно для прогона (порядок — форма моста §«Порядок деплоя»)

1. **Office первым** — образ с PR #1981+ (приёмник; без клиента безвреден).
2. **Media вторым** — образ с PR #1988+; в `/etc/membrana/media.env` добавить
   `OFFICE_API_URL=https://office.mmbrn.tech` и `OFFICE_API_TOKEN=<API_INTERNAL_TOKEN офиса>`.
   Без них мост отвечает `office-not-configured` — сервис стартует, прогон идёт, запись в дом не едет.
3. Вызов — один HTTP-запрос, скрипта прогона нет:

```bash
curl -s -X POST "$VITE_MEDIA_SERVER_URL/v1/devices/$FIELD_NODE_DEVICE_ID/collections/$FIELD_NODE_COLLECTION_ID/plugins/membrana.handler.mfcc/request" \
  -H "x-membrana-token: $VITE_MEDIA_API_TOKEN" -H "content-type: application/json" \
  -d '{"sampleId":"c4cfbf06-c415-4f4f-a829-9a49f76fcaf6"}'
# → { runId, address, fingerprints, bridge: { outcome: "sent", status: 200, attempts: 1 } }
```

4. Чтение обратно — из дома, не из лога:

```bash
curl -s "https://office.mmbrn.tech/plugin-results/runs?collectionId=$FIELD_NODE_COLLECTION_ID&pluginId=membrana.handler.mfcc" \
  -H "x-membrana-token: $OFFICE_API_TOKEN"
```

Коллекция «Полевые записи 2026-08» устройства `field-node-2026-08`: 5 проб на 19.08
(две новые 18.08 16:10Z при 48 кГц; запись 16.08 14:56Z при 44,1 кГц — ожидаемый отказ
«несравнимо», как в прогоне 18.08). `sampleId` в теле — адрес повода `collections.sample_added`
(payload M4), прогон идёт по всей коллекции.

## Результат прогона

_(заполняется после деплоя: runId · address · fingerprints · bridge.outcome · документ из `readRuns`
с `stale` по чтению · сводка по пробам; расхождения с 18.08 — названы)_
