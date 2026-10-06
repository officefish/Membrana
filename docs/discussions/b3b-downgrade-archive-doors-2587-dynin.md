# Обсуждение: b3b-downgrade-archive-doors-2587-dynin

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-10-06 10:13 UTC · dynin

**Контекст:** packages/background-media/src/modules/downgrade-archive/downgrade-archive.controller.ts
**Вопрос:** Блок b3b спринта tariff-downgrade-freeze-2587 (план v3, ADR-0031), ветка feat/downgrade-archive-b3b-2587 от ствола c5c01a65 (b3a влит). Состав: DTO (словарь импортом из downgrade-archive.vocabulary.ts b3a, своих литералов нет), контроллер /v1/devices/:deviceId/downgrade-archive/ под MediaDeviceAccessGuard — POST preview (200 всегда), POST freeze (201 ок / 200 отказ через reply), GET batches, POST batches/:batchId/restore (201/200); модуль: контроллер + сервис провайдером, imports Prisma/Devices/Blob, массивы по строке (сосед #2588 добавит purge); провод в AppModule. Проверки: typecheck/lint 0, зубы модуля 3 файла зелёные (контроллер 5: статусы и приведение чисел), DI-смоук dist под SMOKE_REQUIRE_DIST=1 зелёный, verify-swagger показывает 4 маршрута, дифф +390/−7. Проверь: (1) две формы ответа 201/200 у приказов и 200 у preview — где риск, что Nest перебьёт статус или сериализацию (reply.send vs return)? (2) Number(body.x) на входе: NaN/undefined доезжают до сервиса — достаточно ли его валидации (invalid_limit/invalid_retention), или контроллер обязан отвечать 400? (3) Охрана: MediaDeviceAccessGuard — что он гарантирует про deviceId пути, и закрыта ли чужая партия на restore (сервис сверяет batch.deviceId)? (4) Чего не хватает зубам контроллера? Вердикт сдан/не сдан по BLOCK-условиям b3b плана (дверь без охраны; 201 при отказе/200 при успехе; модуль не в AppModule или смоук красный; принадлежность партии не по deviceId пути).

**Ответ:**

## Всплытие

[память:подсознание] emerge dynin-2026-09-21-cabinet-registration-promo-m4-form-landing — там я уже считал дверь как конечный автомат с матрицей кодов (201/401/403/429/503 + сетевой сбой). Здесь ровно та же задача: зафиксировать матрицу выходов 201/200/4xx и указать, кто за какой код отвечает (Nest default vs reply.status).

[память:подсознание] emerge dynin-2026-08-24-logging-observability-cut-m1-incident-number — формализация «закрытого словаря отказов» и инвариант равенства идентификатора в теле/заголовке. Для b3b прямо релевантно: `reason ∈ vocabulary` — предикат, который зуб обязан проверять, а не доверять строке.

Остальные — про тарифы/ритм/one-shot — к дверям архива не относятся, молчу.

## Вердикт: **сдан условно** (ни одно BLOCK не нарушено, но есть две дыры, которые закрыть до merge)

### 1. Две формы ответа — риск сериализации
- `freeze` и `restore`: `@Res() reply` + `reply.send(outcome)` — Nest **полностью** уступает ответ, свои interceptors/serializers (ClassSerializer, global pipes на output) **не отработают**. Это осознанный выбор; но тогда `outcome` обязан быть уже plain-объектом без Prisma Decimal/Date-инстансов. Проверь зубом: `JSON.stringify(outcome)` идемпотентен и совпадает с DTO-формой.
- `preview`: `@HttpCode(200)` + `return` — ок, идёт через стандартный pipeline. Несимметрия с freeze/restore допустима, но зафиксируй в комментарии (уже есть — хорошо).
- Риск: если в сервисе случайно `throw` после начала работы — Nest exception filter попробует ответить, а reply уже может быть «на подходе». Оберни тело `freeze`/`restore` в try/catch и логируй до `reply.status(...).send(...)`.

### 2. `Number(body.x)` — где граница 400 vs 200 `{ok:false}`
Формально:
- `Number(undefined) = NaN`, `Number(null) = 0`, `Number('abc') = NaN`, `Number('10') = 10`.
- `0` — валидный тип, но, скорее всего, невалидное значение → это **домен** → 200 `invalid_limit/invalid_retention`. ОК.
- `NaN` и отсутствующее поле — это **форма запроса сломана** → по конвенции 400 (ApiBadRequest уже декорирован, но не реализован class-validator).

Рекомендация: добавить `ValidationPipe` на DTO (`@IsInt() @Min(1)` для `bufferLimitBytes`, `retentionDays`; `@IsString() @IsNotEmpty()` для digest/criterion). Тогда:
- 400 — поле отсутствует/не число/≤0 типа ≠ number;
- 200 `{ok:false, reason:'invalid_limit'}` — число валидное по типу, но домен его отвергает (например, превышает физический предел).

Сейчас всё валится в сервис как `NaN` → он обязан возвращать `invalid_limit`. Если это покрыто зубом сервиса — не блокер, но контроллерный слой обязан иметь свой зуб на «пустое тело → 400», иначе клиент получает 200 с доменным кодом на сломанный JSON, что ломает принцип «форма ≠ домен».

### 3. Охрана и принадлежность партии
- `MediaDeviceAccessGuard` гарантирует: токен `X-Membrana-Token` принадлежит `deviceId` из `:deviceId` пути. Это закрывает «чужой прибор».
- Но **не** закрывает «чужая партия того же оператора»: `batchId` в пути не проверяется охраной. Инвариант `batch.deviceId === deviceId` обязан быть в `archive.restore(deviceId, batchId)` — зуб должен это ловить явным кейсом: «batch принадлежит другому deviceId → `batch_not_found`» (не 403, а именно not_found, чтобы не светить существование).

Проверь: в сервисе есть `where: { id: batchId, deviceId }` или эквивалент. Если нет — **это BLOCK** по условию «принадлежность партии не по deviceId пути».

### 4. Чего не хватает зубам контроллера (5 — мало)
Добавь минимум:
- `freeze` возвращает `{ok:false}` → **200**, не 201 (регрессия на HttpCode).
- `freeze` возвращает `{ok:true}` → **201** и тело совпадает с `DowngradeFreezeResponseDto`.
- `restore` чужого `batchId` (принадлежит другому deviceId) → **200 `batch_not_found`**.
- `preview` с пустым body / `bufferLimitBytes: 'abc'` → поведение зафиксировано (сейчас 200 `invalid_limit` — зафиксируй это зубом).
- Охранный зуб: без `X-Membrana-Token` → 401/403 (достаточно одного кейса, что guard смонтирован).
- Идемпотентность `freeze` по `planDigest` → второй вызов 201 с `idempotent:true`.

## BLOCK-резюме
- дверь без охраны — **нет** (guard на классе);
- 201 при отказе / 200 при успехе — **нет** (reply.status выбран корректно);
- модуль не в AppModule / смоук красный — **нет** (DI-smoke зелёный);
- принадлежность партии не по deviceId пути — **проверить сервис** (если `where` без `deviceId` — BLOCK).

Закрой дыру #3 на уровне сервиса (если ещё не) и дыру #2 на уровне контроллерного зуба — тогда безусловный «сдан».

---

## Закрытие (исполнитель, 06.10)

Все пункты разбора закрыты в той же ветке (`feat/downgrade-archive-b3b-2587`); зубы — `downgrade-archive.controller.test.ts` (C) и `downgrade-archive.service.test.ts` (S, влит с b3a #2604) в `packages/background-media/src/modules/downgrade-archive/`. Открытых вопросов по b3b нет; формулировки выше — состояние ДО закрытия.

| Вопрос Дынина | Решение | Зуб (`it`, строка) |
|---|---|---|
| (1) Две формы 201/200 — риск, что Nest перебьёт статус | Приказы пишут статус через `reply.status(...).send(...)` (как загрузка проб, конвенция 12.08), `@HttpCode` у них нет; preview — `@HttpCode(200)` и обычный `return`. | C :40, :49, :63, :94 |
| (2) `Number(body.x)` → `NaN` доезжает до сервиса; нужен ли 400 на форму | Оставлено как у соседей (`buffer-cleanup.controller`: `Number(body.volume)` без валидатора; class-validator в пакете не используется): форма приводится в контроллере, домен отвечает закрытым словарём `invalid_limit` / `invalid_retention` / `unknown_criterion` (S :213, :303). Поведение зафиксировано зубом контроллера: `'abc'` и пустое тело → в сервис `NaN`/`undefined`. 400 на форму — отдельное решение для всех дверей media, не этого блока. | C :86; S :213, :303 |
| (3) Охрана не закрывает чужую партию того же оператора | Сервис сверяет `batch.deviceId !== deviceId` → `batch_not_found` (существование не раскрывается) — было в b3a; контроллер пропускает ответ как 200. Сторож `MediaDeviceAccessGuard` на классе — утверждено зубом по метаданным `__guards__`. | S :350; C :102, :79 |
| (4) Зубов контроллера мало | Добавлены: сторож смонтирован; `'abc'`/пустое тело → `NaN`; повтор freeze `idempotent:true` → 201; чужая партия → 200 `batch_not_found`. Кейс «без X-Membrana-Token → 401» — предмет зуба самого сторожа (`media-device-access.guard`), не контроллера; здесь утверждена его смонтированность. | C :79, :86, :94, :102 |
| BLOCK-резюме: охрана / статусы / AppModule+смоук / принадлежность партии | Все четыре условия выполнены: guard на классе (C :79); статусы (C :40, :49, :63); модуль в `AppModule`, DI-смоук dist под `SMOKE_REQUIRE_DIST=1` зелёный, `verify-swagger` показывает 4 маршрута; принадлежность — в сервисе (S :350). Контроллер 9/9, модуль 3 файла, пакет 54 файла зелёные, typecheck/lint 0. | — |
