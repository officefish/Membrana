# Expectations — Block `refusal-contract` (A)

Односторонний документ: что я жду от соседей и что отдаю, **не читая** их EXPECTATIONS.
Живой в Phase 2; запечатывается freeze-тегом координатора.

## Что мне нужно от соседей

| От блока | Что | Форма (сигнатура/схема) | Инварианты |
|---|---|---|---|
| B (`overflow-policy`) | Режим переполнения прибора для поля ответа `overflowPolicy` | Ожидаю поле на записи `Device` сервера записей, читаемое синхронно из уже загруженной строки (`DevicesService.getById(deviceId)` возвращает `Device`; mapper A принимает политику параметром, ему всё равно, откуда она) — значение из `OverflowPolicy` словаря A (`stop` \| `smart_cleanup`) | Значение всегда есть (backfill `stop`, NOT NULL); неизвестное значение не долетает до A (отвергнуто у B при записи); имя поля B — `bufferPolicy` (данность: `bufferPolicy` ≠ `overflowPolicy`), тип у B — тот же union, что `OverflowPolicy` в `buffer-overflow/refusal.ts`, а не второй набор строк |
| B | Умолчание на дырах | Если поле не прочиталось (старая строка, порча) — A подставляет `stop`; лучше, чтобы этого не требовалось | `effective(⊥) = stop` — совпадает с нормой B из брифа |
| B (опционально) | Долговечный носитель эпизода, если владелец/интеграция решат, что память процесса — мало | Таблица `DeviceOverflowEpisode { deviceId, subject: 'buffer' \| 'userStorage', overflowId, overflowAt, releasedAt? }` или две пары колонок на `Device` — зона `prisma/**` B; A подставляет реализацию порта `OverflowEpisodeStore { open(deviceId, subject, now) → { overflowId, overflowAt }; release(deviceId, subject) }` | Идемпотентность `open` при открытом эпизоде; `release` при закрытом — no-op; время — от часов сервера, не базы |
| C (`device-hold`) | Ничего в коде до интеграции | — | C потребляет мой ответ; мне от C нужно лишь, чтобы **разбор шёл по `reason`, не по HTTP-коду и не по `message`** |
| Координатор | Экспорт `buffer-overflow` из бареля `packages/plugin-contracts/src/index.ts` (общий файл) | Поимённо, как остальные строки бареля: `BUFFER_OVERFLOW_REASONS`, `isBufferOverflowReason`, `OVERFLOW_POLICIES`, `isBufferOverflowRefusal`, типы `BufferOverflowReason`, `OverflowPolicy`, `QuotaAxis`, `BufferOverflowRefusal`, `QuotaSubject` | После этого в media одна строка импорта меняется с относительного пути на `'@membrana/plugin-contracts' with { 'resolution-mode': 'import' }` (файл `buffer-overflow-refusal.ts`, шапка называет это) |
| Координатор | Замена временной константы | Удалить `modules/samples/overflow-policy.temporary.ts`; в `SamplesService.uploadOrRefuse` передать в mapper политику из поля B | Порча координатора: файл остался → красный |
| Координатор | Судьба второй двери загрузки | `firebat-node.controller.ts:146` зовёт `upload()`; при отказе сейчас получит `200 { ok:false, … }` через `BufferOverflowRefusedException`, задание остаётся `leased` | Решить: перевести на `uploadOrRefuse()` и завершить задание словом отказа — вне зон всех блоков |

## Что я готов отдать

| Блоку | Что | Форма | Инварианты |
|---|---|---|---|
| C, 4/4, кабинет | Словарь причин | `packages/plugin-contracts/src/buffer-overflow/reasons.ts`: `BUFFER_OVERFLOW_REASONS = { DEVICE_BUFFER_FULL: 'device_buffer_full', USER_STORAGE_FULL: 'user_storage_full' } as const`, `type BufferOverflowReason`, `isBufferOverflowReason(value): value is BufferOverflowReason` | Закрытый набор; прочие причины (T15) добавляются в тот же объект; литералы snake_case; никакого HTTP-кода и общего `quota_exceeded` |
| C, 4/4 | Тип тела отказа | `refusal.ts`: `BufferOverflowRefusal = { ok: false; reason: BufferOverflowReason; buffer: QuotaAxis; userStorage: QuotaAxis; overflowPolicy: OverflowPolicy; overflowId: string; overflowAt: string }`, `QuotaAxis = { usedBytes: number; limitBytes: number }`, предикат формы `isBufferOverflowRefusal(value)` | `usedBytes`/`limitBytes` — целые ≥ 0, те же оси и та же арифметика, что `GET /v1/devices/:id/quota` (`backend` из `/quota` в отказе **не несётся**); `overflowAt` — ISO-8601 UTC; `overflowId` — непрозрачная строка, сравнение только `===` |
| C | Транспорт отказа | `POST /v1/devices/:deviceId/collections/:collectionId/samples` → HTTP **200** + тело выше при полном буфере/хранилище; **201** + `SampleResponseDto` при успехе; **413** только от `@fastify/multipart` (файл > `MAX_UPLOAD_BYTES`), без `reason` | Один `overflowId`/`overflowAt` на все отказы одного эпизода (проверено 100 отказами); новый эпизод — после того как сервер увидел место (успешная загрузка в ось, удаление/перенос из оси, очистка через `SamplesService.delete`) |
| C | Что считать «тем же эпизодом» | `overflowId` равен → тот же факт; отличается → новый факт | После рестарта media открытый эпизод переоткрывается с **новым** id (носитель — память процесса, см. CONCEPT §5). C в удержании проб не шлёт, поэтому новый id доедет только после действия человека — C решает, как встречать иной id при живом удержании |
| B | Тип политики | `refusal.ts`: `OVERFLOW_POLICIES = { STOP: 'stop', SMART_CLEANUP: 'smart_cleanup' } as const`, `type OverflowPolicy`, `isOverflowPolicy` | Если B возьмёт этот union для поля `bufferPolicy` — второго набора строк не будет |
| Интеграция | Субъект оси | `QuotaSubject = 'buffer' \| 'userStorage'` — ключи ответа `/quota` как строки, единственная связь «ось ↔ причина» в `refusalReasonFor(subject)` | Тарифный датасет — не субъект квоты (как сегодня) |

## Мои стабы (исполняемые, в моей зоне)

| Стаб | Замещает | Где живёт |
|---|---|---|
| `TEMPORARY_OVERFLOW_POLICY_UNTIL_BLOCK_B = 'stop'` | поле `bufferPolicy` блока B | `packages/background-media/src/modules/samples/overflow-policy.temporary.ts` — **боевой** файл (не `stubs/`: боевому коду стабы импортировать запрещено зубом `stubs-not-in-production`); временность — в имени файла, константы и шапке |
| Относительный `import type` словаря из `plugin-contracts/src/buffer-overflow` | экспорт из бареля пакета (общий файл, интеграция) | шапка `buffer-overflow-refusal.ts` |
| Моки `DevicesService.getQuota`, `CollectionsService.getOwned`, `BlobStorageService`, `AudioIngestService`, `PrismaService` | соседние сервисы media (не блоки коворка) | `samples.service.refusal.test.ts` |
| Инжектируемые часы `OVERFLOW_EPISODE_CLOCK` | время сервера | `overflow-episode-registry.ts` (токен), тесты |

## Долги, названные заранее (не швы — внутренние)

- Правило отбора оси (`buffer` / `userStorage` / вне квоты) существует дважды на сервере:
  `DevicesService.getQuota` (зона B) и `resolveQuotaSubject` в mapper A. Дублируется **правило**,
  не строки словаря. Свести в одно место — после того как B откроет `devices/**` (интеграция
  или отдельный PR).
- Свагер-снимок: `verify-swagger.mjs` теперь судит и формы ответа upload, не только пути.
