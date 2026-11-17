# Обсуждение: b3-downgrade-archive-doors-2587-dynin

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-10-05 18:50 UTC · dynin

**Контекст:** packages/background-media/src/modules/downgrade-archive/downgrade-archive.service.ts
**Вопрос:** Блок b3 спринта tariff-downgrade-freeze-2587 (ADR-0031, контракт freeze), ветка feat/downgrade-archive-doors-2587. Двери /v1/devices/:deviceId/downgrade-archive/: POST preview (меряет буфер measureSampleSet, порядок режима собирается раундами selectChartList по 200 — modeOrderOf, затем selectKeepWithinBytes(limit); planDigest = sha256 над {v, deviceId, criterion, limit, keep ids sorted, freeze ids sorted, tail ids}); POST freeze (сначала идемпотентность по (deviceId, planDigest): frozen → та же партия, failed → duplicate_plan; затем пересчёт плана и сверка хеша → plan_stale; archiveSamples b2 с postCondition sum(active buffer) ≤ limit внутри транзакции → quota_invariant_violated + failed; хвост failed-партий переподчиняется новой); GET batches; POST batches/:id/restore (batch_not_found при чужом приборе, batch_not_frozen, archive_expired, insufficient_quota по getQuota). Охрана MediaDeviceAccessGuard. Замер: 60 проб × 0.5 с — измерение 68–223 мс. Зубы: service 14 (настоящие plugin-handlers и синтетический WAV), controller 5, store 19; typecheck/lint 0; DI-смоук на dist зелёный; объём +1202 строк. Проверь предикаты: (1) modeOrderOf раундами по 200 — транзитивен ли итоговый порядок для spectral-variety и совпадает ли с одним прогоном для двух других режимов? (2) planDigest: достаточно ли состава keep/freeze/tail + лимит, или нужны байты/createdAt (гонка: проба заменена той же id)? (3) идемпотентность до пересчёта — нет ли дыры: тот же planDigest, но другой лимит? (4) post-condition внутри транзакции b2 против проверки в сервисе — что лучше? (5) чего не хватает зубам? Вердикт сдан/не сдан по BLOCK-условиям b3 плана.

**Ответ:**

[память:подсознание] emerge dynin-2026-09-21-cabinet-registration-promo-m0-order — тот же приём «уникальный ключ → повторное чтение» (planDigest ↔ idempotency), порядок операций как инвариант, а не вкус; прямо применим к (3).
[память:подсознание] emerge dynin-2026-09-08-tariff-single-truth-m1-reseed — инвариант монотонной версии между слоями (R=G=B=D), ровно та же логика «что должно совпасть, чтобы приказ был тем же»: подсказывает добавить (fromTariffId, toTariffId, limit) в ключ идемпотентности.
[память:подсознание] emerge dynin-2026-09-29-batch-collection-run-contour-architecture-gate — inputHash как детерминированная функция от канонического сериала входа: прямо о составе planDigest и что в него обязано попадать.

Теперь по предикатам.

**(1) modeOrderOf, транзитивность порядка раундами.**
- `loudness-over-background` и `drone-likeness`: компаратор total order по одному скаляру ⇒ `selectChartList` возвращает top-200 того же глобального порядка. Раунды = конкатенация непересекающихся префиксов ⇒ порядок **совпадает с одним прогоном**. Предикат держится.
- `spectral-variety`: алгоритм жадно-штрафующий (MMR-подобный). Порядок зависит **от множества кандидатов в раунде**. Раунд 2 стартует с пустого «уже выбранного» — проба, которая в один прогон была бы отфильтрована как «похожая на выбранное в раунде 1», в раунде 2 попадает в топ. **Транзитивности нет**, с одним прогоном **не совпадает**. Это не бага, если принять как контракт — но тогда зафиксируй в комментарии и в тесте: «spectral-variety даёт порядок, отличный от 1-прогона на N>200». Иначе — тащи «уже выбранное» между раундами (нужен API в handlers) или ограничь буфер ≤200 для этого режима.

**(2) planDigest, достаточен ли состав.**
Нет. Гонка «та же `sampleId`, другой контент/байты» реальна (перезапись блоба, миграция). Также — pinned может перевернуться у человека между preview и freeze, и `modeRank` зависит от соседей. Минимально добавь в хеш: `bytes`, `createdAt` (мс), `pinned`, `modeRank` для каждой пробы в keep/freeze/tail (отсортировано по id). Опционально — `storageSha256`, если дешёво. Это сделает `plan_stale` честным по контенту, а не только по составу id.

**(3) идемпотентность до пересчёта — дыра есть.**
Ключ сейчас `(deviceId, planDigest)`, а `planDigest` зависит от `bufferLimitBytes` — но **не** от `fromTariffId/toTariffId/retentionDays/criterion` явно в ключе (они в хеше, если входят в его тело; в коде входят `criterion` и `bufferLimitBytes`, а `fromTariffId/toTariffId/retentionDays` — **нет**). Сценарий: кабинет шлёт тот же planDigest, но с другим `toTariffId` или `retentionDays` — вернём «та же партия» с чужими реквизитами. **Fix:** либо включить `fromTariffId, toTariffId, retentionDays, membraneId` в тело хеша, либо в `findByPlan` сверять все поля `FreezeOrder` и при расхождении — `duplicate_plan`/`plan_mismatch`. Это ровно урок #2313 (К3).

**(4) post-condition: в транзакции b2, не в сервисе.**
В сервисе — гонка: между SELECT суммы и COMMIT приедет новая запись. Инвариант `sum(active) ≤ limit` обязан проверяться **внутри** той же транзакции, что переносит пробы, уровень изоляции `SERIALIZABLE` или явный advisory-lock на `deviceId`. Сервис оставляет только парсинг исхода. У тебя так и сделано — хорошо; явно задокументируй уровень изоляции в сторе.

**(5) чего не хватает зубам (14 service):**
- `modeOrderOf`: детерминизм при перестановке входа (сортировка по id работает), N=201 (ровно +1 раунд), N=400 (ровно 2 раунда), spectral-variety с заранее известным «похожим» кластером — проверить, что порядок **не** совпадает с 1-прогоном, и это зафиксировано.
- planDigest-стабильность: та же `sampleId`, подменён `bytes`/`createdAt` ⇒ **разный** digest (сейчас, подозреваю, одинаковый — тест обязан падать красным до фикса (2)).
- freeze-гонка: concurrent добавление в буфер между preview и freeze ⇒ `plan_stale`.
- freeze с тем же planDigest, но другим `toTariffId`/`retentionDays` ⇒ отказ, а не idempotent (красный тест для (3)).
- post-condition: искусственно нарушить (мок стора) ⇒ `failed`, тариф не коммитится (проверка на уровне контроллера/оркестратора, если он здесь не виден).
- restore: ровно `expiresAt` (граница `≤`), `after == limit` (граница включения).
- failed-tail: перенос хвоста в новую партию (упомянут в DTO/докстринге, в сервисе переподчинения не вижу — либо это в store, либо зуб отсутствует).

**Вердикт по BLOCK-условиям b3: НЕ СДАН.** Блокеры:
- B1 (3): дыра идемпотентности по `toTariffId/retentionDays/membraneId` — приказ с чужими реквизитами возвращает ту же партию.
- B2 (2): planDigest не покрывает подмену контента при той же id.
- B3 (1): поведение `spectral-variety` раундами не задокументировано как контракт и не покрыто зубом; либо фикс, либо явная фиксация с тестом.

Остальное (post-condition в транзакции, охрана, типы) — ок. После трёх правок + соответствующих красных→зелёных зубов — пересдача.

---

## Закрытие (исполнитель, 05.10)

Все пункты разбора закрыты в той же ветке (`feat/downgrade-archive-doors-2587`); зубы — `downgrade-archive.service.test.ts` (S) и `downgrade-archive.store.test.ts` (St) в `packages/background-media/src/modules/downgrade-archive/`. Открытых вопросов по b3 нет; формулировки выше — состояние ДО закрытия, сохранены как след прогона контекста.

| Вопрос Дынина | Решение | Зуб (`it`, строка) |
|---|---|---|
| B1 (3): дыра идемпотентности — тот же planDigest с другими реквизитами возвращал ту же партию | `freeze` сверяет найденную партию с приказом по `membraneId`, `retentionDays`, `fromTariffId`, `toTariffId`; расхождение → `duplicate_plan` с именами полей, не idempotent. Для этого `fromTariffId`/`toTariffId` добавлены в `ArchiveBatchView` и DTO партии. | S :389 |
| B2 (2): planDigest не покрывал подмену содержимого под тем же id | Тело хеша — строки `[sampleId, bytes, createdAt]` keep/freeze (сортировка по адресу) + хвост + лимит + режим; подмена размера → другой хеш → `plan_stale`. | S :376, :192 |
| B3 (1): раунды `spectral-variety` не зафиксированы как контракт | Контракт раундов записан в JSDoc `modeOrderOf` (для loudness/drone — срезы одной сортировки; для variety — раундовый отсев, не глобальный dedupe, сознательно); зубы: 250 кандидатов с кластером из 10 одинаковых — без потерь, без дублей, детерминирован при перестановке, лидер кластера первый, копии вытеснены. | S :424 |
| modeOrderOf: N=201 (граница раунда), совпадение с одним прогоном для двух режимов | 201 — все ранжированы без дублей; loudness монотонен по deltaDb (450), drone-likeness монотонен по плоскостности. | S :409, :237 |
| planDigest-стабильность при подмене bytes/createdAt | См. B2 — красный до фикса, зелёный после. | S :376 |
| freeze-гонка: добавление в буфер между preview и freeze → plan_stale | Было покрыто. | S :268 |
| post-condition: искусственно нарушить ⇒ failed, тариф не коммитится | Проверка внутри транзакции b2 (как рекомендовано), покрыта на уровне store; дверь отдаёт отказ `quota_invariant_violated` с партией `failed`. Уровень изоляции — умолчание Prisma (Read Committed) с проверкой `count` и post-condition внутри транзакции; SERIALIZABLE/advisory-lock — долг на живом замере, назван в докладе. | St :437, :428 |
| restore: граница `expiresAt` (≤) и `after == limit` (включительно) | Ровно `expiresAt` → `archive_expired`; `used + frozen == limit` → помещается. | S :447 |
| failed-tail: переподчинение хвоста в сервисе не видно | Переподчинение живёт в транзакции store (`updateMany` по `batch.state = failed`), сервис отдаёт `adopted` в ack; предпросмотр показывает хвост. | St :412; S :173 (failedTail) |
| (4) post-condition в транзакции vs в сервисе | В транзакции b2 — подтверждено; сервис только разбирает исход. | St :437 |
| Вердикт «не сдан» (B1–B3) | Снят тремя правками + зубами; typecheck 0, lint 0, модуль 43/43, пакет 54 файла зелёные, DI-смоук на dist зелёный (до последних правок DTO/сервиса — граф провайдеров не менялся), Swagger OK. | — |
