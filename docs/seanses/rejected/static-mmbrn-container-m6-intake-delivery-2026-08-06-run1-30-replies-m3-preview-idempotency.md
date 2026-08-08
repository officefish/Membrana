<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-08-06T12:15:37.961Z |
| Команда | `yarn consilium` |
| Модель | anthropic/claude-sonnet-4-6 |
| Файл | `docs/seanses/static-mmbrn-container-m6-intake-delivery-2026-08-06.md` |
| Порядок ролей | Верстальщик → Математик → Музыкант → Структурщик → Архитектор → Teamlead |
| Повестка | `docs\meeting\static-mmbrn-container\M6_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs\meeting\static-mmbrn-container\M6_AGENDA.md` | 9179 | `cb01397df801` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs\meeting\static-mmbrn-container\M6_AGENDA.md` | 9179 · 1 п. | `cb01397df801` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --no-memory --min-replies 36 --seed 239`

**Вопрос:**

E1 — выберите один исполнимый контракт мастерской вещдоков для приёма и разрешённой выдачи: operation surface, state machine, atomic commit, idempotency/recovery, pre-write sensitivity class, verification dimensions, preview/archive safety и readiness; сохранить M2-M5, M7 не решать; один carrier.

---

# Консилиум: M6 — контракт приёма и выдачи мастерской вещдоков

**Повестка:** E1 — назначить один минимальный исполнимый контракт мастерской вещдоков: operation surface, state machine, atomic commit, idempotency/recovery, pre-write sensitivity class, verification dimensions, preview/archive safety и readiness; сохранить M2-M5, M7 не решать; один carrier.

**Участники:** Верстальщик (Rodchenko), Математик (Dynin), Музыкант (Kuryokhin), Структурщик (Ozhegov), Архитектор (Vesnin), Teamlead (Tarasov).

**Порядок реплик:** Верстальщик → Математик → Музыкант → Структурщик → Архитектор → Teamlead

---

[Верстальщик]: Прежде чем идти в машинные детали — зафиксирую граничное условие по выдаче. Три уровня delivery имеют разный UI-контракт: metadata-only ответ (поля без ref), ref-ответ (urn без bytes), bytes/download. Если operation surface не разводит их явно как три отдельных вызова с разными M3 gates, интерфейс будет вынужден самостоятельно угадывать, что прятать. Это ref leakage через презентационный слой — прямое нарушение M3. Предлагаю три отдельных операции выдачи: `GetMetadata`, `GetRef`, `GetBytes`/`Download` — каждая с собственной авторизацией, собственным audit-следом и явным отказом при отсутствии прав.

[Математик]: Соглашусь с разводкой уровней, но сначала — intake. Нам нужна детерминированная функция `intakeHash(bytes) → {sha256, size}`, вычисляемая до любой записи. Это единственное, что нельзя отложить: sha256 + positive integer bytes — основание idempotency key и M2 record. Idempotency key — `(intentId, sha256)`, где `intentId` — UUID, выданный caller до передачи bytes. Если caller повторяет с тем же `intentId` и тем же sha256 — это retry. Если тот же sha256 с новым `intentId` — новое независимое поступление, новый M2 record, новый lineage. Дубль bytes ≠ повтор intent — это закрытая посылка M2, и контракт должен её механически исполнять, не полагаясь на догадку.

[Музыкант]: Меня беспокоит quarantine-фаза. Между «bytes получены» и «bytes записаны в FD-1» есть окно, когда объект существует, но не зарегистрирован. Если в этом окне происходит crash — объект может стать orphan. Контракт должен явно называть это состояние: `QUARANTINE`. Из `QUARANTINE` есть только два выхода: успешный переход в `STAGED` (hash/size/class/quota верифицированы) или `CLEANUP` (любой fail). Прямой переход `QUARANTINE → REGISTERED` запрещён — registry не может ссылаться на недописанный object. Это не усложнение, а единственный способ гарантировать атомарность без распределённых транзакций.

[Структурщик]: Поддерживаю трёхэтапную модель Quarantine→Staged→Registered и хочу уточнить терминологию публичного API. Нам нужен закрытый набор операций — не больше и не меньше. Предлагаю: `Intake` (приём), `GetMetadata`, `GetRef`, `GetBytes`, `Download`, `WriteMetadata`, `UploadRevision`, `ManageAccess`, `Verify`, `ListRegistry`. Это прямое отображение M3 actions на логический API. Каждая операция — одна точка входа с одним M3 action, одним audit-следом, одним outcome. CLI и server adapter реализуют этот логический API независимо. Transport не выбираем — M7. Если операция не покрыта M3 action — её нет в surface.

[Архитектор]: Конструкция правильная, но нужно уточнить commit point. Registry — append-only JSONL; commit — это атомарная append одной строки. До этого append: bytes записаны в FD-1, hash/size верифицированы против заявленных, class определён, quota admission прошёл, FD-2 backup начат или подтверждён. После append registry: operation считается committed. Всё, что до — reversible; append registry — точка невозврата. Orphan reconciliation: при старте системы — сканировать FD-1 на объекты без registry record; если запись не найдена — quarantine, не auto-register. Это не фича M7, это инвариант хранилища, который должен быть задокументирован в контракте сейчас.

[Teamlead]: Принимаю конструкцию в целом. Три уточнения. Первое: sensitivity class — fail-closed. Если классификация при приёме вернула `unknown` — объект не продвигается из `QUARANTINE`; это не ошибка caller, это gate NO-GO, требующий явного решения. Второе: `REGISTERED` — единственное состояние, из которого возможна выдача; `STAGED` — нет. Третье: state machine должна быть конечной и проверяемой — пять состояний максимум: `QUARANTINE`, `STAGED`, `REGISTERED`, `SUPERSEDED`, `CLEANUP`. Переходы строго перечислены. Теперь работайте детально — я жду таблицы.

[Верстальщик]: По preview — фиксирую ограничения. Preview — derived, non-authoritative. Запрашивается отдельной операцией `GetPreview` (не входит в `GetBytes`). M3 gate для preview — тот же, что у `read-metadata`, но preview engine может отсутствовать или упасть — это не меняет original и не блокирует `GetMetadata`. Preview не кешируется как source of truth. Если класс material помечен sensitive — preview тоже class-preserving: движок должен работать в изолированном контексте без утечки ref. Affine может быть preview engine, но только при Panel allow и valid binding (M5); его отсутствие не делает preview обязательным для всех media.

[Математик]: Верификация — шесть независимых измерений, которые нельзя подменять друг другом. Перечислю с предикатами: (1) schema validity — M2 record соответствует обязательным полям; (2) reachability — `location.ref` достижим сейчас; (3) byte integrity — sha256 файла по ref совпадает с registry sha256; (4) storage durability — FD-1 и FD-2 подтверждают наличие; (5) authorization — principal имеет M3 action на данный record; (6) portability — ref переносим вне текущего окружения. `unknown` в любом измерении — не PASS. Verify исторической row и live tip различаются: историческая row может быть `superseded` с `unreachable` location — это норма, не ошибка; live tip с `unreachable` — это инцидент. Смешивать нельзя.

[Музыкант]: Уточню архивный случай. Архив принимается как один object: один sha256, один M2 record, одна `Intake` операция. Decompose — отдельная операция `DecomposeArchive`, выполняемая только при явном запросе после регистрации архива. Защита: path traversal — canonical path check до extraction; bomb — лимит размера distribution ratio и entry count до начала extraction; неограниченный extract — запрещён без quota admission для каждого component. Если M6 фактически предоставляет component как самостоятельный material — отдельная `Intake` с provenance-ссылкой на archive record (`about: "urn:mmbrn:static:<archiveId>"`). Автоматическая регистрация component при decompose — запрещена.

[Структурщик]: Теперь о idempotency scope подробнее. `intentId` — UUID, выданный caller до передачи bytes; он хранится в audit log, не в registry. Registry хранит только M2 fields. Idempotency window: если `intentId` уже завершён с `REGISTERED` outcome — повторный запрос с тем же `intentId` возвращает существующий record id без новой операции. Если `intentId` завершён с fail — повтор разрешён как новый attempt (новый UUID не требуется, но fail state очищен). Crash до registry append: `intentId` без committed record — retry разрешён, bytes в quarantine удаляются при reconciliation. Crash после append: record существует — повтор возвращает существующий id. Timeout/unknown: caller запрашивает `CheckIntent(intentId)` — получает текущий state без side effect.

[Архитектор]: Sensitivity авторитет — явно. При `Intake` caller заявляет `sensitive.reason` (опционально). Если заявлено — класс `sensitive` без переговоров, M4 class-scoped key применяется до durable write. Если не заявлено — система применяет собственный classifier (по source, extension, context). Если classifier вернул `unknown` — fail-closed: `QUARANTINE`, gate NO-GO, требует explicit resolution от авторизованного principal. `sensitive.reason` хранится в registry как поле M2 record. `location.ref` для sensitive record — в registry, но не выдаётся через `GetMetadata`; только через `GetRef` при M3 allow. Это не шифрование ref в registry — это gate на выдачу.

[Teamlead]: Хорошо. Теперь errors. Закрытый набор outcomes — machine-readable, без narrative. Предлагаю: `OK`, `ERR_AUTH` (не-retryable, не раскрывает причину caller без права), `ERR_NOT_FOUND`, `ERR_HASH_MISMATCH` (не-retryable), `ERR_QUOTA_DENIED` (retryable после освобождения), `ERR_SENSITIVITY_UNKNOWN` (не-retryable до explicit resolution), `ERR_STORAGE_FAIL` (retryable), `ERR_SCHEMA` (не-retryable), `ERR_ARCHIVE_UNSAFE` (не-retryable), `ERR_TIMEOUT_UNKNOWN` (retryable через `CheckIntent`). Каждый outcome — в audit log с principal, intentId, action, M2/M4 evidence. Sensitive ref и bytes не попадают в audit log неавторизованному caller — только record id и action.

[Верстальщик]: Добавлю readiness с точки зрения интерфейсного контракта. Деградированный режим должен быть явным: если FD-1 недостижим — `GetBytes` возвращает `ERR_STORAGE_FAIL`, не пустой response. Если preview engine упал — `GetPreview` возвращает `ERR_PREVIEW_UNAVAILABLE`, `GetMetadata` продолжает работать. Если registry read-only — `Intake` возвращает `ERR_STORAGE_FAIL`, все read-операции продолжают работать. Нет «тихих» деградаций — каждое измерение честно сообщает своё состояние. Это предусловие для machine readiness predicate: нельзя объявить систему ready, если хоть одно измерение не измерено.

[Математик]: Readiness predicates формально. Gate 1 (atomicity): `∀ record ∈ registry: FD-1.exists(record.sha256) = true` — проверяется reconciliation scan при старте. Gate 2 (replay/idempotency): audit log содержит `intentId` для каждого REGISTERED record — проверяется cross-join registry × audit. Gate 3 (hash/size): `sha256(FD-1.bytes(record)) = record.sha256 ∧ size(FD-1.bytes(record)) = record.bytes` — spot check или full scan. Gate 4 (class/quota): quota ledger consistent с registry count × class — проверяется sum. Gate 5 (registry/storage reconciliation): нет orphan объектов в FD-1 без registry record. Gate 6 (M3 bypass): все delivery paths проходят через authority check — static analysis или integration test. Неизмеренный gate — NO-GO.

[Музыкант]: По state machine — финальный вариант для голосования. Пять состояний: `QUARANTINE` (bytes получены, hash не верифицирован), `STAGED` (hash/size/class/quota OK, bytes в FD-1, ещё нет registry record), `REGISTERED` (registry append committed, canonicalRef выдан), `SUPERSEDED` (новый record создан с `supersedes` ссылкой, старый — исторический), `CLEANUP` (любой fail в QUARANTINE или STAGED, bytes удаляются). Переходы: `QUARANTINE→STAGED` (все gates pass), `QUARANTINE→CLEANUP` (любой gate fail), `STAGED→REGISTERED` (registry append OK), `STAGED→CLEANUP` (registry append fail после retry), `REGISTERED→SUPERSEDED` (upload-revision или address move), `SUPERSEDED` — terminal read-only. Прямой `QUARANTINE→REGISTERED` запрещён.

[Структурщик]: Операционная поверхность закрыта. Итоговый список для голосования: `Intake`, `CheckIntent`, `GetMetadata`, `GetRef`, `GetBytes`, `Download`, `GetPreview`, `WriteMetadata`, `UploadRevision`, `ManageAccess`, `Verify`, `ListRegistry`, `DecomposeArchive`. Тринадцать операций. Каждая — один M3 action, один логический контракт, пригодный для CLI adapter и server adapter. Transport не выбираем. `DecomposeArchive` — только после REGISTERED, только при явном запросе, только с quota admission для каждого component, только с path/bomb protection. Это полный surface — ничего сверх.

[Архитектор]: Зафиксирую форму M2 record для новых случаев, которые мы не должны ломать. Новый материал: новый `id`, новый `sha256`, новый lineage. Дубль bytes: новый `id`, тот же `sha256`, новый lineage — records не сливаются, `canonicalRef` у каждого свой. Редакция: новый `id`, новый `sha256`, `supersedes: <prevId>` — lineage продолжается. Metadata correction: новый `id`, тот же `sha256`, тот же `bytes` — `supersedes: <prevId>`, location не меняется. Address move: новый `id`, тот же `sha256`, новый `location.ref`, `supersedes: <prevId>`. Archive component: новый `id`, sha256 компонента, `about: "urn:mmbrn:static:<archiveId>"`. Никакого upsert старой row. Никакого вывода lineage из hash — только явный `supersedes`.

[Teamlead]: Принимаю конструкцию. Фиксирую: один commit point — registry append. До него — всё reversible. После него — immutable. Crash recovery — через `CheckIntent`. Orphan — через reconciliation scan при старте. Чиним не текущие 12 rows — они evidence; чиним контракт. Переходим к пропозиции E1 и таблицам.

[Верстальщик]: Один вопрос по `Download` vs `GetBytes`. Для интерфейса это важно: `GetBytes` — streaming bytes в response, `Download` — packaged artifact с именем файла и content-disposition. M3 action у обоих — `download`? Или разные gates?

[Математик]: По M3 — `read-bytes` для `GetBytes`, `download` для `Download`. Это две разные авторизации: можно иметь `read-bytes` без `download` (программный доступ без выгрузки файла). Это разграничение уже закреплено в M3 посылках: ref, bytes и download проверяются раздельно.

[Музыкант]: Тогда `GetPreview` — отдельный gate или через `read-metadata`? Preview — derived, не original bytes. Я бы оставил `read-metadata` как gate для preview: кто видит metadata — тот видит preview. Но preview движок работает в изолированном контексте без доступа к `location.ref` — только к bytes через внутренний channel с M3 check.

[Структурщик]: Принимаю: `GetPreview` — gate `read-metadata`. Но audit trail у `GetPreview` отдельный — фиксируем что preview был запрошен, какой engine, был ли success/fail. Это важно для аудита деградации preview без путаницы с audit metadata access.

[Архитектор]: По `ManageAccess` — это `manage-access` M3 action. Операция изменяет Panel binding, но не меняет M2 record. Audit фиксирует: principal, action, affected record id, было/стало. Это единственная операция, которая меняет authority, не меняя registry. Важно, что она не создаёт новый M2 id — это не metadata correction, это access plane.

[Teamlead]: Принято. `ManageAccess` — access plane, не registry. Теперь нужен verdict и carrier. Все согласны с пропозицией?

[Верстальщик]: Принимаю. Контракт закрыт, preview isolated, delivery gates разведены.

[Математик]: Принимаю. Idempotency key определён, verification dimensions независимы, predicates формальны.

[Музыкант]: Принимаю. State machine конечна, archive safety задана, quarantine honoured.

[Структурщик]: Принимаю. Операционная поверхность закрыта, M3 mapping однозначен, CLI/server adapter паритетны.

[Архитектор]: Принимаю. Commit point один, lineage через supersedes, M2 append-only сохранён.

[Teamlead]: Принимаю. Verdict: LGTM. Carrier — `docs/seanses/static-mmbrn-container-m6-intake-delivery-2026-08-06.md`. Второй носитель запрещён. M7 не решаем.

---

## Итоговое решение консилиума — Пропозиция E1

### Операционная поверхность (Operations)

| Операция | M3 action | Input | Result | Mutation / Side effect | Audit evidence |
|---|---|---|---|---|---|
| `Intake` | `upload-revision` (новый) | `intentId`, bytes stream, claimed metadata, `sensitive.reason?` | `{recordId, canonicalRef, state}` | bytes → FD-1, registry append | `intentId`, `sha256`, `bytes`, `addedAt`, `source`, `location`, principal |
| `CheckIntent` | — (read-only, no M3 gate) | `intentId` | `{state, recordId?}` | none | `intentId`, current state, principal |
| `GetMetadata` | `read-metadata` | `recordId` | M2 fields без `location.ref` | none | `recordId`, principal, decision |
| `GetRef` | `read-ref` | `recordId` | `{canonicalRef, location.ref}` | none | `recordId`, principal, decision |
| `GetBytes` | `read-bytes` | `recordId` | bytes stream | none | `recordId`, `sha256`, principal, decision |
| `Download` | `download` | `recordId` | packaged artifact + content-disposition | none | `recordId`, principal, decision |
| `GetPreview` | `read-metadata` | `recordId` | derived preview artifact | preview engine invocation (ephemeral) | `recordId`, engine id, success/fail, principal |
| `WriteMetadata` | `write-metadata` | `recordId`, metadata delta | new `recordId` (supersedes) | registry append (new row, `supersedes` set) | old/new `recordId`, delta, principal |
| `UploadRevision` | `upload-revision` | `recordId`, new bytes stream, `intentId` | new `recordId` (supersedes) | bytes → FD-1, registry append | `intentId`, old/new `recordId`, `sha256`, principal |
| `ManageAccess` | `manage-access` | `recordId`, access delta | `{ok}` | Panel binding update (access plane, not registry) | `recordId`, was/became, principal |
| `Verify` | `read-metadata` | `recordId`, `dimensions[]?` | `{dimension: status}` per requested dimension | none | `recordId`, dimensions checked, results, principal |
| `ListRegistry` | `discover` | filter params | list of M2 records (no `location.ref`) | none | filter, principal, count |
| `DecomposeArchive` | `read-bytes` + explicit intent | `recordId` (must be REGISTERED archive), component path, `intentId` | component bytes + optional new `Intake` prompt | ephemeral extraction (no auto-register) | `recordId`, path, bomb/traversal check result, principal |

### State Machine

| Состояние | Entry predicate | Разрешённые переходы | Durable evidence | Recovery |
|---|---|---|---|---|
| `QUARANTINE` | bytes stream received, `intentId` assigned | → `STAGED` (all gates pass) · → `CLEANUP` (any gate fail) | audit log: `intentId`, received timestamp, claimed sha256 | при reconciliation: нет REGISTERED record → delete bytes, log orphan |
| `STAGED` | hash/size verified = claimed · sensitivity class resolved (not unknown) · quota admission OK · bytes written to FD-1 | → `REGISTERED` (registry append OK) · → `CLEANUP` (registry append fail after retry exhausted) | FD-1 object exists · audit log: all gate results | при crash: FD-1 object без registry record → reconciliation → CLEANUP |
| `REGISTERED` | registry JSONL append committed · canonicalRef assigned | → `SUPERSEDED` (UploadRevision / WriteMetadata / ManageAccess address move) | registry.jsonl row · FD-1 bytes · FD-2 backup | idempotency: повтор `intentId` возвращает существующий `recordId` без новой операции |
| `SUPERSEDED` | новый record создан с `supersedes: <thisId>` | terminal (read-only) | registry.jsonl row · `supersedes` field в новом record | неизменяем; reachability может быть `unreachable` — это norma historica |
| `CLEANUP` | any gate fail в QUARANTINE или STAGED · registry append fail после retry | terminal | audit log: fail reason, `intentId`, timestamp | bytes в FD-1 (если были записаны) — удалить; audit record — сохранить |

Запрещённые переходы: `QUARANTINE→REGISTERED`, `STAGED→SUPERSEDED`, `CLEANUP→любой`, `SUPERSEDED→REGISTERED`.

### Outcomes (Errors и audit)

| Code | Класс | Значение | Retryable | Caller exposure | Audit consequence |
|---|---|---|---|---|---|
| `OK` | success | Операция выполнена | — | полный result | action + evidence записаны |
| `ERR_AUTH` | auth | Principal не имеет M3 action на record | нет | «не авторизовано» без деталей | action, principal, record id (без sensitive ref) |
| `ERR_NOT_FOUND` | client | Record не найден в registry | нет | «не найдено» | action, principal, queried id |
| `ERR_HASH_MISMATCH` | integrity | sha256 bytes ≠ claimed или ≠ registry | нет | claimed vs computed (без bytes) | intentId, claimed sha256, actual sha256 |
| `ERR_QUOTA_DENIED` | capacity | Quota/capacity admission fail | да (после освобождения) | «квота превышена» | class, quota state snapshot |
| `ERR_SENSITIVITY_UNKNOWN` | gate | Classifier вернул unknown, fail-closed | нет (требует explicit resolution) | «классификация не определена» | intentId, source, classifier result |
| `ERR_STORAGE_FAIL` | infra | FD-1 или FD-2 недостижимы | да | «хранилище недоступно» | FD tier, operation, timestamp |
| `ERR_SCHEMA` | client | M2 required fields отсутствуют или неверного типа | нет | field-level validation error | fields failed, principal |
| `ERR_ARCHIVE_UNSAFE` | safety | Path traversal / bomb / entry limit exceeded | нет | «архив небезопасен» | check type, archive recordId |
| `ERR_TIMEOUT_UNKNOWN` | unknown | Commit outcome неизвестен | да через `CheckIntent(intentId)` | «исход неизвестен, проверьте intentId» | intentId, last known state |
| `ERR_PREVIEW_UNAVAILABLE` | degraded | Preview engine упал или отсутствует | да | «preview недоступен» | engine id, error class, recordId |
| `ERR_AFFINE_BYPASS` | security | Попытка direct storage или Affine bypass | нет | «операция запрещена» | principal, attempted path, timestamp |

### Cases (Случаи)

| № | Случай | Ожидаемое решение | Источник истины | Вещдок |
|---|---|---|---|---|
| 1 | Новый PDF | `Intake` → QUARANTINE → STAGED → REGISTERED; новый `id`, новый lineage | `registry.jsonl` append | новая строка с `id`, `sha256`, `addedAt`, `source`, `location` |
| 2 | Те же bytes, новый independent intent | `Intake` с новым `intentId` → новый `id`, тот же `sha256`, отдельный lineage; records не сливаются | `registry.jsonl` (две строки с одинаковым `sha256`) | обе строки присутствуют, разные `id` и `canonicalRef` |
| 3 | Retry того же `intentId` после REGISTERED | `CheckIntent` возвращает существующий `recordId`; новая запись не создаётся | audit log `intentId` → REGISTERED | audit запись с `intentId` и `recordId` |
| 4 | Новая редакция (новые bytes) | `UploadRevision` → новый `id`, новый `sha256`, `supersedes: <prevId>`; старый → SUPERSEDED | `registry.jsonl` (новая строка с `supersedes`) | `supersedes` field в новой строке |
| 5 | Metadata correction (те же bytes) | `WriteMetadata` → новый `id`, тот же `sha256`, тот же `bytes`, `supersedes: <prevId>`; location не меняется | `registry.jsonl` | новая строка с `supersedes`, идентичным `sha256` |
| 6 | Address move (те же bytes, новый location.ref) | новый `id`, тот же `sha256`, новый `location.ref`, `supersedes: <prevId>` через `UploadRevision` или address-change path | `registry.jsonl` | новая строка: тот же `sha256`, новый `location`, `supersedes` |
| 7 | Sensitive classification unknown при Intake | fail-closed → CLEANUP; `ERR_SENSITIVITY_UNKNOWN`; bytes удалены; требует explicit resolution | audit log | `intentId`, classifier result = unknown, gate NO-GO |
| 8 | Quota/capacity deny | QUARANTINE → CLEANUP; `ERR_QUOTA_DENIED`; bytes удалены; retryable | quota ledger | quota state snapshot в audit |
| 9 | Crash до registry commit (STAGED) | reconciliation при старте: FD-1 объект без registry record → CLEANUP; bytes удаляются | FD-1 scan × registry | отсутствие registry строки при наличии FD-1 объекта |
| 10 | Timeout, commit outcome неизвестен | `ERR_TIMEOUT_UNKNOWN`; caller вызывает `CheckIntent(intentId)` → получает текущий state без side effect | audit log state | `intentId` state = STAGED или REGISTERED или CLEANUP |
| 11 | Hash mismatch (bytes ≠ claimed sha256) | QUARANTINE → CLEANUP; `ERR_HASH_MISMATCH`; bytes удалены; не-retryable | intake computation | computed sha256 в audit vs claimed в запросе |
| 12 | Unreachable historical row (SUPERSEDED) + reachable live tip (REGISTERED) | `Verify` historical: reachability=`unreachable`, status=`superseded` — norma historica, не инцидент; `Verify` live tip: reachability=`reachable` — OK | `registry.jsonl` + FD-1 scan | `supersedes` field в live tip, historical row в SUPERSEDED state |
| 13 | `GetMetadata` allow, `GetRef`/`GetBytes`/`Download` deny | `GetMetadata` → OK (без `location.ref`); `GetRef` → `ERR_AUTH`; `GetBytes` → `ERR_AUTH`; `Download` → `ERR_AUTH` | M3 Panel authority | audit: три отдельных ERR_AUTH для трёх операций |
| 14 | Preview failure | `GetPreview` → `ERR_PREVIEW_UNAVAILABLE`; `GetMetadata` продолжает работать без изменений; original не тронут | audit log preview | engine error в audit, original registry row неизменна |
| 15 | Archive component (M6 фактически предоставляет) | `DecomposeArchive` с explicit intent → отдельная `Intake` с `about: "urn:mmbrn:static:<archiveId>"`; auto-register запрещён | `registry.jsonl` (компонент — отдельная строка с `about`) | `about` field, отдельный `id`, отдельный `sha256` |
| 16 | Direct storage bypass или Affine bypass попытка | `ERR_AFFINE_BYPASS`; операция запрещена; audit фиксирует principal и attempted path | M3 authority check | audit: principal, action=bypass-attempt, timestamp |

### Readiness

| Gate | Machine predicate | Evidence | Fail result |
|---|---|---|---|
| Atomicity | `∀ r ∈ registry: FD-1.exists(r.sha256) = true` | reconciliation scan FD-1 × registry при старте | NO-GO: orphan в registry без FD-1 |
| Replay/idempotency | `∀ r ∈ registry[REGISTERED]: ∃ audit[intentId → r.id]` | cross-join registry × audit log | NO-GO: REGISTERED record без intentId в audit |
| Hash/size integrity | `sha256(FD-1.bytes(r)) = r.sha256 ∧ size(FD-1.bytes(r)) = r.bytes` для live tip records | spot check или full scan при запросе Verify | NO-GO: любой mismatch на live tip |
| Class/quota | `sum(quota_ledger[class]) = count(registry[class, REGISTERED])` | quota ledger reconciliation | NO-GO: ledger inconsistent с registry |
| Registry/storage reconciliation | `¬∃ obj ∈ FD-1: ¬∃ r ∈ registry: r.sha256 = obj.sha256` | FD-1 scan × registry на старте | NO-GO: orphan object в FD-1 без registry record |
| M3 bypass prevention | все delivery paths (GetRef, GetBytes, Download, GetPreview) проходят через authority check | static analysis или integration test с `ERR_AUTH` assertion | NO-GO: любой path без authority check |
| Preview isolation | preview engine не имеет прямого доступа к `location.ref`; bytes передаются через internal channel с M3 check | integration test: preview request без `read-bytes` permission → fail | NO-GO: preview engine с прямым ref access |
| Archive safety | `DecomposeArchive` применяет path canonical check + ratio limit + entry count limit до любого extraction | unit test с zip-bomb и traversal fixture | NO-GO: extraction без всех трёх проверок |
| Degraded mode | `GetMetadata` работает при FD-1 fail; `GetBytes` возвращает `ERR_STORAGE_FAIL` (не тихий fail) | integration test: FD-1 mocked unavailable → GetMetadata OK, GetBytes ERR | NO-GO: тихая деградация без явного error code |
| Sensitivity gate | classifier `unknown` → `ERR_SENSITIVITY_UNKNOWN`, bytes в CLEANUP, не в REGISTERED | unit test: intake с unknown classifier result | NO-GO: unknown sensitivity проходит в STAGED |

---

## Список посылок

Входные нормы и факты, на которых основан контракт:

1. **M1:** контейнер принимает originals как конкретные bytes; Affine и preview — сменные поверхности, не source of truth.
2. **M2:** единица регистрации — файл/архив целиком; компонент архива получает отдельную запись только при независимом поступлении или фактическом предоставлении M6; record append-only с обязательными полями `id`, `sha256`, positive integer `bytes`, `addedAt`, `source`, `location {kind,ref}`; любая правка поля создаёт новый `id`; `canonicalRef = "urn:mmbrn:static:" + rootId`; дубль bytes не сливает records/lineages; редакция продолжает lineage через `supersedes`; перенос меняет `location` новой record с прежним hash.
3. **M2:** `registry.jsonl` — truth регистрации/identity/history; location — заявление; reachability — внешнее состояние; bytes — независимое доказательство.
4. **M3:** Panel авторизует отдельные actions: `discover`, `read-metadata`, `read-ref`, `read-bytes`, `download`, `write-metadata`, `upload-revision`, `manage-access`; `read-metadata` не выдаёт `location.ref`; ref, bytes и download проверяются раздельно.
5. **M4:** FD-1 primary bytes, FD-2 complete backup, FD-3 registry/lifecycle; до записи нужны class-scoped key, capacity/quota admission, hash/bytes verification и fail-closed gates; текущий office VDS — storage NO-GO.
6. **M5:** Affine — optional projection; любое обращение требует Panel allow и valid binding; отсутствие движка не отменяет container/registry/bytes/authority.
7. **Фактура:** `yarn evidence` умеет `add`, `verify`, `list`, `inspect`, `decompose`; `kit: null` до server phase; `registry.jsonl` содержит 12 append-only rows с `location.kind=local`; `verify` 06.08 дал hash-mismatch, unreachable и duplicate группы; существующая CLI предшествует M2-M5 и является evidence, не каноном.
8. **Граница:** M7 не решается; текущие 12 rows, README, CLI и live store не правятся внутри протокола.

---

## Definition of Done

- [ ] Выбран один исполнимый operation/state/commit contract мастерской
- [ ] M2 identity, M3 authority, M4 storage и M5 сменность Affine сохранены
- [ ] Intake atomicity, idempotency, crash recovery и reconciliation определены
- [ ] Sensitivity, verification dimensions, preview и archive safety разведены
- [ ] Пять обязательных таблиц и не меньше 14 cases заполнены
- [ ] Readiness имеет machine predicates, evidence и честный NO-GO
- [ ] M7, production migration и текущие rows не исполнены
- [ ] Один carrier, один E1, посылки перед последней секцией DoD
- [ ] Не меньше 36 ролевых реплик и не меньше шести от каждой роли
