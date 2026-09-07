# Interface Contract — `cowork-buffer-full-stop`

Phase 3 коворка. Сведено координатором (сессия Б) 06.09.2026 после одновременного вскрытия
трёх `EXPECTATIONS.md` на freeze-тегах `f05e4bdc` (A), `769fbbc8` (B), `b420c930` (C).
Протокол вскрытия: [`cowork-sprint-cowork-buffer-full-stop-interface-consilium.md`](../../discussions/cowork-sprint-cowork-buffer-full-stop-interface-consilium.md).

Правило контракта: **блоки не переписываются**; каждая строка ниже либо уже совпадает у обоих
концов, либо гасится адаптером из §5. Расхождений, требующих ведущей модели (S-C2), нет.

## 1. Сигнатуры на швах

### Шов `A → C` — отказ загрузки (сервер → прибор)

| Сторона | Что | Форма |
|---|---|---|
| A отдаёт | тело отказа | `POST /v1/devices/:deviceId/collections/:collectionId/samples` → HTTP **200** + `BufferOverflowRefusal = { ok:false; reason: BufferOverflowReason; buffer: QuotaAxis; userStorage: QuotaAxis; overflowPolicy: OverflowPolicy; overflowId: string; overflowAt: string }`; успех — **201** + `SampleResponseDto`; **413** только от `@fastify/multipart` (тело больше `MAX_UPLOAD_BYTES`), без `reason` |
| A отдаёт | словарь | `@membrana/plugin-contracts` → `buffer-overflow/`: `BUFFER_OVERFLOW_REASONS { DEVICE_BUFFER_FULL:'device_buffer_full', USER_STORAGE_FULL:'user_storage_full' }`, `isBufferOverflowReason`, `OVERFLOW_POLICIES { STOP:'stop', SMART_CLEANUP:'smart_cleanup' }`, `isOverflowPolicy`, `isBufferOverflowRefusal(value): value is BufferOverflowRefusal`, типы `BufferOverflowReason`, `OverflowPolicy`, `QuotaAxis`, `QuotaSubject`, `BufferOverflowRefusal` |
| C принимает | путь отправки | `ServerStorageBackend.putSample` при `200 { ok:false }` бросает `DomainError('…','SAMPLE_REFUSED', refusal)` и зовёт статических слушателей `ServerStorageBackend.onSampleRefusal(listener)`; `413` → `PAYLOAD_TOO_LARGE` (не квота); бэкенд словаря **не знает** — литерал судит носитель удержания через `isBufferOverflowRefusal` |
| Решено | пакет словаря | **`@membrana/plugin-contracts`** (замер: `background-media` не зависит от `core`). C ждал `@membrana/core` — гасится адаптером §5 A-3 (замена импорта + строки зависимостей `apps/client`, `apps/cabinet`) |

### Шов `B → A` — политика прибора в поле ответа (настройка → свидетельство)

| Сторона | Что | Форма |
|---|---|---|
| B отдаёт | поле | `Device.bufferPolicy: BufferPolicyMode` (enum БД `stop \| smart_cleanup`, NOT NULL, DEFAULT `stop`) + `Device.bufferPolicyParams: Json?`; миграция с backfill `stop` до NOT NULL |
| B отдаёт | чистый читатель | `effectiveBufferPolicy(row) → { mode, params }` (`modules/devices/buffer-policy.ts`, без сети и Prisma; `⊥` → `stop`; `smart_cleanup` без полного S → `stop`) и `DevicesService.getEffectiveBufferPolicy(deviceId)` |
| A принимает | параметр mapper'а | `SamplesService.uploadOrRefuse` передаёт политику в mapper параметром; сегодня — `TEMPORARY_OVERFLOW_POLICY_UNTIL_BLOCK_B` |
| Решено | как A читает | **чистой функцией `effectiveBufferPolicy(device).mode` на уже загруженной строке `Device`** (A её держит для квоты) — без второго чтения базы и без прямого чтения колонки (требование B: порча → `stop`, не падение). Временный файл удаляется (адаптер §5 A-1) |
| Решено | тип режима | один union: B принимает `OverflowPolicy` из `plugin-contracts` вместо своих четырёх копий `BUFFER_POLICY_MODES` (media, cabinet, cabinet-UI, client) — адаптер §5 B-1; enum Postgres — не копия строк TS, остаётся |
| Решено | словарь отказов записи | `unknown_mode · params_incomplete · params_invalid · binding_active · binding_not_confirmed · node_not_paired` — **отдельный закрытый список B**, не union A: другая дверь (запись настройки), другой субъект; оба блока сказали это независимо |

### Шов `B → C` — эффективная политика на приборе (сервер → зеркало)

| Сторона | Что | Форма |
|---|---|---|
| B отдаёт | канал | поле `bufferPolicy: { mode, params }` в корне ответа `GET /v1/devices/:deviceId/quota` — уже пропущено через `effective()` на сервере |
| B отдаёт | читатель | `createBufferPolicyReader(source: () => Promise<unknown>) → { refresh(), current(), subscribe(listener) }`; `current()` до первого чтения и после неудачи — `stop` (`never_received` / `sync_failed` / `malformed`); тип результата не содержит `'auto-cleanup'` |
| C ждал | вход | `getEffectiveOverflowPolicy(): 'stop' \| 'smart_cleanup'` синхронно + `subscribeEffectiveOverflowPolicy(listener)`; сегодня — `stubs/effective-policy.stub.ts` |
| Решено | мост | адаптер §5 BC-1: `reader.current().policy.mode` ↔ `getEffectiveOverflowPolicy`, `reader.subscribe` ↔ подписка C; **источник** — сырой `/quota` (`ServerStorageBackend.getQuota()` отбрасывает поле → добавляется `getQuotaRaw()`), **частота** — vitals C (≥ 1/мин при удержании) и штатное чтение квоты; читатель в сеть не ходит |
| Решено | главенство | эпизод удержания хранит `overflowPolicy` **из ответа сервера**; при расхождении с чтением `/quota` прибор верит отказу (C) — B не возражает |
| Решено | `smart_cleanup` до T12 | локальный страж при `smart_cleanup` молчит (`HoldActivation = 'ignored'`, C); **серверный отказ входит в удержание при любой политике** (сервер отказал — писать некуда); панель показывает режим, алгоритма нет |
| Решено | хозяин слова | `micBufferRecorderPluginState.bufferPolicy` становится **зеркалом** `reader.current().policy.mode`; умолчание `'auto-cleanup'` в плагине и ветка автоочистки в `stopDecision` недостижимы (адаптер §5 BC-2); тип `BufferPressurePolicy` в `media-library` расширяется до `OverflowPolicy`, литерал `'auto-cleanup'` снимается |

### Шов `C → кабинет` (внутри одного блока — только проводка)

`RuntimeStatePayload.overflowHold?: { phase:'held_local'\|'held'; reason; overflowId; overflowAt; policy } \| null`
(core + wire кабинета синхронны, `verify:wire-sync` OK); `resolveNodeVitality → 'dead' \| 'stopped_buffer_full' \| 'alive'`,
`NODE_DEAD_SILENCE_MS = NODE_RECENT_PRESENCE_WINDOW_MS` (300 с — единственный порог);
`<NodeOverflowHoldLine vitality hold />`. Проводка в `NodesPage.tsx` — адаптер §5 C-1.

## 2. Что отдаётся дальше — 4/4 (#2310), не блок

От C: `getDeviceOverflowHold().subscribeWindowSignal(s)` — `OverflowWindowSignal = { overflowId, episode, cause:'entered'\|'start-refused', attempt }`,
`entered` ровно один на `overflowId`; `isHeld()`, `getEpisode()` (несёт `reason`, `overflowId`, `overflowAt`,
`policy`, `buffer`, `userStorage` — окно без второго запроса квоты), `release('human')` — единственный ручной выход.
От A: словарь причин для таблицы код→текст. От B: `mode`/`params` через читатель.

## 3. Инварианты потока данных

| # | Инвариант | Владелец |
|---|---|---|
| I1 | **Эпизод** = `overflowId` + `overflowAt`; чеканятся вместе при первом отказе; ключ `deviceId × subject` (буфер и хранилище одного прибора — два независимых эпизода) | A |
| I2 | Один `overflowId` на все отказы эпизода; новый эпизод — когда сервер увидел место (успех в ось, удаление/перенос/очистка через `SamplesService.delete`) | A |
| I3 | Носитель эпизода — **память процесса media**: рестарт media = открытый эпизод переоткрывается новым id. Порт `OverflowEpisodeStore { open, release, peek }` есть; долговечная реализация — названный долг, не этот спринт | A · долг |
| I4 | Владелец времени факта — сервер (`overflowAt` ISO-8601 UTC); прибор хранит зеркало, не чеканит | A/C |
| I5 | При удержании и `stop`: исходящих POST проб = 0 (шлюз `setSampleUploadGate`), ретраев нет; живут heartbeat 120 с, `GET /quota` ≥ 1/мин, состояние узла с push при входе/повышении/сбросе | C |
| I6 | Следствие I3+I5: пока прибор удержан, иной `overflowId` физически не приходит (POST = 0); придёт после `release('human')` → C заводит новый эпизод и **новый сигнал окна** (`activateFromServer`: иной id при живом удержании = `entered`). Локальный эпизод (без id) повышается до серверного без сигнала | C |
| I7 | Выход из удержания — только `release('human' \| 'cleanup')`; появление места удержание не снимает; удержание переживает рестарт сценария и перезагрузку страницы (`localStorage`, восстановленный эпизод окна не поднимает) | C |
| I8 | Политика: `effective(⊥) = effective(порча) = effective(smart без S) = stop` на всех трёх носителях (media, кабинет, клиент); `sync_failed = stop`, не «последнее валидное» (таблица вердикта M1) | B |
| I9 | Разбор отказа — только по `reason` (не по HTTP-коду, не по `message`); клиент судит по телу `ok`, не по 200/201 | A/C |
| I10 | Единицы: `usedBytes`/`limitBytes` — целые ≥ 0 байт, те же оси и та же арифметика, что `/quota`; `backend` из `/quota` в отказе не едет | A |
| I11 | Литералы словаря отказа и режимов существуют в монорепо **в одном месте** (`plugin-contracts`); стаб C и четыре копии B умирают на интеграции; структурный зуб A расширяется на `apps/client`, `apps/cabinet`, `background-cabinet` | интеграция |

## 4. Глоссарий стыка

| Термин | Значение | Не путать с |
|---|---|---|
| **отказ (загрузки)** | `200 { ok:false, reason ∈ BufferOverflowReason }` на POST пробы | **отказ записи настройки** — `200 { ok:false, reason }` на ручках политики B (другой список) |
| **эпизод переполнения** | факт «полон» от первого отказа до освобождения места; `overflowId` + `overflowAt` | сессия/сценарий прибора |
| **`overflowPolicy`** | поле ответа отказа — снимок политики на момент отказа | **`bufferPolicy`** — поле настройки прибора (`mode` + `params`) |
| **эффективная политика** | `bufferPolicy` после `effective()`: с умолчанием `stop` на всех дырах | сырое значение колонки |
| **привязка (binding)** | галочка «применить ко всем» у мембраны: пока стоит — источник истины политика мембраны для всех приборов, включая будущие | снимок значения на приборы |
| **удержание (hold)** | состояние прибора `DeviceOverflowHold`: `held_local` (свой страж, без id) / `held` (серверный id) | остановка сценария целиком |
| **субъект / ось** | `buffer` \| `userStorage` — ключи `/quota` | тарифный датасет (не субъект квоты) |
| **vitality** | `dead` (молчание heartbeat/link-state > 300 с) / `stopped_buffer_full` (линк жив ∧ удержание ∧ `overflowId`) / `alive` | «нет телеметрии» |
| **сигнал окна** | `entered` (один на id) / `start-refused` (на каждую отбитую попытку) | само окно (4/4) |

## 5. Адаптеры — что и где пишется на интеграции

| # | Шов | Адаптер | Порча (красный после интеграции) |
|---|---|---|---|
| A-1 | B→A | Удалить `modules/samples/overflow-policy.temporary.ts`; в `uploadOrRefuse` передать `effectiveBufferPolicy(device).mode` | файл остался / константа в mapper → красный |
| A-2 | A | Барель `packages/plugin-contracts/src/index.ts`: поимённый экспорт `buffer-overflow`; в `buffer-overflow-refusal.ts` относительный импорт → `'@membrana/plugin-contracts' with { 'resolution-mode': 'import' }` | относительный импорт из `src` соседа остался → красный |
| A-3 | A→C | `apps/client`, `apps/cabinet` получают зависимость `@membrana/plugin-contracts` (строки `package.json`); в `device-overflow-hold/{wiring,localGuard}.ts` стаб `refusal-contract.stub.ts` → импорт словаря; каталог `stubs/` удаляется | каталог `stubs/` есть / вторая копия литералов → красный |
| B-1 | B | `BUFFER_POLICY_MODES` в media `devices/buffer-policy.ts`, cabinet `membrane/buffer-policy.ts`, cabinet-UI `bufferPolicyForm.ts`, client `buffer-policy/types.ts` → импорт `OVERFLOW_POLICIES`/`OverflowPolicy` из `plugin-contracts` | четыре копии → красный (структурный зуб I11) |
| BC-1 | B→C | `ServerStorageBackend.getQuotaRaw(): Promise<unknown>` (метод рядом с `getQuota`); мост `apps/client/src/lib/buffer-policy-bridge.ts`: `createBufferPolicyReader(() => backend.getQuotaRaw())`, `getEffectiveOverflowPolicy = () => reader.current().policy.mode`, `subscribeEffectiveOverflowPolicy = reader.subscribe`; `refresh()` — из vitals C и штатного чтения квоты | стаб `effective-policy.stub.ts` остался → красный |
| BC-2 | B→C | Плагин: `bufferPolicy` — зеркало `reader.current().policy.mode`; умолчание `'auto-cleanup'` и `patchConfig({ bufferPolicy: 'auto-cleanup' })` в панели снимаются; `BufferPressurePolicy` в `media-library/buffer-stop.ts` → `OverflowPolicy`, ветка автоочистки недостижима | дефолт `'auto-cleanup'` вернулся → красный (зуб B, поднятый из каталога на плагин) |
| C-1 | C→кабинет | `NodesPage.tsx`: `resolveNodeVitality(...)` + `<NodeOverflowHoldLine />` в карточке; при `stopped_buffer_full` подпись «Сценарий остановлен» заменяется строкой удержания | — |
| C-2 | C | Барель `packages/services/media-library/src/index.ts`: `type SampleRefusal`, `type SampleUploadGate`, `parseSampleRefusal`; в клиенте тип берётся прямым импортом, не из сигнатуры | — |
| X-1 | вне зон | `firebat-node.controller.ts:146` зовёт `upload()`: при отказе получает `200 { ok:false }` через `BufferOverflowRefusedException`, задание остаётся `leased` — **на интеграции не трогать**, долг с билетом (второй вход прибора-узла ADR-0027) | — |
| X-2 | вне зон | `sample-library.service.ts:200` (кабинет): перегрузка `requireOwnedMembrane` ломается от любой новой скалярной колонки `Membrane` — B обошёл таблицей; долг, не этот коворк | — |

Строк в `app.module.ts` не нужно: `MembraneModule` уже импортирует `PairModule` (B); модуль samples регистрирует свои провайдеры сам (A).

## 6. Интеграционный smoke — один сценарий через все швы

1. **B→A.** Строка `Device` с `bufferPolicy = stop` (backfill) → `uploadOrRefuse` при полном буфере → `200 { ok:false, reason:'device_buffer_full', overflowPolicy:'stop', overflowId, overflowAt, buffer, userStorage }`; та же строка с `smart_cleanup` и полным S → `overflowPolicy:'smart_cleanup'`; с `smart_cleanup` и пустым S → `'stop'`. Временной константы в дереве нет.
2. **A→C.** Тот же ответ через фейковый `fetch` в `ServerStorageBackend.putSample` → `SAMPLE_REFUSED` → носитель судит **импортированным** `isBufferOverflowRefusal` → удержание `held` с тем же `overflowId`/`overflowAt` → ровно один сигнал `entered`; 100 повторов → 0 новых сигналов, 0 `fetch`.
3. **C→кабинет.** `runtimeRealtimeBridge` публикует `overflowHold` → `parseRuntimeOverflowHoldPayload` (core) и wire кабинета принимают → `resolveNodeVitality` = `stopped_buffer_full`, `dead` ложен при живом presence.
4. **B→C.** Сырой `/quota` с `bufferPolicy.mode = smart_cleanup` через `getQuotaRaw()` → мост → `getEffectiveOverflowPolicy() = 'smart_cleanup'` → локальный страж `ignored`; серверный отказ при этом всё равно входит в удержание. `/quota` упал → `stop`.
5. **Зеркало.** Панель плагина показывает `stop`/`smart_cleanup` от читателя; литерала `'auto-cleanup'` в `apps/client` и `media-library` нет (grep-зуб).
6. **Структура.** Один носитель литералов словаря в монорепо (`plugin-contracts`); каталогов `stubs/` в блоках нет; `overflow-policy.temporary.ts` нет; `verify:wire-sync`, `media:verify-swagger`, `cabinet:verify-swagger` зелёные.
7. **Собственные зубы всех трёх блоков** зелёные в собранной ветке.
