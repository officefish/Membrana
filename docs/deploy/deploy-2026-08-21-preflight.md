# Preflight деплоя 21.08 — связка per-device ключей (ADR-0028 Р1/Р2)

**Блок 1 `deploy-preflight` спринта `deploy-safestorage-2026-08-21`. Держатель: tarasov.**
Слово владельца на деплой получено 21.08 в чате. Порядок: **office не трогаем · media первым ·
cabinet вторым**. Всё ниже снято **с сервера**, не со слов клиента.

## 1. Гейт Тарасова — зелёный

`Unit tests` на стволе `2693e1ff`: шаг **«App DI smoke — background-media и background-office
поднимаются (#2009)» → success**. Без этого шага деплой не подписывается (вердикт b7,
restart-loop прода 19.08 ~8 минут).

## 2. Снимок состояния ДО выкатки

| Что | Значение (21.08, до деплоя) |
|---|---|
| Прод-чекаут `/root/membrana` | `6df73034` (19.08) |
| media-api | образ `membrana/background-media:local` `a22730e48c7d`, **Up 40 часов** |
| cabinet-api | `ghcr.io/officefish/membrana-cabinet-api:main` `c141fd4311f8`, **Up 5 недель** |
| cabinet-web | `ghcr.io/officefish/membrana-cabinet-web:main` `e759320d1a87`, **Up 5 недель** |
| health media | `{"status":"ok","version":"0.1.0","uptime":142977}` |
| health cabinet | `{"status":"ok","version":"0.1.0","protocolVersion":1,"uptime":3558784}` |
| Таблица `NodeKey` | `id, deviceId, keyHash, createdAt, revokedAt, lastUsedAt` — **колонки `audience` нет** |
| Последняя миграция | `20260819120000_firebat_node_key`; `20260820111700_node_key_audience` **не применена** |

Итог: Р1/Р2 (PR #2031, 20.08) на проде отсутствуют целиком — выкатывается ствол как есть.

## 3. Откат — сделан фактом ДО сборки

`docker compose build` пишет в **тот же тег** `membrana/background-media:local`: без метки
предыдущий образ исчез бы, и фраза «старый образ на месте» стала бы неправдой. Метки поставлены
до единой команды сборки:

| Образ отката | ID |
|---|---|
| `membrana/background-media:rollback-2026-08-21` | `a22730e48c7d` |
| `ghcr.io/officefish/membrana-cabinet-api:rollback-2026-08-21` | `c141fd4311f8` |
| `ghcr.io/officefish/membrana-cabinet-web:rollback-2026-08-21` | `e759320d1a87` |

**Команда возврата media** (выполняется первой при любом отклонении, разбор потом):

```bash
cd /root/membrana
docker tag membrana/background-media:rollback-2026-08-21 membrana/background-media:local
docker compose -f packages/background-media/docker-compose.yml \
  -f deploy/background-media.prod.compose.yml \
  --env-file /etc/membrana/media.env up -d --force-recreate --no-build media-api
curl -fsS http://127.0.0.1:3010/health
```

**Команда возврата cabinet:**

```bash
cd /root/membrana
docker tag ghcr.io/officefish/membrana-cabinet-api:rollback-2026-08-21 ghcr.io/officefish/membrana-cabinet-api:main
docker tag ghcr.io/officefish/membrana-cabinet-web:rollback-2026-08-21 ghcr.io/officefish/membrana-cabinet-web:main
docker compose -f deploy/background-cabinet.image.compose.yml --env-file /etc/membrana/cabinet.env up -d --force-recreate
```

**Про откат миграции.** `20260820111700_node_key_audience` добавляет колонку `audience` со
значением по умолчанию — старый код её просто не читает, поэтому откат образа **не требует**
отката схемы. Обратная миграция намеренно не готовится: снос колонки уничтожил бы уже выданные
`client`-ключи, а это потеря данных ради косметики.

## 4. Условие остановки

Любое отклонение на шагах 2–4 (сервис не поднялся, миграция не применилась, вещдок приёмки не
сошёлся) → **сначала команда отката выше**, затем разбор в документе блока. Правки сервисов на
проде запрещены: выкатывается ствол как есть.
