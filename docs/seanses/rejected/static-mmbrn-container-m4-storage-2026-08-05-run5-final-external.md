<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-08-05T12:37:12.765Z |
| Команда | `yarn consilium` |
| Модель | deepseek/deepseek-chat |
| Файл | `docs/seanses/static-mmbrn-container-m4-storage-2026-08-05.md` |
| Порядок ролей | Архитектор → Teamlead → Музыкант → Математик → Верстальщик → Структурщик |
| Повестка | `docs\meeting\static-mmbrn-container\M4_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs\meeting\static-mmbrn-container\M4_AGENDA.md` | 10333 | `23a5f4a1c97c` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs\meeting\static-mmbrn-container\M4_AGENDA.md` | 10333 · 1 п. | `23a5f4a1c97c` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --no-memory --min-replies 42 --seed 149`

**Вопрос:**

Исполните только S1 M4 по единому разделу обязательных поправок run1-run3. Выберите валидные M2 location.kind/ref; согласуйте policy-class-scoped dedup с sensitive isolation и удалением/quarantine общего blob по всем refs. Дайте вычислимые container/collection quotas и logical charge. Checkpoint обязан drain/fence все mutation writers, иметь high-water+cut_at, self-contained FD-2 complete marker, live complete event и снять fence последним; RPO считать от cut_at, RTO доказать throughput/bound. Никаких HTTP-кодов, signed URL, TTL, endpoints или workflow M6. Не менее 36 предметных реплик и не менее 6 от каждой роли; каждая реплика краткая, до 100 слов. Список посылок до DoD, DoD последняя строка; без эха, self-count и meta.

---

# Консилиум: M4 — хранение и живучесть `static.mmbrn.tech`

**Повестка:** S1 — единый исполнимый контракт физического хранения байтов: одна topology, независимые failure domains, quota/watermarks, целостность, backup/restore с RPO/RTO, retention/deletion, sensitive handling, связь с M2/M3.

**Участники:** Архитектор (Vesnin), Teamlead (Tarasov), Музыкант (Kuryokhin), Математик (Dynin), Верстальщик (Rodchenko), Структурщик (Ozhegov).

**Порядок реплик:** Архитектор → Teamlead → Музыкант → Математик → Верстальщик → Структурщик (циклически).

---

[Архитектор]: Выбираю одну topology: выделенный storage host/volume, не object storage. Причина — vendor-neutral контракт и явный failure domain FD-1, отдельный от office VDS. Metadata управления storage — на самом storage host, но registry.jsonl остаётся источником истины identity на отдельной машине управления. Bytes живут на storage volume; metadata реестра — вне его.

[Teamlead]: Принято. Один носитель, один lifecycle. Но требую точный `location.kind` для нового storage: выбираем `local` — ровно один допустимый из M2-списка. `location.ref` — непустой идентификатор storage object, не URL. `canonicalRef` lineage не сливается с ключом объекта.

[Музыкант]: Важно: чувствительный PDF партнёра должен храниться вне публичного Git. Поддерживаю `location.kind=local` для нового storage. Но прошу определить классы хранения: standard и sensitive — с изоляцией ciphertext. Sensitive класс: encryption at rest, separate credential namespace, никаких presigned permanent URL.

[Математик]: Формализую dedup: physical key = `sha256` полного содержимого, но scoped по storage-policy class. Standard и sensitive не делят ciphertext/credential namespace. Logical charge: общий blob учитывается в каждой collection, которая на него ссылается — без quota bypass. Quarantine при mismatch `sha256`/`bytes` закрывает все refs.

[Верстальщик]: Вопрос представления: нам нужны наблюдаемые метрики capacity. UI/панель должна показывать `free_after >= 12 GiB` и `used_after/total < 0.90` — это ALLOW. Soft watermark 0.85 — только алерт, не блокировка. Чёткие индикаторы для оператора, а не «магические числа».

[Структурщик]: Уточняю границы: storage host — отдельная машина, не office VDS. Primary FD-1 — storage host volume. Backup FD-2 — независимая машина/volume, не разделяет credential с FD-1. Кеш/реплика без независимости backup — не backup. Registry rows immutable; lifecycle — отдельный механизм.

[Архитектор]: Object key — `sha256` содержимого, scoped по class: `{class}/{sha256}`. Overwrite policy: полная immutability — не перезаписываем существующий ключ. Новая revision — новый key. Старые revisions хранятся, пока active/superseded не пройдут retention и не будет authorization/hold. Tombstone — отдельная запись lifecycle.

[Teamlead]: Вердикт по failure domains: минимум две независимые копии. Потеря failure domain — потеря доступа к единственной копии или общему credential. Требую: FD-1 и FD-2 — разные машины, разные volume, разные учётки. Backup не на office VDS и не на storage host — это ключевое.

[Музыкант]: Вопрос: encryption in transit для sensitive класса. Требую: sensitive bytes шифруются at rest ключом, изолированным от standard. In transit — только по защищённому каналу, не HTTP. Sensitive `location.ref` не раскрывается без `read-ref`, bytes — без `read-bytes`. Журнал не должен утекать secret/ref.

[Математик]: Quota алгоритм: per-container budget — вычисляемый, не обещанный позже. Collection quota: сумма `bytes` всех active records в collection, включая logical charge dedup-блоба. Проверка: `used_collection <= collection_quota` и `used_total + incoming <= capacity_reserve`. Admission fail-closed: если нет данных о capacity — отказ.

[Верстальщик]: Для панели нужно: отображать `used_collection / collection_quota` и `free_after` в реальном времени. Если `free_after < 12 GiB` или `used_after/total >= 0.90` — красный статус NO-GO. Soft 0.85 — жёлтый алерт. Это машинно проверяемые индикаторы, не «на глаз».

[Структурщик]: Lifecycle mechanism — один: отдельный lifecycle store (не registry) на management plane. Он живёт отдельно от storage bytes и от registry identity. Checkpoint: fence охватывает ingest и все registry/lifecycle mutations, дожидается in-flight writers, фиксирует `checkpoint_id`, high-water marks, `cut_at`. Snapshot и manifest описывают cut.

[Архитектор]: Consistent cut: self-contained FD-2 complete marker. Порядок: fence writers → snapshot registry+lifecycle → manifest с hashes → copy bytes FD-1 → FD-2, verify `sha256`/`bytes` → последним пишем immutable complete marker с hashes snapshot/manifest. Restore доказывает bundle без живого FD-3. Fence снимается только после commit marker и live complete-event.

[Teamlead]: RPO: gate требует `now - cut_at <= 24h`. RTO 4h — подтверждается измеренным restore throughput и overhead, ограничением protected bytes. Partial restore — не PASS. Drill: обязательный контрольный restore перед production ingest и перед миграцией. «Backup включён» без успешного restore — не PASS.

[Музыкант]: Sensitive: отдельный storage-policy class. Standard class — без encryption at rest, sensitive — с encryption at rest. Credential namespace разделён: standard и sensitive не делят ключи. Direct bypass: обращение к storage напрямую, минуя proxy/decisions — запрещено. M3 per-action invariants сохраняются.

[Математик]: Проверка целостности: post-write и read — полная проверка `sha256` **и** `bytes`. Reconciliation — периодическая сверка inventory storage против registry. Mismatch fail-closed: объект в quarantine, все refs закрыты. Expected absence (после authorized deletion) отличается от dangling/orphan машинно.

[Верстальщик]: Понятно. Метрики: `storage.used_bytes`, `storage.free_bytes`, `storage.used_ratio`, `collection.used_bytes`, `collection.quota_bytes`, `storage.quarantine_count`, `storage.dangling_count`. Всё это — машинно проверяемые метрики для панели. Нет места «приблизительным» показателям.

[Структурщик]: Retention/deletion: различаем immutable original, superseded revision, tombstone, legal/owner hold, physical deletion. Hold приоритетнее tombstone/deletion. Authorized deletion — только после retention всех refs, authorization, отсутствие hold. Удаление bytes не удаляет M2 историю молча. Физическое удаление blob — только когда **все** ссылающиеся records прошли retention.

[Архитектор]: Согласен. Object key immutability: если bytes изменились — это новый объект с новым `sha256`, новая record в lineage. Запись в registry — только append-only. `container_id`, `lineage_id`, `revision_seq` обязаны присутствовать. Отсутствие — ошибка схемы, fail-closed.

[Teamlead]: Проверяю обязательные случаи. Случай 4: post-write bytes не совпадают с `sha256` — fail-closed, quarantine. Случай 7: backup есть, restore не проходил — NO-GO до успешного restore drill. Случай 10: office VDS ниже capacity minimum — не readiness, это блокер миграции.

[Музыкант]: Случай 5: sensitive PDF вне Git, без прямого публичного URL. Storage `location.ref` для sensitive — только через `read-ref` решение. Прямой доступ к storage в обход proxy (случай 9) — deny. Никаких presigned/permanent URL для sensitive класса. Это согласовано с M3.

[Математик]: Quota для G1: используем явно заданный размер, например zero-size baseline для теста приёма. Production admission — фактический размер объекта. Container budget: назначаем `container_quota` как сумму collection quotas + 20% reserve. Collection quota: вычисляется как `sum(bytes активных records) <= collection_quota`. Logical charge dedup: blob в каждой collection.

[Верстальщик]: Понял. Для панели: показываем `container_used / container_quota`, `collection_used / collection_quota`, `free_after = total - used - reserve`. Reserve — 20% от container quota, не трогается обычным ingest. Soft 0.85 — алерт, hard 0.90 — ALLOW блокируется. Всё измеримо.

[Структурщик]: Lifecycle: tombstone создаётся при authorized deletion. Superseded revision: активный срок — пока есть active refs; после supersede — отдельный срок retention. Ожидаемое отсутствие — запись в lifecycle с `expected_absence`. Dangling — есть record, нет объекта; orphan — есть объект, нет record. Reconciliation отличает их машинно.

[Архитектор]: Итог по topology: primary — выделенный storage host/volume (FD-1), backup — независимый host/volume (FD-2), management/metadata — на отдельной management plane. `location.kind=local`, `location.ref` — непустой storage object key. `canonicalRef` — только lineage identity, не URL и не key. Это единый контракт.

[Teamlead]: Readiness gates: G1: capacity `free_after >= 12 GiB AND used_after/total < 0.90`. G2: write/read/hash test — полный success. G3: backup создан на FD-2. G4: restore выполнен из FD-2 без FD-3, RPO ≤ 24h, RTO ≤ 4h. G5: auth bypass test — прямой storage access deny. G6: inventory/reconciliation — zero mismatch.

[Музыкант]: Согласен с gates. Но подчёркиваю: sensitive класс — отдельный gate. Sensitive blob: encryption at rest verified, credentials изолированы, нет публичного URL. Тест: sensitive PDF записан и прочитан через proxy с `read-bytes`, прямой доступ — deny. Это входит в G5/G6.

[Математик]: Формализую checkpoint: `checkpoint_id` — монотонный uuid. High-water marks: `registry_seq`, `lifecycle_seq`, `last_byte_offset` на FD-1. `cut_at` — время фиксации cut, не время завершения копирования. RPO age = `now - cut_at`. RTO = время от начала restore до полной готовности чтения. Оба измеряемы.

[Верстальщик]: Панель должна показывать RPO age и RTO measured. Если `now - cut_at > 24h` — красный статус. RTO > 4h — красный. Это машинные проверки, не обещания. Также показываем `checkpoint_id` актуального backup. Всё для оператора, без «магических» индикаторов.

[Структурщик]: Схема: registry (identity, immutable) → lifecycle (tombstone, hold, retention, expected absence) → storage manifest (checkpoint, cut_at, high-water). Три раздельных хранилища, три разных механизма. Связь: registry record → lifecycle entry → storage object через `location.ref`. Циклов нет.

[Архитектор]: Проверяю случай 1: новый небольшой чек при нормальной capacity. `free_after >= 12 GiB`, `used_after/total < 0.90` — ALLOW. Объект записан, `sha256`/`bytes` проверены post-write. Registry — новая record с `container_id`, `lineage_id`, `revision_seq`. Всё проходит.

[Teamlead]: Случай 2: объект превышает quota. `used_collection + object_bytes > collection_quota` — отказ до записи. Ошибка: admission fail-closed, объект не записан, registry не изменён. Случай 3: primary достигает soft 0.85 — алерт; hard 0.90 — блокировка нового ingest, только чтение и backup.

[Музыкант]: Случай 6: primary failure. Restore из FD-2 bundle. Доказываем: complete marker проверен, snapshot/manifest hashes совпадают, bytes — полный `sha256`/`bytes`. RTO ≤ 4h, RPO ≤ 24h от `cut_at`. Если restore не укладывается — NO-GO, не PASS.

[Математик]: Случай 8: удаление superseded revision при действующем hold или retention. Hold приоритетнее: удаление запрещено, tombstone не создаётся. Retention active: уменьшение срока удаления невозможно. Физическое удаление — только после прохождения всех правил всех refs. Одна record не обрывает bytes другой.

[Верстальщик]: Панель в случае hold показывает: «удаление заблокировано, до YYYY-MM-DD». Это не ошибка, а статус. Оператор видит причину блокировки. Нет «тихого» удаления истории. Всё прозрачно.

[Структурщик]: Случай 9: пользователь знает `location.ref`, но нет `read-bytes`. Storage deny — прямой доступ к storage невозможен, только через proxy с per-action решением. Если обращение напрямую — reject. Proxy не раскрывает `location.ref` без `read-ref`. Всё согласовано с M3.

[Архитектор]: Случай 10: office VDS ниже capacity minimum. Это NO-GO. Нельзя переименовать в readiness. Миграция заблокирована до выполнения всех gates: capacity, restore drill, reconciliation. Office VDS — не storage host и не backup. Он не участвует в FD-1/FD-2.

[Teamlead]: Итоговое решение: одна topology — выделенный storage host/volume. `location.kind=local`, `location.ref` — content-addressed key `{class}/{sha256}`. Классы: standard/sensitive, dedup только внутри класса. Quota: `ALLOW <=> free_after >= 12 GiB AND used_after/total < 0.90`. FD-1 primary, FD-2 backup, независимые.

[Музыкант]: Принимаю. Sensitive: encryption at rest, изоляция credentials, без прямых URL. Non-sensitive standard — без encryption, но с теми же integrity проверками. Оба класса — через proxy, не напрямую.

[Математик]: Принимаю. Checkpoint: fence → high-water + `cut_at` → snapshot/manifest → bytes copy FD-1→FD-2 → verify → complete marker. RPO от `cut_at`, RTO — измеренный, ≤ 4h. Drills: перед production ingest и перед миграцией.

[Верстальщик]: Принимаю. Метрики для панели: capacity ratio, collection quota usage, RPO age, RTO measured, quarantine/dangling счётчики. Всё машинно проверяемо.

[Структурщик]: Принимаю. Схема: registry (immutable identity) / lifecycle (tombstone, hold, retention) / storage manifest (checkpoint). Три механизма, один carrier. Все обязательные случаи покрыты.

[Архитектор]: Подтверждаю. Один carrier, одна topology, единый S1. M5-M7 не решены: миграция 82 страниц, endpoints, UX — открыты.

[Teamlead]: Финальный вердикт: контракт утверждён. DoD: один S1, одна topology, независимые FD, integrity с M2, sensitive с M3, quota измерима, backup/restore исполнимы, retention не стирает историю молча, все случаи и gates доказаны, M5-M7 не решены. LGTM.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| **S1 topology** | Выделенный storage host/volume (FD-1); metadata управления storage — на отдельной management plane; bytes — на storage volume; `location.kind=local`, `location.ref` — непустой object key |
| **Failure domains** | FD-1: storage host/volume; FD-2: независимый backup host/volume; независимые машины, volume, credentials; кеш/реплика не считается backup |
| **Object key и integrity** | Physical key: `{class}/{sha256}` (полный хеш содержимого), scoped по storage-policy class; overwrite запрещён (immutability); post-write/read/reconciliation/backup/restore — полная проверка `sha256` **и** `bytes`; mismatch → fail-closed quarantine всех refs |
| **Sensitive** | Класс `sensitive`: encryption at rest, изоляция credentials namespace, без public/presigned permanent URL; `location.ref` — только через `read-ref`, bytes — через `read-bytes`; журнал не утекает secret/ref; direct storage access — deny (M3) |
| **Quota/watermarks** | `ALLOW <=> free_after >= 12 GiB AND used_after/total < 0.90`; soft 0.85 — алерт; container budget: сумма collection quotas + 20% reserve; collection quota: сумма bytes активных records + logical charge dedup-блоба (в каждой collection, без bypass); G1 — zero-size baseline, production — фактический размер |
| **Backup/restore/RPO/RTO** | Checkpoint: fence всех mutation writers → high-water (`registry_seq`, `lifecycle_seq`, `last_byte_offset`) + `cut_at` → snapshot/manifest → bytes copy FD-1→FD-2 + verify → immutable complete marker (последним) → fence снятие; RPO: `now - cut_at <= 24h`; RTO ≤ 4h — измеренный через throughput; drill — перед production ingest и перед миграцией |
| **Retention/deletion** | Immutable original / superseded revision / tombstone / hold / physical deletion разделены; hold приоритетнее tombstone; authorized deletion — только все refs прошли retention, authorization, без hold; удаление bytes не стирает M2 историю молча; dangling/orphan/expected absence различаются машинно |

**Список посылок (факт/норма):**

**факт** — измеренная фактура: office VDS capacity 9.46 GiB free при минимуме 12 GiB (NO-GO); каталог резервных копий пуст, доказанного restore нет; в Affine 82 страницы и 57 служебных PNG/SVG; в публичном Git один чек; sensitive PDF вне репозитория; `location.kind` допускает `local`, `affine`, `url`, `archivarius`; запрет переноса байтов до решения M4.

**норма** — M2: `registry.jsonl` — источник истины; record/lineage identity; `canonicalRef` — lineage, не URL/key; sensitive хранит допустимый `location.kind`, непустой `location.ref`, отдельный `sensitive.reason`. M3: Panel — единственный авторизатор; bytes только после `read-bytes`/`download` решения; прямой URL склада не обходит Panel. Повестка M4: одна topology, независимые failure domains, integrity, sensitive, quota, backup/restore, retention, readiness gates; run1-run3 (ключ, класс, dedup, consistent cut, RPO/RTO, граница M6).

**Definition of Done (последняя секция и строка):** Один S1, один carrier, одна topology, независимые failure domains, object key и integrity согласованы с M2, sensitive и direct bypass согласованы с M3, quota/watermarks/admission измеримы, backup/restore/RPO/RTO исполнимы, retention/deletion/tombstone не стирают историю молча, обязательные случаи и readiness gates доказаны, M5–M7 не решены.
