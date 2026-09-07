# Concept — Block `refusal-contract` (A)

| Поле | Значение |
|------|----------|
| спринт | `cowork-buffer-full-stop` |
| билет | #2307 (вердикт M2, эпик `docs/meeting/buffer-full-stop/EPIC.md`) |
| ветка | `cowork/cowork-buffer-full-stop/refusal-contract` от `edcbbda9` |
| зона | `packages/background-media/src/modules/samples/**` · `packages/plugin-contracts/src/buffer-overflow/**` (новый) · swagger-снимок media · этот каталог |

Документ описывает блок **изнутри**: что он есть сам по себе, без соседей. Что он ждёт от B и C —
в `EXPECTATIONS.md`, не здесь.

## 1. Предмет блока одной фразой

Сервер записей перестаёт отвечать транспортным кодом на доменный факт «места нет» и отвечает
**отказом с эпизодом**: `200 { ok:false, reason, buffer, userStorage, overflowPolicy, overflowId, overflowAt }`.
Словарь причин живёт одним модулем в общем пакете; эпизод переполнения чеканится один раз и
держится, пока сервер не увидит, что место появилось.

## 2. Пакет словаря — `@membrana/plugin-contracts` (по замеру, не по вкусу)

Выбор между `packages/core/src/contracts/buffer-overflow/` и
`packages/plugin-contracts/src/buffer-overflow/`. Замер из брифа: `@membrana/background-media`
**не зависит** от `@membrana/core`, но зависит от `@membrana/plugin-contracts` (строка
`dependencies` и `references` в `tsconfig.json` уже есть). Дополнительно сверено в дереве:

| Факт | Следствие |
|------|-----------|
| `core` и `plugin-contracts` — оба `type: module`, `exports` только с условием `import` | Для CJS-сервера media оба пакета одинаково «ESM-only»: рантайм-значения — лишь через `import()`, типы — `import type … with { 'resolution-mode': 'import' }` (README `plugin-contracts`, прецедент `first-wave.registrar.ts`) |
| `core` у media нет ни в `dependencies`, ни в `references` | Выбор `core` = две строки в общих файлах (`package.json`, `tsconfig.json` media) на интеграции — лишний шов ради того же результата |
| `plugin-contracts` описан как «словарь серверной плагинности; office и media зависят от него, не наоборот» | Словарь отказа сервера записей — того же рода: framework-нейтральный контракт, который media чеканит, а потребители читают |
| `plugin-contracts` есть у `background-cabinet` и `media-library` напрямую; у `apps/client`/`apps/cabinet` — транзитивно | Клиентский разбор (C) сидит в `media-library` (`server-storage-backend.ts`) — прямая зависимость там есть. Если C захочет импорт из `apps/client` напрямую — строка зависимости на интеграции (см. EXPECTATIONS) |

**Решение: `packages/plugin-contracts/src/buffer-overflow/`.** Барель пакета `src/index.ts`
не трогается (общий файл) — экспорт наружу вносит интеграция. До этого media берёт **типы** из
модуля по относительному пути через project reference (`tsc` перенаправит на `dist/*.d.ts`);
импорт назван временным в шапке файла и в EXPECTATIONS (строка «что заменить на интеграции»).

### Содержимое каталога

| Файл | Несёт |
|------|-------|
| `reasons.ts` | `BUFFER_OVERFLOW_REASONS` (const-объект, два литерала M2: `device_buffer_full`, `user_storage_full`), тип `BufferOverflowReason`, `isBufferOverflowReason`. Место для прочих причин (T15) — тот же объект, литералы здесь **не назначаются** |
| `refusal.ts` | `OVERFLOW_POLICIES` / `OverflowPolicy` (`stop` \| `smart_cleanup`), `QuotaAxis { usedBytes, limitBytes }`, `BufferOverflowRefusal` — тип тела ответа, `isBufferOverflowRefusal` (проверка формы для потребителей) |
| `index.ts` | локальный барель каталога (не пакета) — одна точка импорта для интеграции |
| `buffer-overflow.test.ts` | зубы: закрытость набора (ровно два), type-level `Equal`, форма тела |

Стиль — как у `triggers.ts` того же пакета: const-объект → union → предикат. Так один модуль
даёт и рантайм (для ESM-потребителей: кабинет, клиент), и тип (для CJS-сервера).

## 3. Кто «чеканит» литералы и почему у сервера нет третьей копии

Вердикт M2: «пишет/чеканит литералы при отказе — сервер; потребители — только импорт +
exhaustiveness». Из-за границы CJS/ESM сервер не может статически импортировать рантайм-объект
словаря, а динамический `import()` корня пакета до интеграции ничего не даст (барель не тронут).

Поэтому в media — **ровно один модуль**, где литералы существуют:
`modules/samples/buffer-overflow-refusal.ts` (mapper). Каждый литерал в нём объявлен через
`satisfies BufferOverflowReason` — типовая система проверяет его против словаря; переименование
в словаре красит `tsc` media. Всё остальное в media (DTO swagger, сервис, контроллер) берёт
значения из mapper, не пишет строк.

Это и есть «сервер чеканит». Структурный зуб (`buffer-overflow-dictionary.test.ts`) сканирует
`packages/plugin-contracts/src/**` и `packages/background-media/src/**` (боевые файлы) и требует:
каждый литерал встречается **ровно в двух файлах** — `reasons.ts` словаря и mapper media. Порча
«вторая копия строк» (в DTO, в контроллере, в стабе) → красный. Рантайм-сверка: тест media
импортирует `reasons.ts` по относительному пути и утверждает, что набор значений mapper ===
набор значений словаря.

## 4. Mapper «квота → отказ» — один модуль, три чистые функции

`modules/samples/buffer-overflow-refusal.ts`:

| Функция | Вход | Выход |
|---------|------|-------|
| `resolveQuotaSubject(collection)` | `kind`, `systemKey` | `'buffer'` \| `'userStorage'` \| `null` (тарифный датасет — вне квоты, как сегодня) |
| `refusalReasonFor(subject)` | субъект | литерал словаря; `buffer → device_buffer_full`, `userStorage → user_storage_full` — единственное место связи «ось квоты ↔ причина» |
| `buildBufferOverflowRefusal({ subject, quota, overflowPolicy, episode })` | оси `/quota`, политика, эпизод | тело `BufferOverflowRefusal` |

Сегодняшняя развилка в `SamplesService.upload` (`collection.kind === 'buffer' ? quota.buffer : …`)
переезжает в `resolveQuotaSubject` — это та же логика, что в `DevicesService.getQuota`
(строки 150–160), но переписывать `devices/**` нельзя (зона B); mapper дублирует правило отбора
оси, не строки словаря. Отмечено как долг интеграции в EXPECTATIONS (одно правило отбора оси
на сервер — выносится, когда B откроет `devices/**`).

## 5. Носитель эпизода и `overflowAt` — названо, не решено молча

### Что такое эпизод

`used ≤ limit` на сервере держится всегда: загрузка, которая перешагнула бы лимит, отвергается,
и «занято» не растёт. Значит «буфер полон» — не `used > limit`, а **«следующая проба не
влезает»**; и «место освободилось ниже лимита» — не арифметика, а **переход из состояния
«отвергаем» в «принимаем»**. Эпизод = непрерывная серия отказов одного субъекта одного
прибора, не прерванная событием, которое дало место.

### Носитель — память процесса за портом (Phase 2), с явно названной ценой

Кандидаты: (а) память процесса; (б) колонка `Device`; (в) отдельная таблица. (б) и (в) — зона B
(`prisma/**`), бриф разрешает объявить ожидание и получить миграцию на интеграции.

**Выбрано (а): `OverflowEpisodeRegistry` — Nest-провайдер модуля samples, `Map` по ключу
`deviceId + subject`, за узким портом `OverflowEpisodeStore { open, release }`.** Почему это не
компромисс, а адекватный носитель:

- сама квота на сервере **не хранится** — `getQuota` считает `usedBytes` живьём из таблицы
  проб при каждом обращении. Эпизод — производная того же живого состояния; хранить его
  долговечнее, чем саму квоту, значило бы завести второй источник истины;
- единственное, что носитель помнит сверх живого состояния — **`overflowAt` первого отказа**.
  Потеря этой памяти (рестарт media) даёт новый `overflowId` с новым `overflowAt`, и оба
  остаются **истинны**: буфер по-прежнему полон, факт зафиксирован заново;
- долговечная сторона нити `overflowId` по эпику — **зеркало на приборе** (C), не сервер:
  прибор в удержании не шлёт проб (нет ретраев при удержании — данность M3), значит после
  рестарта сервера новый id доедет до прибора только после действия человека (сброс
  удержания) — а это новая попытка, для которой новый факт уместен.

Цена, названная прямо: (1) media в двух экземплярах разошлась бы в id — сегодня media один
контейнер; (2) рестарт → новый id. Порт оставлен ровно для того, чтобы интеграция или B могли
подставить долговечный носитель без правки сервиса (см. EXPECTATIONS, «если нужна
долговечность»).

### Открытие и закрытие эпизода — только по наблюдениям в моей зоне

| Событие | Действие с эпизодом субъекта |
|---------|------------------------------|
| отказ по квоте (`upload`) | `open(deviceId, subject, now)` — идемпотентно: открытый эпизод возвращается тем же `overflowId`/`overflowAt`; новый чеканится только если открытого нет |
| успешная загрузка в ось субъекта (`upload`) | `release` — место было |
| удаление пробы из оси (`delete`; сюда же приходит `buffer-cleanup`, он удаляет через `SamplesService`) | `release` — место дали |
| перенос пробы из оси (`move`, источник) | `release` источника |

`release` при уже закрытом эпизоде — no-op. События вне зоны (рост лимита при смене тарифа в
`devices/**`) не наблюдаются: если после роста лимита проба влезла — `release` сработает по
успеху; если не влезла — эпизод продолжается, и это честно: прибор так и не записал ни байта.

Следствие для оператора: удаление одной маленькой пробы, после которого проба прибора всё
ещё не влезает, даёт **новый** эпизод при следующей попытке. Это действие человека («сброс —
действием человека или очисткой», M3), и второе окно «всё ещё полно» информативно, а не шум.

### `overflowAt`

Чеканится **вместе с `overflowId` при первом отказе эпизода** (кандидат эпика, принят как
есть): ISO-8601 в ответе, `Date` внутри. Источник времени — инжектируемые часы
(`OVERFLOW_EPISODE_CLOCK`, необязательный токен; умолчание `() => new Date()`), чтобы зуб
«100 отказов → одно `overflowAt`» судил детерминированно, а не по скорости машины.

`overflowId` — `randomUUID()`, непрозрачная строка, равенство по `===`, семантики внутри нет
(Математик, M2).

## 6. Как 413 остаётся только транспорту

Сегодня 413 у upload рождается в двух местах: `@fastify/multipart` (`FST_REQ_FILE_TOO_LARGE`,
лимит `MAX_UPLOAD_BYTES` в `main.ts`) — настоящее «тело слишком большое»; и
`PayloadTooLargeException` в `samples.service.ts:131` — квота. Второе убирается целиком:
`PayloadTooLargeException` из модуля samples исчезает (структурный зуб: импорт этого класса в
`modules/samples/**` → красный). Первое не трогается: swagger описывает 413 как «multipart
file exceeds MAX_UPLOAD_BYTES; transport only, no domain reason».

### Два лица `SamplesService`

`upload()` имеет внешнего потребителя вне всех зон — `firebat-node.controller.ts:146` берёт
`sample.id` из результата. Сменить тип возврата = красный typecheck в чужом файле. Поэтому:

| Метод | Возврат | Кто зовёт |
|-------|---------|-----------|
| `uploadOrRefuse()` | `{ ok:true, sample } \| BufferOverflowRefusal` — **основной контракт** | `SamplesController.upload` |
| `upload()` | `SampleDto`, при отказе бросает `BufferOverflowRefusedException` | `firebat-node` (до интеграции) |

`BufferOverflowRefusedException extends HttpException` со статусом **200** и телом отказа: не
транспортная ошибка, а доменный исход, доставленный через исключение там, где вызывающий не
умеет нести объединение. Nest отдаст `200 { ok:false, … }` — тот же контракт M2 на второй двери
загрузки, без правки чужого файла. Ожидание к интеграции: перевести `firebat-node` на
`uploadOrRefuse` и решить судьбу задания при отказе (остаётся `leased`) — вне зоны A.

### Контроллер

`POST …/samples`: `@Res({ passthrough: true })`; при `ok:false` — `reply.status(200)`, тело как
есть; успех — 201 `SampleResponseDto`, как было. Swagger: `@ApiResponse({ status: 200, type:
BufferOverflowRefusalDto })` + `201` + `413` (транспорт). `verify-swagger.mjs` получает предмет:
у пути upload обязаны быть обе формы — `200` со схемой, где `reason.enum` = ровно два литерала,
`ok.enum = [false]`, и `201`; у `413` в описании — слово «transport», в схеме — нет `reason`.

## 7. `overflowPolicy` — временная константа, названная временной

`modules/samples/overflow-policy.temporary.ts`:
`TEMPORARY_OVERFLOW_POLICY_UNTIL_BLOCK_B: OverflowPolicy = 'stop'`. Это **боевой** файл (не
`stubs/` — боевому коду стабы импортировать запрещено зубом `stubs-not-in-production`), а
временность — в имени файла, имени константы и шапке. Mapper принимает политику параметром;
сервис передаёт константу. Интеграция заменяет одну строку в сервисе на чтение поля B и
удаляет файл (порча координатора: файл остался → красный).

## 8. Зубы и порчи (норма 03.09: у каждого — предмет и красный)

| Зуб | Предмет | Порча → красный |
|-----|---------|-----------------|
| `buffer-overflow.test.ts` (plugin-contracts) | `reasons.ts`, `refusal.ts` | третий литерал в объекте → `Equal` красный; `isBufferOverflowReason('quota_exceeded')` → true → красный |
| `samples.service.refusal.test.ts` | `SamplesService.uploadOrRefuse/upload/delete/move`, `OverflowEpisodeRegistry` | вернуть 413 на квоту → `rejects` вместо `ok:false` → красный; новый id на каждый отказ → `new Set(ids).size === 1` красный; не звать `release` в `delete` → «новый эпизод после удаления» красный; `user_storage_full` для буфера → красный |
| `overflow-episode-registry.test.ts` | реестр | `open` без идемпотентности → красный; `release` не закрывает → красный; часы не инжектированы → `overflowAt` плывёт → красный |
| `buffer-overflow-dictionary.test.ts` | исходники двух пакетов | вторая копия строки в media → красный; `PayloadTooLargeException` в `modules/samples/**` → красный |
| `verify-swagger.mjs` | `dist` swagger-документ | снять `@ApiResponse(200)` → красный; `reason` без enum → красный; вернуть «quota exceeded» в 413 → красный |

Каждая порча прогоняется руками до доклада; протокол прогонов — `CHECKS.md` этого каталога.

## 9. Что НЕ строится (границы, повторены для аудита)

Удержание/память на приборе (C); окно (4/4); поле политики и миграция (B); алгоритм очистки
(T12); тарифы в базе (#2297); тексты прочих причин (T15); HTTP-код как причина; общий «квота»
без субъекта; разбор английского текста; правки `firebat-node/**`, `devices/**`, `prisma/**`,
барелей, `package.json`.
