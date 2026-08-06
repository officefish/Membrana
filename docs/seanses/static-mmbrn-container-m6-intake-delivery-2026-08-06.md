<!-- канал: llm — исходные протоколы произведены yarn consilium -->
<!-- local-synthesis: председательская редакция из run1-run5 после исчерпания 5/5 внешних попыток; сырой run5 сохранён в rejected/static-mmbrn-container-m6-intake-delivery-2026-08-06-run5-final-external-surface-fingerprint-readiness.md -->

# Метаданные сеанса

| Поле | Значение |
|---|---|
| Каноническая комната | M6 «Приём и выдача» заседания `static-mmbrn-container` |
| Локальная сборка | 2026-08-06 после закрытия внешнего бюджета 5/5 |
| Последний внешний вызов | `yarn consilium`, `anthropic/claude-sonnet-4-6` |
| Файл | `docs/seanses/static-mmbrn-container-m6-intake-delivery-2026-08-06.md` |
| Повестка | `docs/meeting/static-mmbrn-container/M6_AGENDA.md` |
| Корпус | rejected run1-run5, ратифицированные M1-M5, независимые постаудиты |

Локальная редакция использует только доставленную повестку, закрытые M1-M5, сохранённые
внешние прогоны и их постаудиты. Новых внешних вызовов не производилось.

---

# Консилиум: E1 — контракт приёма и разрешённой выдачи

[Математик]: Сначала фиксирую два множества, которые нельзя смешивать: M2 records и attempts. Идемпотентность живёт на ключе `(principal,intentId)`, а независимое поступление тех же bytes с новым intent создаёт новый record и новую lineage.

[Музыкант]: Preview остаётся производной поверхностью. Он получает original только после `read-bytes` allow, сохраняет class и при любой ошибке возвращает `preview_unavailable`, не меняя original, registry или tip.

[Teamlead]: Выбираем одну модель LIGD: durable intent ledger, immutable registry и gated delivery. Commit для caller состоит из verified FD-1, safe registry append и durable binding; FD-2 приходит только последующим complete checkpoint.

[Структурщик]: Operation surface является одной закрытой таблицей. Вне неё нет скрытых CLI-команд, server endpoints или операций из примечаний; у каждой строки ровно один M3 action и ровно один authority object.

[Архитектор]: До object gate `recordId` разрешается в `canonicalRef`, current tip, policy version и object-version vector. Неизвестный record, binding, action или version даёт fail-closed, а не fallback.

[Верстальщик]: Metadata, ref, bytes и download — четыре разных результата. Metadata включает разрешённые M2 поля и `sensitive.reason`, но никогда `location.ref`; ref-операция возвращает только `location.ref`.

[Математик]: Полный request fingerprint строится из operation и канонического JSON всех влияющих на результат inputs: content hash, `bytes`, class, collection, expected tip, source, location, sensitive, about, measured и archive provenance. Смена любого поля при том же intent даёт conflict.

[Музыкант]: Для архива выбираем четыре фиксированных предела: member bytes не больше 64 MiB, compression ratio не больше 10:1, entries не больше 256, depth не больше 2. Traversal, absolute path, NUL и symlink escape блокируют extraction целиком.

[Teamlead]: Revision content использует `upload-revision`. Non-storage metadata correction, address move и class change используют `write-metadata`, но остаются тремя operations: последние две копируют bytes в новый address/class namespace и заново проверяют hash/size до append; удаление источника остаётся отдельной M4 deletion chain.

[Структурщик]: `manage-access` разделяется по object: container, collection и lineage — три строки с одним authority object каждая. Операция меняет только M3 policy store, не M2 row и не lifecycle материала.

[Архитектор]: M2 читается буквально. Payload называется `content`; `bytes` — положительное целое размера, `source` и `about` — строки, kinds только `local|affine|url|archivarius`. `bytes_size` и object-valued `about` запрещены.

[Верстальщик]: Audit разделяет `operation` и `action`. Для `verify-integrity` operation так и называется, но action остаётся `read-bytes`; raw ref, path, key и content не попадают в audit уже на записи.

[Математик]: M4 admission сохраняется без редакции: `U_c + logical_delta <= Q_c`, затем после `physical_delta` обязательны `free_after >= 12 GiB` и `utilisation_after < 0.90`. Новый резерв 1 GiB не вводится.

[Музыкант]: Archive component проходит две операции. `extract-archive` читает archive lineage под `read-bytes` и выдаёт временный quarantined member; `intake-archive-component` под `upload-revision` создаёт самостоятельную M2 row до любой выдачи component.

[Teamlead]: До append ledger уже хранит immutable fingerprint и proposedRecordId. Если append прошёл, а COMMITTED binding не записался, recovery находит row по proposedRecordId, проверяет FD-1 и завершает binding, не удаляя referenced bytes.

[Структурщик]: Attempt state, registry row и lifecycle event имеют разные carriers. FAILED/HOLD/QUARANTINE не являются M2 состояниями; LIVE/SUPERSEDED/HISTORICAL выводятся append-only lifecycle join без мутации registry.

[Архитектор]: Revision и metadata write предъявляют `expectedCurrentTip`. Новая row получает новый `id`, прежние root и `canonicalRef`, `supersedes=expectedCurrentTip`; CAS mismatch даёт `rejected_cas` и не создаёт fork.

[Верстальщик]: Not-found не раскрывает existence: без уже разрешённого discover caller получает одну форму `not_found`. Если существование легально известно, конкретный action deny может быть показан как `forbidden` без ref или bytes.

[Математик]: Reconciliation — не равенство counts. Нужен exact bidirectional join M6-managed recordId между registry и COMMITTED ledger, затем fingerprint/ref к FD-1; перестановка двух записей обязана дать mismatch.

[Музыкант]: Shared cleanup разрешает delete только при нуле live refs, совпадающем ownership marker и том же class namespace, возрасте superseded не меньше 365 дней, отсутствии hold и полной per-ref authorization chain. Standard и sensitive одинакового hash не склеиваются и не удаляют друг друга.

[Teamlead]: Legacy 12 rows не получают вымышленные ledger bindings. Они образуют `legacy_uncovered`, а production intake остаётся NO-GO до отдельной принятой binding policy; это не работа M6 и не повод переписать rows.

[Структурщик]: Verify dimensions представлены отдельными operations. Schema и durability используют `read-metadata`, reachability и portability — `read-ref`, integrity — `read-bytes`, authorization — owner-only `manage-access` на lineage.

[Архитектор]: `verify-authorization` не маскирует target action под discover. Owner получает policy decision evidence через `manage-access`; ordinary caller проверяет право только фактическим вызовом нужной operation.

[Верстальщик]: `list-container`, `list-collection` и `list-lineage` используют discover на разных objects. Result не содержит `location.ref`; sensitive ids не попадают в audit list, только redacted filters и result count.

[Математик]: Corpus readiness объявляется явно: `L_proposed` — все ledger intents с durable proposedRecordId во всех состояниях, включая FAILED и reconciliation; `C_managed` — registry rows, чей id встречается в `L_proposed`; `C_legacy=C_all\C_managed`. State-indexed cardinality различает ещё не созданный object, stored pending, crash after append и committed binding. Sample не доказывает universal predicate.

[Музыкант]: Четыре archive constants повторяются в обеих operation rows, Case 15 и readiness. Слова «те же limits» недостаточно: каждый carrier должен позволять проверить значения без перехода в чужую секцию.

[Teamlead]: FD-2 RPO безусловен: `now-cut_at <= 24h` для каждого admitted intake независимо от reachability. Недоступный, но свежий FD-2 даёт `degraded_fd2`; любой stale checkpoint даёт `fd2_checkpoint_stale` и intake NO-GO, хотя авторизованные reads через исправный FD-1 продолжаются.

[Структурщик]: State recovery использует CAS и idempotent append по proposedRecordId. Retry того же intent/fingerprint возвращает текущий terminal или pending outcome; другой fingerprint конфликтует, а failed history не стирается.

[Архитектор]: Direct FD-1 и Affine bypass закрыты. Affine остаётся optional projection M5: valid binding и Panel allow обязательны, отсутствие движка не отменяет container identity, bytes, authority или history.

[Верстальщик]: Caller-facing outcomes закрыты и machine-readable. `hash_mismatch`, `unreachable`, `preview_unavailable`, `degraded_fd2`, `fd2_checkpoint_stale` и `legacy_uncovered` не сворачиваются в одну неразличимую ошибку.

[Математик]: Full-corpus hash/size gate идёт по каждому `r in C_live`, а schema — по каждому `r in C_all`. Historical unreachable остаётся честным row-scoped фактом и не делает live tip автоматически broken.

[Музыкант]: Component provenance генерирует мастерская из archiveRecordId и memberPath: string `source` указывает на archive canonicalRef, string `about` — на member path. Caller не может подменить provenance свободным полем.

[Teamlead]: M7 не открываем: DNS, Caddy, rollout, import 12 rows и production migration отсутствуют. M6 заканчивается исполнимым логическим contract и честным текущим NO-GO.

[Структурщик]: Пять таблиц ниже являются единственной нормативной формой E1. Реплики объясняют выбор, но operation, state, outcome, cases и readiness читаются независимо и не ссылаются на несуществующие действия.

[Архитектор]: Проверяю границы: M2 не переопределён, M3 action/object замкнуты, M4 topology и thresholds сохранены, M5 сменность Affine сохранена. Второго интерфейса и transport design нет.

[Верстальщик]: Форма готова к внешней приёмке. Я не закрываю ролевой DoD собственным подсчётом: этот последний чек остаётся независимому аудитору, как требует повестка.

## Итоговое решение консилиума — E1

**Пропозиция E1:** принять модель **LIGD (Ledgered Intake + Gated Delivery)** как единственный
контракт M6. Она использует durable intent ledger, immutable M2 registry, append-only
lifecycle evidence, exact M3 gates и M4 admission/readiness без проектирования M7.

**Вердикт: ПРИНЯТО локальной сборкой после исчерпания 5/5 внешних попыток; требуется
независимый PASS и ратификация владельца.**

### Таблица 1. Operations (закрытая)

Во всех record operations pre-gate resolution равен
`recordId -> canonicalRef + currentTip + policyVersion + objectVersion`.

| Operation | M3 action | Authority object | Input | Result | Mutation / side effect | Audit evidence |
|---|---|---|---|---|---|---|
| `intake` | `upload-revision` | collection | principal, intentId, targetCollection, content, positive integer `bytes`, claimedSha256, source string, location, class, optional sensitive/about/measured | record / outcome | ledger + FD-1 + M2 append | operation, action, principal, intent, fingerprint, proposed/committed id, M3 decision, M4 evidence |
| `revise-content` | `upload-revision` | lineage | principal, intentId, expectedCurrentTip, content, `bytes`, claimedSha256, source, location, class, optional fields | record / outcome | new M2 row, CAS tip | intake evidence + expected tip, supersedes, CAS result |
| `write-metadata` | `write-metadata` | lineage | principal, intentId, expectedCurrentTip, patch limited to source/about/measured; system copies unchanged hash/bytes/location/class | record / outcome | new M2 row, no content write | old/new id, changed fields redacted, CAS result |
| `move-address` | `write-metadata` | lineage | principal, intentId, expectedCurrentTip, destination location; class unchanged | record / outcome | class-preserving copy only, destination hash/size verify, then new M2 row; source bytes remain under the M4 retention/deletion chain | old/new id/location kind, copy+verify evidence, CAS result; refs redacted |
| `change-class` | `write-metadata` | lineage | principal, intentId, expectedCurrentTip, target class and nonempty reason if sensitive | record / outcome | copy to target class namespace, hash/size verify, then new M2 row | old/new class, copy+verify, quota/capacity and CAS evidence |
| `list-container` | `discover` | container | principal, filters | record list without ref | none | object=container, redacted filters, result count |
| `list-collection` | `discover` | collection | principal, collection, filters | record list without ref | none | object=collection, redacted filters, result count |
| `list-lineage` | `discover` | lineage | principal, canonicalRef | lineage rows/tip without ref | none | object=lineage, tip id, result count |
| `read-metadata` | `read-metadata` | lineage | principal, recordId | M2 metadata incl. kind/reason, without ref | none | action, recordId, decision/version fields |
| `read-ref` | `read-ref` | lineage | principal, recordId | `{location.ref}` only | none | ref omitted/redacted at write |
| `read-bytes` | `read-bytes` | lineage | principal, recordId | content stream | FD-1 read | size/hash evidence, no content/ref in audit |
| `download` | `download` | lineage | principal, recordId | content + disposition | FD-1 read/token | action=download, delivery outcome |
| `preview` | `read-bytes` | lineage | principal, recordId, profile | derived preview / unavailable | isolated derived cache only | operation=preview, action=read-bytes, derived=true |
| `manage-access-container` | `manage-access` | container | owner, policy delta | policy version | M3 policy store only | object=container, grants delta, versions |
| `manage-access-collection` | `manage-access` | collection | owner, collection, policy delta | policy version | M3 policy store only | object=collection, grants delta, versions |
| `manage-access-lineage` | `manage-access` | lineage | owner, canonicalRef, policy delta | policy version | M3 policy store only | object=lineage, grants delta, versions |
| `extract-archive` | `read-bytes` | lineage | principal, archiveRecordId, memberPath; limits **64 MiB / 10:1 / 256 / depth 2** | quarantined member content + extraction receipt | temp sandbox only | operation, action, archive id, all four limit results, path redacted |
| `intake-archive-component` | `upload-revision` | collection | principal, intentId, targetCollection, extractionReceipt, content, `bytes`, claimedSha256; limits **64 MiB / 10:1 / 256 / depth 2** | component record / outcome | full intake; system derives source/about | archive/component ids, all four limits, M3/M4 evidence |
| `verify-schema` | `read-metadata` | lineage | principal, recordId | schema status | lifecycle evidence only | operation=verify-schema, action=read-metadata |
| `verify-reachability` | `read-ref` | lineage | principal, recordId | reachability status | lifecycle evidence only | operation=verify-reachability, action=read-ref |
| `verify-integrity` | `read-bytes` | lineage | principal, recordId | hash/size status | lifecycle evidence only | operation=verify-integrity, action=read-bytes |
| `verify-durability` | `read-metadata` | lineage | principal, recordId | FD-1/FD-2/FD-3 status without ref | lifecycle evidence only | operation=verify-durability, action=read-metadata, M4 evidence |
| `verify-authorization` | `manage-access` | lineage | owner, recordId, targetAction | current policy decision evidence | none | operation=verify-authorization, action=manage-access, versions |
| `verify-portability` | `read-ref` | lineage | principal, recordId | portability status without returning ref | lifecycle evidence only | operation=verify-portability, action=read-ref |

Request fingerprint is `sha256(canonical-json(request_effect))`, where `request_effect`
contains operation, content hash, `bytes`, class, target collection, expected tip, complete
effective M2 fields, archive provenance and every other result-affecting input. Raw content is
represented by its computed hash. Key fields `(principal,intentId)` are stored beside it.

### Таблица 2. State machine (attempt и lifecycle разведены)

| State | Entry predicate | Allowed transition | Durable evidence | Recovery |
|---|---|---|---|---|
| `RESERVED` | CAS reserved `(principal,intentId)` | `FINGERPRINTED` / `FAILED` | ledger owner token + operation | stale owner expires; same caller resumes |
| `FINGERPRINTED` | computed hash/size match declared values; immutable full fingerprint + proposedRecordId stored | `SCANNED` / `REJECTED` | ledger fingerprint, computed hash/bytes | same fingerprint resumes; other fingerprint conflicts |
| `SCANNED` | malware and format PASS | `CLASSIFIED` / `QUARANTINED` / `REJECTED` | scan evidence | scan may replay idempotently |
| `CLASSIFIED` | standard or sensitive with nonempty reason | `ADMITTED` / `HELD` / `REJECTED` | authority decision + class | unknown waits or terminates; no M2 row |
| `ADMITTED` | M4 quota and capacity predicates PASS | `STORED_PENDING_REGISTRY` / `FAILED` | measured `U_c,Q_c,deltas,free_after,utilisation` | admission rechecked after timeout |
| `STORED_PENDING_REGISTRY` | FD-1 object written and hash/bytes verified | `COMMITTED` / `FAILED` | class-aware ref, ownership marker, proposedRecordId | safe append if absent; if row exists, verify and finish binding; never delete referenced bytes |
| `COMMITTED` | exactly one M2 row appended and ledger binding durable | terminal success | row + binding + FD-1 proof | replay returns same recordId |
| `HELD` | class/policy unresolved | resume classification / terminal reject | hold reason, no row | owner policy decides; history retained |
| `QUARANTINED` | malware/format/archive safety failure | terminal reject | quarantine ticket | never auto-register; retention handled outside registry |
| `REJECTED` | deterministic gate deny/conflict | terminal | immutable outcome | new request requires policy change or new intent as outcome says |
| `FAILED` | infrastructure failure before complete commit | reconcile / replay / terminal reject | immutable failure event | exact ledger/registry/FD-1 reconciliation first |

M2 lifecycle is not stored in these attempt states. `LIVE`, `SUPERSEDED` and `HISTORICAL`
are derived from immutable rows plus append-only lifecycle events; registry rows are never
updated or deleted.

### Таблица 3. Outcomes (закрытый словарь)

| Code | Class | Meaning | Retryable | Caller exposure | Audit consequence |
|---|---|---|---|---|---|
| `accepted` | success | complete LIGD commit | no | recordId, canonicalRef | COMMITTED binding |
| `duplicate_intent` | idempotent success | same intent/fingerprint already committed | no | existing recordId | replay event |
| `intent_fingerprint_conflict` | conflict | same intent, different complete fingerprint | no | conflict only | both fingerprints, no raw fields |
| `outcome_unknown` | transient | caller cannot know commit result | yes, same intent | safe code only | reconciliation required |
| `rejected_cas` | conflict | expected tip differs | yes after refresh/new intent | observed tip if authorized | CAS evidence |
| `rejected_class_unknown` | hold/reject | class unresolved | conditional | code/hold token | authority evidence |
| `rejected_quota` | admission | `U_c+logical_delta>Q_c` | after quota change | code | M4 quota evidence |
| `rejected_capacity` | admission | free/utilisation predicate fails | after capacity change | code | M4 capacity evidence |
| `rejected_malware` | security | scan fails | no | generic code | redacted scan evidence |
| `rejected_format` | data | format fails | no | generic code | redacted format evidence |
| `quarantined` | safety | held outside registry | no | ticket only | no M2 row |
| `not_found` | lookup/auth | absent or undiscoverable | no | identical safe shape | no id/ref leak |
| `forbidden` | auth | known object, action denied | after policy change | action only | exact M3 decision |
| `hash_mismatch` | integrity | stored/computed hash differs | no | code, authorized recordId | no raw content/hash leak to unauthorized caller |
| `size_mismatch` | integrity | computed size differs from M2 `bytes` | no | code | declared/computed sizes redacted by policy |
| `unreachable` | reachability | resolver cannot reach row location | later | code | row-scoped lifecycle evidence |
| `schema_invalid` | schema | M2 row/input invalid | no | invalid fields safe list | schema evidence |
| `preview_unavailable` | derived | engine/cache unavailable | yes | original remains valid | derived failure only |
| `archive_limit` | safety | **64 MiB / 10:1 / 256 / depth 2** or traversal rule fails | no | failed limit | all four checks recorded |
| `m3_bypass_blocked` | security | direct storage/Affine path | no | generic deny | security event |
| `degraded_fd2` | durability | FD-2 unavailable and `now-cut_at<=24h` | after reachability returns | code + safe age | degraded operation recorded |
| `fd2_checkpoint_stale` | durability | `now-cut_at>24h`, regardless of FD-2 reachability | after a fresh checkpoint | code + safe age | intake blocked |
| `legacy_uncovered` | readiness | M2 row lacks accepted ledger evidence | no | readiness code | no fake binding |
| `conflict_shared_cleanup` | retention | live ref prevents delete | no | code | candidate retained |

### Таблица 4. Cases

| # | Случай | Ожидаемое решение | Источник истины | Вещдок |
|---:|---|---|---|---|
| 1 | Новый PDF | `intake` -> one record/new root | M2 + ledger + FD-1 | accepted binding |
| 2 | Те же bytes, независимое поступление | new intent/id/root; no hash merge | M2 identity | two rows, same hash |
| 3 | Retry того же intent | same fingerprint -> same outcome/record | ledger | duplicate_intent |
| 4 | Новая редакция | `revise-content`, new id, same root/ref, CAS supersedes | M2 lineage | new immutable row |
| 5 | Metadata correction | `write-metadata` accepts only source/about/measured; copies hash/bytes/location/class unchanged | M2 fields + M3 | old/new rows |
| 6 | Address move | `move-address` copies within the same class, verifies destination hash/size, then appends a same-hash new-location row; source deletion is not part of this operation | M2 + M4 storage proof | supersedes chain + destination proof |
| 7 | Unknown sensitive class | HELD or rejected; no row/quota | authority + ledger | hold/reject evidence |
| 8 | Quota/capacity deny | exact M4 predicate fails before write | M4 measurements | rejected_quota/capacity |
| 9 | Crash before registry append | proposed id + verified FD-1 -> safe append once; if the intent terminates without a row, the object is an orphan and may be cleaned only after manual review proves exact class-aware ref, ownership marker and zero live refs, without inventing an M2 row or lifecycle event | ledger/FD-1/registry | reconciliation + orphan review event |
| 10 | Timeout unknown outcome | replay same intent; COMMITTED returns same id | ledger | outcome_unknown/replay |
| 11 | Hash/size mismatch | fail exact dimension, do not rewrite row | content proof + M2 | verify event |
| 12 | Historical unreachable, live tip reachable | two row-scoped statuses; history immutable | lifecycle join | two verify reports |
| 13 | Metadata allow; ref/bytes/download deny | metadata without ref; three exact denies | M3 Panel | four decision events |
| 14 | Preview failure | preview_unavailable; original untouched | M5 projection + M2 | derived failure |
| 15 | Archive component | extraction and component intake both enforce **64 MiB / 10:1 / 256 / depth 2**; system generates string source/about; record precedes delivery | two-operation flow | archive row + component row + four checks |
| 16 | Direct storage/Affine bypass | deny before data/ref exposure | M3/M5 boundary | security event |
| 17 | Same intent, changed metadata/fingerprint | conflict, no second record | complete fingerprint | immutable conflict |
| 18 | Failed intent retry | old terminal history retained; allowed replay/new intent follows outcome | ledger | failed + replay/new attempt |
| 19 | Shared blob cleanup | delete only at zero live refs, marker/class match, superseded age at least 365 days, no hold and complete per-ref authorization chain | M4 retention + live refs | retained/deleted evidence |

### Таблица 5. Readiness

Объявленные корпуса: `C_all` — все M2 rows; `C_live` — current tips по lifecycle join;
`L_proposed` — все intents с durable proposedRecordId во всех состояниях, включая
`FAILED` и reconciliation; `C_managed` — rows, чьи ids встречаются в `L_proposed`;
`C_legacy=C_all\C_managed`; `A_all` — весь audit.

State-indexed cardinality для каждого intent из `L_proposed`: до
`STORED_PENDING_REGISTRY` — zero row / zero FD-1 object; в `STORED_PENDING_REGISTRY` —
zero row / exactly one verified FD-1 object; в `COMMITTED` — exactly one row / exactly one
verified FD-1 object / exactly one durable binding. `FAILED` не исключает intent из корпуса:
reconciliation допускает только наблюдаемые crash-snapshots zero/zero, zero/one или one/one
при отсутствующей binding, запрещает one/zero и обязана привести intent к одной из
предыдущих согласованных cardinalities либо к терминальному reject без row/object.

| Gate | Machine predicate | Evidence | Fail result |
|---|---|---|---|
| Schema | every `r in C_all` satisfies exact M2 schema/types | full `C_all` schema report | NO-GO |
| Atomicity | every committed intent maps to exactly one row in `C_managed` and one verified FD-1 object; every committed managed row maps back | exact bidirectional join | NO-GO |
| Replay | every key has <=1 fingerprint and <=1 recordId; replay corpus/property test has no duplicate append | full ledger + crash/replay test | NO-GO |
| Hash/size | for every `r in C_live`, recomputed hash and size equal row values | full `C_live` recomputation, not sample | NO-GO |
| Class/quota | for every active collection, distinct live refs derive `U_c`; every admitted intent proves `U_c+logical_delta<=Q_c` | full lifecycle join + quota ledger | NO-GO |
| Capacity | every admitted write proves `free_after>=12 GiB` and `utilisation_after<0.90` after physical_delta | FD-1 metrics per admitted intent | NO-GO |
| Reconciliation | every `L_proposed` intent, including `FAILED`, satisfies its state-indexed row/object/binding cardinality; a one/one crash-snapshot completes binding, zero/one safely appends once or retains for repair, one/zero is corruption; all `C_managed` rows join back | full ledger/registry/FD-1 three-way diff over every state | NO-GO until repair completes |
| Legacy gap | every `r in C_legacy` is explicitly `legacy_uncovered`; none has synthetic binding | uncovered set equals `C_legacy` | production intake NO-GO |
| M3 bypass | every successful data/ref access has matching prior exact Panel allow/object/version | full access/audit join + bypass probe | NO-GO |
| Preview isolation | every preview source has read-bytes allow; injected preview failure never mutates original | full preview log + fault test | NO-GO |
| Archive safety | every extraction and component intake records **64 MiB / 10:1 / 256 / depth 2** plus traversal/symlink PASS | full archive operation log + fixtures | NO-GO |
| FD-2 RPO | `now-cut_at<=24h` for every admitted intake, whether FD-2 is reachable or not; unreachable but fresh yields `degraded_fd2`, any stale checkpoint yields `fd2_checkpoint_stale` and NO-GO | checkpoint log joined to intake time | NO-GO intake |
| Audit redaction | no entry in `A_all` contains raw ref/path/key/content; action belongs to M3 and matches operation row | full log schema/content scan | NO-GO |
| Orphan cleanup | every zero-row/one-object candidate is reported as `orphan_detected`; manual review proves exact class-aware ref, ownership marker and zero live refs; cleanup creates no synthetic M2 row or lifecycle event | full orphan report + review/dry-run | NO-GO cleanup |
| Registered deletion | every registered-object delete proves zero live refs, matching owner marker and class namespace, superseded age at least 365 days, no unmatched hold, and a complete per-ref M4 deletion authorization chain; `move-address` never deletes source bytes | full registered cleanup log/dry-run | NO-GO |
| M5 projection | every Affine/preview access has valid binding + exact Panel allow; absence leaves container operations intact | full projection access join + failure injection | NO-GO projection, container remains |

Текущее измеренное состояние честно **NO-GO для production intake**: двенадцать legacy rows
не имеют принятого M6 ledger evidence, а текущий office VDS уже закрыт M4 как storage NO-GO.
Это readiness result, не скрытая задача миграции.

## Список посылок

- M1: контейнер принимает originals как конкретные bytes; Affine и preview — сменные поверхности, не source of truth.
- M1: файл/архив регистрируется целиком; component получает отдельную запись только при независимом поступлении или фактическом предоставлении M6.
- M2: registry rows immutable/append-only; обязательны id, sha256, positive integer bytes, addedAt, string source и location; optional supersedes, sensitive.reason, string about, measured.
- M2: canonicalRef выводится из rootId; duplicate bytes не сливает records/lineages; revision продолжает lineage; address move создаёт новую row.
- M2: registry — truth registration/identity/history; location — заявление, reachability — внешнее состояние, content — независимое доказательство.
- M3: closed actions — discover, read-metadata, read-ref, read-bytes, download, write-metadata, upload-revision, manage-access; objects — container, collection, lineage.
- M3: read-metadata не выдаёт location.ref; ref, bytes и download проверяются раздельно; unknown action/object/version fails closed.
- M4: FD-1 primary bytes, FD-2 complete backup, FD-3 registry/lifecycle; exact quota/capacity, hash/size, restore/RPO/RTO and class-scoped storage are binding.
- M5: Affine is optional projection behind Panel allow and valid binding; engine absence does not erase container identity, bytes, authority or history.
- Фактура: `docs/evidence/registry.jsonl` содержит 12 local rows; verify 06.08 нашёл hash mismatch, unreachable superseded row и duplicate hash groups; CLI/README предшествуют M2-M5.
- Ограничения повестки: один E1/carrier, пять таблиц, 14+ cases, полный ролевой корпус, M7/production migration/live rows не исполняются, неизмеренное состояние даёт NO-GO.

## Definition of Done

- [x] Выбран один исполнимый operation/state/commit contract мастерской
- [x] M2 identity, M3 authority, M4 storage и M5 сменность Affine сохранены
- [x] Intake atomicity, idempotency, crash recovery и reconciliation определены
- [x] Sensitivity, verification dimensions, preview и archive safety разведены
- [x] Пять обязательных таблиц и не меньше 14 cases заполнены
- [x] Readiness имеет machine predicates, evidence и честный NO-GO
- [x] M7, production migration и текущие rows не исполнены
- [x] Один carrier, один E1, посылки перед последней секцией DoD
- [ ] Не меньше 36 ролевых реплик и не меньше шести от каждой роли — внешний аудит
