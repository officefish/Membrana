# Обсуждение: b2-downgrade-archive-schema-2587-vesnin

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-10-05 17:54 UTC · vesnin

**Контекст:** packages/background-media/src/modules/downgrade-archive/downgrade-archive.store.ts
**Вопрос:** Блок b2 спринта tariff-downgrade-freeze-2587 (ADR-0031, решения 2 и 4), ветка feat/downgrade-archive-schema-2587. Сделано: prisma-модели DowngradeArchiveBatch (deviceId, membraneId, reason, from/toTariffId, criterion, planDigest, retentionDays, frozenAt, expiresAt, state enum frozen|restored|deleted|failed, restoredAt, deletedAt, keptBytes, frozenBytes; @@unique([deviceId, planDigest]); индексы (expiresAt), (deviceId, state)) и DowngradeArchivedSample (строка Sample целиком под тем же id, batchId FK NoAction, deviceId FK Cascade, modeRank nullable, archivedAt); миграция снимком SQL рукой (migrate dev не гонялся); store (файл в билете): archiveSamples — транзакция findMany→create batch→createMany archived→deleteMany sample, partial → failed + partial_freeze, повтор planDigest → duplicate_plan через P2002; restoreBatch — обратный перенос, только frozen и до expiresAt; listBatches; failedTailOf; purgeExpired(now,{dryRun}) — кандидаты предикатом isPurgeDue, без dryRun — отказ purge_not_implemented; markPurged — условный updateMany с проверкой count. Двери и провод в AppModule — b3. getQuota не менялся; зуб P2: после переноса занятое буфера уменьшилось ровно на bytes на настоящем DevicesService. 12 зубов зелёные, 52 старых файла зубов media зелёные. Проверь границы: (1) NoAction вместо Restrict на batchId — верно ли обоснование (каскад от Device)? (2) Транзакция: порядок create batch → createMany → deleteMany; есть ли дыра между findMany и deleteMany для параллельной загрузки/удаления той же пробы? (3) Контракт purgeExpired/markPurged достаточен для #2588? (4) Что в store лишнее для b2 или чего не хватает b3? Вердикт сдан/не сдан по BLOCK-условиям b2 плана.

**Ответ:**

[память:подсознание] emerge vesnin-2026-09-01-library-open-api-m1-ownership — та же магистраль владения `Device → Sample`: здесь архив живёт на том же корне, и каскад от `Device` — продолжение той цепочки, не новая.

**Конструкция.** Партия — узел между прибором и строками архива. Корень владения один: `Device`. `DowngradeArchiveBatch.deviceId` держит каскад, `DowngradeArchivedSample.batchId` — NoAction: при удалении прибора строки архива уйдут напрямую по своему `deviceId Cascade`, а батч — по своему; FK между ними не должен тянуть лишнюю цепочку. Это согласованно.

**По пунктам:**

1. **NoAction на batchId — верно.** Обоснование держится: обе таблицы висят на `Device` каскадом, двойной каскад создаёт неоднозначность путей удаления (в MSSQL — ошибка, в Postgres — работает, но путь неявный). Явный NoAction + Cascade от корня = один детерминированный путь. Это конструктивно, а не декоративно.

2. **Дыра между `findMany` и `deleteMany` есть, но безопасная при RR, опасная при RC.** В одной транзакции между `findMany` и `deleteMany` параллельный писатель может: (а) удалить пробу — тогда `deleteMany` вернёт меньше, чем `createMany` создал в архиве → **фантом в архиве без исходника** (строка-то уже скопирована из прочитанного снимка); (б) обновить `sizeBytes` — `frozenBytes` разъедется с фактом. Лечится одним из двух: либо `SELECT … FOR UPDATE` на `findMany` (Prisma — `$queryRaw`), либо проверять `count` у `deleteMany` и падать в rollback, если `!== rows.length`. Второе дешевле и в стиле `markPurged`. **Это зуб, который стоит добавить в b2** — иначе `frozenBytes` и `keptBytes` врут при гонке с загрузкой/удалением.

3. **Контракт `purgeExpired/markPurged` для #2588 — достаточен по форме, но не хватает одного шва.** `purgeExpired(dryRun)` → список кандидатов, снаружи уборщик удаляет блобы, потом `markPurged` условным апдейтом. Хорошо, что `WHERE` повторяет предикат — это одно место правды. Чего нет: **удаления строк `DowngradeArchivedSample` до `markPurged`**. Либо `markPurged` сам удаляет строки в той же транзакции с апдейтом (если `count === 1`), либо отдельный метод `deleteBatchRows(batchId)`, который #2588 вызовет между блобами и `markPurged`. Иначе `deleted`-партия с живыми строками — ложь схемой, та самая, которой ты избегаешь отказом `purge_not_implemented`.

4. **Лишнего в b2 нет.** Не хватает для b3: (а) чтение одной партии `getBatch(batchId)` для предпросмотра возврата; (б) агрегат «сколько байт в архиве прибора по `frozen`» — пригодится b3 для витрины, но может подождать. Двери b3 построятся на том, что есть.

**Вердикт: не сдан.** BLOCK: гонка findMany↔deleteMany не закрыта (пункт 2) — это нарушение инварианта «frozenBytes = сумма байт перенесённых». Правка на час: проверка `count` у `deleteMany` с rollback. После этого — сдан.

---

## Закрытие (исполнитель, 05.10)

Все пункты разбора закрыты в той же ветке (`feat/downgrade-archive-schema-2587`, PR по b2); зубы — `packages/background-media/src/modules/downgrade-archive/downgrade-archive.store.test.ts`. Открытых вопросов по b2 нет; формулировки выше — состояние ДО закрытия.

| Вопрос Веснина | Решение | Зуб (`it`, строка) |
|---|---|---|
| (1) `NoAction` вместо `Restrict` на `batchId` — верно ли обоснование | Подтверждено: обе таблицы висят каскадом на `Device`, `RESTRICT` проверяется немедленно и ломает каскад прибора; `NO ACTION` — в конце оператора. Обоснование записано в миграции и в комментарии модели. | схема; без БД зубом не покрывается — проверка на первом `migrate deploy` стенда (названо в шапке миграции) |
| (2) BLOCK: дыра `findMany` ↔ `deleteMany` — фантом в архиве, `frozenBytes` врёт | Сверка `count` у `deleteMany` с `rows.length`; расхождение бросает `ConcurrentChange` ВНУТРИ транзакции → откат целиком; снаружи отказ `concurrent_change`, партии нет. Стаб транзакции в зубе умеет откат. | :342 |
| (3) `deleted`-партия с живыми строками — ложь схемой | `markPurged` стал транзакцией: условный `updateMany` → при `count === 1` в той же транзакции `deleteMany` строк партии; ответ несёт `deletedRows`. При отказе строки целы. #2588 удаляет блобы ДО вызова (`storageRef` из строк). | :363, :313 |
| (4а) не хватает `getBatch(batchId)` для предпросмотра возврата | Добавлен. | :378 |
| (4б) агрегат «байт в архиве прибора по frozen» | Отложено до b3: `listBatches` уже отдаёт `frozenBytes` и `state` по партиям — сумма считается вызывающим без нового запроса; отдельный агрегат заводить при замере витрины. | :329 |
| Вердикт «не сдан» по п. 2 | Снят правкой п. 2; typecheck 0, lint 0, зубы store 15/15, старые зубы media зелёные. | — |
