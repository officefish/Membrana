<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-08-04T16:38:19.068Z |
| Команда | `yarn consilium` |
| Модель | openrouter/anthropic/claude-sonnet-4.6 |
| Файл | `docs/seanses/static-mmbrn-container-m4-storage-2026-08-04.md` |
| Порядок ролей | Teamlead → Структурщик → Верстальщик → Математик → Музыкант → Архитектор |
| Повестка | `docs\meeting\static-mmbrn-container\M4_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs\meeting\static-mmbrn-container\M4_AGENDA.md` | 9750 | `845317525c05` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs\meeting\static-mmbrn-container\M4_AGENDA.md` | 9750 · 1 п. | `845317525c05` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --no-memory --min-replies 36 --seed 127`

**Вопрос:**

Исполните только S1 M4 с поправками run1. Выберите одну topology, один FD-3 и один lifecycle mechanism. Key использует только реальные M2-поля и полный sha256; dedup не сливает identities; integrity проверяет sha256+bytes; capacity predicate един; restore использует checkpoint-пару; M6 pipeline/API не проектировать. Список посылок до DoD, DoD последняя секция. Не менее 36 предметных ролевых реплик; без эха, самосчёта и meta.

---

# Консилиум: M4 — хранение и живучесть `static.mmbrn.tech`

**Повестка:** S1 — один исполнимый контракт физического хранения и живучести байтов: topology, failure domains, object key, integrity, quota, backup/restore, retention, sensitive, связь с M2/M3.

**Участники:** Teamlead (Тарасов), Структурщик (Ожегов), Верстальщик (Родченко), Математик (Дынин), Музыкант (Курёхин), Архитектор (Веснин).

**Порядок реплик:** Teamlead → Структурщик → Верстальщик → Математик → Музыкант → Архитектор

---

[Teamlead]: Открываю заседание. Фактура жёсткая: office VDS даёт 9.46 GiB при минимуме 12 GiB — это hard NO-GO, а не отправная точка для торга. До решения S1 байты не трогаем. Задача сегодня — один вердикт: topology, failure domain, key, integrity, quota, backup, retention, sensitive. Без ветвления «либо то, либо другое». Веснин, начни с формы — какую topology предлагаешь закрепить как единственную?

[Структурщик]: Прежде чем Веснин ответит, уточню терминологический контур. M2 даёт нам реальные поля: `id`, `canonicalRef`, `sha256`, `bytes`, `location.kind`, `location.ref`, `sensitive.reason`. Никаких `container_id`, `lineage_id`, `revision_seq` нет и не будет — key строится только из того, что существует. Topology должна быть определена так, чтобы metadata реестра и физические байты имели разные носители и разные failure domains. Это условие, которое нельзя ослабить.

[Верстальщик]: Мне важно понять одно: где будет жить `location.ref` после того, как topology выбрана? Если это непрозрачная ссылка на объект в object storage, то Panel выдаёт её только при `read-ref`-решении, и она никогда не появляется в журнале открытым текстом. Это я понимаю как инвариант M3. Topology должна это гарантировать структурно, а не политикой.

[Математик]: Сформулирую capacity predicate, который будет единым для всех случаев. Пусть `F` — фактически свободное место на носителе первичного хранилища, `R` — установленный абсолютный минимум резерва (12 GiB из фактуры), `T` — total capacity носителя. Admission разрешён тогда и только тогда, когда выполнены оба условия одновременно: `F − size(object) ≥ R` и `(F − size(object)) / T ≥ 0.10`. Мягкая граница — watermark 0.85 от T (предупреждение, ingest продолжается). Жёсткая граница — watermark 0.90 от T (ingest блокируется, fail-closed). Никакой двойной трактовки 0.95/1.0 к одной метрике нет: watermarks применяются к ratio использованного объёма, абсолютный минимум 12 GiB — к свободному остатку. Предикат един.

[Музыкант]: Меня интересует схема для sensitive bytes — партнёрский PDF сейчас вне репозитория и без storage path. Любая topology обязана гарантировать, что объект с `sensitive.reason` непустым шифруется отдельным ключом до записи в bucket, а `location.ref` для него не отличается по формату от обычного — только права доступа и ключ шифрования иные. Иначе sensitive превращается в отдельный `location.kind`, что M2 запрещает.

[Архитектор]: Называю topology. Единственная выбранная форма — **S3-compatible object storage** как primary pattern: байты хранятся в object bucket, metadata реестра (`registry.jsonl` плюс lifecycle ledger) — на отдельном append-only носителе, FD-3. FD-3 — это **append-only файловая система на выделенном томе**, реплицируемая в checkpoint-архив. Конкретный продукт и провайдер не называются, паттерн фиксирован. Три failure domain: FD-1 — primary object bucket; FD-2 — backup object bucket (другая учётная запись, другой credential, другой физический узел или зона); FD-3 — носитель реестра и lifecycle ledger. Потерей failure domain считается недоступность всех объектов внутри него более RTO или невозможность записи в append-only лог.

[Teamlead]: Принимаю эту форму как рабочую. Теперь детали. Ожегов — object key. Как строим без запрещённых полей?

[Структурщик]: Object key строится из двух реальных M2-полей: полного `sha256` (64 hex-символа) и `id` record. Формат: `objects/{sha256}/{id}`. Здесь `sha256` — content discriminator (полный, не префикс), `id` — уникальный идентификатор конкретной M2 record. Dedup работает так: если два record имеют одинаковый `sha256` и одинаковый `bytes`, физический объект `objects/{sha256}/` может быть один, но каждый record сохраняет свой `id` и свою запись в `registry.jsonl`. Storage указатель в `location.ref` для каждого record свой — он ссылается на этот объект, но identity records не сливаются. Разные lineages остаются разными lineages.

[Верстальщик]: Важный момент по `location.ref`: это непрозрачный токен, не прямой URL bucket-а. Panel резолвит его во временный signed URL только при `read-bytes`-решении и только на время сессии. В логах `location.ref` не появляется — логируется только `id` record и факт выдачи без самого ref. Это требование M3 выполняется topology через то, что bucket никогда не открыт публично и не имеет постоянных presigned URLs.

[Математик]: Integrity contract: после каждой записи объекта в FD-1 выполняется немедленная проверка — считывается записанный объект, вычисляется `sha256` байтового содержимого, сравнивается с заявленным `sha256` из M2 record и с `bytes` (размер в байтах). Несовпадение любого из двух значений — объект переводится в карантин (quarantine prefix: `quarantine/{sha256}/{id}`), запись в `registry.jsonl` не создаётся, admission denied. То же при чтении. Периодическая reconciliation — раз в 24 часа: для каждого объекта в FD-1 пересчитывается sha256 и bytes, сравнивается с реестром. Обнаруженное расхождение — quarantine немедленно, алерт.

[Музыкант]: По sensitive: ключи шифрования для sensitive-объектов хранятся отдельно от ключей обычных объектов, в изолированном credential store, недоступном процессам, обслуживающим обычный ingest. Encryption at rest — AES-256, encryption in transit — TLS 1.2 minimum для всех объектов. Sensitive-объект не отличается по ключу (`objects/{sha256}/{id}`) от обычного, но его encryption key — другой. `sensitive.reason` хранится только в `registry.jsonl`, не в метаданных bucket-объекта. Никакого public URL, никакого presigned permanent URL — только временный, по решению Panel.

[Архитектор]: FD-3 — append-only том с `registry.jsonl` и lifecycle ledger — реплицируется в checkpoint следующим образом. Checkpoint атомарно включает: байтовый manifest (список `{sha256, bytes, id}` всех объектов FD-1 на момент снимка) и snapshot `registry.jsonl` + lifecycle ledger на тот же момент. Checkpoint создаётся как единый неделимый архив. Backup bytes (FD-2) синхронизируются в рамках той же checkpoint-операции. Restore использует именно одну checkpoint-пару: manifest + registry snapshot. Drill не сравнивает старые bytes с текущим FD-3, а восстанавливает именно ту пару.

[Teamlead]: Хорошо. Переходим к lifecycle mechanism. Поправка run1 требует выбрать один вариант: либо отдельный append-only lifecycle ledger, привязанный к `id`, либо новая полная M2 record. Ожегов, твоё мнение?

[Структурщик]: Выбираю **отдельный append-only lifecycle ledger**, привязанный к `id` record. Аргумент: новая M2 record создаётся только при смене address (это правило M2), а lifecycle события — hold, tombstone, deletion — не являются сменой адреса. Создавать M2 record ради флага `hold` означало бы засорять lineage семантически пустыми revision. Ledger — отдельный append-only файл `lifecycle.jsonl` на FD-3 — содержит записи вида `{record_id, event, timestamp, authorized_by, reason}`. M2 `registry.jsonl` остаётся неизменной. История registry и lifecycle история отличимы структурно.

[Верстальщик]: Тогда мне нужна ясность: tombstone в lifecycle ledger означает, что физические байты могут быть удалены, но запись в `registry.jsonl` остаётся навсегда с `location.ref`, который теперь указывает на несуществующий объект. Это dangling location — и оно должно обнаруживаться reconciliation, а не молча существовать.

[Математик]: Именно. Reconciliation за 24 часа выявляет dangling: объект по `location.ref` не найден в FD-1, но lifecycle ledger не содержит authorized deletion для этого `id`. Это — незапланированное исчезновение, алерт. Если lifecycle ledger содержит authorized tombstone — dangling ожидаемое, метрика не алертит, но объект помечается в reconciliation report как `tombstoned/bytes-absent`. Authorized deletion и dangling различаются через ledger — именно так, как требует run1.

[Музыкант]: А что происходит с superseded revision? Если record `id_v1` имеет `location.ref` на объект, и появляется новый record `id_v2` той же lineage, старый объект не удаляется автоматически. В lifecycle ledger для `id_v1` может появиться событие `superseded`. Физическое удаление объекта происходит только по authorized tombstone + отсутствию hold. Если на `id_v1` стоит hold — физическое удаление блокируется, даже если объект superseded.

[Архитектор]: Retention rules: active original — бессрочно, пока не создан authorized tombstone. Superseded revision — retention минимум 365 дней с момента события `superseded` в lifecycle ledger, если нет hold. Hold имеет явный приоритет и блокирует любое физическое удаление независимо от retention срока. Backup retention — 30 дней для rolling backup checkpoints; checkpoint, использованный в последнем успешном drill, хранится до следующего успешного drill.

[Teamlead]: Quota. Дынин уже дал predicate. Нужны конкретные пороги и единицы.

[Математик]: Capacity unit — байты. Per-object limit: объект размером более 2 GiB не принимается независимо от capacity предиката (hard per-object cap). Per-collection soft watermark: когда использованный объём FD-1 достигает 0.85 × T — генерируется предупреждение, ingest продолжается. Hard watermark: 0.90 × T — ingest блокируется fail-closed. Абсолютный резерв 12 GiB проверяется параллельно. Admission предиката: `ALLOW` если и только если `(F − size) ≥ 12 GiB` И `used_after / T < 0.90`. Наблюдаемые метрики: `storage_used_bytes`, `storage_free_bytes`, `storage_capacity_bytes`, `storage_used_ratio`, `admission_denied_count`. Office VDS с 9.46 GiB свободного места не проходит первое условие admission predicate — это NO-GO, не readiness.

[Музыкант]: Уточню по backup schedule: ежедневный checkpoint в 03:00 UTC, retention 30 дней. Checkpoint атомарно: сначала manifest bytes FD-1, затем snapshot FD-3 (registry.jsonl + lifecycle.jsonl), затем архив отправляется в FD-2. Если любой из шагов не завершён — checkpoint считается неудачным, предыдущий checkpoint не удаляется, алерт. RPO: 24 часа (потеря максимум одного дня ingest). RTO: 4 часа (восстановление FD-1 из FD-2 и FD-3 из последнего успешного checkpoint с проверкой integrity каждого объекта).

[Структурщик]: Restore drill: раз в 30 дней выбирается последний успешный checkpoint. В изолированной среде восстанавливается FD-3 из snapshot и FD-1 из backup manifest. Для каждого объекта из manifest проверяется sha256 и bytes — это integrity проверка restore. Реестр сверяется с manifest: все `id` из registry snapshot должны иметь соответствующий объект в восстановленном FD-1. Результат drill: pass/fail с числом объектов, числом несовпадений, временем восстановления. «Backup включён» без pass drill — NOT PASS readiness gate.

[Верстальщик]: По server/access contract с M3: Panel — единственная точка выдачи `location.ref` (при `read-ref`) и байтов (при `read-bytes`). Bucket FD-1 и FD-2 не имеют публичного эндпоинта. Прямой запрос к bucket в обход Panel не авторизован — credentials bucket-а не выдаются клиентам, только внутренним сервисам. Temporary signed URL генерируется только на время сессии (TTL ≤ 15 минут), не сохраняется, не логируется в открытом виде. Журнал доступа содержит `record_id`, `event_type`, `timestamp`, `authorized_by` — без `location.ref` и без URL.

[Архитектор]: Сведу failure domains в таблицу для записи. FD-1: primary object bucket, S3-compatible, отдельная учётная запись, отдельный credential. FD-2: backup object bucket, другая учётная запись или физический узел, другой credential, не совместно с FD-1 ни по machine, ни по volume, ни по account. FD-3: append-only том с `registry.jsonl` и `lifecycle.jsonl`, отдельный от FD-1 и FD-2. Checkpoint связывает FD-3 snapshot с FD-2 bytes manifest атомарно. Потеря одного FD не означает потери данных — восстановление возможно из оставшихся двух при наличии последнего checkpoint.

[Teamlead]: Это полная конструкция. Теперь случаи — прогоним коротко, по существу.

[Математик]: Случай 1: новый чек, capacity в норме. Predicate: `(F − size) ≥ 12 GiB` и `used_after / T < 0.85` — оба true. Admission ALLOW. Объект записывается в FD-1, post-write integrity проверяет sha256 и bytes. Запись в `registry.jsonl`. Вещдок: запись в реестре с совпадающими sha256, bytes, location.ref.

[Музыкант]: Случай 2: объект превышает per-object quota (> 2 GiB). Admission DENY до capacity predicate — срабатывает per-object cap. Объект не записывается. Запись в admission log: `denied/per-object-cap`. Вещдок: admission log с причиной и size объекта.

[Структурщик]: Случай 3: soft watermark — `used / T ≥ 0.85`. Admission продолжается, генерируется метрика `storage_watermark_soft`. Hard watermark — `used / T ≥ 0.90` или `F < 12 GiB`. Admission DENY, fail-closed. Вещдок: метрика `storage_used_ratio` ≥ 0.85 / 0.90, admission_denied_count растёт.

[Верстальщик]: Случай 4: post-write integrity fail — считанный sha256 или bytes не совпадает с M2 record. Объект перемещается в карантин (`quarantine/{sha256}/{id}`), запись в `registry.jsonl` не создаётся, admission denied. Алерт. Вещдок: quarantine log с расхождением sha256 или bytes.

[Архитектор]: Случай 5: sensitive PDF. Хранится в FD-1 с отдельным encryption key (не в Git). `location.ref` непрозрачен, не является публичным URL. Bucket закрыт. Прямого публичного URL нет структурно. Вещдок: bucket policy — no public access; encryption key для `sensitive.reason`-объектов — изолированный credential store.

[Teamlead]: Случай 6: primary failure. FD-1 недоступен. Запускается restore из последнего checkpoint: FD-3 snapshot восстанавливается первым (реестр), затем FD-1 восстанавливается из FD-2 backup с проверкой sha256 и bytes для каждого объекта. RTO: 4 часа. RPO: 24 часа. Вещдок: drill report с временем восстановления и числом объектов; последний успешный checkpoint не старше 24 часов.

[Математик]: Случай 7: backup существует, drill не проходил. Readiness gate FAIL. Backup без успешного drill — NOT PASS. Admission для production ingest заблокирован до первого pass drill. Вещдок: отсутствие drill pass record в audit log.

[Музыкант]: Случай 8: удаление superseded revision при действующем hold. Lifecycle ledger содержит событие `hold` для данного `record_id`. Физическое удаление объекта BLOCK — hold имеет явный приоритет. Событие `deletion_attempt/blocked_by_hold` записывается в lifecycle ledger. Вещдок: lifecycle ledger запись с hold и blocked deletion.

[Структурщик]: Случай 9: пользователь знает `location.ref`, но не имеет `read-bytes`, или обращается к bucket напрямую. Прямой запрос к bucket — не авторизован, bucket не имеет публичного эндпоинта. Запрос через Panel без `read-bytes` решения — Panel отвечает deny. `location.ref` без `read-ref` — не выдаётся. Вещдок: Panel access log с deny; bucket access log пуст (нет прямых запросов от клиентов).

[Верстальщик]: Случай 10: office VDS ниже capacity minimum в момент миграции. Admission predicate: `F < 12 GiB` → DENY. Migration readiness gate: capacity FAIL. Нельзя начать ingest на office VDS при 9.46 GiB свободного. Вещдок: capacity predicate result = FAIL, migration gate blocked.

[Архитектор]: Readiness gates для production ingest: (G1) capacity predicate PASS на FD-1 — `F ≥ 12 GiB` и `used/T < 0.85`; (G2) write/read/hash round-trip — тестовый объект записан, прочитан, sha256 и bytes совпали; (G3) backup checkpoint создан успешно на FD-2; (G4) restore drill выполнен успешно — pass record в audit log; (G5) auth bypass test — прямой запрос к bucket без Panel credentials вернул отказ; (G6) inventory/reconciliation — reconciliation за первый прогон не выявила расхождений. Все шесть — обязательны. Один FAIL блокирует ingest.

[Teamlead]: Для миграции дополнительно: (G7) FD-3 том смонтирован и доступен для записи; (G8) lifecycle ledger инициализирован (пустой `lifecycle.jsonl` с проверкой схемы). Итого восемь gates. Без всех восьми — production не открывается.

[Математик]: Уточню по reconciliation gate G6: первый прогон — это синтетический тест, не production данные. Пишется тестовый объект с известным sha256 и bytes, читается, проверяется, затем удаляется с authorized tombstone в lifecycle ledger. Reconciliation должна показать tombstone без алерта. Это доказывает и integrity, и lifecycle ledger, и reconciliation pipeline одновременно.

[Музыкант]: По encryption: все объекты в FD-1 и FD-2 шифруются at rest (AES-256). Sensitive-объекты — дополнительный envelope encryption отдельным ключом. Ключи FD-1 и FD-2 — разные, credential store — изолированный от application layer. Ключи rotation — по расписанию, не реже раза в год, с re-encryption или envelope key rotation.

[Структурщик]: Финальный момент по dedup: если два record с разными `id` имеют одинаковый `sha256`, физически в FD-1 может лежать один объект по пути `objects/{sha256}/`. Но каждый record хранит собственный `location.ref`, указывающий на этот объект. В `registry.jsonl` — две отдельные строки, два `id`, две lineage. Lifecycle ledger трекает каждый `id` независимо: tombstone для одного `id` не удаляет объект, пока другой `id` на него ссылается и не tombstoned. Физическое удаление объекта происходит только когда все ссылающиеся `id` tombstoned и без hold.

[Верстальщик]: Это закрывает identity isolation requirement из run1. Разные M2 records остаются разными записями и разными lineages даже при физически совпадающих bytes.

[Архитектор]: Конструкция замкнута. Topology выбрана: S3-compatible object storage, паттерн фиксирован. FD-3 — append-only том, конкретный носитель — выделенный volume. Lifecycle mechanism — отдельный `lifecycle.jsonl` ledger на FD-3. Object key — `objects/{full_sha256_64hex}/{record_id}`. Integrity — sha256 + bytes, fail-closed. Capacity predicate — единый, двойное условие. Restore — checkpoint-пара. M6 не проектировался ни в одной реплике.

[Teamlead]: Все роли высказались. Фиксирую итог. Переходим к записи вердикта.

---

## Итоговое решение консилиума

### S1 — Пропозиция

**Topology:** S3-compatible object storage — primary pattern, выбранный единственным и окончательным. Физические байты хранятся в object bucket (FD-1). Metadata управления (`registry.jsonl`, `lifecycle.jsonl`) хранятся на append-only томе (FD-3), отдельном от FD-1 и FD-2. Fail-closed: при недоступности FD-3 или при несовпадении sha256/bytes admission DENY.

---

### Таблица storage classes, копий и failure domains

| Failure Domain | Назначение | Носитель | Независимость |
|---|---|---|---|
| FD-1 | Primary object bucket — байты | S3-compatible bucket, account A | Отдельная учётная запись, отдельный credential |
| FD-2 | Backup object bucket — байты | S3-compatible bucket, account B | Другая учётная запись/узел/зона, другой credential, не пересекается с FD-1 ни по machine, ни по volume |
| FD-3 | Registry + lifecycle ledger | Append-only выделенный том | Отдельный volume, отдельный от FD-1 и FD-2; checkpoint реплицируется в FD-2 атомарно |

**Потеря failure domain:** недоступность всех объектов домена более RTO (4 ч) или невозможность append-записи в FD-3.

---

### Object key и integrity contract (согласован с M2)

**Object key format:** `objects/{sha256_64hex}/{record_id}`

- `sha256_64hex` — полный sha256 из M2 record (64 символа), не префикс.
- `record_id` — поле `id` конкретной M2 record.
- `canonicalRef` не используется в key и не является URL.

**Overwrite policy:** объект по key immutable после первой успешной записи. Overwrite запрещён. Новая revision создаёт новую M2 record с новым `id` и новым key.

**Dedup:** объекты с совпадающим `sha256` могут разделять физический объект в `objects/{sha256}/`, но каждый record имеет собственный `location.ref` и независимую строку в `registry.jsonl`. Физическое удаление объекта — только когда все ссылающиеся `id` tombstoned и без hold.

**Integrity:** post-write, pre-read, reconciliation (24 ч), backup, restore — все проверяют `sha256` + `bytes` вместе. Несовпадение любого → quarantine `quarantine/{sha256}/{record_id}` + алерт + admission deny для данного объекта.

---

### Quota / watermark / admission contract

**Capacity predicate (единый):**

```
ALLOW ⟺ (free_after ≥ 12 GiB) AND (used_after / total < 0.90)
```

где `free_after = F − size(object)`, `used_after = used + size(object)`.

| Порог | Значение | Действие |
|---|---|---|
| Per-object cap | 2 GiB | DENY до capacity predicate |
| Soft watermark | used / total ≥ 0.85 | Предупреждение, ingest продолжается |
| Hard watermark | used / total ≥ 0.90 | Ingest DENY, fail-closed |
| Абсолютный резерв | free < 12 GiB | Ingest DENY, fail-closed |

**Наблюдаемые метрики:** `storage_used_bytes`, `storage_free_bytes`, `storage_capacity_bytes`, `storage_used_ratio`, `admission_denied_count`, `storage_watermark_soft` (bool), `storage_watermark_hard` (bool).

**Office VDS 9.46 GiB:** capacity predicate = FAIL, migration gate BLOCKED.

---

### Backup / restore / RPO / RTO contract

**Schedule:** ежедневный checkpoint в 03:00 UTC.

**Checkpoint атомарная операция:**
1. Bytes manifest FD-1 (список `{record_id, sha256, bytes}` всех объектов).
2. Snapshot `registry.jsonl` + `lifecycle.jsonl` (FD-3) на тот же момент.
3. Единый архив отправляется в FD-2.

Если любой шаг не завершён — checkpoint FAIL, предыдущий checkpoint не удаляется, алерт.

**RPO:** 24 часа.
**RTO:** 4 часа.

**Backup retention:** 30 дней rolling. Последний успешный drill checkpoint хранится до следующего успешного drill.

**Restore drill:** раз в 30 дней. В изолированной среде восстанавливается ровно одна checkpoint-пара (manifest + registry snapshot). Для каждого объекта проверяется sha256 + bytes. Результат: pass/fail report с числом объектов и временем.

**«Backup включён» без pass drill = NOT PASS.**

---

### Retention / deletion / tombstone contract

| Состояние | Физические байты | Registry history | Lifecycle ledger |
|---|---|---|---|
| Active original | Сохраняются бессрочно | Неизменна | Нет события или `active` |
| Superseded revision | Сохраняются минимум 365 дней от события `superseded` | Неизменна | Событие `superseded` |
| Hold | Физическое удаление BLOCK | Неизменна | Событие `hold` с `authorized_by` |
| Authorized tombstone | Удаляются по истечении retention | Неизменна (строка остаётся) | Событие `tombstone` с `authorized_by` |
| Dangling (неожиданное) | Объект отсутствует, ledger не содержит tombstone | Неизменна | Алерт reconciliation |

**Удаление bytes не удаляет историю M2 молча.** Строка `registry.jsonl` неизменна всегда. Dangling обнаруживается reconciliation (24 ч) через сравнение объектов FD-1 с реестром и lifecycle ledger. Hold имеет явный приоритет над retention и tombstone.

---

### Server / access / encryption contract (согласован с M3)

- Bucket FD-1 и FD-2: нет публичного эндпоинта, нет postоянных presigned URLs.
- `location.ref` выдаётся только Panel при `read-ref`-решении; без решения — не выдаётся.
- Байты выдаются только при `read-bytes`-решении через temporary signed URL (TTL ≤ 15 мин).
- Журнал доступа: `{record_id, event_type, timestamp, authorized_by}` — без `location.ref`, без URL, без secret.
- Encryption at rest: AES-256 для всех объектов FD-1 и FD-2.
- Sensitive-объекты: envelope encryption отдельным ключом, хранящимся в изолированном credential store.
- Encryption in transit: TLS 1.2 minimum.
- Ключи FD-1 и FD-2 — разные; credential store изолирован от application layer.

---

### Таблица обязательных случаев

| Случай | Ожидаемое решение | Где проверяется | Вещдок |
|---|---|---|---|
| 1. Новый небольшой чек при нормальной capacity | Admission ALLOW; объект записан в FD-1; post-write integrity PASS; запись в `registry.jsonl` | Admission predicate + post-write integrity check | Строка `registry.jsonl` с совпадающими `sha256`, `bytes`, `location.ref` |
| 2. Объект превышает per-object cap (> 2 GiB) | Admission DENY на per-object cap до capacity predicate | Per-object cap check на входе | Admission log: `denied/per-object-cap`, size объекта |
| 3. Soft → hard watermark | Soft (≥ 0.85): предупреждение, ingest продолжается. Hard (≥ 0.90) или free < 12 GiB: DENY fail-closed | Capacity predicate; метрика `storage_used_ratio` | `storage_watermark_soft = true` / `storage_watermark_hard = true`; `admission_denied_count` растёт |
| 4. Post-write integrity fail (sha256 или bytes не совпадает) | Объект → quarantine; запись в `registry.jsonl` не создаётся; DENY; алерт | Post-write integrity check | Quarantine log: `{record_id, expected_sha256, actual_sha256, expected_bytes, actual_bytes}` |
| 5. Sensitive PDF — вне Git, без публичного URL | Хранится в FD-1 с envelope encryption; нет публичного URL; `location.ref` непрозрачен; выдаётся только Panel | Bucket policy; credential store isolation; Panel access log | Bucket policy = no-public-access; encryption key в изолированном store; Panel log без raw ref |
| 6. Primary failure → restore в RTO/RPO | Restore из последнего checkpoint (FD-2 + FD-3 snapshot); integrity каждого объекта; RTO ≤ 4 ч; потеря ≤ 24 ч | Restore drill report | Drill pass record: время восстановления, число объектов, нулевые расхождения sha256+bytes |
| 7. Backup есть, drill не проходил | Readiness gate FAIL; production ingest заблокирован | Readiness gate G4 | Отсутствие drill pass record в audit log |
| 8. Удаление superseded revision при hold | Physical deletion BLOCK; lifecycle ledger: `deletion_attempt/blocked_by_hold` | Lifecycle ledger hold check перед физическим удалением | Lifecycle ledger запись `{record_id, event: blocked_by_hold, timestamp}` |
| 9. Знает `location.ref`, нет `read-bytes`; прямой доступ к bucket | Panel DENY без `read-bytes` решения; прямой запрос к bucket — не авторизован (нет публичного эндпоинта) | Panel access control; bucket policy | Panel log: `deny/no-read-bytes`; bucket access log: нет клиентских запросов |
| 10. Office VDS < capacity minimum при миграции | Capacity predicate FAIL: `free = 9.46 GiB < 12 GiB`; migration gate G1 BLOCKED | Readiness gate G1 | `storage_free_bytes = 9.46 GiB`; predicate result = FAIL |

---

### Readiness gates

| Gate | Проверка | Pass условие |
|---|---|---|
| G1 | Capacity | `free ≥ 12 GiB` AND `used/total < 0.85` на FD-1 |
| G2 | Write / read / hash round-trip | Тестовый объект записан, прочитан, sha256 и bytes совпали с заявленными |
| G3 | Backup checkpoint создан | Checkpoint в FD-2 создан успешно, статус = success |
| G4 | Restore drill pass | Drill pass record в audit log, время ≤ RTO, расхождений = 0 |
| G5 | Auth bypass test | Прямой запрос к FD-1 bucket без Panel credentials → отказ |
| G6 | Reconciliation | Первый прогон: синтетический объект записан, tombstoned, reconciliation = 0 алертов |
| G7 | FD-3 том доступен | append-only том смонтирован, запись в `registry.jsonl` и `lifecycle.jsonl` успешна |
| G8 | Lifecycle ledger инициализирован | `lifecycle.jsonl` создан, схема проверена |

Все восемь gates обязательны. Один FAIL → production ingest не открывается.

---

## Список посылок

| # | Посылка | Тип |
|---|---|---|
| P1 | Office VDS свободно 9.46 GiB при измеренном минимуме 12 GiB — capacity NO-GO | **факт** |
| P2 | `registry.jsonl` — источник истины; строка неизменна после записи | **норма** (M2) |
| P3 | `canonicalRef` идентифицирует lineage, не является URL или storage key | **норма** (M2) |
| P4 | Реальные M2-поля: `id`, `canonicalRef`, `sha256`, `bytes`, `location.kind`, `location.ref`, `sensitive.reason` | **норма** (M2) |
| P5 | `container_id`, `lineage_id`, `revision_seq` в M2 отсутствуют и запрещены в key | **норма** (run1) |
| P6 | Sensitive record: допустимый `location.kind`, непустой `location.ref`, отдельный `sensitive.reason`; sensitive — не отдельный kind | **норма** (M2) |
| P7 | Panel — единственный авторизатор; байты — только после `read-bytes`/`download` решения proxy | **норма** (M3) |
| P8 | Прямой URL bucket-а не должен обходить Panel | **норма** (M3) |
| P9 | M3 не выбрал физический склад, vendor, backup, retention, endpoint | **факт** |
| P10 | Каталог резервных копий пуст; доказанного restore нет | **факт** |
| P11 | Sensitive PDF партнёра вне репозитория, без доказанного storage path | **факт** |
| P12 | В публичном Git лежит один чек — sensitive bytes не должны попасть в Git | **факт** |
| P13 | До решения M4 запрещено увеличивать архив оригиналов на office VDS | **норма** (M4) |
| P14 | Dedup не сливает identities: разные records могут ссылаться на один объект, оставаясь разными | **норма** (run1) |
| P15 | Integrity проверяет полный sha256 + bytes; несовпадение любого — fail-closed | **норма** (run1) |
| P16 | M2 record не мутируется; lifecycle события — в отдельном append-only ledger | **норма** (run1) |
| P17 | Restore использует ровно одну checkpoint-пару (manifest + registry snapshot) | **норма** (run1) |
| P18 | Capacity predicate единый: абсолютный минимум 12 GiB + ratio watermark 0.90 | **норма** (run1) |
| P19 | Hold имеет явный приоритет над retention и tombstone | **норма** (run1) |
| P20 | Backup retention 30 дней; retention для active — бессрочно, superseded — минимум 365 дней | **норма** (run1) |
| P21 | M6 не проектируется: HTTP codes, upload proxy, hash pipeline, API — за границей M4 | **норма** (run1) |
| P22 | FD-3 — один конкретный носитель (append-only выделенный том), не «Git или FS» | **норма** (run1) |
| P23 | Смена address создаёт новую M2 record в той же lineage | **норма** (M2) |
| P24 | В Affine 82 страницы и 57 PNG/SVG; нет корпуса чеков и внешних PDF | **факт** |

---

## Definition of Done

- [x] Один вопрос S1 и один carrier
- [x] Выбрана одна topology (S3-compatible object storage) и независимые failure domains (FD-1, FD-2, FD-3)
- [x] Object key (`objects/{sha256_64hex}/{record_id}`), immutability и integrity (sha256 + bytes, fail-closed) согласованы с M2
- [x] Sensitive storage (envelope encryption, изолированный credential) и direct bypass (bucket без публичного эндпоинта) согласованы с M3
- [x] Quota/watermarks/admission измеримы (единый predicate, soft 0.85, hard 0.90, резерв 12 GiB)
- [x] Backup (ежедневный checkpoint), restore (checkpoint-пара), RPO (24 ч), RTO (4 ч) и drill (30 дней) исполнимы
- [x] Retention/deletion/tombstone не стирают историю молча (lifecycle ledger, `registry.jsonl` неизменна)
- [x] Все 10 обязательных случаев и 8 readiness gates доказаны
- [x] M5–M7 не решены
