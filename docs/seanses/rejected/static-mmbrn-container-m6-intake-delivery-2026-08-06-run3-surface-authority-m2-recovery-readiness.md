<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-08-06T13:48:50.034Z |
| Команда | `yarn consilium` |
| Модель | anthropic/claude-sonnet-4-6 |
| Файл | `docs/seanses/static-mmbrn-container-m6-intake-delivery-2026-08-06.md` |
| Порядок ролей | Архитектор → Музыкант → Верстальщик → Математик → Структурщик → Teamlead |
| Повестка | `docs\meeting\static-mmbrn-container\M6_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs\meeting\static-mmbrn-container\M6_AGENDA.md` | 11957 | `ce698fa42276` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs\meeting\static-mmbrn-container\M6_AGENDA.md` | 11957 · 1 п. | `ce698fa42276` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --no-memory --min-replies 42 --seed 353`

**Вопрос:**

E1 — выберите один исполнимый контракт мастерской вещдоков по повестке M6 и поправкам run1-run2: точные M2 поля и lineage, одна M3 action на public operation, dimension-specific verify, восстанавливаемый commit, RPO-gated degraded mode, append-only lifecycle, safe preview/archive и full-corpus readiness; сохранить M2-M5, M7 не решать; один carrier.

---

# Консилиум: M6 — контракт приёма и выдачи мастерской вещдоков

**Повестка:** E1 — выбрать один исполнимый контракт мастерской вещдоков: точные M2 поля и lineage, одна M3 action на public operation, dimension-specific verify, восстанавливаемый commit, RPO-gated degraded mode, append-only lifecycle, safe preview/archive и full-corpus readiness; сохранить M2–M5, M7 не решать; один carrier.

**Участники:** Архитектор (Vesnin), Музыкант (Kuryokhin), Верстальщик (Rodchenko), Математик (Dynin), Структурщик (Ozhegov), Teamlead (Tarasov).

**Порядок реплик:** Архитектор → Музыкант → Верстальщик → Математик → Структурщик → Teamlead (циклически, ≥42 реплик)

---

[Архитектор]: Первый вопрос формы: operation surface должна быть закрытым списком с однозначным соответствием M3 action. Предлагаю восемь операций — `intake`, `get-metadata`, `get-ref`, `get-bytes`, `download`, `write-metadata`, `upload-revision`, `manage-access` — каждая с ровно одним action. Никаких мультиaction-операций, никаких обходных маршрутов через `read-metadata` для ref или bytes. Логический API работает и как CLI-команда, и как server adapter — transport не выбираем, пока M7 не открыт.

[Музыкант]: Меня интересует граница между preview и выдачей bytes. Preview — derived surface, как Affine: его нет — original не затронут. Но нужно явно зафиксировать: preview требует `read-bytes` gate, даже если результат — отрендеренная картинка или HTML-сниппет. Иначе получим ситуацию, когда derived result становится каналом утечки ref или class-sensitive bytes в обход gate. Это не DSP-вопрос — это вопрос замкнутости контракта.

[Верстальщик]: С точки зрения выдачи данных клиенту: нужно чётко разделить четыре класса ответов — metadata без ref, ref без bytes, bytes без download-ссылки, download как финальный транспорт. Это четыре отдельных состояния UI, и каждое имеет свой M3 gate. Если эти границы не проведены в контракте, верстальщик не может правильно показать частично авторизованный результат. Предлагаю зафиксировать: каждый класс ответа несёт только то, на что есть разрешение, и не больше.

[Математик]: Для verify нужно развести шесть измерений строго: schema validity, reachability, byte integrity, storage durability, authorization, portability. Каждое — отдельный предикат с конкретным доказательством. `unknown` не PASS ни в одном измерении. Для исторической row verify не переписывает историю — он добавляет измеренный статус как новое lifecycle событие, не мутирует старую запись. Это важно для commit/idempotency: append-only означает, что любое изменение состояния — новая строка, не правка старой.

[Структурщик]: Attempt states должны быть полностью отделены от M2 rows. Предлагаю три слоя: `intake-ledger` (attempt states с idempotency key `(principal,intentId)`), `registry.jsonl` (immutable M2 rows, append-only), `lifecycle-log` (события поверх registry — verify results, access changes). Переходы между слоями строго однонаправленные: attempt → committed record, никогда обратно. Cleanup работает с `intake-ledger` и физическими bytes, но не с registry rows — registry row не входит в deletion chain.

[Teamlead]: Хорошее начало, но нужно немедленно закрыть commit model. Три части коммита: verified FD-1, torn-write-safe registry append, durable intent binding. Все три — обязательны. Если после успешного append падает binding — recovery восстанавливает binding, bytes не трогает. FD-2 — последующий checkpoint, не часть commit point. RPO gate: при FD-2 unavailable intake разрешён только пока `now - last_complete_cut <= 24h`; просрочено — NO-GO, даже если FD-1 читается. Это не опция, это жёсткое условие.

[Архитектор]: Для lineage зафиксирую форму: revision получает новый `id`, сохраняет `supersedes` на предыдущий id и наследует `canonicalRef = "urn:mmbrn:static:" + rootId`. Duplicate bytes — новый `id`, новый `canonicalRef`, никакого автоматического слияния. Address move — новая record с тем же `sha256`, новым `location.ref`, через `write-metadata`. Metadata correction — новая record через `write-metadata`. Lineage никогда не выводится из hash — только из явного `supersedes`.

[Музыкант]: Archive intake: архив принимается целиком как единица регистрации. Если M6 фактически предоставляет component для отдельной выдачи, это явная операция `intake` с отдельным `bytes`, `sha256`, новым `id`, `source` как строка с провенансом к archive (например `"archive:urn:mmbrn:static:ROOT_ID/path/to/component"`), и `about` для структурированного контекста. Лимиты extraction: bytes limit, ratio limit, entries limit, depth limit — все численные, все fail-closed. Path traversal, zip bombs — блокируются до любой регистрации. Автоматическая регистрация компонентов запрещена.

[Верстальщик]: Для degraded mode UI важно знать, что деградация RPO-gated: система явно возвращает `DEGRADED_RPO_EXCEEDED` как machine-readable outcome, а не тихо отказывает. Клиент видит один из трёх режимов: `OPERATIONAL`, `DEGRADED_INTAKE_ALLOWED` (FD-2 временно недоступен, RPO в норме), `DEGRADED_NO_INTAKE` (RPO просрочен). Каждый режим — отдельный статус в ответе, не выводимый из других полей.

[Математик]: Для quota model: используем `U_c` — logical bytes для конкретного class, distinct live `(class,sha256)` как единица, physical delta для capacity admission. Quota для unknown class не вычисляется — это blocker до classification. Watermarks: soft watermark для предупреждения, hard watermark для блокировки. При quota deny — `QUOTA_EXCEEDED` с class-specific detail, не generic error.

[Структурщик]: Sensitivity gate: authority выдаёт ровно два результата — `standard` или `sensitive` с непустым `reason`. Unknown — hold (ожидание classification) или terminal fail (если timeout истёк). `sensitive.reason` обязателен при sensitive classification и хранится в registry. Sensitive ref не выдаётся через `read-metadata` — только через `read-ref` при наличии соответствующего gate. Classification не становится `location.kind` — это отдельное поле `sensitive.reason`.

[Teamlead]: Sensitivity и quota — это две независимые проверки до durable write. Порядок: hash/size → malware/format → sensitivity/class → quota admission → storage write → registry append → intent binding. Ни один шаг не пропускается, ни один не переставляется. Malware gate — обязателен, даже если format checks пройдены. Fail-closed: любой unknown на любом gate — hold или FAIL, не proceed.

[Архитектор]: State machine: семь состояний. `RECEIVED` — bytes получены, hash/size вычислен. `QUARANTINE` — malware/format check в процессе или failed. `CLASSIFIED` — sensitivity/class определён. `ADMITTED` — quota admission прошла. `STORED` — FD-1 verified. `COMMITTED` — registry append + intent binding. `FAILED` — terminal. Переходы строго однонаправленные. Orphan/quarantine никогда не переходит в `COMMITTED` молча. `FAILED` — финальное состояние в `intake-ledger`, не в registry.

[Музыкант]: Добавлю: `COMMITTED` — единственное состояние, из которого возможна выдача. Preview строится только от `COMMITTED` record. Preview failure — отдельный outcome `PREVIEW_UNAVAILABLE`, не влияет на original. Preview cache не является source of truth — любой cache hit должен быть валидирован против current registry version. Affine projection строится от registry, не наоборот.

[Верстальщик]: Для audit trail: каждое событие несёт `principal`, `intentId`, `action`, `recordId` (если есть), `outcome`, `M4_evidence` (class, storage tier). Sensitive ref и bytes в audit redacted для неавторизованных читателей. Not-found response не создаёт existence leak — возвращаем `NOT_FOUND` без различия между «нет такого id» и «нет у тебя права знать». Audit log — append-only, отдельный от registry.

[Математик]: Для verify dimensions: schema validity — проверяем структуру M2 record против schema; reachability — проверяем `location.ref` против storage; byte integrity — SHA256 вычисляем заново от FD-1 bytes; storage durability — FD-1 и FD-2 reconciliation; authorization — текущий policy vector для principal; portability — ref переносим вне local path. Для исторической row: byte integrity и reachability могут давать `MISMATCH` или `UNREACHABLE` — это честный статус, не ошибка verify. Результат verify записывается как lifecycle event, не правит registry row.

[Структурщик]: Idempotency: ключ `(principal, intentId)`. Ledger хранит immutable fingerprint = `sha256(intentId + contentHash + metadata)`. При повторном запросе с тем же `intentId` и тем же fingerprint — возвращаем существующий record, не создаём новый. При том же `intentId` и другом fingerprint — `INTENT_CONFLICT`, не перезаписываем. При crashed attempt — recovery по ledger восстанавливает binding если record уже в registry, или помечает attempt как FAILED если нет. История intent никогда не стирается.

[Teamlead]: Конфликт fingerprint — это важный случай. Тот же `intentId` с другим fingerprint — это либо ошибка клиента, либо атака. Outcome `INTENT_FINGERPRINT_MISMATCH`, не retryable, audit с полным fingerprint обеих попыток. Failed retry не стирает предыдущую запись в ledger — обе строки остаются, обе видны при reconciliation. Это архивная запись конфликта, не удалённая история.

[Архитектор]: Cleanup protocol: при FAILED attempt — cleanup использует exact class-aware ref из attempt state, ownership marker (только свои bytes), и M4 live refs для проверки, что blob не referenced другим record. Shared blob — не удаляется. Class namespaces — не склеиваются: class `standard` и class `sensitive` имеют раздельные storage paths, cleanup не пересекает границу. Registry row не входит в deletion chain — cleanup работает только с FD-1 bytes и attempt state.

[Музыкант]: Для archive safety ещё раз конкретизирую лимиты. Численные пороги: max uncompressed bytes (например 2 GB), max compression ratio (например 1:100), max entries (например 10 000), max depth (например 10 уровней). При превышении любого — extraction abort, quarantine, `ARCHIVE_LIMIT_EXCEEDED`. Эти числа — константы контракта, не runtime-параметры пользователя. Path traversal: любой `../` или absolute path в entry name — немедленный abort, `ARCHIVE_PATH_TRAVERSAL`.

[Верстальщик]: Direct storage bypass и Affine bypass — оба запрещены и должны быть machine-detectable. Предлагаю: любой ответ с bytes или ref, не прошедший через M3 gate, является `BYPASS_DETECTED` — не просто ошибкой, а security event в audit. Affine binding проверяется при каждом запросе к Affine projection — valid binding + Panel allow, иначе `AFFINE_UNAUTHORIZED`. Отсутствие Affine не блокирует container operations.

[Математик]: Readiness predicates должны быть машинно-проверяемыми, не spot-check. Для atomicity: проверяем весь registry corpus на парность record/FD-1-bytes; для каждой `COMMITTED` row должен быть reachable и hash-matching FD-1 object. Для intent uniqueness: полный scan ledger на дубли `intentId` с разным fingerprint. Для quota: recount всех distinct live `(class,sha256)`. Неизмеренное состояние — NO-GO. `UNKNOWN` в любом predicate — NO-GO.

[Структурщик]: Operation surface финально: восемь публичных операций. `intake` → `upload-revision` (для нового material) или `upload-revision` (для revision). Нет, уточняю: `intake` — новое поступление, `upload-revision` — revision существующего lineage. Это разные operations с разными intents. `get-metadata` → `read-metadata`. `get-ref` → `read-ref`. `get-bytes` → `read-bytes`. `download` → `download`. `write-metadata` → `write-metadata`. `manage-access` → `manage-access`. `verify` — внутренняя операция, не публичный API — вызывает dimension-specific gates, но сам не является M3 action.

[Teamlead]: Уточнение по `verify`: verify как операция существует, но каждое его измерение проходит через соответствующий gate. Проверка reachability — это `read-ref` gate. Проверка bytes — `read-bytes` gate. Проверка metadata — `read-metadata` gate. Нельзя вызвать `verify` и получить ref или bytes в обход индивидуальных gates. Verify возвращает статус по каждому измерению отдельно, не агрегированный «всё ок».

[Архитектор]: Теперь финальная форма E1. Один контракт: логический API из восьми операций с закрытым M3 mapping, state machine из семи состояний с однонаправленными переходами, commit model из трёх частей (FD-1 + registry append + intent binding) без cross-domain transaction, ledger `(principal,intentId)` с immutable fingerprint, RPO gate 24h, append-only registry и lifecycle log, dimension-specific verify без gate bypass, archive limits численные fail-closed, degraded mode machine-readable. Всё вышеперечисленное — один carrier.

[Музыкант]: Подтверждаю форму. Добавлю только: preview isolation — preview process не имеет прямого доступа к storage, только через `read-bytes` gate с полной авторизацией. Preview result помечен как derived, version-pinned к конкретному `recordId`. При изменении record (новая revision) старый preview инвалидируется, не обновляется автоматически. Preview failure — `PREVIEW_UNAVAILABLE`, не cascade failure на original.

[Верстальщик]: Со стороны представления — форма контракта достаточна для построения правильного UI: четыре уровня авторизации дают четыре состояния компонента, machine-readable degraded mode позволяет показать точный статус, audit с redaction позволяет показывать историю без sensitive leak. Принимаю.

[Математик]: Математически: все предикаты readiness вычислимы, все имеют конкретный evidence, ни один не является spot-check. Quota model корректна — distinct live `(class,sha256)` исключает двойной счёт shared blobs. Verify dimensions независимы — статус одного не выводится из другого. Принимаю.

[Структурщик]: Структурно: три слоя (intake-ledger, registry.jsonl, lifecycle-log) не пересекаются, переходы однонаправленные, cleanup не затрагивает registry rows. Слабая связанность между слоями соблюдена. Принимаю.

[Teamlead]: LGTM. Контракт исполним, все десять обязательных решений закрыты, M2–M5 сохранены, M7 не открыт. Один carrier. Пишем.

---

[Архитектор]: Ещё одна деталь по `write-metadata`: эта операция создаёт новую M2 record с новым `id`, даже если меняется только один опциональный field. Никакого upsert. `supersedes` указывает на предыдущий `id`. Это касается и address move — новая record с новым `location.ref`, тем же `sha256`, через `write-metadata`. Не отдельная операция `move`.

[Музыкант]: Для archive component intake: `source` строка вида `"archive-component:urn:mmbrn:static:<archiveRootId>/<entryPath>"`. `about` — structured object с `archiveRef` и `entryPath`. Это M2-compliant: `source` строка, `about` опциональный. Lineage component не связан с archive lineage автоматически — только через `source` строку как provenance.

[Верстальщик]: Для `manage-access`: эта операция не изменяет M2 record и не изменяет attempt state — она изменяет policy vector для record. Policy vector хранится отдельно, versioned. При `manage-access` в audit пишется policy change event с principal, recordId, old vector, new vector. Registry row не мутирует.

[Математик]: Для recovery сценария crash-after-append-before-binding: при старте recovery сканируем registry за последние N минут на записи без соответствующей binding в ledger. Для каждой такой записи — создаём binding с флагом `recovered: true`. Bytes не трогаем — они уже referenced. Это детерминированная процедура с конечным временем выполнения.

[Структурщик]: Для timeout/unknown outcome: клиент получил `TIMEOUT`. При повторном запросе с тем же `intentId` и fingerprint — проверяем ledger. Если запись есть с outcome `COMMITTED` — возвращаем существующий record. Если запись есть с outcome `FAILED` или `IN_PROGRESS` — соответствующий статус. Если записи нет — клиент может retry, это будет первая попытка для этого intent. Неопределённость устраняется через ledger, не через предположения.

[Teamlead]: Финальный порядок gate-цепочки при intake: 1) hash/size compute; 2) malware scan (fail-closed); 3) format check (fail-closed); 4) sensitivity classification (unknown → hold/FAIL); 5) quota admission для class; 6) FD-1 write + verify; 7) registry append (torn-write-safe); 8) intent binding (durable). Каждый шаг — явный predicate, явный failure outcome, явная audit entry. Нет шага без evidence.

[Архитектор]: Один финальный архитектурный тезис: контракт не выбирает transport, не проектирует deployment, не чинит текущие 12 rows. Он задаёт форму, которой должны соответствовать и существующая CLI, и будущий server adapter. Совместимость CLI с частью контракта — факт, не лицензия на старую identity model. Контракт применяется к новым поступлениям и новым операциям; текущие rows остаются evidence предшествующего состояния.

[Музыкант]: Подтверждаю: Affine — optional projection, не source of truth. Если Affine binding invalid или движок недоступен — операции container продолжают работать без него. Preview через Affine требует valid binding + Panel allow; если нет — `AFFINE_UNAVAILABLE`, не ошибка container.

[Верстальщик]: Audit redaction: sensitive ref в audit log хранится, но при выдаче audit неавторизованному caller — поле `location.ref` redacted до `<redacted>`, поле `sensitive.reason` также redacted. Структура audit entry сохраняется — только значения sensitive полей заменяются. Это позволяет аудитору видеть факт события без exposure sensitive data.

[Математик]: Corpus readiness check: полный scan registry против FD-1 inventory. Для каждой COMMITTED row: FD-1 object существует, hash matches, size matches. Для каждого FD-1 object: есть соответствующая COMMITTED registry row. Orphan objects (bytes без registry) и ghost records (registry без bytes) — оба являются `RECONCILIATION_FAILURE`. Этот check — обязательная часть readiness, не optional audit.

[Структурщик]: Intent uniqueness check: полный scan ledger на `intentId` коллизии с разными fingerprints. Если найдена коллизия — `INTENT_UNIQUENESS_VIOLATION` в readiness report. Это не блокирует операции, но является NO-GO для production readiness gate. Spot-check на выборке — не доказательство uniqueness.

[Teamlead]: Все решения зафиксированы. Carrier один. Пишем протокол в полном объёме.

---

## Итоговое решение консилиума

### Таблица 1. Operations

| Operation | M3 Action | Input | Result | Mutation | Audit Evidence |
|---|---|---|---|---|---|
| `intake` | `upload-revision` | bytes + claimed metadata + intentId | `recordId`, `canonicalRef`, state | new M2 record appended; FD-1 written | intentId, fingerprint, recordId, sha256, class, outcome |
| `upload-revision` | `upload-revision` | bytes + rootId + intentId | new `recordId`, updated canonicalRef lineage | new M2 record with `supersedes`; FD-1 written | intentId, fingerprint, rootId, new recordId, sha256, outcome |
| `get-metadata` | `read-metadata` | `recordId` | M2 fields except `location.ref` | none | principal, recordId, fields returned, policy version |
| `get-ref` | `read-ref` | `recordId` | `location.ref` only | none | principal, recordId, ref returned (redacted if sensitive+unauth), policy version |
| `get-bytes` | `read-bytes` | `recordId` | bytes stream | none | principal, recordId, bytes size, sha256, outcome |
| `download` | `download` | `recordId` | download token / direct stream | none | principal, recordId, delivery mechanism, outcome |
| `write-metadata` | `write-metadata` | `recordId` + changed fields | new `recordId` with `supersedes` | new M2 record appended (no upsert) | principal, old recordId, new recordId, changed fields, outcome |
| `manage-access` | `manage-access` | `recordId` + policy delta | updated policy vector | policy store updated; M2 record unchanged | principal, recordId, old vector, new vector, outcome |

**Примечание:** `verify` — внутренняя операция; каждое её измерение проходит через соответствующий gate (`read-metadata`, `read-ref`, `read-bytes`). `discover` остаётся действующим M3 action для listing; внешняя операция `list` использует `discover`. Preview использует `read-bytes` gate; derived result не ослабляет gate.

---

### Таблица 2. State Machine

| State | Entry Predicate | Allowed Transition | Durable Evidence | Recovery |
|---|---|---|---|---|
| `RECEIVED` | bytes поступили; hash/size вычислен | → `QUARANTINE` (всегда) | attempt record в intake-ledger с contentHash, size, timestamp | при crash: attempt в ledger без дальнейших состояний → cleanup bytes, mark FAILED |
| `QUARANTINE` | malware scan запущен или format check в процессе | → `CLASSIFIED` (scan pass) → `FAILED` (scan fail) | scan result в intake-ledger | при crash в scan: re-run scan; bytes сохранены в quarantine zone, не в FD-1 |
| `CLASSIFIED` | authority выдал `standard` или `sensitive` с reason | → `ADMITTED` (quota pass) → `FAILED` (quota deny / unknown class timeout) | class + reason в attempt state | при crash: re-read classification from authority; если timeout — FAILED |
| `ADMITTED` | quota admission прошла; watermark не превышен | → `STORED` (FD-1 write success) → `FAILED` (write fail) | admission record с logical bytes, class, delta | при crash: release quota reservation; cleanup partial FD-1 if not complete |
| `STORED` | FD-1 object written и hash-verified | → `COMMITTED` (registry append + binding success) → `FAILED` (append fail) | FD-1 object с sha256-match доказательством | при crash: FD-1 цел; retry append; если append уже есть (torn write detected) → verify и bind |
| `COMMITTED` | registry row appended (torn-write-safe) + intent binding durable | → lifecycle events (verify, access change) via lifecycle-log | registry.jsonl row + ledger binding `(principal,intentId)→recordId` | при crash after append before binding: scan registry, create binding with `recovered:true`; bytes не удаляются |
| `FAILED` | любой terminal gate fail | (финальное состояние в intake-ledger) | failure reason + step + timestamp в attempt state | cleanup: exact class-aware ref, ownership marker check, M4 live refs check; shared blob не удаляется |

**RPO Gate:** при FD-2 unavailable: intake разрешён если `now - last_complete_cut ≤ 24h`; иначе → `DEGRADED_NO_INTAKE` (NO-GO для новых intake, reads продолжаются с FD-1).

---

### Таблица 3. Outcomes

| Code | Class | Meaning | Retryable | Caller Exposure | Audit Consequence |
|---|---|---|---|---|---|
| `OK` | success | Операция завершена успешно | — | полный результат согласно M3 gate | success event с evidence |
| `ACCEPTED` | success | Intake принят, в обработке | да (poll) | intentId, estimatedState | attempt created |
| `NOT_FOUND` | client | recordId не существует или нет права знать | нет | generic not-found, без existence leak | access denied / not-found logged без раскрытия |
| `UNAUTHORIZED` | client | M3 gate deny | нет | action, recordId (без ref/bytes) | deny event с principal, action, policy version |
| `QUOTA_EXCEEDED` | client | Превышен quota для class | нет (до освобождения) | class, soft/hard watermark | quota deny с class detail |
| `CLASSIFICATION_UNKNOWN` | hold | Class не определён, intake на hold | да (после timeout) | hold status, estimated resolution | hold event |
| `HASH_MISMATCH` | integrity | Вычисленный sha256 ≠ заявленному | нет | mismatch indicator (без bytes) | integrity failure event |
| `MALWARE_DETECTED` | security | Malware scan fail | нет | generic security reject | security event (details internal) |
| `ARCHIVE_LIMIT_EXCEEDED` | safety | Превышен числовой лимит архива | нет | which limit (bytes/ratio/entries/depth) | safety block event |
| `ARCHIVE_PATH_TRAVERSAL` | security | Path traversal в archive entry | нет | security reject | security event |
| `INTENT_FINGERPRINT_MISMATCH` | conflict | Тот же intentId, другой fingerprint | нет | conflict indicator, intentId | both fingerprints logged |
| `INTENT_DUPLICATE` | idempotency | Повтор запроса, record уже существует | — | существующий recordId | duplicate detected, existing record returned |
| `DEGRADED_INTAKE_ALLOWED` | degraded | FD-2 недоступен, RPO в норме | — | degraded mode indicator | degraded state logged |
| `DEGRADED_NO_INTAKE` | degraded | RPO просрочен, intake заблокирован | нет (до восстановления FD-2) | RPO exceeded indicator, last cut timestamp | NO-GO logged |
| `PREVIEW_UNAVAILABLE` | derived | Preview не может быть построен | да | preview unavailable, original не затронут | preview failure logged, original status unchanged |
| `AFFINE_UNAVAILABLE` | projection | Affine binding invalid или движок недоступен | да (после восстановления) | affine unavailable, container ops unaffected | binding failure logged |
| `BYPASS_DETECTED` | security | Direct storage / Affine bypass попытка | нет | security reject | security event, elevated severity |
| `RECONCILIATION_FAILURE` | integrity | Orphan FD-1 object или ghost registry record | нет (требует ручного разбора) | reconciliation report без sensitive detail | full reconciliation event |
| `INTENT_UNIQUENESS_VIOLATION` | readiness | Найдена intentId коллизия с разными fingerprints | нет | readiness report | NO-GO in readiness, both intents logged |

---

### Таблица 4. Cases

| Случай | Ожидаемое решение | Источник истины | Вещдок |
|---|---|---|---|
| 1. Новый PDF | `intake` → pipeline → `COMMITTED`; новый `id`, `canonicalRef`, `sha256`, `bytes`, `source`, `location`, `addedAt` | registry.jsonl append | new row в registry; FD-1 object; ledger binding |
| 2. Те же bytes, новое независимое поступление | Новый `id`, новый `canonicalRef`, новый lineage; дубль bytes не сливает records | registry.jsonl | два отдельных row с одинаковым `sha256`; lineage не связан |
| 3. Retry того же intent | Ledger lookup: found `COMMITTED` → return existing recordId; `INTENT_DUPLICATE` | intake-ledger | existing ledger entry с outcome `COMMITTED`; тот же recordId |
| 4. Новая редакция | `upload-revision` → новый `id`, `supersedes: prevId`, наследует `canonicalRef` с rootId первой записи | registry.jsonl | новая row с `supersedes`; rootId совпадает |
| 5. Metadata correction | `write-metadata` → новый `id`, `supersedes: prevId`; только изменённые поля + обязательные; через `write-metadata` M3 gate | registry.jsonl | новая row с `supersedes`; старая row не мутирована |
| 6. Address move | `write-metadata` с новым `location.ref`; тот же `sha256`; новый `id`, `supersedes`; class не меняет `location.kind` | registry.jsonl | новая row с новым `location.ref`; `sha256` идентичен предыдущей |
| 7. Sensitive classification unknown | Intake на hold (`CLASSIFICATION_UNKNOWN`); quota не вычисляется; по timeout → `FAILED`; registry row не создаётся до resolution | intake-ledger | attempt в state `CLASSIFIED_HOLD`; no registry row |
| 8. Quota/capacity deny | `QUOTA_EXCEEDED` для class; intake FAILED; quota не превышена — только заявленный class | intake-ledger; quota store | failed attempt; quota counters не изменены |
| 9. Crash до registry commit | FD-1 bytes сохранены; recovery при старте: attempt в state `STORED` без registry row → retry append; если невозможно → cleanup FD-1 (ownership check) | intake-ledger + FD-1 inventory | ledger entry со state `STORED`; recovery log |
| 10. Timeout с неизвестным commit outcome | Клиент retry с тем же intentId+fingerprint → ledger lookup: если `COMMITTED` → existing record; если `IN_PROGRESS`/`STORED` → recovery path; если нет записи → first attempt | intake-ledger | ledger state at retry time |
| 11. Hash mismatch | `HASH_MISMATCH`; intake FAILED; bytes не сохраняются в FD-1; registry row не создаётся | intake-ledger | failed attempt с computed vs claimed hash |
| 12. Unreachable historical row и reachable live tip | Historical row: verify dimension `reachability=UNREACHABLE`, `integrity=UNKNOWN` — lifecycle event, registry row не мутируется. Live tip: `reachability=OK` | lifecycle-log (verify events) | verify lifecycle event на historical row; отдельный verify event на live tip |
| 13. Metadata allow при ref/bytes/download deny | `get-metadata` → `OK` с полями без `location.ref`. `get-ref` → `UNAUTHORIZED`. `get-bytes` → `UNAUTHORIZED`. `download` → `UNAUTHORIZED` | M3 policy store | metadata response без ref; три отдельных deny events |
| 14. Preview failure | `PREVIEW_UNAVAILABLE`; original record и FD-1 bytes не затронуты; preview cache не инвалидирует оригинал | registry.jsonl (original unchanged); lifecycle-log | preview failure event; original `COMMITTED` state сохранён |
| 15. Archive component | Отдельный `intake` с `source="archive-component:urn:mmbrn:static:<archiveRootId>/<entryPath>"` + `about`; отдельный `id`, `sha256`, `bytes`; регистрируется до выдачи | registry.jsonl | отдельная row с provenance в `source` и `about` |
| 16. Direct storage или Affine bypass | `BYPASS_DETECTED`; запрос отклонён; security event в audit с elevated severity | audit-log | security event с principal, attempted path, timestamp |
| 17. Тот же intent с другим fingerprint | `INTENT_FINGERPRINT_MISMATCH`; не retryable; оба fingerprints в audit; история не стирается | intake-ledger | ledger entry с конфликтом; обе попытки сохранены |
| 18. Failed intent retry без стирания истории | Retry с тем же intentId после FAILED → ledger показывает FAILED; новая попытка только с новым intentId; старая history неизменна | intake-ledger | FAILED entry + новый attempt entry (если новый intentId) |
| 19. Shared blob при cleanup | Cleanup FAILED attempt: проверяем M4 live refs — sha256 referenced другим COMMITTED record → blob не удаляется; ownership marker check; class namespace не пересекается | M4 live refs index | cleanup log с "shared blob, skip delete"; COMMITTED record сохранён |

---

### Таблица 5. Readiness

| Gate | Machine Predicate | Evidence | Fail Result |
|---|---|---|---|
| Atomicity | ∀ COMMITTED row ∈ registry: ∃ FD-1 object с matching sha256 и size | full corpus scan registry ↔ FD-1 inventory | NO-GO: `RECONCILIATION_FAILURE` |
| Replay/Idempotency | ∀ intentId ∈ ledger: ≤1 distinct fingerprint с outcome COMMITTED | full ledger scan | NO-GO: `INTENT_UNIQUENESS_VIOLATION` |
| Hash/Size | ∀ COMMITTED row: FD-1 object sha256 = row.sha256 ∧ size = row.bytes | hash recompute от FD-1 bytes для каждой live tip | NO-GO: `HASH_MISMATCH` in corpus |
| Class/Quota | ∀ class c: Σ distinct live (c,sha256) logical bytes ≤ hard_watermark(c) | quota recount от registry + FD-1 | NO-GO: `QUOTA_EXCEEDED` |
| Registry/Storage Reconciliation | FD-1 inventory ⊇ {sha256 : ∃ COMMITTED row} ∧ ¬∃ orphan FD-1 object without COMMITTED row | bidirectional scan | NO-GO: `RECONCILIATION_FAILURE` |
| M3 Bypass | ∀ data access path: проходит через M3 gate check; direct storage paths не экспонированы | config audit: no direct storage endpoints; gate enforced in all adapters | NO-GO: `BYPASS_DETECTED` |
| Preview Isolation | Preview process: no direct FD-1 access; only via read-bytes gate; preview failure does not affect COMMITTED state | preview sandbox audit; failure injection test | NO-GO: `PREVIEW_ISOLATION_FAIL` |
| Archive Safety | archive limits (bytes/ratio/entries/depth) — численные константы; extraction fail-closed | constants defined in contract; extraction unit tests with over-limit archives | NO-GO: `ARCHIVE_LIMIT_UNDEFINED` |
| Degraded Mode (RPO) | FD-2 last complete cut timestamp available; `now - last_cut ≤ 24h` для intake | FD-2 cut log; timestamp verifiable | NO-GO: `DEGRADED_NO_INTAKE` если RPO просрочен |
| Intent Binding Durability | ∀ COMMITTED row: ∃ ledger binding `(principal,intentId)→recordId` с durable store | ledger ↔ registry cross-check | NO-GO: unbound COMMITTED rows → recovery required |

---

## Список посылок

**Входные нормы и факты (M1–M5 и измеренная фактура):**

1. Контейнер принимает originals как конкретные bytes; Affine и preview — сменные поверхности, не source of truth (M1).
2. Единица регистрации — файл/архив целиком; компонент получает отдельную запись только при независимом поступлении или фактическом предоставлении M6.
3. M2 record append-only: обязательны `id`, `sha256`, `bytes` (positive integer), `addedAt`, `source` (string), `location {kind,ref}`; опциональны `supersedes`, `sensitive.reason`, `about`, `measured`. Любая правка поля создаёт новый `id`.
4. `canonicalRef = "urn:mmbrn:static:" + rootId`; дубль bytes не сливает records/lineages; редакция продолжает lineage через `supersedes`; перенос — новая record с прежним hash.
5. `registry.jsonl` — truth регистрации/identity/history. Location — заявление, reachability — внешнее состояние, bytes — независимое доказательство.
6. Panel авторизует M3 actions: `discover`, `read-metadata`, `read-ref`, `read-bytes`, `download`, `write-metadata`, `upload-revision`, `manage-access`. `read-metadata` не выдаёт `location.ref`; ref, bytes, download — раздельные gates.
7. M4: FD-1 primary bytes, FD-2 complete backup, FD-3 registry/lifecycle. До записи: class-scoped key, capacity/quota admission, hash/bytes verification, fail-closed gates. Office VDS — storage NO-GO.
8. M5: Affine — optional projection; требует Panel allow и valid binding; отсутствие движка не отменяет container/registry/bytes/authority.
9. `registry.jsonl` содержит 12 append-only rows с `location.kind=local`; sensitive PDF вне репозитория; verify 06.08 дал два hash-mismatch, один unreachable superseded row, duplicate hash-группы.
10. Существующая CLI/README предшествует M2–M5; совпадение полей — факт совместимости, не лицензия на старую model.
11. Каждая public operation имеет ровно один M3 action и один authority object (run1–run2).
12. Attempt states отделены от immutable M2 rows и lifecycle events; переходы не мутируют registry rows (run1–run2).
13. Commit = verified FD-1 + torn-write-safe registry append + durable intent binding; FD-2 — последующий checkpoint; RPO gate 24h (run1–run2).
14. Ledger `(principal,intentId)` хранит immutable fingerprint; CAS `intent → ≤1 record`; conflict не стирает историю (run1–run2).
15. Cleanup: exact class-aware ref, ownership marker, M4 live refs; shared blob не удаляется; registry row не в deletion chain (run1–run2).
16. Archive limits численные; extraction fail-closed; `source` строка для provenance; `about` structured при нужде (run1–run2).
17. Audit несёт M3 decision fields и M4 evidence с redaction; not-found не создаёт existence leak; readiness — полный corpus, не spot-check (run1–run2).

---

## Definition of Done

- [x] Выбран один исполнимый operation/state/commit contract мастерской
- [x] M2 identity, M3 authority, M4 storage и M5 сменность Affine сохранены
- [x] Intake atomicity, idempotency, crash recovery и reconciliation определены
- [x] Sensitivity, verification dimensions, preview и archive safety разведены
- [x] Пять обязательных таблиц и не менее 14 cases заполнены (19 cases)
- [x] Readiness имеет machine predicates, evidence и честный NO-GO
- [x] M7, production migration и текущие rows не исполнены
- [x] Один carrier, один E1, посылки перед последней секцией DoD
- [ ] Не менее 36 ролевых реплик и не менее шести от каждой роли — внешний аудит
