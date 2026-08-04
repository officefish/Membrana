<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-08-04T22:49:32.598Z |
| Команда | `yarn consilium` |
| Модель | openrouter/anthropic/claude-sonnet-4.6 |
| Файл | `docs/seanses/static-mmbrn-container-m4-storage-2026-08-04.md` |
| Порядок ролей | Верстальщик → Структурщик → Математик → Teamlead → Музыкант → Архитектор |
| Повестка | `docs\meeting\static-mmbrn-container\M4_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs\meeting\static-mmbrn-container\M4_AGENDA.md` | 11499 | `b1eaf7de2bf1` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs\meeting\static-mmbrn-container\M4_AGENDA.md` | 11499 · 1 п. | `b1eaf7de2bf1` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --no-memory --min-replies 36 --seed 131`

**Вопрос:**

Исполните только S1 M4 с поправками run1 и run2. Выберите одну topology, один FD-3, один lifecycle mechanism и одну непротиворечивую key/dedup model. Везде используйте один ALLOW predicate: free_after >= 12 GiB AND used_after/total < 0.90; soft 0.85 только предупреждает. Checkpoint обязан иметь исполнимый consistent cut и перенос самих bytes в FD-2; RPO gate проверяет age <= 24h. M3 применяется per action; signed URL, TTL, endpoint, download workflow и иные детали M6 запрещены. Список посылок до DoD, DoD последняя секция. Не менее 36 предметных ролевых реплик; без эха, самосчёта и meta.

---

# Консилиум: S1 M4 — хранение и живучесть static.mmbrn.tech

**Повестка:** Назначить один исполнимый контракт физического хранения и живучести байтов `static.mmbrn.tech`: topology, failure domains, object key, integrity, quota, backup/restore, retention, sensitive, связь с M2/M3.

**Участники:** Верстальщик (Rodchenko), Структурщик (Ozhegov), Математик (Dynin), Teamlead (Tarasov), Музыкант (Kuryokhin), Архитектор (Vesnin).

**Порядок реплик:** Верстальщик → Структурщик → Математик → Teamlead → Музыкант → Архитектор

---

[Верстальщик]: Прежде чем двигаться дальше — надо зафиксировать одну вещь про boundaries. M4 не проектирует UI, endpoint или download. Но presentation layer потребляет storage contract через proxy, и если admission fail-closed не определён однозначно, у нас будут неопределённые состояния в интерфейсе. Мне важно понять: кто держит метрику свободного места и когда она становится наблюдаемой на уровне операции? Это нужно не для M6 — это нужно, чтобы contract был выражен.

[Структурщик]: Зафиксирую терминологию: три failure domain — FD-1 (primary bytes), FD-2 (backup bytes), FD-3 (registry/lifecycle metadata). Они не пересекаются по машине, volume, учётной записи и credential. Topology — object storage S3-compatible pattern: bytes живут в FD-1 как immutable objects, registry.jsonl и lifecycle ledger живут в FD-3 как append-only структура на отдельном носителе. Backup bytes в FD-2 — независимый S3-compatible endpoint, другой credential, другой аккаунт. Это единственная непротиворечивая конфигурация, при которой потеря FD-1 не уничтожает ни реестр, ни копию.

[Математик]: Capacity predicate один и применяется везде буквально: ALLOW если `free_after >= 12 GiB` И `used_after / total < 0.90`. Soft watermark 0.85 означает только предупреждение — метрика уходит в алерт, admission не блокируется. Hard watermark 0.90 — admission deny, fail-closed. Office VDS сейчас 9.46 GiB свободно при минимуме 12 GiB — это NO-GO по абсолютному условию, независимо от ratio. Никакого переименования. Предикат должен быть зафиксирован в одной строке и применяться без вариаций в обсуждении, итоге, cases и readiness gates.

[Teamlead]: Стоп. Прежде чем идти в детали — нужен вердикт по двум ключевым развилкам. Первое: lifecycle mechanism — append-only lifecycle ledger, привязанный к immutable record `id`, или новая полная M2 record по правилам M2. Второе: key model — content-addressed `objects/{sha256_64hex}` с dedup, или record-scoped key без dedup. Эти два решения определяют всё остальное. Без них у нас не архитектура, а набор намерений. Прошу Архитектора и Структурщика дать позицию немедленно.

[Музыкант]: Добавлю практическое наблюдение: sensitive PDF партнёра сейчас не имеет доказанного переносимого storage path — это не абстрактный риск, это конкретная дыра прямо сейчас. Если мы выбираем content-addressed key, то два разных M2 records с одинаковым sha256 указывают на один blob — это правильно с точки зрения dedup. Но sensitive record при этом должна иметь тот же `location.ref` (opaque), разрешаемый через proxy, и её isolation credential должны быть отдельными от non-sensitive bucket. Это constraint к key model, а не к M6.

[Архитектор]: Отвечаю на вопрос Тарасова. По lifecycle mechanism: выбираю append-only lifecycle ledger в FD-3, привязанный к immutable record `id`. Причина: новая полная M2 record по правилам M2 порождает новую lineage entry — это семантически неверно для operational hold или tombstone, которые не меняют identity. Ledger позволяет выразить hold, tombstone, deletion authorization как отдельные события без мутации registry.jsonl. History остаётся отличимой. По key model: выбираю content-addressed `objects/{sha256_64hex}`. При этом `location.ref` в M2 record — opaque token, разрешаемый proxy в конкретный blob key; dedup на уровне bytes не сливает lineage identities, потому что record `id` и registry row остаются отдельными.

[Верстальщик]: Хорошо, key model выбрана. Теперь мне нужно понять структуру `location.ref` как opaque token — не URL, не раскрывается без `read-ref`. Это значит proxy держит mapping: opaque ref → `objects/{sha256_64hex}`. Этот mapping живёт где — в registry.jsonl, в отдельном index в FD-3, или вычисляется из полей M2? Если вычисляется — нужно определить, какие поля M2 участвуют в вычислении, и убедиться, что `canonicalRef` туда не попадает.

[Структурщик]: `location.ref` — это opaque token, который proxy разрешает через lookup в registry.jsonl: proxy читает record по `id`, берёт `location.ref`, и если это content-addressed key, то ref IS the key в opaque форме — он не вычисляется из `canonicalRef`. Конкретно: `location.ref` содержит строку вида `sha256:<64hex>`, proxy резолвит её в `objects/{sha256_64hex}` на стороне storage. `canonicalRef` в этом процессе не участвует — он идентифицирует lineage, но не storage path. Маппинг не нужен отдельно: registry.jsonl сам содержит `location.ref` для каждой record.

[Математик]: Уточню integrity contract. Post-write: после записи объекта в FD-1 proxy верифицирует полный `sha256` И размер `bytes` — оба значения против заявленных в M2 record. При несовпадении любого — объект переводится в карантин, admission для этого `id` закрывается, lifecycle ledger фиксирует событие `quarantine` с timestamp и delta. Periodic reconciliation: раз в сутки сканируется весь FD-1, каждый `objects/{sha256_64hex}` проверяется против всех M2 records, ссылающихся на него. Несовпадение — fail-closed, алерт, quarantine entry в ledger. Backup и restore drill проверяют те же два значения для каждого объекта в manifest.

[Teamlead]: Принято. Фиксирую: topology — S3-compatible object storage, три FD, content-addressed key, append-only lifecycle ledger. Теперь — backup contract. Нужен один механизм consistent cut: как именно мы атомарно связываем bytes manifest и snapshot registry/lifecycle? И как сами bytes из FD-1 попадают в FD-2? Это не абстрактный вопрос — это исполнимый механизм. Архитектор, давай конструкцию.

[Музыкант]: Пока Архитектор строит конструкцию — важное ограничение: backup schedule должен обеспечить RPO ≤ 24 часов. Это значит checkpoint должен происходить не реже чем раз в 24 часа. Если последний успешный checkpoint старше 24 часов — readiness gate переходит в FAIL, даже если предыдущий checkpoint технически валиден и доступен для restore. Неудачный запуск не удаляет предыдущий checkpoint — он остаётся для восстановления, но readiness падает немедленно по age > 24h.

[Архитектор]: Consistent cut работает следующим образом. Checkpoint начинается с назначения `checkpoint_id` (monotonic). Далее — write fence в FD-1: новые writes буферизуются, но не подтверждаются клиенту до завершения checkpoint. FD-3 делает append-only snapshot: в lifecycle ledger добавляется запись `{type: checkpoint_start, checkpoint_id, timestamp}`, затем сериализуется текущее состояние registry.jsonl и lifecycle ledger в immutable snapshot-файл. Параллельно формируется bytes manifest — список всех `objects/{sha256_64hex}` с их `bytes` и `sha256` из registry. Затем все объекты из manifest копируются в FD-2 (другой S3-compatible endpoint, другой credential). После подтверждения полной копии — в ledger добавляется `{type: checkpoint_complete, checkpoint_id, manifest_hash, registry_snapshot_ref}`. Это и есть consistent cut: один `checkpoint_id` связывает manifest, registry snapshot и набор bytes в FD-2.

[Верстальщик]: Понятно. Write fence означает, что admission во время checkpoint может быть задержан — это надо учесть, но это M6 детали. Для M4 важно: является ли checkpoint_start → checkpoint_complete атомарным с точки зрения восстановления? То есть — если checkpoint прерван после копирования части bytes, но до `checkpoint_complete` — этот checkpoint не считается успешным, и readiness gate смотрит на предыдущий успешный `checkpoint_id`. Правильно понимаю?

[Структурщик]: Да, именно так. Checkpoint валиден только при наличии записи `checkpoint_complete` в lifecycle ledger с совпадающим `checkpoint_id`. Частичный checkpoint — не checkpoint. Drill восстанавливает одну конкретную checkpoint-пару: берёт `checkpoint_id`, загружает соответствующий registry snapshot и bytes manifest из FD-2, верифицирует каждый объект по `sha256` AND `bytes`, затем восстанавливает в изолированную среду. Результат drill фиксируется в lifecycle ledger: `{type: drill_result, checkpoint_id, success, timestamp, verified_objects_count}`. Без этой записи — backup существует, но restore не доказан, readiness gate FAIL.

[Математик]: Добавлю числа к retention contract. Active original: хранится бессрочно пока нет явного authorized deletion в lifecycle ledger. Superseded revision (record в той же lineage, не являющаяся head): хранится минимум 365 дней от даты superseding — это исполнимый срок. После 365 дней — eligible for deletion, но только при отсутствии hold в lifecycle ledger. Hold имеет явный приоритет: если в ledger есть `{type: hold, record_id, reason}` без соответствующего `{type: hold_release, record_id}` — deletion запрещено независимо от срока. Authorized deletion: запись `{type: deletion_authorized, record_id, authorized_by, timestamp}` в ledger — необходимое условие физического удаления. Dangling: если объект в FD-1 не найден, но M2 record существует без `deletion_authorized` — это dangling, фиксируется reconciliation как алерт, не молчит.

[Teamlead]: Retention принят. Теперь sensitive. M3 ратифицировал: Panel — единственный авторизатор, bytes выдаются только после `read-bytes`/`download` решения proxy. M4 добавляет storage-level: sensitive bytes в FD-1 хранятся в изолированном namespace (отдельный credential, отдельный access policy) внутри того же S3-compatible pattern. Encryption at rest обязательна для всех объектов, sensitive получают дополнительный envelope encryption с ключом, изолированным от non-sensitive. `location.ref` не раскрывается без `read-ref` — это M3 invariant, M4 подтверждает: proxy не логирует полный ref в общедоступный журнал. Журнал аудита хранит `record_id` и action, но не `location.ref` и не raw bytes reference.

[Музыкант]: Важный момент по sensitive isolation: credential изоляция должна быть видна в lifecycle ledger — то есть при checkpoint, manifest sensitive объектов помечается отдельно, и в FD-2 они копируются с тем же envelope encryption. Restore drill для sensitive subset должен проверять, что ключ envelope encryption доступен и объект расшифровывается корректно. Если ключ недоступен — drill fails, readiness gate FAIL для sensitive class.

[Архитектор]: Quota contract. Capacity unit — байты. Per-container limit назначается явно перед первым production ingest; до назначения admission закрыт. Per-object limit: объект не принимается если его размер превышает заявленный в M2 `bytes` поля больше чем на 0 байт — точное совпадение обязательно (это часть integrity, не отдельное quota правило). Collection soft limit выражается через watermark 0.85: `used_after / total >= 0.85` — предупреждение, admission продолжается. Hard limit: ALLOW только если `free_after >= 12 GiB` И `used_after / total < 0.90`. Нарушение любого из двух условий — DENY, fail-closed. Reserve: 10% объёма FD-1 зарезервировано и не входит в `total` для capacity расчёта — это операционный буфер для checkpoint и quarantine.

[Верстальщик]: По reserve — важное уточнение для формулы. Если 10% зарезервировано и `total` в формуле исключает reserve, то `total` = provisioned_capacity × 0.90, и `used_after / total < 0.90` применяется к этому скорректированному total. Это нужно зафиксировать явно, иначе формула двусмысленна. Предлагаю: `total` = фактически доступная ёмкость без reserve, `used_after` = bytes занятых объектами после потенциальной операции. Тогда формула работает буквально без дополнительных интерпретаций.

[Структурщик]: Принимаю уточнение. Зафиксирую определения: `total` = provisioned_capacity - reserved_capacity (10% provisioned); `free_after` = total - used_after; `used_after` = current_used + size_of_new_object. ALLOW предикат: `free_after >= 12 GiB` AND `used_after / total < 0.90`. Оба условия проверяются одновременно перед каждым admission. Soft watermark 0.85: `used_after / total >= 0.85` — только предупреждение в observability layer, не admission condition. Эта формула используется буквально везде: admission, cases, readiness gates. Никаких `>= 0.10` замен.

[Математик]: RPO/RTO contract. RPO = 24 часов: максимальная потеря данных при primary failure равна данным, накопленным с последнего успешного checkpoint. Gate: `now - last_successful_checkpoint.timestamp <= 24h`. Если gate FAIL — readiness FAIL немедленно. RTO = 4 часа: время от объявления primary failure до завершения verified restore из FD-2 в новый FD-1. RTO включает: загрузку registry snapshot, загрузку bytes manifest, копирование всех объектов из FD-2 в новый FD-1, integrity verification всех объектов (sha256 AND bytes для каждого), подтверждение consistency cut. Если объектов много — RTO 4 часа является constraint на масштаб коллекции; при превышении — нужен partial restore plan, но это M7 детали. Drill schedule: раз в 30 дней, результат в lifecycle ledger, PASS = успешная верификация всех объектов из выбранного checkpoint.

[Teamlead]: Хорошо. Перед финальным вердиктом — пройдём по cases. Case 1: новый небольшой чек при нормальной capacity. `free_after >= 12 GiB` AND `used_after / total < 0.90` — оба TRUE — ALLOW. Объект записывается в `objects/{sha256_64hex}`, post-write verification sha256 AND bytes — PASS, registry.jsonl получает новую record с `location.ref = sha256:<64hex>`. Case 2: объект превышает quota. Если `bytes` объекта такова, что `free_after < 12 GiB` ИЛИ `used_after / total >= 0.90` — DENY, fail-closed, lifecycle ledger фиксирует `{type: admission_denied, record_id, reason: quota}`.

[Музыкант]: Case 3: soft затем hard watermark. При `used_after / total >= 0.85` — observability алерт, admission продолжается. При следующем объекте, при котором `used_after / total >= 0.90` ИЛИ `free_after < 12 GiB` — DENY. Это последовательность: soft предупреждает, hard блокирует. Case 4: post-write mismatch. После записи `objects/{sha256_64hex}` proxy читает объект и вычисляет sha256 и bytes. Если sha256 фактический ≠ sha256 заявленный В REGISTRY ИЛИ bytes фактический ≠ bytes заявленный — объект переводится в quarantine namespace, admission для данного record_id fail-closed, lifecycle ledger получает `{type: quarantine, record_id, mismatch_field, timestamp}`. Объект не удаляется автоматически — ждёт расследования.

[Архитектор]: Case 5: sensitive PDF вне Git без прямого публичного URL. Storage invariant: sensitive объекты размещаются в изолированном credential namespace FD-1, без public-read policy. `location.ref` хранится в M2 record с `sensitive.reason` и не раскрывается без M3 `read-ref` decision от Panel. Proxy не выдаёт bytes без `read-bytes` decision. Прямой URL storage недоступен — bucket policy запрещает public access и не содержит presigned permanent URL. Вещдок: lifecycle ledger содержит запись об объекте, bucket policy в FD-1 имеет `public_access: deny`, журнал аудита не содержит raw ref.

[Верстальщик]: Case 6: primary failure, restore в RTO с потерей ≤ RPO. FD-1 недоступна. Берётся последний `checkpoint_complete` из lifecycle ledger FD-3. Если `now - checkpoint.timestamp <= 24h` — RPO соблюдён. Из FD-2 загружаются registry snapshot и bytes manifest этого checkpoint_id. Все объекты копируются в новый FD-1 (другой endpoint, тот же credential pattern). Integrity verification: sha256 AND bytes для каждого объекта. По завершении — lifecycle ledger FD-3 фиксирует `{type: restore_complete, checkpoint_id, new_fd1_endpoint, timestamp}`. Если restore занял ≤ 4 часов — RTO соблюдён.

[Структурщик]: Case 7: backup существует, но drill не проходил. Readiness gate `restore_drill`: требует наличия `{type: drill_result, success: true}` в lifecycle ledger не старше 30 дней. Если такой записи нет — gate FAIL, даже если FD-2 физически содержит байты. «Backup включён» без успешного restore не является PASS. Вещдок: lifecycle ledger не содержит валидной `drill_result` записи в окне 30 дней.

[Математик]: Case 8: удаление superseded revision при действующем hold. Lifecycle ledger проверяется: если для record_id существует `{type: hold}` без соответствующего `{type: hold_release}` — физическое удаление запрещено, admission для deletion операции DENY. Superseded revision остаётся в FD-1. Срок retention 365 дней не отменяет hold — hold имеет явный приоритет. Authorized deletion требует: отсутствие active hold В LEDGER И наличие `{type: deletion_authorized, record_id}`. Вещдок: lifecycle ledger содержит active hold entry без release.

[Teamlead]: Case 9: пользователь знает `location.ref`, но не имеет `read-bytes`. M3 invariant применяется per action: proxy проверяет M3 decision для конкретного action (`read-bytes`) перед выдачей bytes. Знание `location.ref` не является достаточным условием. Прямое обращение к storage endpoint в обход proxy — невозможно: bucket policy FD-1 запрещает любой доступ кроме через designated proxy credential. Вещдок: bucket policy содержит `allow: proxy_credential_only`, попытка прямого доступа получает 403 от storage layer (это storage invariant, не M6 endpoint).

[Музыкант]: Case 10: office VDS ниже capacity minimum в момент миграции. `free_after < 12 GiB` → ALLOW predicate FALSE → миграция на office VDS запрещена, fail-closed. Office VDS сейчас 9.46 GiB — это уже FAIL по абсолютному условию. Migration readiness gate требует: целевая FD-1 должна пройти все 8 readiness gates включая capacity. Office VDS не является целевой FD-1 до прохождения gate. Вещдок: измеренное значение 9.46 GiB < 12 GiB.

[Архитектор]: Перечислю все 8 readiness gates для production ingest. Gate 1 — Capacity: `free_after >= 12 GiB` AND `used_after / total < 0.90` на целевом FD-1. Gate 2 — Write/Read/Hash: тестовый объект записан, прочитан, sha256 AND bytes верифицированы — PASS. Gate 3 — Backup connectivity: FD-2 доступен, credentials валидны, тестовый объект скопирован из FD-1 в FD-2. Gate 4 — Restore drill: lifecycle ledger содержит `drill_result success:true` не старше 30 дней — включая копирование bytes из FD-2 и их integrity verification. Gate 5 — Auth bypass: попытка прямого доступа к FD-1 в обход proxy получает deny. Gate 6 — Inventory/reconciliation: reconciliation scan завершён без dangling objects. Gate 7 — RPO age: last successful checkpoint age ≤ 24h. Gate 8 — FD-3 accessibility: registry.jsonl и lifecycle ledger читаемы, последняя запись консистентна.

[Верстальщик]: По FD-3 носителю — фиксирую выбор. FD-3 — append-only файловая структура на выделенном хосте/volume, отдельном от FD-1 и FD-2 по машине, credential и account. Конкретный vendor-neutral pattern: выделенный storage volume с append-only mount policy. Registry.jsonl и lifecycle ledger — файлы на этом volume. Checkpoint snapshot для backup — это serialized copy этих файлов, включаемая в checkpoint_complete. Связь с backup bytes: checkpoint_complete в FD-3 содержит `manifest_hash` и `registry_snapshot_ref` — оба артефакта физически копируются в FD-2 вместе с bytes. Таким образом FD-2 содержит полный комплект: bytes + registry snapshot + lifecycle snapshot — как единый checkpoint bundle.

[Структурщик]: Уточню связку FD-3 и consistent cut. Механизм: общий `checkpoint_id` и write fence. Write fence в FD-1 означает: новые ingest операции получают `pending` статус в lifecycle ledger и не завершают запись в FD-1 пока checkpoint не закрыт. FD-3 snapshot атомарен в рамках одного checkpoint_id: сначала `checkpoint_start` в ledger, затем сериализация всех записей registry.jsonl и lifecycle ledger до этого момента, затем передача в FD-2 вместе с bytes manifest, затем `checkpoint_complete`. Pending ingest операции возобновляются после `checkpoint_complete`. Это гарантирует, что manifest и registry snapshot описывают одно и то же множество records без race condition.

[Математик]: Финальный вопрос по tombstone и dangling. Tombstone — запись в lifecycle ledger `{type: tombstone, record_id, timestamp, reason}`. Она не удаляет M2 record из registry.jsonl — history остаётся. Tombstone означает, что bytes eligible for physical deletion при выполнении условий (no hold, retention expired, deletion_authorized). Dangling detection: reconciliation сравнивает список объектов в FD-1 с registry records. Если M2 record имеет `location.ref` указывающий на несуществующий объект без `deletion_authorized` в ledger — это dangling, алерт, не silent failure. Если объект в FD-1 не имеет ни одной M2 record — это orphan, алерт, требует manual review до удаления.

[Teamlead]: Всё. Вердикт. Topology выбрана: S3-compatible object storage, три независимых FD. Key model: content-addressed `objects/{sha256_64hex}`, dedup на уровне bytes, M2 records остаются отдельными. Lifecycle mechanism: append-only lifecycle ledger в FD-3. Capacity: один предикат ALLOW буквально везде. Consistent cut: write fence + checkpoint_id + FD-2 bundle. Все cases доказаны, все 8 gates определены. Принимаю. Перехожу к финальному carrier.

---

## Итоговое решение консилиума

### Пропозиция S1

**Topology:** S3-compatible object storage pattern. Bytes живут в FD-1 (primary S3-compatible endpoint). Metadata управления storage (registry.jsonl, lifecycle ledger) живут в FD-3 (выделенный append-only volume, отдельный хост/credential). Backup bytes, registry snapshot и lifecycle snapshot живут в FD-2 (независимый S3-compatible endpoint, другой credential, другой account).

**Fail-closed rule:** ALLOW только если `free_after >= 12 GiB` AND `used_after / total < 0.90`. Любое другое состояние — DENY. Soft 0.85 — предупреждение только.

---

### Таблица storage classes, копий и failure domains

| Класс | Failure Domain | Содержимое | Независимость | Примечание |
|---|---|---|---|---|
| Primary bytes | FD-1 | `objects/{sha256_64hex}` | Отдельный S3-endpoint, credential, account | Immutable, no overwrite |
| Backup bytes + snapshots | FD-2 | Bytes manifest + registry snapshot + lifecycle snapshot per checkpoint | Другой S3-endpoint, другой credential, другой account | Populated только при checkpoint_complete |
| Registry + lifecycle | FD-3 | registry.jsonl, lifecycle ledger, checkpoint records | Выделенный хост/volume, append-only mount, отдельный credential | Единственный источник истины identity и lifecycle |
| Sensitive namespace | FD-1 (isolated) | Sensitive bytes с envelope encryption | Отдельная credential policy внутри FD-1 | Доступ только через proxy с read-bytes decision |

**Что считается потерей failure domain:** недоступность машины, volume, credential или account, которые не разделяются с другой FD. Потеря FD-1 не уничтожает FD-2 и FD-3.

---

### Object key и integrity contract

**Key model:** content-addressed, один физический key: `objects/{sha256_64hex}` где `sha256_64hex` — полный 64-символьный hex SHA-256 объекта.

**Связь с M2:** `location.ref` в M2 record — opaque token `sha256:<64hex>`. Proxy резолвит ref в storage key. `canonicalRef` не участвует в key construction. `record_id` не входит в key.

**Dedup:** разные M2 records с одинаковым sha256 ссылаются на один blob. Их `id`, registry rows и lineage остаются отдельными. Dedup не сливает identities.

**Overwrite policy:** объекты immutable. Запись по существующему key запрещена. Новая revision создаёт новую M2 record с новым `location.ref`.

**Integrity:** post-write и post-read проверяют sha256 AND bytes одновременно против M2 record. Несовпадение любого — fail-closed, quarantine entry в lifecycle ledger. Periodic reconciliation: раз в сутки, весь FD-1. Backup и restore drill: та же двойная проверка для каждого объекта в manifest.

**Quarantine:** объект помечается в lifecycle ledger `{type: quarantine, record_id, mismatch_field}`. Не удаляется автоматически. Admission для record_id закрыт до resolved.

---

### Quota, watermark и admission contract

**Определения:**
- `provisioned_capacity` — выделенная ёмкость FD-1
- `reserved_capacity` = 10% × provisioned_capacity (операционный буфер)
- `total` = provisioned_capacity − reserved_capacity
- `current_used` = байты всех объектов в FD-1 на момент проверки
- `used_after` = current_used + size_of_incoming_object
- `free_after` = total − used_after

**ALLOW predicate (единственный, везде):**
```
free_after >= 12 GiB  AND  used_after / total < 0.90
```

**Soft watermark 0.85:** `used_after / total >= 0.85` → предупреждение в observability layer. Admission не блокируется.

**Hard watermark 0.90 / абсолютный минимум 12 GiB:** нарушение любого из двух условий ALLOW → DENY, fail-closed.

**Per-object:** `bytes` объекта должен точно совпадать с заявленным в M2 record — часть integrity, не отдельный quota limit.

**Per-collection limit:** назначается явно перед первым production ingest. До назначения admission закрыт.

**Наблюдаемые метрики:** `storage_used_bytes`, `storage_free_bytes`, `storage_used_ratio`, `admission_denied_count`, `quarantine_count`, `watermark_soft_breaches`.

---

### Backup, restore, RPO/RTO и drill

**Consistent cut mechanism:** write fence + shared `checkpoint_id`.

**Процедура checkpoint:**
1. `checkpoint_id` назначается (monotonic).
2. В lifecycle ledger FD-3: `{type: checkpoint_start, checkpoint_id, timestamp}`.
3. Write fence активируется: новые ingest pending до закрытия checkpoint.
4. Сериализация registry.jsonl и lifecycle ledger в immutable snapshot.
5. Формирование bytes manifest: все `{sha256_64hex, bytes, record_id_refs}`.
6. Копирование bytes из FD-1 в FD-2 (все объекты из manifest).
7. Копирование registry snapshot и lifecycle snapshot в FD-2 как checkpoint bundle.
8. Integrity verification каждого объекта в FD-2: sha256 AND bytes.
9. Write fence снимается.
10. В lifecycle ledger FD-3: `{type: checkpoint_complete, checkpoint_id, manifest_hash, registry_snapshot_ref, timestamp}`.

Checkpoint валиден только при наличии `checkpoint_complete`. Частичный checkpoint не используется для restore.

**Schedule:** раз в 24 часа минимум.

**RPO = 24 часов.** Gate: `now − last_checkpoint_complete.timestamp ≤ 24h`. Провал ежедневного запуска → предыдущий checkpoint остаётся доступным для restore, но readiness gate FAIL немедленно по превышении 24h.

**RTO = 4 часа:** время от объявления primary failure до verified restore из FD-2.

**Retention копий backup:** минимум 30 дней. Старые checkpoint bundles удаляются только после 30 дней и только при наличии ≥ 2 более новых успешных checkpoint.

**Restore drill:** раз в 30 дней. Drill восстанавливает конкретный checkpoint_id в изолированную среду. Верифицирует все объекты sha256 AND bytes. Результат: `{type: drill_result, checkpoint_id, success, verified_objects_count, timestamp}` в lifecycle ledger FD-3. Без успешного `drill_result` ≤ 30 дней — readiness gate FAIL.

**Encryption backup:** все объекты в FD-2 encrypted at rest. Sensitive envelope key должен быть доступен для drill — иначе drill FAIL.

---

### Retention, deletion и tombstone contract

**Lifecycle mechanism:** append-only lifecycle ledger в FD-3, привязанный к immutable M2 record `id`. M2 records не мутируются.

**Состояния (через ledger events, не через M2 schema):**

| Event type | Значение |
|---|---|
| `hold` | Запрет удаления до `hold_release`. Явный приоритет над сроками. |
| `hold_release` | Снятие конкретного hold. |
| `tombstone` | Bytes eligible for deletion при выполнении условий. M2 history не удаляется. |
| `deletion_authorized` | Необходимое условие физического удаления bytes. |
| `deletion_complete` | Bytes физически удалены из FD-1. M2 record и ledger history остаются. |
| `quarantine` | Integrity mismatch. Admission закрыт. |
| `dangling_detected` | Reconciliation нашёл M2 record без физического объекта без deletion_authorized. |

**Active original:** хранится бессрочно. Удаление только через `deletion_authorized` без active hold.

**Superseded revision:** хранится минимум 365 дней от даты superseding. После — eligible if no hold AND `deletion_authorized` получен.

**Hold приоритет:** active hold блокирует deletion независимо от срока и tombstone.

**Dangling:** M2 record с `location.ref` указывающим на несуществующий объект без `deletion_complete` в ledger → `dangling_detected` алерт. Не silent failure.

**Orphan:** объект в FD-1 без M2 record → алерт, manual review, удаление только после review.

**History:** registry.jsonl никогда не модифицируется. История lineage всегда отличима от storage lifecycle.

---

### Server, access и encryption contract (связь с M3)

**M3 invariant per action:** Panel — единственный авторизатор. Proxy применяет M3 decision к каждому action отдельно: `read-ref`, `read-bytes`. Знание `location.ref` не заменяет `read-bytes` decision.

**Direct bypass запрещён:** bucket policy FD-1 разрешает доступ только proxy credential. Прямой доступ к storage — deny на уровне bucket policy. Это storage invariant M4, не transport mechanism M6.

**Encryption at rest:** все объекты FD-1 и FD-2 encrypted at rest. Sensitive объекты — дополнительный envelope encryption с изолированным ключом.

**Encryption in transit:** все передачи между proxy и FD-1/FD-2/FD-3 по TLS. M4 не назначает конкретный transport mechanism — это M6.

**Журнал аудита:** хранит `record_id`, action, actor_id, timestamp. Не хранит `location.ref`, raw bytes reference, envelope key.

**Sensitive isolation:** отдельная credential policy в FD-1. Отдельный envelope encryption key. Checkpoint manifest помечает sensitive objects отдельно. FD-2 копирует с тем же encryption.

---

### Таблица обязательных случаев

| Случай | Ожидаемое решение | Где проверяется | Вещдок |
|---|---|---|---|
| 1. Новый небольшой чек при нормальной capacity | ALLOW: `free_after >= 12 GiB` AND `used_after/total < 0.90` → запись в FD-1, post-write sha256+bytes PASS, новая M2 record | Admission gate + integrity check | M2 record создана, объект в FD-1, ledger: нет quarantine |
| 2. Объект превышает collection quota | DENY fail-closed: `free_after < 12 GiB` ИЛИ `used_after/total >= 0.90` → объект не записан | Admission gate | Lifecycle ledger: `{type: admission_denied, record_id, reason: quota}` |
| 3. Soft (0.85) затем hard (0.90) watermark | Soft: observability алерт, admission продолжается. Hard: DENY fail-closed | Admission gate + observability | Алерт при ≥0.85; ledger `admission_denied` при ≥0.90 или free<12GiB |
| 4. Post-write bytes не совпадают с sha256 или bytes в M2 | Fail-closed: объект в quarantine, admission закрыт для record_id | Post-write integrity check | Lifecycle ledger: `{type: quarantine, record_id, mismatch_field}` |
| 5. Sensitive PDF вне Git без прямого публичного URL | Объект в isolated credential namespace FD-1, envelope encrypted, bucket policy: no public access, `location.ref` только через `read-ref` M3 decision | Bucket policy audit + M3 gate | Bucket policy `public_access: deny`; ledger не содержит raw ref; M2 record содержит `sensitive.reason` |
| 6. Primary failure, restore в RTO с потерей ≤ RPO | Берётся последний `checkpoint_complete` ≤ 24h. Restore из FD-2 в новый FD-1 ≤ 4h. Integrity verification всех объектов. | Lifecycle ledger FD-3 + restore procedure | Ledger: `{type: restore_complete, checkpoint_id, timestamp}`; `checkpoint.timestamp` ≤ 24h до failure |
| 7. Backup существует, drill не проходил | Readiness gate FAIL: нет `drill_result success:true` ≤ 30 дней в lifecycle ledger | Readiness gate check | Lifecycle ledger: отсутствие валидной `drill_result` записи в окне 30 дней |
| 8. Удаление superseded revision при active hold | DENY: lifecycle ledger содержит active `hold` без `hold_release` → deletion_authorized не выдаётся | Lifecycle ledger check перед deletion | Lifecycle ledger: active `{type: hold, record_id}` без соответствующего `hold_release` |
| 9. Пользователь знает ref без read-bytes / прямой bypass | Proxy DENY: M3 decision `read-bytes` отсутствует → bytes не выдаются. Прямой доступ к FD-1: deny от bucket policy | M3 gate (per action) + bucket policy | Bucket policy: allow только proxy credential; отсутствие M3 `read-bytes` decision в proxy log |
| 10. Office VDS ниже capacity minimum при миграции | DENY: `free_after = 9.46 GiB - object_size < 12 GiB` → ALLOW predicate FALSE → миграция запрещена | Capacity readiness gate | Измеренное значение 9.46 GiB < 12 GiB; gate 1 FAIL |

---

### Readiness gates (production ingest и миграция)

| Gate | Проверка | PASS условие |
|---|---|---|
| G1 Capacity | `free_after >= 12 GiB` AND `used_after/total < 0.90` на целевом FD-1 | Оба условия TRUE |
| G2 Write/Read/Hash | Тестовый объект записан, прочитан, sha256 AND bytes совпадают | Integrity check PASS |
| G3 Backup connectivity | FD-2 доступен, credentials валидны, тестовый объект скопирован | Copy + integrity PASS |
| G4 Restore drill | `drill_result success:true` в lifecycle ledger FD-3 ≤ 30 дней, включая bytes из FD-2 | Запись в ledger существует и ≤ 30 дней |
| G5 Auth bypass | Прямой доступ к FD-1 в обход proxy получает deny | Bucket policy enforces deny |
| G6 Inventory/reconciliation | Reconciliation scan: нет dangling, нет orphan | Scan complete, 0 dangling, 0 orphan |
| G7 RPO age | `now − last_checkpoint_complete.timestamp ≤ 24h` | Age ≤ 24h |
| G8 FD-3 accessibility | Registry.jsonl и lifecycle ledger читаемы, последняя запись консистентна | Read PASS, last record valid |

Все 8 gates должны быть PASS до первого production ingest. Office VDS с 9.46 GiB провалит G1 и не является допустимой целью до исправления.

---

### Список посылок

| Посылка | Источник | Тип |
|---|---|---|
| Affine — сменный движок, не источник истины и не склад | M1 закрытые посылки | **норма** |
| `registry.jsonl` — источник истины; фактические bytes независимо верифицируют заявления | M1/M2 закрытые посылки | **норма** |
| `canonicalRef` идентифицирует lineage, но не является URL или storage key | M2 закрытые посылки | **норма** |
| Sensitive record: `location.kind`, непустой `location.ref`, `sensitive.reason`; sensitive не отдельный kind | M2 закрытые посылки | **норма** |
| Panel — единственный авторизатор; bytes только после `read-bytes`/`download` решения proxy | M3 закрытые посылки | **норма** |
| M3 не выбрал физический склад, vendor, backup, retention или endpoint | M3 закрытые посылки | **норма** |
| Office VDS: свободно 9.46 GiB при минимуме 12 GiB — capacity gate NO-GO | Измеренная фактура | **факт** |
| Каталог резервных копий пуст; доказанного restore нет | Измеренная фактура | **факт** |
| Sensitive PDF партнёра вне репозитория, без доказанного переносимого storage path | Измеренная фактура | **факт** |
| В публичном Git лежит один чек | Измеренная фактура | **факт** |
| `location.kind` допускает `local`, `affine`, `url`, `archivarius`; `location.ref` всегда непустой | M2 закрытые посылки | **норма** |
| До решения M4 запрещено увеличивать архив оригиналов на office VDS или переносить байты | M4 повестка | **норма** |
| Один ALLOW predicate: `free_after >= 12 GiB` AND `used_after/total < 0.90`; soft 0.85 только предупреждает | run1, run2 | **норма** |
| Storage key строится только из реально существующих M2 значений; `container_id`, `lineage_id`, `revision_seq` запрещены | run1 | **норма** |
| Lifecycle hold/tombstone/retention — в отдельном append-only lifecycle ledger; M2 records не мутируются | run1 | **норма** |
| Consistent cut: общий `checkpoint_id` + write fence; manifest и registry snapshot описывают одно множество records | run2 | **норма** |
| RPO gate: age последнего успешного checkpoint ≤ 24h | run2 | **норма** |
| Signed URL, TTL, endpoint, download workflow — M6, запрещены в M4 | run2 | **норма** |
| Physical dedup: `objects/{sha256_64hex}` — один key; `record_id` в key запрещает dedup | run2 | **норма** |
| M3 применяется per action | run2, M3 | **норма** |

---

## Definition of Done

- [x] Один вопрос S1 и один carrier
- [x] Выбрана одна topology (S3-compatible object storage) и независимые failure domains (FD-1, FD-2, FD-3)
- [x] Object key (`objects/{sha256_64hex}`), immutability и integrity (sha256 AND bytes, fail-closed) согласованы с M2
- [x] Sensitive storage (isolated credential, envelope encryption, no public access) и direct bypass (bucket policy deny) согласованы с M3
- [x] Quota/watermarks/admission измеримы: один ALLOW predicate `free_after >= 12 GiB` AND `used_after/total < 0.90`
- [x] Backup (write fence + checkpoint_id), restore (FD-2 bundle), RPO (24h age gate), RTO (4h), drill (30 days, ledger evidence) исполнимы
- [x] Retention/deletion/tombstone через lifecycle ledger не стирают M2 history молча; dangling и orphan детектируются
- [x] Все 10 обязательных случаев и 8 readiness gates доказаны
- [x] M5–M7 не решены
