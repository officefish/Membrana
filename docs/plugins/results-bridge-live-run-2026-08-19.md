# Мост media → office: первый прогон без скрипта — вещдок

> Блок b5 спринта `plugin-results-bridge` (фаза эпика #1961). Код моста в стволе:
> приёмник office — PR #1981 (`18ba21c4`), отправитель media — PR #1985 (`ca07071f`),
> вход `request` + провод сида — PR #1988 (`293f77d9`). Форма: `docs/plugins/results-bridge-form.md`.

## Статус — СОСТОЯЛСЯ (деплой 19.08 вечера, ствол faa83063 + #2008)

Днём 19.08 (13:20 МСК) оба прода несли старый код — 404 на новых входах; вечером office и
media выкачены со ствола, и мост ожил с первого вызова. Раздел «что нужно» оставлен как
исполненный порядок.

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

## Результат прогона (19.08, 16:02:50Z — первый RunRecord через HTTP-путь)

Вызов — боевой вход b4 (`POST …/plugins/membrana.handler.mfcc/request`), ответ нёс
`bridge.outcome sent`; документ ниже ПРОЧИТАН ОБРАТНО из
`office.mmbrn.tech/plugin-results/runs` (GET, дом результатов), не из лога. Скрипт и
SSH-туннель не участвовали. Попутный вещдок деплоя — `docs/field/firebat-node-acceptance-2026-08-19.md`.

| Поле | Значение |
|---|---|
| **runId** | `01a01ac2-cd88-7197-86d8-e2228d6ccad0` |
| address | `membrana.handler.mfcc` · 0.1.0 · `efbf9733-586a-4918-80fd-8fb8b4b9e364` · `background-media/collections` |
| fingerprints.inputHash | `d54cbf24566b53910c281f4dff95a78720ebc2ee4c51f2f68d7652cc7f185e5b` |
| fingerprints.configHash | `4b65be396451b097d4eb68fc5db106eccd631d24152943d2565b4063e19572c1` (тот же, что 18.08 — ворота не менялись) |
| resumeMode · kind | `fresh` · `handler` |
| completedAt | 2026-08-19T16:02:50.653Z |
| stale (чтение 20.08 с currentInputHash прогона) | false |
| bridge | `sent` — RunRecord доехал мостом media → office |

Сводка по пробам (5 на момент прогона): detected 4 · refused 1 (запись 16.08 14:56Z при
44,1 кГц — ворота сняты при 48 кГц, «несравнимо», как 18.08). Запись узла Firebat
`89e428ba-…` создана 18:09:08Z — ПОЗЖЕ этого прогона и в нём не участвует; её проба —
отдельный прогон (см. `mfcc-first-field-probe-2026-08-20.md`), после которого этот
RunRecord станет `stale` по чтению — так и задумано (M3: протухание объявляет чтение).

Отличие от 18.08 — путь: тогда скрипт с SSH-туннелем повторял код офиса; теперь сервисы
сами — вход request (b4) → хост → mfcc → сид onResult → мост (b3) → приёмник (b2).

## Контуры, названные до архивации (ревью Веснина, b5)

1. **Негативный контур.** Без `OFFICE_API_URL`/`OFFICE_API_TOKEN` media жив, прогон идёт,
   `bridge.outcome=office-not-configured` — это НОРМА, не отказ (форма моста, §«Порядок деплоя»):
   «провода нет» — названное состояние, результат остаётся в логе именем.
2. **Идемпотентность и повтор.** Контракт b4: два запроса на одном входе дают РАВНЫЕ
   `inputHash`/`configHash` и РАЗНЫЕ `runId` (зуб «отпечатки детерминированы» в
   `first-wave.registrar.test.ts`); дом хранит оба документа — адрес уникален по `runId`,
   повтор ТОГО ЖЕ runId — upsert. Живой пример двойного вызова — в пробе
   `mfcc-first-field-probe-2026-08-20.md`.
3. **Протухание по чтению.** После пробы 20.08 (вход вырос на запись `89e428ba`) этот
   RunRecord ожидаемо `stale=true` при чтении с новым `currentInputHash` — M3 работает, сторожа нет.
4. **Хеши как якорь.** `configHash` побайтово тот же, что у прогона 18.08 (`4b65be39…`):
   ворота `mel40-c24-buf4096-sr48000`, строгость normal, судимые [0,1,2,3] — не менялись;
   расходится только `inputHash` (состав коллекции), и только он и должен.
