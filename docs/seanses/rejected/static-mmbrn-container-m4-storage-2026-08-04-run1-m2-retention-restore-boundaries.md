<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-08-04T16:19:02.412Z |
| Команда | `yarn consilium` |
| Модель | openrouter/anthropic/claude-sonnet-4.6 |
| Файл | `docs/seanses/static-mmbrn-container-m4-storage-2026-08-04.md` |
| Порядок ролей | Музыкант → Верстальщик → Архитектор → Структурщик → Математик → Teamlead |
| Повестка | `docs\meeting\static-mmbrn-container\M4_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs\meeting\static-mmbrn-container\M4_AGENDA.md` | 7263 | `717c76830572` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs\meeting\static-mmbrn-container\M4_AGENDA.md` | 7263 · 1 п. | `717c76830572` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --no-memory --min-replies 36 --seed 101`

**Вопрос:**

Исполните только S1 M4. Выберите одну vendor-neutral topology и докажите storage/backup failure domains, object integrity, quota/watermarks, restore RPO/RTO, retention/deletion, sensitive access и readiness gates на обязательных случаях. Office VDS остаётся NO-GO. M5-M7 не решать. Не менее 36 предметных ролевых реплик. Секция ровно 'Список посылок'; после DoD конец; без эха, самосчёта и meta.

---

# Консилиум: M4 — хранение и живучесть `static.mmbrn.tech`

**Повестка:** S1 — один исполнимый контракт физического хранения и живучести байтов: topology, failure domains, integrity, quota, backup/restore, retention, sensitive, readiness gates.

**Участники:** Музыкант (Kurёkhin), Верстальщик (Rodchenko), Архитектор (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Teamlead (Tarasov).

**Порядок реплик:** Музыкант → Верстальщик → Архитектор → Структурщик → Математик → Teamlead

---

[Музыкант]: Прежде чем говорить о схемах — зафиксирую факт из фактуры: office VDS даёт 9.46 GiB свободных при минимуме 12 GiB, backup-каталог пуст, restore не доказан. Это не «почти готово» — это три красных флага одновременно. Sensitive PDF партнёра не имеет переносимого storage path. Значит первый вопрос повестки уже ответил сам: нам нужна topology вне VDS, с независимым backup и доказанным restore до первого ingest.

[Верстальщик]: Меня как верстальщика здесь интересует один инвариант: Panel — единственная точка выдачи байтов. Если storage вернёт прямой URL или presigned permanent link, который обходит Panel, — контракт M3 рушится ещё до первого рендера. Поэтому topology обязана технически исключать публичный доступ к объектам без прохождения через proxy. Это не пожелание — это структурный предпосылок для любого UI, который будет проектировать M5.

[Архитектор]: Формулирую форму решения. Выбор между «object storage» и «выделенный storage host/volume» — не вкусовой. Object storage даёт нам три вещи сразу: иммутабельные версии объектов по ключу, независимый credential per bucket/prefix, и возможность разместить primary и backup в двух физически несвязанных аккаунтах или провайдерах без разделения machine и volume. Выделенный host — это дополнительный failure domain на уровне ОС и диска, который мы обязаны администрировать сами. Рекомендую topology: **self-hosted S3-compatible object storage** (MinIO или аналог на протоколе S3) как primary, плюс независимый второй S3-compatible endpoint как backup — разные хосты, разные credentials, разные сети. Metadata управления (`registry.jsonl`) — в отдельном репозитории или хранилище, не в том же bucket что bytes.

[Структурщик]: Уточню контракт ключа объекта, чтобы не смешать `canonicalRef` с URL. M2 говорит: `canonicalRef` идентифицирует lineage, но не является URL или storage key. Значит storage key — это производная величина: `{container}/{lineage_id}/{revision_seq}/{sha256[0:8]}`. Такой ключ связывает объект с M2 record через `lineage_id` и `revision_seq`, которые присутствуют в registry.jsonl, но сам ключ не раскрывается через `canonicalRef`. Overwrite запрещён — объект immutable после записи. Dedup: перед записью proxy проверяет sha256 по реестру; если совпадает — новый объект не создаётся, создаётся новая record с указателем на тот же ключ. Quarantine: если после записи считанный sha256 не совпадает с заявленным — объект перемещается в `quarantine/` prefix, record получает статус `integrity-failed`, admission блокируется.

[Математик]: Числа по quota и watermark. Capacity unit — байты объекта (без overhead metadata). Per-container soft watermark: 80% от provisioned capacity. Hard watermark: 95%. Reserve: 5% заблокировано под системные нужды (quarantine, tombstone, backup staging). Admission fail-closed: при достижении hard watermark новые write-запросы отклоняются с кодом ошибки `507 Insufficient Storage`; существующие объекты не удаляются автоматически. Per-object limit: устанавливается явно в конфигурации контейнера; при его отсутствии — консервативный default 512 MiB на объект. Наблюдаемые метрики: `storage_bytes_used`, `storage_bytes_provisioned`, `storage_watermark_soft_ratio`, `storage_watermark_hard_ratio`, `admission_rejected_total`. Метрики экспортируются в формате Prometheus-compatible scrape endpoint — вне scope M6, но интерфейс должен быть определён здесь как invariant.

[Teamlead]: Слушаю. Форма решения от Веснина — object storage S3-compatible — принимается как вердикт topology. Теперь по failure domains: primary и backup не могут разделять машину, volume, аккаунт или credential — это закрытая норма из повестки. Прошу Веснина формализовать таблицу классов и доменов, Ожегова — контракт ключа и integrity pipeline, Дынина — quota с числами. Музыканту и Родченко — зафиксировать sensitive и bypass-контракт. Работаем по циклу дальше.

[Музыкант]: Sensitive bytes — отдельный разговор. PDF партнёра не просто «не публичный» — он не должен быть доступен даже по временной ссылке вне сессии с активным `read-bytes` решением Panel. Значит: никаких presigned URL с TTL больше длительности одного download-запроса. Лучше — streaming через proxy без передачи ключа клиенту вообще. Encryption at rest: AES-256 на уровне storage, ключ — в отдельном credential store, не в том же конфиге что bucket endpoint. Encryption in transit: TLS 1.2+ обязателен на всём пути proxy → storage. `location.ref` sensitive record в журнале не логируется в открытом виде — только хэш или masked форма.

[Верстальщик]: Добавлю к sensitive: `location.ref` — это внутренний ключ, и если журнал audit-trail пишет его в plaintext, это утечка. Нужно правило: в audit log пишется `lineage_id` и действие, но не `location.ref` и не полный storage key. Это не M6-задача, это invariant, который должен быть зафиксирован здесь, чтобы M6 не нарушил его «удобным логированием».

[Архитектор]: Фиксирую таблицу failure domains. Три класса: **FD-1** — primary object storage, независимый хост/аккаунт/credential, содержит bytes и служебные метаданные объектов; **FD-2** — backup object storage, физически отдельный хост или провайдер, отдельный аккаунт, отдельный credential, содержит полные копии bytes и снапшот registry.jsonl; **FD-3** — registry store, хранит `registry.jsonl` и историю, может быть Git-репозиторий на третьем хосте или append-only файловое хранилище. Потеря failure domain — это недоступность хоста, удаление аккаунта, компрометация credential или физическая потеря volume. Две независимые копии bytes всегда — FD-1 и FD-2. Кеш или реплика внутри одного аккаунта failure domain не образуют.

[Структурщик]: Immutability контракт: объект записывается один раз по ключу `{container}/{lineage_id}/{revision_seq}/{sha256[0:8]}`. После записи PUT на тот же ключ запрещён на уровне bucket policy. Superseded revision — это объект с `revision_seq < current_max` для данного `lineage_id`; он не удаляется автоматически, он помечается в реестре как `status: superseded`. Физическое удаление superseded возможно только если нет active hold и retention period истёк. Tombstone: если объект физически удалён, в registry.jsonl добавляется запись `{status: tombstone, deleted_at, reason}`; история lineage не стирается. Dangling location: integrity daemon периодически сверяет `location.ref` из реестра с фактическим присутствием объекта в storage; отсутствующий объект без tombstone — это `dangling`, алерт, не тихое игнорирование.

[Математик]: RPO и RTO. Backup schedule: инкрементальный каждые 4 часа, полный еженедельно. RPO = 4 часа (максимальная потеря данных между инкрементальными backup). RTO = 8 часов (время восстановления primary из backup с верификацией целостности). Restore drill: раз в 30 дней, автоматизированный скрипт восстанавливает случайную выборку объектов из backup в изолированную staging среду и проверяет sha256 каждого объекта против registry.jsonl. Результат drill: `pass` или `fail` с перечнем несовпадений. `backup-exists-no-drill-pass` — статус `FAIL` для readiness gate, не PASS. Retention копий backup: минимум 30 дней, после — удаляются по политике, но не раньше успешного drill следующего цикла.

[Teamlead]: Хорошо. Drill без доказанного restore — не PASS, это норма. Прошу Дынина зафиксировать readiness gates числово. Веснину — уточнить, где живёт metadata управления storage относительно bytes. Ожегову — retention/hold/tombstone таблицу. Продолжаем.

[Музыкант]: По restore drill — добавлю требование к содержанию доказательства. Мало проверить sha256 объектов: нужно доказать, что registry.jsonl и bytes восстановлены совместно и консистентны. То есть для каждого восстановленного объекта: sha256 из реестра совпадает с sha256 фактического байта, `lineage_id` из ключа совпадает с записью в registry.jsonl, `revision_seq` не конфликтует. Если реестр восстановлен, но байты другой версии — это ложное совпадение, drill должен это обнаружить.

[Верстальщик]: Ещё один инвариант для sensitive: proxy не пишет в response headers ничего, что раскрывает storage endpoint, bucket или key. Никаких `X-Storage-Key`, никаких `Content-Disposition` с полным путём. Это не UI-задача, это transport invariant, который нужно зафиксировать в M4, иначе M6 реализует «удобный» header и сломает изоляцию.

[Архитектор]: Metadata управления storage — уточняю. Bytes хранятся в FD-1 (primary) и FD-2 (backup). Metadata управления — это два раздельных слоя: первый — object metadata внутри storage (ETag, size, upload timestamp, custom headers с `lineage_id` и `revision_seq`) — хранится там же где bytes, в FD-1 и FD-2; второй — registry.jsonl — хранится в FD-3, отдельно от bytes. Это разделение критично: потеря FD-1 не уничтожает реестр, потеря FD-3 не уничтожает bytes. Восстановление возможно с любой стороны при наличии двух оставшихся доменов.

[Структурщик]: Retention и hold. Четыре статуса объекта в реестре: `active` (текущая ревизия), `superseded` (старая ревизия, lineage жива), `hold` (legal или owner hold, физическое удаление заблокировано независимо от retention), `tombstone` (физически удалён, запись в истории остаётся навсегда). Переход `active → superseded` происходит при появлении новой revision в lineage. Переход `superseded → deleted` (физическое удаление bytes) — только при: retention period истёк И нет hold флага. Переход любого статуса → `tombstone` фиксируется в registry.jsonl с timestamp и reason. Удаление bytes без tombstone record — запрещено; integrity daemon обнаружит это как dangling.

[Математик]: Readiness gates. Перечисляю машинно проверяемые условия: **RG-1 Capacity** — `storage_bytes_used / storage_bytes_provisioned < 0.80` (ниже soft watermark), PASS/FAIL; **RG-2 Write/Read/Hash** — тестовый объект записан, считан, sha256 совпал, объект удалён из test prefix, PASS/FAIL; **RG-3 Backup connectivity** — backup endpoint доступен, test write прошёл, PASS/FAIL; **RG-4 Restore drill** — последний drill завершён с результатом `pass` не позже 30 дней назад, PASS/FAIL; **RG-5 Auth bypass** — прямой GET на storage endpoint без proxy credentials возвращает 403/401, не 200, PASS/FAIL; **RG-6 Inventory/Reconciliation** — integrity daemon прогнан на полном реестре, нет dangling, PASS/FAIL. Все шесть должны быть PASS до первого production ingest. Office VDS NO-GO — это автоматический FAIL для RG-1 при текущих 9.46 GiB; переименование в readiness не допускается.

[Teamlead]: Шесть гейтов — принимаю. Все шесть PASS — обязательное условие до ingest, не достаточное. Прошу команду пройти по обязательным случаям из повестки — десять строк, по одной реплике на случай от соответствующей роли. Начинаем.

[Музыкант]: Случай 1 — новый небольшой чек при нормальной capacity. Proxy принимает файл, вычисляет sha256 и bytes, проверяет per-object limit (≤ 512 MiB, чек заведомо меньше), проверяет `storage_watermark_hard_ratio < 0.95`. Оба условия PASS — объект записывается в FD-1 по ключу `{container}/{lineage_id}/{revision_seq}/{sha256[0:8]}`, registry.jsonl обновляется, backup sync запланирован на следующий инкремент. Вещдок: запись в registry.jsonl с `status: active`, ETag объекта в FD-1.

[Верстальщик]: Случай 2 — объект превышает per-object quota. Proxy получает заявленный `bytes` в pre-admission check. Если `bytes > 512 MiB` (или явно заданный per-object limit коллекции) — admission отклоняется до записи с кодом `413 Content Too Large`. Объект не попадает в storage, registry.jsonl не обновляется. Вещдок: admission log с причиной `per-object-limit-exceeded`, timestamp, `lineage_id` заявки.

[Архитектор]: Случай 3 — primary достигает soft, затем hard watermark. При пересечении 80%: метрика `storage_watermark_soft_ratio ≥ 1.0` — алерт оператору, новые ingests продолжаются. При пересечении 95%: метрика `storage_watermark_hard_ratio ≥ 1.0` — admission fail-closed, все новые write отклоняются с `507`, существующие объекты не затронуты. Разблокировка только после ручного подтверждения освобождения capacity и сброса метрики. Вещдок: лог admission с `hard-watermark-exceeded`, метрики в scrape endpoint.

[Структурщик]: Случай 4 — считанные bytes не совпадают с sha256 после записи. Post-write verification: proxy читает объект из FD-1 и пересчитывает sha256. Несовпадение — объект перемещается в `quarantine/` prefix (PUT заблокирован на исходном ключе), запись в registry.jsonl получает `status: integrity-failed`, оператору — алерт. Повторный ingest этого `lineage_id`/`revision_seq` невозможен до ручного разрешения. Вещдок: запись `integrity-failed` в registry.jsonl, объект в `quarantine/` prefix с timestamp.

[Математик]: Случай 5 — sensitive PDF вне Git и без прямого публичного URL. Объект хранится в FD-1 в prefix `sensitive/` с bucket policy: public access полностью отключён, presigned URLs запрещены на уровне IAM-эквивалента. `location.ref` в registry.jsonl — внутренний ключ, не URL. Доступ только через proxy после `read-bytes` от Panel. Git-репозиторий не содержит ни bytes, ни `location.ref`. Вещдок: bucket policy dump показывает `public-access: deny`, audit log показывает только proxy-инициированные GET, ни одного прямого external access.

[Teamlead]: Случай 6 — primary failure, restore в RTO. Primary FD-1 недоступен. Оператор инициирует restore: backup FD-2 → новый primary FD-1 (или временный FD-1'). Процедура: копирование bytes из FD-2, верификация sha256 каждого объекта против registry.jsonl из FD-3, обновление endpoint в конфиге proxy. Целевое время: ≤ 8 часов (RTO). Потеря данных: ≤ 4 часа (RPO, объекты записанные в последние 4 часа до failure могут отсутствовать в backup). Вещдок: restore log с sha256-верификацией каждого объекта, timestamp начала и конца, дельта между последним backup timestamp и временем failure.

[Музыкант]: Случай 7 — backup существует, drill ещё не проходил. RG-4 возвращает FAIL: `last-drill-result: none` или `last-drill-age > 30d`. Production ingest заблокирован — все шесть RG должны быть PASS. Оператор обязан запустить drill в staging, получить `pass`, только после этого RG-4 переходит в PASS и ingest разблокируется. «Backup включён» без успешного restore — не PASS, это явная норма readiness gates. Вещдок: RG-4 status в readiness dashboard, drill-log с результатом.

[Верстальщик]: Случай 8 — удаление superseded revision при действующем hold. Registry.jsonl содержит `status: superseded` и `hold: {type: legal, active: true}` для данного `lineage_id/revision_seq`. Запрос физического удаления блокируется retention engine: `deletion-blocked: hold-active`. Bytes остаются в FD-1. Tombstone не создаётся — tombstone возможен только после физического удаления. История в registry.jsonl неизменна. Вещдок: попытка deletion логируется с результатом `blocked`, hold record остаётся в реестре.

[Архитектор]: Случай 9 — пользователь знает `location.ref`, но не имеет `read-bytes`, или обращается к storage напрямую. Два sub-case. Первый: пользователь запрашивает bytes через proxy, Panel проверяет `read-bytes` — нет permission, proxy возвращает `403 Forbidden`, bytes не выданы, `location.ref` не раскрывается в error response. Второй: прямой HTTP GET на storage endpoint — bucket policy возвращает `403 Forbidden` (RG-5 проверяет именно это). В обоих случаях audit log пишет попытку с `lineage_id`, но не с `location.ref` в plaintext. Вещдок: storage access log без успешного direct access, proxy audit log с `403` без ref в теле ответа.

[Структурщик]: Случай 10 — office VDS ниже capacity minimum в момент планируемой миграции. RG-1 проверяет capacity нового primary storage, не VDS. VDS NO-GO — это факт, зафиксированный в фактуре: 9.46 GiB < 12 GiB minimum. Миграция на VDS невозможна вне зависимости от любых формулировок — переименование NO-GO в readiness не допускается. Readiness gate RG-1 проверяет: `target_storage_provisioned_bytes - target_storage_used_bytes ≥ 12 GiB`. Если target — VDS в текущем состоянии — FAIL автоматически. Вещдок: capacity check log против нового primary endpoint, VDS excluded из candidate list.

[Математик]: Хочу добавить к случаю 4 численный контракт integrity verification. Проверка не только post-write, но и периодическая: integrity daemon запускается раз в 24 часа, пересчитывает sha256 случайной выборки 5% объектов (или всех объектов если корпус < 1000). Несовпадение любого объекта — алерт `P1`, объект в quarantine, запись в реестре. Полное сканирование раз в 7 дней. Это покрывает silent data corruption, не только write-time corruption. Числа: 5% sample за 24 часа, 100% за 7 дней.

[Teamlead]: Принимаю дополнение к integrity — silent corruption реален и игнорировать его нельзя. Теперь — итоговый вопрос: есть ли у кого-то возражение против выбранной topology S3-compatible object storage как единственного вердикта? Или кто-то хочет защитить альтернативу выделенного storage host?

[Музыкант]: Выделенный storage host даёт больше контроля над DSP-смежными задачами в будущем (edge capture, streaming), но для текущей задачи — хранение документов и PDF — это избыточно и добавляет failure surface ОС-уровня. S3-compatible — правильный выбор для данного corpus.

[Верстальщик]: С точки зрения proxy-контракта — S3-compatible API даёт чистое разделение: proxy владеет credentials, клиент не видит storage endpoint. Выделенный host потребовал бы дополнительного слоя абстракции для того же результата. Поддерживаю object storage.

[Архитектор]: Альтернатива «выделенный host» не даёт ни одного преимущества для заявленных требований и добавляет операционную нагрузку. Вердикт: **S3-compatible object storage, self-hosted, два независимых endpoint как FD-1 и FD-2**. Один topology — зафиксирован.

[Структурщик]: Уточню один термин, который мы не финализировали: `archivarius` как `location.kind` из M2-контракта. В новой topology `location.kind = archivarius` будет указывать на объект в S3-compatible storage; `location.ref` — внутренний ключ объекта. Это согласуется с M2: `canonicalRef` не становится URL, `location.ref` — это opaque storage key, не раскрываемый без `read-ref`. Нужно зафиксировать это соответствие явно в carrier.

[Математик]: Финальное число для admission: capacity reserve 5% — это не просто резерв под quarantine. Quarantine может вырасти при массовом integrity failure. Поэтому: quarantine prefix имеет собственный hard cap — 2% от provisioned capacity. При превышении quarantine cap — алерт `P0`, ingest полностью заблокирован. Это предотвращает сценарий, где атака через corrupt objects заполняет весь reserve.

[Teamlead]: Хорошо. Все позиции заняты. Фиксирую вердикт консилиума: topology выбрана, failure domains определены, integrity контракт закрыт, sensitive bypass заблокирован, quota с числами, RPO 4h / RTO 8h, drill обязателен, tombstone история неизменна, все десять случаев доказаны, шесть readiness gates сформулированы машинно. Office VDS NO-GO остаётся NO-GO. M5–M7 не затронуты. Carrier готов к записи.

[Музыкант]: Последнее — про drill в staging. Staging не должна быть тем же хостом что primary или backup. Иначе drill, который «восстанавливает» объекты на тот же диск, не проверяет реальный restore сценарий. Staging = третья независимая среда, только для drill, сбрасывается после каждого цикла.

[Верстальщик]: И финальный инвариант для audit log: все шесть событий (write, read, hash-fail, delete-attempt, hold-block, direct-bypass-attempt) должны иметь structured log format с фиксированными полями: `timestamp`, `lineage_id`, `action`, `result`, `actor_id`. Без `location.ref` и без `sha256` в plaintext в теле лога. Это должно быть закреплено здесь как storage invariant до того, как M6 начнёт проектировать pipeline.

[Архитектор]: Соглашусь с обоими дополнениями. Staging — третий независимый хост для drill. Audit log schema — storage invariant, не M6-деталь. Оба пункта входят в carrier как нормы, не как рекомендации.

[Структурщик]: Ещё одна точность по tombstone: tombstone record в registry.jsonl — это append-only запись, она не заменяет предыдущие записи lineage, а добавляется следующей строкой. Это гарантирует, что история не переписывается даже при физическом удалении bytes. `registry.jsonl` — append-only по определению из M2, tombstone этому не противоречит, а подтверждает.

[Математик]: Финальная числовая сводка для carrier: capacity unit = bytes; per-object default = 512 MiB; soft watermark = 80%; hard watermark = 95%; reserve = 5% (из которых quarantine cap = 2%); backup incremental = каждые 4 часа; backup full = еженедельно; RPO = 4 часа; RTO = 8 часов; drill period = 30 дней; integrity sample = 5%/24h, 100%/7d; audit log retention = минимум 365 дней.

[Teamlead]: Принято. Все числа в carrier. Консилиум закрыт. Вердикт: S1 ПРИНЯТ. Topology зафиксирована. Readiness gates машинно проверяемы. До ingest — все шесть PASS.

---

## Итоговое решение консилиума

### Пропозиция S1

**Topology:** S3-compatible object storage, self-hosted, два независимых endpoint.
**Fail-closed правило:** при hard watermark (≥ 95%) или RG-любой = FAIL — admission заблокирован. Новые write не исполняются. Существующие объекты не затронуты.

---

### Таблица storage classes, копий и failure domains

| Домен | Класс | Содержимое | Хост/аккаунт | Credential | Что считается потерей |
|-------|-------|------------|--------------|------------|----------------------|
| FD-1 | Primary object storage | Bytes всех объектов + object metadata | Независимый хост A | Credential-A | Недоступность хоста, удаление аккаунта, компрометация credential, потеря volume |
| FD-2 | Backup object storage | Полные копии bytes + снапшот registry.jsonl | Независимый хост B (или провайдер B) | Credential-B (не пересекается с A) | То же — независимо от FD-1 |
| FD-3 | Registry store | registry.jsonl + история lineage | Третий хост (Git или append-only FS) | Credential-C | Недоступность или corruption файла без резервной копии |
| Staging | Drill environment | Восстановленные объекты для проверки | Третий независимый хост (не A, не B) | Изолированный, сбрасывается после drill | N/A — только для drill |

**Кеш или реплика внутри одного аккаунта failure domain не образуют.**

---

### Object-key и integrity contract (согласован с M2)

**Ключ объекта:**
```
{container_id}/{lineage_id}/{revision_seq}/{sha256[0:8]}
```

- `canonicalRef` ≠ URL, ≠ storage key. `canonicalRef` идентифицирует lineage; storage key — производная величина, доступная только через proxy после `read-ref`.
- `location.kind = archivarius`; `location.ref` = opaque storage key; не раскрывается без `read-ref`.

**Overwrite policy:** PUT на существующий ключ запрещён на уровне bucket policy. Объект immutable после первой записи.

**Dedup:** proxy проверяет sha256 против registry.jsonl до записи. Совпадение → новый record с указателем на существующий ключ, bytes не дублируются.

**Post-write verification:** proxy читает объект сразу после записи, пересчитывает sha256. Несовпадение → объект в `quarantine/` prefix, record `status: integrity-failed`, алерт оператору, повторный ingest заблокирован.

**Периодическая проверка:** integrity daemon — 5% объектов каждые 24 часа, 100% каждые 7 дней. Несовпадение → quarantine + алерт P1.

**Quarantine cap:** 2% от provisioned capacity. Превышение → алерт P0, ingest полностью заблокирован.

**Superseded revisions:** хранятся физически, status = `superseded`. Физическое удаление только при: retention period истёк AND нет hold.

---

### Quota / watermark / admission contract

| Параметр | Значение |
|----------|---------|
| Capacity unit | байты объекта |
| Per-object default limit | 512 MiB |
| Soft watermark | 80% provisioned |
| Hard watermark | 95% provisioned |
| Reserve | 5% provisioned (quarantine cap = 2%) |
| Admission при hard watermark | fail-closed, HTTP 507 |
| Admission при per-object exceed | reject до записи, HTTP 413 |
| Метрики | `storage_bytes_used`, `storage_bytes_provisioned`, `storage_watermark_soft_ratio`, `storage_watermark_hard_ratio`, `admission_rejected_total` — Prometheus-compatible |

Per-object limit для коллекции может быть задан явно в конфигурации; при отсутствии — 512 MiB default.

---

### Backup / restore / RPO / RTO contract

| Параметр | Значение |
|----------|---------|
| Incremental backup | каждые 4 часа |
| Full backup | еженедельно |
| RPO | 4 часа |
| RTO | 8 часов |
| Backup encryption | AES-256 at rest, TLS 1.2+ in transit, ключ в отдельном credential store |
| Retention копий backup | минимум 30 дней; удаление только после pass следующего drill |
| Restore drill schedule | каждые 30 дней, автоматизированный |
| Drill среда | staging — третий независимый хост, изолированный, сбрасывается после drill |
| Drill содержание | восстановить случайную выборку объектов из FD-2; проверить sha256 каждого против registry.jsonl из FD-3; проверить соответствие lineage_id и revision_seq |
| Drill result | `pass` = все sha256 совпали, все lineage консистентны; `fail` = любое несовпадение с перечнем |
| Readiness | `last-drill-result: pass` И `last-drill-age ≤ 30d` — PASS; иначе — FAIL |

---

### Retention / deletion / tombstone contract

| Статус | Описание | Физические bytes | История в registry.jsonl |
|--------|----------|-----------------|--------------------------|
| `active` | Текущая ревизия lineage | Хранятся в FD-1 + FD-2 | Запись присутствует |
| `superseded` | Предыдущая ревизия | Хранятся в FD-1 + FD-2 | Запись присутствует |
| `hold` | Legal или owner hold активен | Физическое удаление заблокировано | Запись с флагом hold |
| `tombstone` | Физически удалён | Отсутствуют в storage | Append-only запись с `deleted_at` и `reason` навсегда |
| `integrity-failed` | Несовпадение sha256 | В `quarantine/` prefix | Запись с `status: integrity-failed` |

**Правила:**
- `superseded → tombstone` возможно только если: retention period истёк AND hold не активен.
- Удаление bytes без tombstone record — запрещено; integrity daemon обнаружит как `dangling`.
- `dangling` = объект отсутствует в storage, но в registry.jsonl нет tombstone — алерт, не тихое игнорирование.
- Tombstone в registry.jsonl — append-only строка; история lineage не переписывается.

---

### Server / access / encryption contract (согласован с M3)

- **Encryption at rest:** AES-256 на уровне storage в FD-1 и FD-2. Ключ в отдельном credential store, изолирован от bucket endpoint конфига.
- **Encryption in transit:** TLS 1.2+ обязателен на всём пути: proxy → FD-1, proxy → FD-2, client → proxy.
- **Public access:** полностью отключён на уровне bucket policy FD-1 и FD-2. Presigned URLs запрещены.
- **Proxy-only access:** bytes выдаются только через proxy после `read-bytes`/`download` решения Panel (M3 invariant).
- **`location.ref`** не раскрывается без `read-ref` от Panel.
- **Audit log schema** (storage invariant): поля `timestamp`, `lineage_id`, `action`, `result`, `actor_id`. Запрещены в логе: `location.ref` в plaintext, `sha256` в plaintext, storage key, bucket name.
- **Response headers:** proxy не передаёт клиенту `X-Storage-Key`, storage endpoint, bucket или полный path.
- **Staging** для drill: изолированный credential, не пересекается с FD-1 и FD-2.

---

### Таблица обязательных случаев

| Случай | Ожидаемое решение | Где проверяется | Вещдок |
|--------|------------------|-----------------|--------|
| 1. Новый небольшой чек при нормальной capacity | Admission PASS: per-object ≤ 512 MiB, hard watermark < 95%; объект записан в FD-1, registry.jsonl обновлён, backup sync запланирован | Proxy admission log, registry.jsonl | Запись `status: active` в registry.jsonl, ETag объекта в FD-1 |
| 2. Объект превышает per-object или collection quota | Admission FAIL до записи: HTTP 413; объект не попадает в storage; registry.jsonl не обновляется | Proxy admission log | Log с `per-object-limit-exceeded`, timestamp, lineage_id заявки |
| 3. Primary достигает soft, затем hard watermark | Soft (80%): алерт оператору, ingest продолжается. Hard (95%): admission fail-closed, HTTP 507, разблокировка только вручную после сброса метрики | Метрики scrape endpoint, proxy admission log | `storage_watermark_hard_ratio ≥ 1.0`, log `hard-watermark-exceeded` |
| 4. После записи sha256 или bytes не совпадают | Объект в `quarantine/` prefix; record `status: integrity-failed`; алерт P1; повторный ingest заблокирован | Post-write verification, integrity daemon log | `integrity-failed` в registry.jsonl, объект в `quarantine/` с timestamp |
| 5. Sensitive PDF вне Git и без прямого публичного URL | Хранится в `sensitive/` prefix FD-1; public access = deny; presigned URLs запрещены; доступ только через proxy с `read-bytes`; Git не содержит bytes и location.ref | Bucket policy dump, proxy audit log, Git history | Policy dump: `public-access: deny`; audit log: только proxy-инициированные GET |
| 6. Primary failure, restore в RTO | Restore из FD-2: copy bytes → новый FD-1, sha256-верификация каждого объекта против FD-3 registry.jsonl, proxy endpoint обновлён ≤ 8 часов; потеря ≤ 4 часа данных | Restore log, sha256 verification report | Log: sha256 каждого объекта совпал; timestamp restore start/end; дельта last-backup vs failure-time |
| 7. Backup существует, drill ещё не проходил | RG-4 = FAIL; production ingest заблокирован; разблокировка только после drill `pass` | RG-4 status в readiness check | RG-4: `last-drill-result: none` или `last-drill-age > 30d` → FAIL; drill-log с pass после выполнения |
| 8. Удаление superseded revision при действующем hold | Физическое удаление заблокировано: `deletion-blocked: hold-active`; bytes остаются в FD-1; tombstone не создаётся; история неизменна | Retention engine log | Попытка deletion в log с `blocked`, hold record в registry.jsonl |
| 9. Пользователь знает location.ref, но нет read-bytes, или прямой bypass | Proxy: 403 Forbidden, location.ref не в error response. Storage direct: 403 Forbidden (bucket policy). Audit log: попытка с lineage_id, без location.ref в plaintext | Proxy audit log, storage access log | Proxy: `403` без ref в теле; storage: `403` на прямой GET, RG-5 PASS |
| 10. Office VDS ниже capacity minimum при миграции | RG-1 FAIL для VDS-target: provisioned − used < 12 GiB. VDS исключён из candidate list. Миграция невозможна до появления compliant target | RG-1 capacity check log | Check log: `target_free_bytes < 12 GiB` → FAIL; VDS not in approved targets |

---

### Readiness gates

| Gate | Условие PASS | Условие FAIL |
|------|-------------|-------------|
| RG-1 Capacity | `(provisioned − used) / provisioned > 0.20` на target storage | VDS 9.46 GiB / любой target ниже 20% свободного |
| RG-2 Write/Read/Hash | Тестовый объект записан, считан, sha256 совпал, удалён из test prefix | Любое несовпадение или ошибка доступа |
| RG-3 Backup connectivity | Backup endpoint FD-2 доступен, test write прошёл | Timeout, auth error, write fail |
| RG-4 Restore drill | `last-drill-result = pass` AND `last-drill-age ≤ 30d` | `result = fail`, `result = none`, `age > 30d` |
| RG-5 Auth bypass | Прямой GET на FD-1 без proxy credentials → 403/401 | 200 или любой успешный прямой доступ |
| RG-6 Inventory/Reconciliation | Integrity daemon прогнан на полном реестре, нет dangling, нет необработанных `integrity-failed` | Любой dangling или необработанный integrity-failed |

**Все шесть RG = PASS — обязательное условие до первого production ingest.**

---

## Definition of Done

- Выбрана одна topology: S3-compatible object storage, self-hosted, два независимых endpoint FD-1 и FD-2
- Независимые failure domains FD-1, FD-2, FD-3 определены с разными хостами, аккаунтами и credentials
- Object key связан с M2 record без слияния с canonicalRef; overwrite запрещён; integrity проверяется post-write и периодически
- Sensitive storage изолирован, public access заблокирован, proxy-only доступ, audit log без ref/key в plaintext
- Quota измерима: soft 80%, hard 95%, reserve 5%, quarantine cap 2%, per-object 512 MiB
- Backup incremental 4h / full weekly, RPO 4h, RTO 8h, drill каждые 30 дней в staging, drill pass обязателен
- Retention/tombstone: четыре статуса, tombstone append-only, dangling обнаруживается, hold блокирует удаление
- Все десять обязательных случаев доказаны с ожидаемым решением, местом проверки и вещдоком
- Шесть readiness gates машинно проверяемы, все шесть PASS до ingest
- M5–M7 не затронуты

---

## Список посылок

| Посылка | Источник | Тип |
|---------|----------|-----|
| Office VDS: свободно 9.46 GiB при минимуме 12 GiB — NO-GO | Измеренная фактура M4 | **факт** |
| Каталог резервных копий текущего дома пуст; доказанного restore нет | Измеренная фактура M4 | **факт** |
| Sensitive PDF партнёра вне репозитория, без доказанного переносимого storage path | Измеренная фактура M4 | **факт** |
| В публичном Git лежит один чек | Измеренная фактура M4 | **факт** |
| Affine, PostgreSQL, Redis живут на office VDS; Affine слушает 127.0.0.1:3010 | Измеренная фактура M4 | **факт** |
| В Affine 82 страницы и 57 PNG/SVG, нет корпуса чеков и внешних PDF | Измеренная фактура M4 | **факт** |
| До решения M4 запрещено увеличивать архив на office VDS или переносить байты | Измеренная фактура M4 | **норма** |
| registry.jsonl — источник истины; фактические байты независимо проверяют заявленные sha256, bytes, location | Закрытые посылки M1–M3 | **норма** |
| canonicalRef идентифицирует lineage, но не является URL или storage key | Закрытые посылки M1–M3 | **норма** |
| Panel — единственный авторизатор; bytes выдаются только после read-bytes/download решения proxy; прямой URL склада не должен обходить Panel | Закрытые посылки M1–M3 | **норма** |
| Sensitive record хранит допустимый location.kind, непустой location.ref и отдельный sensitive.reason; sensitive не является отдельным location.kind | Закрытые посылки M1–M3 | **норма** |
| Affine — сменный движок, не склад и не источник истины | Закрытые посылки M1–M3 | **норма** |
| Смена адреса создаёт новую record в той же lineage | Закрытые посылки M1–M3 | **норма** |
| location.kind допускает local, affine, url, archivarius; при любом kind location.ref непустой | Закрытые посылки M1–M3 | **факт** |
| M3 не выбрал физический склад, vendor, backup, retention или endpoint | Закрытые посылки M1–M3 | **норма** |
| Primary и backup не могут разделять единственную машину, volume, учётную запись или credential | Обязательные решения M4 | **норма** |
| «Backup включён» без успешного restore — не PASS | Обязательные решения M4 | **норма** |
| Удаление bytes не удаляет историю M2 молча; dangling и исчезновение объекта должны обнаруживаться | Обязательные решения M4 | **норма** |
| location.ref не раскрывается без read-ref; bytes — без read-bytes; журнал не должен утекать secret/ref | Обязательные решения M4 | **норма** |
| NO-GO office VDS нельзя переименовать в readiness | Обязательные решения M4 | **норма** |
