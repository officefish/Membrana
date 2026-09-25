# Проекция сетки тарифов в базу кабинета — прод, 2026-09-21

**Магистраль дня:** `tariff-transitions-live-day2` (слово владельца 21.09). Слово на выкатку и запись — владелец 21.09 в чате («хорошо, поддерживаю»; запись всех пяти расхождений — ответ «Писать все пять»).
**Исполнитель:** ведущая сессия (Ангелина), с машины владельца, через `scripts/_ssh-media-exec.mjs` (кабинет и медиа — один VPS).

## Порядок и замеры

| Шаг | Команда | Что напечатал сервер |
|---|---|---|
| 1. Выкатка | `CABINET_IMAGE_TAG=main node scripts/_ssh-cabinet-deploy-image.mjs` (ствол `13e8ccea`, CI зелёный; гейт DR1 до этого честно отказал на pending CI) | образы `cabinet-api:main` / `cabinet-web:main` подтянуты до остановки старых; `cabinet SPA: 200`; три контейнера `(healthy)`; сводка `deploy-artifacts/cabinet-deploy-2026-09-21T12-31-02-914Z.json` |
| 2. Проверка | одноразовый контейнер из того же образа, `-v /root/membrana/scripts:/app/scripts`, `node /app/scripts/tariff-project-cabinet.mjs --check` | **находок 5**: `free-v1.bufferQuotaBytes` 1073741824→536870912 · `checkpoint-v1.bufferQuotaBytes` 1073741824→2147483648 · `observatory-v1.bufferQuotaBytes` 1073741824→4294967296 · `free-v1.userStorageQuotaBytes` 1073741824→536870912 · `observatory-v1.userStorageQuotaBytes` 2147483648→4294967296; `rc=1` |
| 3. Запись | тот же контейнер, без `--check` | `записано тарифов 3 · version 1 · free-v1, checkpoint-v1, observatory-v1`; `rc=0` |
| 4. Повторная проверка | `--check` | `база кабинета совпадает с сеткой по полям тарифа + version`; `rc=0` |
| 5. Разноска | `node /app/scripts/tariff-devices-fanout.mjs` (MEDIA_API_URL/TOKEN из `/etc/membrana/cabinet.env`) | `мембран 1 · приборов 1 · updated 1 · failed 0`; `rc=0` |
| 6. Здоровье | `GET /health`, `GET /health/deep` | `ok`, uptime 394 с; deep `degraded` (tape_length 6320, ingest_arrived_15m 0) — то же состояние, что и ДО выкатки в 12:11 UTC, не следствие дня |

## Что это значит

- Причина «1 ГБ на старшем тарифе» (владелец, 18.09) — база кабинета была наполнена до матрицы; сид в образе мёртв (#2366), проекция в развёртывание не вшита. Сегодня база приведена к матрице **руками**, по канону #2333 (`project-cabinet` → `devices-fanout`).
- Два расхождения сверх буфера (`storage.hot` free 1 ГиБ→512 МиБ, observatory 2→4 ГиБ) — та же ратификация 08.09 (гранула `tariff-collections`, source `storm T1`). Записаны по слову владельца. **Побочный риск:** у free-пользователей, уже державших >512 МиБ коллекций, предел стал ниже занятого — до записи не замерялось (решение владельца: «писать все пять»).

## Не закрыто сегодня (честно)

- **Живой замер на приборе** `GET /v1/devices/:deviceId/quota` → `buffer.limitBytes` ∈ {536870912, 2147483648, 4294967296} по тарифу — дверь под `MediaDeviceAccessGuard`, ключа у сессии нет; замер за владельцем.
- `tariff:devices-check` (зуб 3, сверка полей с базой медиа) не гонялся: нужен `MEDIA_DATABASE_URL`, из кабинетного контейнера не задан.
- Повторяемость: каждая смена матрицы снова потребует ручной руки, пока проекция не вшита в развёртывание (#2366).
