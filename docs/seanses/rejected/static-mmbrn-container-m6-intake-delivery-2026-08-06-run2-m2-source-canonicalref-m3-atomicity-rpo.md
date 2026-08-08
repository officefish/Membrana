<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-08-06T13:16:39.483Z |
| Команда | `yarn consilium` |
| Модель | anthropic/claude-sonnet-4-6 |
| Файл | `docs/seanses/static-mmbrn-container-m6-intake-delivery-2026-08-06.md` |
| Порядок ролей | Верстальщик → Teamlead → Математик → Структурщик → Музыкант → Архитектор |
| Повестка | `docs\meeting\static-mmbrn-container\M6_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs\meeting\static-mmbrn-container\M6_AGENDA.md` | 11636 | `22864d69a4b3` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs\meeting\static-mmbrn-container\M6_AGENDA.md` | 11636 · 1 п. | `22864d69a4b3` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --no-memory --min-replies 42 --seed 251`

**Вопрос:**

E1 — выберите один исполнимый контракт мастерской вещдоков по повестке M6 и поправкам run1: exact M3 mapping, class-aware M4 commit/recovery, durable idempotency, safe preview/archive and full-corpus readiness; сохранить M2-M5, M7 не решать; один carrier.

---

# Консилиум: M6 — контракт мастерской вещдоков (приём и выдача)

**Повестка:** E1 — выбрать один исполнимый контракт мастерской вещдоков для полного цикла приёма и разрешённой выдачи: exact M3 mapping, class-aware M4 commit/recovery, durable idempotency, safe preview/archive и full-corpus readiness; сохранить M2–M5, M7 не решать; один carrier.

**Участники:** Teamlead (Тарасов), Архитектор (Веснин), Структурщик (Ожегов), Математик (Дынин), Музыкант (Курёхин), Верстальщик (Родченко).

**Порядок реплик:** Верстальщик → Teamlead → Математик → Структурщик → Музыкант → Архитектор

---

[Верстальщик]: Прежде чем говорить о UI операций — зафиксирую, что preview не является source of truth и его сбой не затрагивает оригинал. С точки зрения интерфейса мне важно одно: каждая операция выдачи (metadata / ref / bytes / download) должна иметь ровно один visible gate — то, что Panel разрешила, то и показано, без «угадай по контексту». Если `read-ref` отдаёт только `location.ref`, а `read-bytes` нужен для preview — это два разных элемента интерфейса, два разных запроса. Ни cache, ни Affine не заменяют ответ мастерской.

[Teamlead]: Положение: M1–M5 закрыты, фактура зафиксирована — 12 строк registry.jsonl, два hash-mismatch, один unreachable, duplicate-группы. Задача — выбрать один контракт, не чинить текущее. Предложение: принимаем модель с единым логическим API (пригодным для CLI и server adapter без дублирования), атомарным commit-point (FD-1 object + registry append + intent binding за одну транзакцию), закрытым набором операций через M3 actions и idempotency ledger на ключе `(principal,intentId)`. Что нужно от команды: Архитектор — форма, Структурщик — границы, Математик — предикаты readiness, Дальше — детали по очереди.

[Математик]: Quota readiness нельзя считать по количеству записей — это ошибка измерения. Верный предикат: `U_c + physical_delta(class, sha256) ≤ capacity_c`, где `U_c` — текущее использование по классу из M4, `physical_delta` считается по distinct live `(class,sha256)` парам, а не по record count. Дублирующиеся bytes в одном классе не дают двойной дельты; standard и sensitive одного hash — разные записи, разные дельты, слияние запрещено. Watermark предупреждения и hard cap — два разных порога, оба машинно проверяемы до durable write.

[Структурщик]: Operation surface должна быть закрытым set: `intake`, `status`, `verify`, `deliver-metadata`, `deliver-ref`, `deliver-bytes`, `deliver-download`, `deliver-preview`, `write-metadata`, `write-revision`, `manage-access`, `archive-intake`, `archive-extract-component`. Каждая операция — ровно один M3 action, ровно один authority object (container / collection / lineage). Без action — операции нет, fail-closed. `intake` и `write-revision` — оба через `upload-revision`; различаются тем, что `intake` создаёт новую lineage, а `write-revision` продолжает существующую через `supersedes`. `recordId` разрешается в `canonicalRef` и policy/version vector до gate, не после.

[Музыкант]: Меня беспокоит граница между archive-intake и archive-extract-component. Архив принимается целиком — это понятно. Но если M6 фактически предоставляет компонент — он должен получить отдельную M2 record с `source` несущим archive provenance, и только после этого выдаётся. Автоматическая регистрация при распаковке запрещена: extraction по запросу, с явными byte/ratio/entry/depth bounds, с защитой от path traversal и zip bombs. Пока component не зарегистрирован — он не существует в registry и не выдаётся.

[Архитектор]: Форма контракта: один логический API с двумя адаптерами (CLI и server) без дублирования бизнес-логики. Граница: всё, что касается transport (HTTP, stdio), — снаружи; всё, что касается commit, identity, authority — внутри единственного core-модуля мастерской. State machine имеет четыре фазы: ATTEMPT (до durable write) → COMMITTED (FD-1 + registry append + intent binding) → DELIVERED (выдача авторизована) → ARCHIVED (historical, не переписывается). Attempt states не попадают в M2/lifecycle. Commit — это не «FD-1 записан» и не «backup начат» — это три условия одновременно: verified FD-1, torn-write-safe registry append, durable intent binding.

[Верстальщик]: Операция `deliver-preview` требует `read-bytes`, не `read-metadata` — это принципиально. Preview — derived result, он class-preserving: sensitive preview не выдаётся без той же authority, что и sensitive bytes. Если preview engine недоступен или вернул ошибку — это изолированный сбой, он не меняет статус original и не является ошибкой мастерской по bytes. Интерфейс должен явно различать «preview недоступен» и «bytes недоступны» — это разные состояния с разными причинами.

[Teamlead]: По sensitivity: авторитет классификации — Panel до durable write, fail-closed при unknown. Это значит: если class неизвестен — либо resumable hold (ждём ответа Panel), либо terminal fail с новым intent. Molча записать как standard при unknown — BLOCK. Sensitive reason должен быть непустым при sensitive class; пустой reason — gate reject. Classification определяет M4 class, но не становится `location.kind` — это разные поля с разными семантиками.

[Математик]: Idempotency ledger: ключ `(principal,intentId)` → immutable request fingerprint + CAS `intent → ≤1 record`. Retry того же intent с теми же bytes — idempotent return существующего результата. Retry того же intent с другими bytes или metadata — `CONFLICT_IDEMPOTENCY`: история не стирается, новый intent требует нового `intentId`. Failed intent retry — возвращает `INTENT_FAILED` с исходной причиной, не открывает новый commit. Crash до commit — orphan в quarantine, cleanup по ownership marker; crash после commit — ledger несёт durable binding, retry возвращает уже зафиксированную запись.

[Структурщик]: Cleanup и reconciliation: используют exact class-aware `location.ref`, ownership marker и M4 live refs. Нельзя удалить blob, если он referenced несколькими records (shared blob protection). Standard и sensitive записи одного hash не склеиваются — они живут в разных M4 class buckets. Исторический object считается отсутствующим только после complete deletion chain: удалена запись registry + удалён FD-1 object + подтверждён M4 checkpoint. Частично удалённый объект — NOT-FOUND по M4, но исторически присутствует в registry (append-only не переписывается).

[Музыкант]: Hash mismatch при intake — terminal fail, не retry. Если заявленный sha256 не совпадает с вычисленным — bytes отклоняются, quarantine не создаётся молча, audit несёт оба hash (заявленный и фактический). Это критично: malware gate и format gate идут после hash/size verification, не до. Порядок gates строгий: hash+size → sensitivity/class → malware/format → quota admission → storage write → registry append → intent binding. Нарушение порядка — NO-GO в readiness.

[Архитектор]: Verification dimensions строго разделены и не подменяют друг друга. Schema validity — `registry.jsonl` соответствует M2 schema. Reachability — `location.ref` достижим прямо сейчас. Byte integrity — sha256 фактических bytes совпадает с записанным. Storage durability — FD-1 и FD-2 подтверждены M4. Authorization — M3 Panel дала allow для конкретного action на конкретном principal. Portability — ref не является local-only и достижим вне текущего хоста. `unknown` по любому измерению — не PASS. Исторические rows проверяются без переписывания: статус «was-reachable, now-unreachable» — это факт о конкретной row, не повод создавать новую.

[Верстальщик]: Audit record должен нести M3 decision fields и M4 evidence с redaction. Raw ref и attempted path не пишутся в audit — только redacted form. Not-found response не создаёт existence leak: мастерская возвращает одинаковый `NOT_FOUND` независимо от того, существует ли запись или principal просто не имеет `discover` authority. Это важно для UI: отображение ошибок не должно раскрывать sensitive existence через разные коды.

[Teamlead]: State machine — четыре состояния attempt-side и три состояния lifecycle-side. Attempt: `PENDING_GATE` → `PENDING_CLASS` → `PENDING_STORAGE` → `QUARANTINE` (terminal для failed intake) или `COMMITTED` (success). Lifecycle: `LIVE` (current tip) → `SUPERSEDED` (есть более новая revision с `supersedes`) → `HISTORICAL` (только для audit, never deleted from registry). Attempt states не пересекаются с lifecycle: нет пути из `QUARANTINE` в `LIVE` без нового intent.

[Математик]: Readiness predicates должны проверять весь corpus, не spot-check. Gate `atomicity`: для каждого committed intentId — ровно один M2 record, verified FD-1 object существует, intent binding durable. Gate `idempotency-replay`: idempotency ledger отвечает на каждый known intentId без обращения к registry напрямую. Gate `hash-size`: для каждого live record — sha256 вычислен от FD-1 bytes и совпадает, bytes > 0. Gate `class-quota`: для каждого class — `U_c ≤ capacity_c * warning_watermark` (предупреждение) или `U_c + min_delta ≤ capacity_c` (hard gate). Неизмеренное состояние — NO-GO автоматически.

[Структурщик]: Archive safety: числовые bounds обязательны и проверяются до extraction. Предлагаю: `MAX_ARCHIVE_BYTES = 4 GiB`, `MAX_COMPRESSION_RATIO = 100`, `MAX_ENTRIES = 10 000`, `MAX_DEPTH = 5`. Path traversal protection: любой entry path, содержащий `..` или абсолютный путь — immediate reject всего архива. Archive extraction не автоматическая: по явному запросу `archive-extract-component` с явным entry path, после которого component проходит полный intake pipeline включая sensitivity classification и отдельную M2 registration.

[Музыкант]: Address move и metadata correction — оба создают новую M2 record через `write-metadata`, обе операции требуют M3 `write-metadata` action. Старая record не обновляется, не удаляется — она остаётся в registry как historical с тем же `id`. Новая record несёт `supersedes: <old_id>`. Это критично: нельзя «переехать» sensitive record в standard class через metadata correction — class — поле M4, меняется только через новый intake с новым classification gate.

[Архитектор]: `manage-access` не меняет ни одну M2 record и не меняет state machine. Это чистое Panel-side действие. Если `manage-access` вызван — audit несёт факт изменения policy, но registry.jsonl не получает новую строку. Это важная граница: identity (registry) и authority (Panel/M3) — разные слои. Попытка смешать их (например, записывать ACL в registry) — нарушение M2/M3 boundary.

[Верстальщик]: Direct storage bypass и Affine bypass — оба `FORBIDDEN`, причём fail-closed. Если кто-то обращается к FD-1 напрямую, минуя мастерскую — это не «работает, просто через другой путь», это нарушение контракта. Affine как optional projection не даёт authority на bytes: отсутствие Affine binding не блокирует container, наличие — не открывает bytes gate. Для UI это означает: не строить ссылки на storage URL напрямую, всегда через `deliver-ref` после проверки M3.

[Teamlead]: Error taxonomy: закрытый set machine-readable outcomes. `OK` — success, не retryable в смысле «уже сделано». `CONFLICT_IDEMPOTENCY` — тот же intentId, другой fingerprint, не retryable, новый intentId. `INTENT_FAILED` — исторически failed intent, не retryable без нового intentId. `GATE_REJECT` — M3 deny, не retryable без policy change. `CLASS_UNKNOWN` — sensitivity не определён, resumable hold или terminal. `HASH_MISMATCH` — bytes не совпадают с заявленным sha256, terminal. `QUOTA_DENY` — capacity exceeded, retryable после освобождения. `STORAGE_UNAVAILABLE` — FD-1 недоступен, retryable. `NOT_FOUND` — единый ответ для not-found и unauthorized discover. `ARCHIVE_LIMIT` — numeric bound exceeded, terminal. `PREVIEW_UNAVAILABLE` — изолированный сбой preview, не влияет на bytes.

[Математик]: Reconciliation procedure: периодически запускается full-corpus scan. Для каждого live record из registry — проверяется наличие FD-1 object по exact class-aware `location.ref`. Если FD-1 отсутствует — record помечается `reachability=unreachable` в отдельном verification log (не в registry). Если FD-1 присутствует — пересчитывается sha256, сравнивается с registry. Если ownership marker на FD-1 object не совпадает с record — это аномалия, флаг для ручного разбора. Shared blob: если два records разных lineage ссылаются на один (class,sha256) — оба должны быть live до удаления любого из них.

[Структурщик]: Логический API пригоден для CLI и server adapter: единый core принимает `IntakeRequest`, `DeliverRequest`, `VerifyRequest` и т.д. с явными полями `principal`, `intentId`, `action`, `target`. CLI-адаптер разбирает argv и вызывает core. Server-адаптер принимает HTTP/transport и вызывает тот же core. Никакой бизнес-логики в адаптерах. Transport выбирается только если без него контракт не исполним — по условию повестки M7 не проектируется, поэтому transport-детали остаются за скобками.

[Музыкант]: Preview isolation: preview engine работает в отдельном процессе/sandbox, без доступа к FD-1 напрямую. Мастерская передаёт bytes в preview engine только после `read-bytes` gate pass. Preview результат — derived, class-preserving, не кешируется как authoritative. Если preview engine возвращает ошибку — мастерская возвращает `PREVIEW_UNAVAILABLE`, original bytes и registry не затронуты. Preview отсутствие (нет engine binding для данного media type) — не ошибка мастерской, `PREVIEW_UNAVAILABLE` с причиной `no_engine`.

[Архитектор]: Два момента по `canonicalRef` и duplicate bytes. `canonicalRef = "urn:mmbrn:static:" + rootId` — это identity pointer на конкретный rootId, не на bytes. Два intake одних и тех же bytes с разными intentId — два разных rootId, два разных `canonicalRef`, два разных lineage. Это не слияние, не dedup по bytes. Registry хранит обе записи. Факт duplicate bytes виден в verify через одинаковый sha256 — это informational, не merge trigger. Вывод lineage из hash запрещён.

[Верстальщик]: Cases таблица должна охватить не только happy path. Меня особенно интересует case 13: metadata allow при ref/bytes/download deny. UI должен показать metadata (name, type, addedAt, sha256, bytes-size) без `location.ref`, без bytes, без download link. Это полностью корректное состояние — не ошибка, не заглушка. `read-metadata` дал результат, остальные gates закрыты — и это честный ответ мастерской, который должен быть отражён в интерфейсе явно, а не как «что-то пошло не так».

[Teamlead]: Итоговая позиция по E1: принимаем модель с закрытым operation surface из 13 операций, state machine с раздельными attempt/lifecycle states, commit из трёх условий одновременно (FD-1 + registry append + intent binding), idempotency ledger на `(principal,intentId)`, sensitivity fail-closed при unknown, пятью разведёнными verification dimensions, preview isolation, archive safety с числовыми bounds и full-corpus readiness predicates. Carrier — один: `docs/seanses/static-mmbrn-container-m6-intake-delivery-2026-08-06.md`. M7 не решается. Связка исполнения: Структурщик — API boundaries, Математик — predicates и quota, остальные — по своим зонам. LGTM к протоколу после заполнения таблиц.

[Математик]: Уточнение по gate порядку — он должен быть строго линейным и проверяемым. Предлагаю пронумеровать: G1=hash+size, G2=sensitivity/class (Panel), G3=malware/format, G4=quota admission, G5=FD-1 write+verify, G6=registry append (CAS), G7=intent binding durable. Каждый gate — binary pass/fail, fail-closed. Если G6 прошёл, но G7 не прошёл — это torn state, recovery по ownership marker. Если G5 прошёл, но G6 не прошёл — orphan в FD-1 без registry reference, cleanup по ownership marker. Registry не ссылается на недописанный object — invariant держится порядком G5→G6→G7.

[Структурщик]: По `archive-extract-component`: эта операция требует M3 `read-bytes` на archive record плюс отдельный `upload-revision` для создания component record. Это две операции, два gate checks. Component получает свой `id`, свой `sha256`, свой `lineage`, свой `source` (несущий archive provenance как `about: { archiveId, entryPath }`). Только после commit component record — он выдаётся. До commit — он не существует в registry. Это не автоматическая регистрация — это явный двухшаговый процесс.

[Музыкант]: Добавлю про failed intent retry (case 18). Если intent завершился `GATE_REJECT` или `HASH_MISMATCH` или любым terminal outcome — retry того же `intentId` возвращает исходный `INTENT_FAILED` с original причиной. История не стирается: ledger хранит immutable `{intentId, fingerprint, outcome, timestamp}`. Новый attempt с теми же bytes требует нового `intentId`. Это защита от replay атак и от случайного повторного intake после terminal failure.

[Архитектор]: Последнее по форме: `Список посылок` — только входные нормы и факты из M1–M5 и фактура мастерской. После него — `Definition of Done`. Carrier — один файл. В нём — один E1 verdict. Всё, что выходит за границы M6 (deployment, migration, Affine pages, current rows fix) — не в carrier, не в протоколе, не в DoD. Структура протокола должна позволить аудиту проверить каждый пункт DoD машинно, а не на доверии.

[Верстальщик]: По форме audit record в UI-контексте: когда principal запрашивает операцию и получает `NOT_FOUND` — audit пишет `{principal, action, target_ref_redacted, outcome: NOT_FOUND, timestamp}`. Никакого `exists: false` или `exists: true` — только `NOT_FOUND`. Это предотвращает existence leak через audit log для неавторизованного principal. Если principal имеет `discover` и получает `NOT_FOUND` — это честный not-found. Если не имеет `discover` — тот же `NOT_FOUND`. Различие только в audit: в первом случае `gate: discover=allow`, во втором `gate: discover=deny`.

[Teamlead]: Итог по командной работе: M6 контракт выбран, детали согласованы всеми ролями. Нет разногласий по существу. Исполнение carrier — одним документом, таблицы обязательны, cases ≥14, readiness predicates машинные. Команда принимает модель.

[Математик]: Принимаю. Предикаты readiness сформулированы как вычислимые функции от измеримых величин, не от экспертного суждения.

[Структурщик]: Принимаю. Closed surface определён, каждая операция имеет ровно один M3 action и один authority object.

[Музыкант]: Принимаю. Archive safety и preview isolation разведены, числовые bounds зафиксированы.

[Архитектор]: Принимаю. Форма — один core-модуль, два адаптера, единый commit invariant G5→G6→G7.

[Верстальщик]: Принимаю. Каждый gate виден в интерфейсе отдельно, existence leak предотвращён, preview failure изолирован.

---

## Итоговое решение консилиума (E1 — пропозиция и вердикт)

**Пропозиция E1:** Принять контракт мастерской вещдоков с закрытым operation surface (13 операций), раздельными attempt/lifecycle state machines, трёхусловным commit point, idempotency ledger на `(principal,intentId)`, sensitivity fail-closed при unknown class, пятью независимыми verification dimensions, preview isolation, archive safety с числовыми bounds и full-corpus readiness predicates. Carrier — `docs/seanses/static-mmbrn-container-m6-intake-delivery-2026-08-06.md`.

**Вердикт: ПРИНЯТО единогласно.**

---

### Таблица 1 — Operations

| Operation | M3 Action | Input | Result | Mutation | Audit evidence |
|---|---|---|---|---|---|
| `intake` | `upload-revision` | `{principal, intentId, bytes, claimed_sha256, claimed_bytes, metadata, target_collection}` | `{recordId, canonicalRef, status: COMMITTED}` | Новая M2 record, FD-1 object, intent binding | `{intentId, fingerprint, gates G1–G7, recordId, outcome}` |
| `write-revision` | `upload-revision` | `{principal, intentId, bytes, claimed_sha256, claimed_bytes, metadata, supersedes: recordId}` | `{recordId, canonicalRef, status: COMMITTED}` | Новая M2 record с `supersedes`, FD-1 object, intent binding | `{intentId, fingerprint, supersedes, gates G1–G7, recordId, outcome}` |
| `write-metadata` | `write-metadata` | `{principal, intentId, target_recordId, metadata_delta}` | `{recordId, canonicalRef}` | Новая M2 record с `supersedes: target_recordId`, no new bytes | `{intentId, fingerprint, target_recordId, fields_changed_redacted, outcome}` |
| `manage-access` | `manage-access` | `{principal, target_collection_or_lineage, policy_delta}` | `{ok}` | Panel policy updated; нет изменений в registry | `{principal, target, policy_action, outcome}` |
| `status` | `read-metadata` | `{principal, recordId}` | `{metadata без location.ref}` | Нет | `{principal, recordId, action: read-metadata, outcome}` |
| `verify` | `read-metadata` | `{principal, recordId, dimensions[]}` | `{dimension: status}` каждое независимо | Нет | `{principal, recordId, dimensions_checked, outcomes_per_dim}` |
| `deliver-metadata` | `read-metadata` | `{principal, recordId}` | `{id, sha256, bytes, addedAt, source, sensitive.reason если allowed, about, measured}` без `location.ref` | Нет | `{principal, recordId, action: read-metadata, outcome}` |
| `deliver-ref` | `read-ref` | `{principal, recordId}` | `{location.ref}` только | Нет | `{principal, recordId, action: read-ref, outcome}` |
| `deliver-bytes` | `read-bytes` | `{principal, recordId}` | Bytes stream | Нет | `{principal, recordId, action: read-bytes, bytes_delivered, outcome}` |
| `deliver-download` | `download` | `{principal, recordId}` | Bytes stream + disposition headers | Нет | `{principal, recordId, action: download, outcome}` |
| `deliver-preview` | `read-bytes` | `{principal, recordId}` | Derived preview (class-preserving) | Нет; preview engine изолирован | `{principal, recordId, action: read-bytes, preview_engine, outcome}` |
| `archive-intake` | `upload-revision` | `{principal, intentId, archive_bytes, claimed_sha256, claimed_bytes, metadata, target_collection}` | `{recordId, canonicalRef, status: COMMITTED}` | Новая M2 record для архива целиком; компоненты не регистрируются | `{intentId, fingerprint, archive_limits_checked, gates G1–G7, recordId, outcome}` |
| `archive-extract-component` | `read-bytes` (архив) + `upload-revision` (component) | `{principal, archive_recordId, entry_path, component_intentId, component_metadata}` | `{component_recordId, canonicalRef}` | Новая M2 record для component с `source.archiveId + source.entryPath`; требует двух gate passes | `{archive_recordId, entry_path_redacted, component_intentId, component_recordId, outcome}` |

---

### Таблица 2 — State Machine

| State | Entry predicate | Allowed transitions | Durable evidence | Recovery |
|---|---|---|---|---|
| **PENDING_GATE** | Intent получен; G1 (hash+size) не пройден | → `PENDING_CLASS` (G1 pass) / → `QUARANTINE` (G1 fail) | Intent в ledger с fingerprint | При crash — intent в ledger без outcome; retry возвращает `PENDING_GATE` |
| **PENDING_CLASS** | G1 pass; sensitivity/class от Panel ожидается | → `PENDING_STORAGE` (class=standard или sensitive с reason) / → `CLASS_HOLD` (resumable) / → `QUARANTINE` (G3 fail или terminal class unknown) | Intent + claimed_class в ledger | При crash — hold; Panel re-query; timeout → terminal |
| **PENDING_STORAGE** | G2+G3+G4 pass; FD-1 write начата | → `COMMITTED` (G5+G6+G7 all pass) / → `ORPHAN` (G5 pass, G6 fail) / → `QUARANTINE` (G5 fail) | Ownership marker на FD-1 object (не registry) | Orphan — cleanup по ownership marker; не становится COMMITTED без G6+G7 |
| **COMMITTED** | G5+G6+G7 all pass; registry append durable | → `LIVE` (lifecycle) | M2 record в registry + FD-1 verified + intent binding | Idempotency ledger возвращает existing recordId на retry |
| **QUARANTINE** | Terminal failure в любом gate | Нет (terminal) | Intent в ledger с outcome=fail + причина | Cleanup по ownership marker; новый intent требует нового intentId |
| **ORPHAN** | G5 pass, G6 или G7 fail | → cleanup (ownership marker) | Ownership marker на FD-1 object | Reconciliation удаляет FD-1 если нет registry reference; не превращается в COMMITTED |
| **LIVE** | Committed; нет более новой revision | → `SUPERSEDED` (write-revision создала новую record с supersedes) | M2 record как live tip | Verify подтверждает reachability + byte integrity |
| **SUPERSEDED** | Новая record с `supersedes: this.id` существует в registry | → `HISTORICAL` (complete deletion chain) | M2 record с supersedes chain | Исторически присутствует; reachability может быть unreachable — это факт row, не ошибка |
| **HISTORICAL** | В registry навсегда; байты могут отсутствовать | Нет переходов (append-only) | M2 record (immutable) | Verify различает live-tip check и historical-row check; нет переписывания |
| **CLASS_HOLD** | G1+G3+G4 pass; Panel не ответил по class в timeout | → `PENDING_CLASS` (Panel ответил) / → `QUARANTINE` (timeout terminal) | Intent в ledger + hold marker | Resumable если Panel даст class в окне; иначе terminal → новый intent |

---

### Таблица 3 — Outcomes

| Code | Class | Meaning | Retryable | Caller exposure | Audit consequence |
|---|---|---|---|---|---|
| `OK` | Success | Операция выполнена | Не нужен (идемпотентен) | Полный result согласно operation | Пишется outcome=OK с evidence |
| `COMMITTED` | Success | Intake/revision commit завершён | Не нужен | `{recordId, canonicalRef}` | G1–G7 outcomes + recordId |
| `IDEMPOTENT_RETURN` | Success | Retry того же intent — возврат существующего результата | N/A | Тот же result, что и исходный OK | Пишется retry_of=intentId |
| `CONFLICT_IDEMPOTENCY` | Conflict | Тот же intentId, другой fingerprint | Нет — требует новый intentId | `{error: CONFLICT_IDEMPOTENCY}` без деталей fingerprint | Пишется conflict без раскрытия fingerprint caller |
| `INTENT_FAILED` | Terminal | Retry исторически failed intent | Нет — требует новый intentId | `{error: INTENT_FAILED, original_outcome}` | Пишется replay попытки |
| `GATE_REJECT` | Auth | M3 Panel deny | Нет без policy change | `{error: GATE_REJECT}` без деталей policy | `{principal, action, target_redacted, gate: deny}` |
| `NOT_FOUND` | Auth/NotFound | Record не найден ИЛИ principal не имеет `discover` | Нет | `{error: NOT_FOUND}` — одинаково для обоих случаев | `{principal, action, outcome: NOT_FOUND}` без existence signal |
| `HASH_MISMATCH` | Terminal | Вычисленный sha256 ≠ claimed_sha256 | Нет — требует новый intake | `{error: HASH_MISMATCH}` | Оба hash в audit (не caller-facing) |
| `SIZE_MISMATCH` | Terminal | Вычисленный bytes ≠ claimed_bytes | Нет — требует новый intake | `{error: SIZE_MISMATCH}` | Вычисленный и заявленный size в audit |
| `CLASS_UNKNOWN` | Hold/Terminal | Sensitivity не определён Panel | Resumable (CLASS_HOLD) или terminal | `{error: CLASS_UNKNOWN, resumable: bool}` | Hold marker + Panel query |
| `QUOTA_DENY` | Capacity | `U_c + physical_delta > capacity_c` | Да — после освобождения | `{error: QUOTA_DENY, class}` | `{U_c, capacity_c, delta, class}` в audit |
| `STORAGE_UNAVAILABLE` | Infra | FD-1 недоступен | Да | `{error: STORAGE_UNAVAILABLE}` | `{fd: FD-1, status}` в audit |
| `MALWARE_REJECT` | Terminal | Malware gate fail | Нет | `{error: MALWARE_REJECT}` | Факт fail без деталей сигнатуры |
| `FORMAT_REJECT` | Terminal | Format gate fail | Нет без нового intake | `{error: FORMAT_REJECT}` | Media type проверки в audit |
| `ARCHIVE_LIMIT` | Terminal | Numeric bound exceeded (bytes/ratio/entries/depth) | Нет | `{error: ARCHIVE_LIMIT, limit_type}` | Которой именно bound превышен |
| `PREVIEW_UNAVAILABLE` | Isolated | Preview engine ошибка или нет engine | Да (изолирован) | `{error: PREVIEW_UNAVAILABLE, reason}` | `{engine, reason}` — original не затронут |
| `FORBIDDEN` | Security | Direct storage bypass или Affine bypass | Нет | `{error: FORBIDDEN}` | `{principal, attempted_path_redacted, outcome}` |

---

### Таблица 4 — Cases

| # | Случай | Ожидаемое решение | Источник истины | Вещдок |
|---|---|---|---|---|
| 1 | Новый PDF | Intake: G1→G2→G3→G4→G5→G6→G7 all pass. Новый rootId, новый `canonicalRef`, новая M2 record, FD-1 object, intent binding. `COMMITTED` | registry.jsonl (новая строка) + FD-1 object + intent ledger | `{intentId, recordId, sha256, outcome: COMMITTED}` |
| 2 | Те же bytes как новое независимое поступление | Новый intentId, новый rootId, новый `canonicalRef`. G1 pass (sha256 совпадает с вычисленным от bytes, но это не duplicate-merge). Новая M2 record без `supersedes`. Два separate lineages. | registry.jsonl (две строки с одинаковым sha256, разными id) | `verify` показывает duplicate sha256 — informational, не merge trigger |
| 3 | Retry того же intent | Idempotency ledger находит `(principal,intentId)` с тем же fingerprint. Возвращает `IDEMPOTENT_RETURN` с исходным `{recordId, canonicalRef}`. Никакого нового write. | Intent ledger (immutable) | Ledger entry `{intentId, fingerprint, outcome: COMMITTED, recordId}` |
| 4 | Новая редакция | `write-revision` с `supersedes: old_recordId`. G1–G7 pass для новых bytes. Новый `id`, новый `canonicalRef`, `supersedes` поле. Old record переходит в `SUPERSEDED`. | registry.jsonl (новая строка с `supersedes`) | `{new_id, supersedes: old_id, sha256_new}` |
| 5 | Metadata correction | `write-metadata` action. Новая M2 record с исправленными полями + `supersedes: old_id`. Нет новых bytes, нет нового FD-1. Old record → SUPERSEDED. | registry.jsonl (новая строка без bytes change) | `{new_id, supersedes: old_id, changed_fields}` — class не меняется через write-metadata |
| 6 | Address move | `write-metadata` action. Новая M2 record с новым `location.ref` + `supersedes: old_id`. Hash тот же. | registry.jsonl (новая строка с новым location.ref) | `{new_id, supersedes: old_id, location_new, sha256_same}` |
| 7 | Sensitive classification unknown | G2: Panel не вернул class. `CLASS_UNKNOWN`. Если resumable — `CLASS_HOLD`, ждём Panel в окне. Если timeout — terminal, `QUARANTINE`. Молча записать как standard — BLOCK. Новый intent требуется после terminal. | Intent ledger (hold или failed) | `{intentId, state: CLASS_HOLD или QUARANTINE, reason: class_unknown}` |
| 8 | Quota/capacity deny | G4: `U_c + physical_delta > capacity_c`. `QUOTA_DENY`. No write. Intent в ledger с outcome=QUOTA_DENY. Retryable после освобождения с тем же intentId (если fingerprint не изменился). | M4 quota metrics `{U_c, capacity_c, delta, class}` | `{intentId, outcome: QUOTA_DENY, class, U_c, capacity_c}` |
| 9 | Crash до registry commit | G5 (FD-1) прошёл, G6 (registry append) не выполнен. FD-1 object — orphan с ownership marker. Reconciliation находит orphan (FD-1 без registry reference), удаляет по ownership marker. Registry не получила строку. Retry по тому же intentId → restart от G5. | Ownership marker на FD-1 + intent ledger (outcome не durable) | Reconciliation log: `{orphan_ref, action: delete, reason: no_registry_reference}` |
| 10 | Timeout с неизвестным commit outcome | G7 не подтверждён в окне. Intent в ledger с outcome=`UNKNOWN`. Caller получает `STORAGE_UNAVAILABLE` или `UNKNOWN`. Reconciliation проверяет: если registry содержит запись с этим intentId — `IDEMPOTENT_RETURN`; если нет — cleanup orphan, новый intent. | Intent ledger + registry scan по intentId | `{intentId, outcome: UNKNOWN}` → reconciliation решает |
| 11 | Hash mismatch | G1: вычисленный sha256 ≠ claimed_sha256. Terminal `HASH_MISMATCH`. Bytes отклонены. Quarantine не создаётся молча. Оба hash в audit, не caller-facing. Новый intent с правильным claimed_sha256. | Вычисленный hash от bytes | Audit: `{intentId, computed_sha256, claimed_sha256, outcome: HASH_MISMATCH}` — caller получает только `HASH_MISMATCH` без hash |
| 12 | Unreachable historical row и reachable live tip | `verify` на historical row: `reachability=unreachable` — это факт этой row, не ошибка системы и не повод создавать новую запись. `verify` на live tip: `reachability=reachable, byte_integrity=ok`. Статусы не смешиваются. | Verification log (не registry — registry append-only) | `{recordId_historical, reachability: unreachable}` + `{recordId_live, reachability: reachable, byte_integrity: ok}` |
| 13 | Metadata allow при ref/bytes/download deny | `deliver-metadata`: `read-metadata` gate pass → возвращает `{id, sha256, bytes_size, addedAt, source, about}` без `location.ref`. `deliver-ref`: `read-ref` gate deny → `GATE_REJECT`. `deliver-bytes`: `read-bytes` gate deny → `GATE_REJECT`. Три отдельных audit entries. | M3 Panel decision per action | `{action: read-metadata, outcome: OK}` + `{action: read-ref, outcome: GATE_REJECT}` + `{action: read-bytes, outcome: GATE_REJECT}` |
| 14 | Preview failure | `deliver-preview` требует `read-bytes` gate. Если gate pass — bytes идут в preview engine. Engine возвращает ошибку → `PREVIEW_UNAVAILABLE`. Original bytes и registry не затронуты. Caller получает `PREVIEW_UNAVAILABLE` с reason. `read-bytes` gate pass зафиксирован в audit отдельно от preview failure. | Preview engine error + audit `{action: read-bytes, outcome: OK}` + `{preview_outcome: PREVIEW_UNAVAILABLE}` | Original остаётся в FD-1 неизменным |
| 15 | Archive component | `archive-extract-component`: требует `read-bytes` на archive record (gate 1) + `upload-revision` для component (gate 2, полный G1–G7 pipeline). Component получает отдельный `id`, `sha256`, `bytes`, `source: {archiveId, entryPath}`. Только после COMMITTED component record — выдаётся. До commit — не существует в registry. | registry.jsonl (отдельная строка для component) | `{component_id, sha256_component, source.archiveId, source.entryPath}` |
| 16 | Direct storage или Affine bypass | Любое обращение к FD-1 напрямую или через Affine без прохождения через мастерскую → `FORBIDDEN`. Fail-closed. Audit: `{principal, attempted_path_redacted, outcome: FORBIDDEN}`. Affine binding не заменяет M3 authority. | M3 Panel + access log | `{outcome: FORBIDDEN}` — attempted path не раскрывается caller |
| 17 | Тот же intent с другим fingerprint | Idempotency ledger находит `(principal,intentId)` с другим fingerprint. `CONFLICT_IDEMPOTENCY`. Новый intentId требуется. Исходная ledger entry не стирается и не меняется. | Intent ledger (immutable entry) | `{intentId, outcome: CONFLICT_IDEMPOTENCY}` — детали fingerprint не раскрываются caller |
| 18 | Failed intent retry без стирания истории | Intent завершился `HASH_MISMATCH` (или другим terminal). Retry того же intentId → `INTENT_FAILED` с original outcome. Ledger entry immutable: `{intentId, fingerprint, outcome: HASH_MISMATCH, timestamp}`. История не стирается. Новый attempt требует нового intentId. | Intent ledger | `{intentId, outcome: INTENT_FAILED, original_outcome: HASH_MISMATCH}` |
| 19 | Shared blob при cleanup | Reconciliation определяет, что FD-1 object по (class, sha256) referenced двумя live records из разных lineages. Нельзя удалить blob — ownership marker показывает multiple references. Удаление блокируется до тех пор, пока оба records не пройдут complete deletion chain. Standard и sensitive с одинаковым sha256 не склеиваются: разные class buckets, независимые ownership markers. | M4 live refs + ownership markers | `{ref, outcome: DELETE_BLOCKED, reason: shared_blob, referencing_records: [id1, id2]}` |

---

### Таблица 5 — Readiness

| Gate | Machine predicate | Evidence | Fail result |
|---|---|---|---|
| **Atomicity** | ∀ intentId в ledger с outcome=COMMITTED: ∃ ровно одна M2 record в registry + FD-1 object verified + intent binding durable | Cross-scan: ledger × registry × FD-1 | NO-GO: atomicity violation |
| **Idempotency-replay** | ∀ known intentId: ledger отвечает без registry scan; fingerprint immutable; outcome=COMMITTED → один recordId | Ledger самодостаточен | NO-GO: ledger gap или mutable entry |
| **Hash-size integrity** | ∀ live M2 record: sha256(FD-1 bytes) == record.sha256 AND FD-1 bytes.length == record.bytes AND record.bytes > 0 | Full-corpus hash recompute | NO-GO: любой mismatch |
| **Class-quota** | ∀ class c: U_c ≤ capacity_c; physical delta вычислен по distinct live (class, sha256); watermark check | M4 usage metrics | NO-GO: U_c > capacity_c; WARNING: U_c > capacity_c * warning_watermark |
| **Registry-storage reconciliation** | ∀ live M2 record: FD-1 object reachable по exact class-aware location.ref с matching ownership marker | Reconciliation scan | NO-GO: orphan или missing object |
| **M3 bypass prevention** | ∀ FD-1 access log: каждый successful access имеет matching M3 Panel allow decision | Access log × Panel decision log | NO-GO: access без Panel allow |
| **Preview isolation** | Preview engine не имеет прямого доступа к FD-1; bytes передаются только после read-bytes gate pass; preview failure не меняет FD-1 | Preview sandbox audit | NO-GO: direct FD-1 access из preview process |
| **Archive safety** | ∀ archive intake: MAX_ARCHIVE_BYTES=4GiB, MAX_COMPRESSION_RATIO=100, MAX_ENTRIES=10 000, MAX_DEPTH=5 проверены до extraction; path traversal check pass | Archive scan log | NO-GO: любой limit не проверен до write |
| **Degraded mode** | При FD-2 unavailable: read operations на live records работают через FD-1; intake продолжается; FD-2 unavailability логируется как WARNING, не блокирует read | M4 health check | WARNING (не NO-GO): FD-2 degraded; NO-GO только если FD-1 тоже unavailable |
| **Gate order** | G1→G2→G3→G4→G5→G6→G7 строго линеен; нет skip; fail-closed на каждом | Gate execution log per intent | NO-GO: любой gate пропущен или порядок нарушен |
| **Intent uniqueness** | ∀ (principal,intentId): ровно одна ledger entry; нет duplicate intentId для одного principal | Ledger uniqueness index | NO-GO: duplicate intentId |
| **Sensitivity fail-closed** | ∀ intake: если class=unknown и нет durable Panel response — state=CLASS_HOLD или QUARANTINE; нет записи с class=standard при unknown | Ledger + registry scan | NO-GO: любая committed record без resolved class |
| **Existence non-leak** | ∀ NOT_FOUND response: caller не может отличить «не существует» от «нет discover authority» | Response uniformity test | NO-GO: divergent NOT_FOUND responses |
| **Historical row immutability** | ∀ M2 record в registry: ни одна строка не изменена после append; verify исторической row не создаёт новую строку | registry.jsonl append-only hash chain | NO-GO: любая мутация строки |

---

## Список посылок

*(Только входные нормы и факты; не содержит выводов протокола)*

1. **M1:** Контейнер принимает originals как конкретные bytes; Affine и preview — сменные поверхности, не source of truth.
2. **M1:** Единица регистрации — файл/архив целиком; компонент архива получает отдельную запись только при независимом поступлении или фактическом предоставлении M6.
3. **M2:** Record append-only; обязательны `id`, `sha256`, positive integer `bytes`, `addedAt`, `source`, `location {kind,ref}`; опциональны `supersedes`, `sensitive.reason`, `about`, `measured`; любая правка поля создаёт новый `id`.
4. **M2:** `canonicalRef = "urn:mmbrn:static:" + rootId`; дубль bytes не сливает records/lineages; редакция продолжает lineage; перенос меняет location новой record с прежним hash.
5. **M2:** `registry.jsonl` — truth регистрации/identity/history; location — заявление; reachability — внешнее состояние; bytes — независимое доказательство.
6. **M3:** Panel авторизует отдельные actions: `discover`, `read-metadata`, `read-ref`, `read-bytes`, `download`, `write-metadata`, `upload-revision`, `manage-access`; `read-metadata` не выдаёт `location.ref`; ref, bytes и download проверяются раздельно.
7. **M4:** FD-1 primary bytes, FD-2 complete backup, FD-3 registry/lifecycle; до записи нужны class-scoped key, capacity/quota admission, hash/bytes verification и fail-closed gates; текущий office VDS — storage NO-GO.
8. **M5:** Affine — optional projection; любое обращение требует Panel allow и valid binding; отсутствие движка не отменяет container/registry/bytes/authority.
9. **Фактура:** `yarn evidence` умеет `add`, `verify`, `list`, `inspect`, `decompose`; `kit: null` до server phase.
10. **Фактура:** `docs/evidence/registry.jsonl` содержит 12 append-only rows с `location.kind=local`; один PDF-чек в публичном Git; sensitive PDF партнёра вне репозитория с `sensitive.reason` и непереносимым local ref.
11. **Фактура:** `verify` 06.08: два hash-mismatch (day memo), один unreachable superseded BPLA row, duplicate hash-группы receipt и BPLA.
12. **Фактура:** README предписывает «bytes к нам, потом опись»; различает `ok/hash-mismatch/unreachable/unknown`; server API — backlog #1303.
13. **Фактура:** Существующая CLI/README предшествует M2–M5; совпадение полей — факт совместимости, не разрешение вернуть старую model.
14. **run1:** Каждая public operation — ровно один M3 action и один authority object; `upload-revision` — action для нового intake; `recordId` до gate разрешается в `canonicalRef` и policy/version vector; status/verify — fail-closed.
15. **run1:** `read-ref` возвращает только `location.ref`; preview требует `read-bytes`, не `read-metadata`; derived result не ослабляет bytes gate.
16. **run1:** Attempt states отделены от M2/lifecycle; address move и metadata correction — `write-metadata`; revision — `upload-revision`; `manage-access` не меняет record/state.
17. **run1:** До durable write authority выдаёт class: standard либо sensitive с непустым `sensitive.reason`; unknown — resumable hold или terminal fail с новым intent; malware/format gate обязательны.
18. **run1:** Commit = verified FD-1 object + torn-write/concurrency-safe immutable registry append + durable intent binding; FD-2 — только последующим complete M4 checkpoint.
19. **run1:** Idempotency ledger key `(principal,intentId)` хранит immutable request fingerprint и CAS `intent → ≤1 record`; другие bytes/metadata дают conflict; retry failed intent не стирает историю.
20. **run1:** Cleanup/reconciliation используют exact class-aware `location.ref`, ownership marker и M4 live refs; нельзя удалить shared blob; standard/sensitive одного hash не склеиваются.
21. **run1:** Quota readiness использует M4 `U_c`, logical bytes, distinct live `(class,sha256)`, physical delta и watermarks, не record counts.
22. **run1:** Component сначала получает отдельную M2 record с archive provenance в `source`, затем выдаётся; archive limits — числовые byte/ratio/entry/depth bounds.
23. **run1:** Audit несёт M3 decision fields и M4 evidence с redaction; raw ref/attempted path не пишутся; not-found не создаёт existence leak; readiness проверяет весь corpus.

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
