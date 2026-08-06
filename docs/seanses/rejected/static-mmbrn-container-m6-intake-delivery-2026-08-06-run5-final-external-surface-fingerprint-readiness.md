<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-08-06T15:57:02.542Z |
| Команда | `yarn consilium` |
| Модель | xai/grok-4.5 |
| Файл | `docs/seanses/static-mmbrn-container-m6-intake-delivery-2026-08-06.md` |
| Порядок ролей | Математик → Музыкант → Teamlead → Структурщик → Архитектор → Верстальщик |
| Повестка | `docs\meeting\static-mmbrn-container\M6_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs\meeting\static-mmbrn-container\M6_AGENDA.md` | 11894 | `003b6760a088` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs\meeting\static-mmbrn-container\M6_AGENDA.md` | 11894 · 1 п. | `003b6760a088` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --no-memory --min-replies 42 --seed 563`

**Вопрос:**

E1 — финальная внешняя попытка M6. Выберите один исполнимый контракт строго по повестке run1-run4: closed table, literal M2 content/bytes/types/kinds/CAS, exact one M3 action+object and audit action, canonical M4 quota/capacity/RPO, durable exact recovery/reconciliation including legacy gap, two-operation archive flow with four repeated constants, write-time redaction and premises containing no selected M6 conclusions; M2-M5 сохранить, M7 не решать; один carrier.

---

# Консилиум: M6 — контракт приёма и выдачи вещдоков

**Повестка:** E1 — один минимальный исполнимый контракт мастерской вещдоков для полного цикла приёма и разрешённой выдачи: от недоверенных bytes и заявленных metadata до immutable M2 record, проверяемой достижимости, preview/read/download и аудита. Operation surface, state machine, commit/idempotency, error taxonomy, readiness gates. M2–M5 сохранить; M7 не решать; carrier — `docs/seanses/static-mmbrn-container-m6-intake-delivery-2026-08-06.md`.

**Участники:** Teamlead (Tarasov), Архитектор (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Математик → Музыкант → Teamlead → Структурщик → Архитектор → Верстальщик

---

[Математик]: Фиксирую инварианты до поверхности. Idempotency: `(principal, intentId) → ≤1 fingerprint ∧ ≤1 recordId`. Content-duplicate ≠ intent-retry: одинаковый `sha256` при новом `intentId` даёт новую M2 row и новый lineage root. CAS на revision: `supersedes = expectedCurrentTip`; fork запрещён численно, не политикой UI. M4 admission буквально: `U_c + logical_delta ≤ Q_c`; после physical delta `free_after ≥ 12 GiB ∧ utilisation_after < 0.90`. Резерва 1 GiB нет.

[Музыкант]: Preview — derived stream, не канон. Ошибка/отсутствие preview не трогает original bytes и registry tip. Для выдачи звучит как отдельный gate на `read-bytes` с class-preserving projection: sensitive остаётся sensitive, cache не становится truth. Прямой Affine/storage bypass — сразу fail, как клиппинг на выходе.

[Teamlead]: Планка run5: один carrier, одна E1-модель, без M7. Берём closed operation table, ledger-before-append, commit = verified FD-1 + safe registry append + durable COMMITTED binding. Legacy 12 rows — evidence, не migration batch. Связка: Математик держит predicates и reconciliation join; Структурщик — API surface; Архитектор — границы commit; Верстальщик — exposure caller без ref leak; Музыкант — preview isolation. Ролевой DoD наружу не закрываем.

[Структурщик]: Логический API один для CLI и server adapter. Имена операций — словарные статьи, не синонимы CLI. Предлагаю surface: `intake`, `revise`, `list-container`, `list-lineage`, `read-metadata`, `read-ref`, `read-bytes`, `download`, `preview`, `extract-archive`, `intake-archive-component`, плюс verify-измерения отдельными `verify-*`. До любого object-gate: `recordId → canonicalRef + tip + policy/object version`. Transport не проектируем.

[Архитектор]: Граница commit жёсткая: registry не ссылается на недописанный object; orphan/quarantine молча registered быть не может. Attempt, M2 row и lifecycle event — три разных носителя, не одна каша. Location kind ∈ {`local`,`affine`,`url`,`archivarius`}; class ≠ kind. M5 Affine остаётся optional projection за Panel allow + valid binding. Форма: intake pipeline → immutable append → read gates по M3.

[Верстальщик]: Caller exposure — конструкция, не декорация. `read-metadata` никогда не отдаёт `location.ref`. Not-found одинаков по форме для deny и absence, без leak existence sensitive path. Preview failure показывает честный non-authoritative status, original card не краснеет. Audit redaction at write: в лог не попадают raw ref/path/key/bytes.

[Математик]: Fingerprint = `sha256(content) || bytes || class || declaredMediaType`. Ledger до append хранит `{principal, intentId, fingerprint, proposedRecordId, class, collectionId}`. Recovery после crash: если COMMITTED binding есть — вернуть существующий recordId; если bytes на FD-1 verified, а append нет — доиграть append один раз по proposedRecordId; если bytes нет — cleanup только unreferenced orphan с ownership marker. Referenced bytes recovery не удаляет.

[Музыкант]: Архив — целый файл на intake. Extraction — операция чтения archive-lineage (`read-bytes`), не silent unpack в registry. Component intake — отдельный `upload-revision` в collection с provenance на archive record. Лимиты fail-closed: max member 64 MiB, ratio 10:1, entries 256, depth 2. Все четыре константы — в operation, case и readiness, иначе бомба пройдёт как «формат ок».

[Teamlead]: Четыре константы архива принял: 64 MiB / 10:1 / 256 / depth 2 — повторить трижды в таблицах. FD-2 unavailable: intake только при `now - cut_at ≤ 24h`, иначе NO-GO; FD-1 reads допустимы. Это degraded mode, не «почти production». Не чиним 12 rows здесь.

[Структурщик]: `revise` покрывает revision content, metadata correction и address move — всё через новый id, тот же root/canonicalRef, `supersedes=expectedCurrentTip`. Отдельных upsert-операций нет. `list-container` = discover на container object; `list-lineage` = discover на lineage object — разные строки таблицы, разные audit object. `intake` и `revise` оба мутируют через `upload-revision` / write path, но input identity разный: raw bytes vs tip+delta.

[Архитектор]: Sensitivity authority — caller declaration + Panel policy; unknown class → hold/fail до durable write. Classification выбирает M4 class-scoped key и quota bucket, но не пишется в `location.kind`. Sensitive ref живёт в registry row; скрытие — только M3 action gate на `read-ref`/`read-bytes`/`download`. Payload field имени M2: `content` (не blob/body); size field — `bytes` positive integer; `bytes_size` запрещён.

[Верстальщик]: Outcomes для UI: machine-readable code + retryable flag + safe exposure. Hash-mismatch и unreachable — разные классы, нельзя склеить в «ошибка файла». Preview isolation: UI бейдж «derived» обязателен в контракте результата, чтобы cache-as-truth не пролез через привычку верстки.

[Математик]: Verify dimensions — ортогональные предикаты, `unknown ≠ PASS`:
1. `verify-schema` — shape/types/required M2 fields;
2. `verify-reachability` — location resolver;
3. `verify-integrity` — sha256/bytes match content;
4. `verify-durability` — FD-1/FD-2 evidence по M4;
5. `verify-authorization` — Panel decision на action;
6. `verify-portability` — class namespace + key scope + non-local transfer readiness.
Live tip vs historical row: historical не переписывается; status row-scoped.

[Музыкант]: Preview operation = M3 `read-bytes` на original/tip с result class `derived-preview`. Никакого отдельного выдуманного action. Если engine (Affine или иной) отсутствует — outcome `preview_unavailable`, original не меняется. Это стык с M5: сменность поверхности, не source of truth.

[Teamlead]: Audit: `operation` = имя surface (`verify-integrity`, `intake`, …); поле `action` = ровно M3 action колонки таблицы. Выдуманных actions нет. Write-time redaction обязательна — иначе BLOCK на приёмке. Reconciliation — exact bidirectional join по `recordId`/`fingerprint`/`ref`, не counts. Legacy без ledger evidence → `uncovered` → readiness NO-GO, не fake binding.

[Структурщик]: State machine черновик состояний: `RECEIVED` → `FINGERPRINTED` → `CLASSIFIED` → `ADMITTED` → `STORED` → `REGISTERED`/`COMMITTED`; ветки `HELD`, `QUARANTINED`, `REJECTED`, `FAILED`. Entry predicates численные/булевы. Orphan cleanup смотрит exact class-aware ref + ownership marker + M4 live refs; shared blob не удаляется; class namespaces не склеиваются; registry row не в deletion chain.

[Архитектор]: Commit point один: переход в `COMMITTED` только после (a) verified FD-1 object existence+hash, (b) safe append-only registry row, (c) durable ledger binding intent→recordId status=COMMITTED. До этого caller при timeout получает `outcome_unknown` и обязан replay тем же `intentId`. Повтор с другим fingerprint на том же intentId → `intent_fingerprint_conflict`, history failed attempts не стирается.

[Верстальщик]: Case metadata allow / ref-bytes-download deny должен быть виден в UI как три раздельных замка, не один traffic-light. Иначе оператор «откроет файл» через привычную зелёную метку metadata. Конструктивизм: три индикатора gate, tabular status.

[Математик]: Quota predicate evidence на одном объявленном corpus C: измерить `U_c`, `Q_c`, `logical_delta`; проверить `U_c + logical_delta ≤ Q_c`. Capacity: `free_after ≥ 12 GiB ∧ utilisation_after < 0.90`. Live scope = lifecycle join, не «все файлы диска». Malware/format checks до durable write; fail → `QUARANTINED`/`REJECTED`, не partial register.

[Музыкант]: Direct storage/Affine bypass case: любой путь без Panel allow + operation surface → deny + audit `m3_bypass_blocked`. Это не warning. Для archive extraction path traversal и symlink escape — reject до component intake. Component record до выдачи обязан иметь string `source` и `about` (provenance к archive id).

[Teamlead]: Операции verify: audit `operation=verify-*`, action = M3 колонки (обычно `read-metadata` или `discover` для schema/list-side; для bytes-side — `read-bytes`/`read-ref` по смыслу измерения). Не плодим `verify` как M3 action. Идемпотентность retry failed intent: новая попытка с тем же intentId после FAILED допустима только если fingerprint совпал и commit не был; история attempt rows append-only.

[Структурщик]: Input identity:
- `intake`: principal + intentId + content bytes + declared metadata/class;
- `revise`: principal + intentId + expectedCurrentTip + content-or-metadata-patch + class;
- list/read/download/preview/verify: recordId или canonicalRef + optional generation;
- archive extract: archive recordId + member path (logical);
- component intake: archive recordId + member path + new intentId + content (re-hashed).
Result classes: `record`, `recordList`, `metadata`, `ref`, `bytes`, `derived-preview`, `verifyReport`, `outcome`.

[Архитектор]: M2 literal: обязательные `id`, `sha256`, `bytes`, `addedAt`, `source`, `location{kind,ref}`; optional `supersedes`, `sensitive.reason`, `about`, `measured`. `source`/`about` — строки. Revision/metadata/move: новый `id`, прежние root/canonicalRef, `canonicalRef = "urn:mmbrn:static:" + rootId`. Duplicate bytes независимое поступление — новый root, без merge. Address move — тот же hash, новый location в новой row.

[Верстальщик]: Not-found exposure: `{code:"not_found", retryable:false}` без hint «существует но deny». Deny с правом знать — отдельно `forbidden` только когда discover уже показал existence через authorized `list-*`. Иначе единый not_found. Это a11y смысла для оператора и security boundary одновременно.

[Математик]: Reconciliation algorithm: build set R from registry recordIds; L from ledger COMMITTED; S from storage refs with ownership markers. Join exact: R↔L on recordId, L↔S on fingerprint/ref, R↔S on location.ref. Uncovered legacy ∈ R \ L → flag `legacy_uncovered` → gate NO-GO for production intake until explicit out-of-band binding policy (не в M6 fake). Counts equality не доказательство.

[Музыкант]: Поток приёма «bytes к нам, потом опись» из README совместим как порядок, но identity model — только M2. CLI fields coincidence — не разрешение вернуть old model. Preview/OCR не обязателен для всех media — только best-effort derived path.

[Teamlead]: Закрываем споры: одна модель — **Ledgered Intake + Gated Delivery (LIGD)**. Нет второй поверхности. Cases ≥19 строк. Readiness — machine predicates, неизмеренное = NO-GO. M7 DNS/Caddy/rollout/82 pages — молчим. Вердикт готовлю после таблиц; роли подтверждают LIGD явно.

[Структурщик]: Mutation column: только `intake`, `revise`, `intake-archive-component` делают durable mutation (ledger+FD-1+registry). `extract-archive` — read side effect max temp quarantine scrubbed, без registry write. Verify/list/read/preview/download — no registry mutation. Side effect audit always append-only event, redacted.

[Архитектор]: Error taxonomy closed: `accepted`, `duplicate_intent`, `intent_fingerprint_conflict`, `rejected_class_unknown`, `rejected_quota`, `rejected_capacity`, `rejected_malware`, `rejected_format`, `rejected_cas`, `quarantined`, `outcome_unknown`, `not_found`, `forbidden`, `hash_mismatch`, `unreachable`, `schema_invalid`, `preview_unavailable`, `archive_limit`, `m3_bypass_blocked`, `degraded_fd2_nogo`, `legacy_uncovered`, `conflict_shared_cleanup`. Retryable только где указано.

[Верстальщик]: Для download vs read-bytes: разные M3 gates и разные audit actions; UI подписи разные («просмотр» vs «скачать»). Ref button отдельный и по умолчанию скрыт без `read-ref`. Это закрывает ref leakage через «скопировать ссылку» в card menu.

[Математик]: Докажу atomicity gate: ∄ registry row with missing FD-1 object for COMMITTED ledger bindings; ∄ second recordId for same (principal,intentId). Evidence: property test replay 10³ intents + crash injection before/after append. Cleanup gate: delete candidate ref only if ¬∃ live M4 ref in lifecycle join ∧ ownership marker = attemptId ∧ class namespace matches.

[Музыкант]: Archive case: extract с path `../../etc/passwd` → `archive_limit`/`rejected_format`; component не регистрируется. Bombs: uncompressed ratio > 10:1 или entries > 256 или depth > 2 или member > 64 MiB — fail-closed до bytes emit. Повторю константы: 64 MiB, 10:1, 256, depth 2.

[Teamlead]: LIGD принят как единственная пропозиция E1. Дальше — таблицы и cases. Кто против формы — сейчас; после таблиц только «Принимаю». Структурщик оформляет Operations; Математик — State/Readiness predicates; Архитектор — Outcomes/Commit; Верстальщик сверяет exposure; Музыкант — archive/preview rows.

[Структурщик]: Operations table — одна закрытая. Container list и lineage list разведены. Verify — шесть строк по измерениям. Preview row: action=`read-bytes`. read-ref result = только `location.ref`. Имена стабильны для CLI verb и server method одинаково.

[Архитектор]: Посылки после решения — только M1–M5, фактура, agenda constraints; никаких «мы выбрали 64 MiB» внутри списка посылок. DoD — последняя секция, чекбоксы открыты. Carrier path единственный. Рекомендую фиксировать LIGD в итоговом блоке с пятью таблицами.

[Верстальщик]: Cases 13–14 и 16 критичны для UI-контракта: metadata allow при bytes deny; preview failure; bypass. Вещдок — outcome code + audit without raw path. Принимаю LIGD при сохранении трёх раздельных gate-индикаторов в result metadata для card.

[Математик]: Shared blob cleanup case: два recordId → один sha256/ref; cleanup attempt на orphan path одного intent не drop'ает ref, пока live join держит второй. Predicate: `live_ref_count(ref, class_ns) == 0` before delete. Принимаю LIGD.

[Музыкант]: Принимаю LIGD. Preview non-authoritative + archive four constants + bypass deny — мои красные линии закрыты в таблицах.

[Teamlead]: Сводное: LIGD = closed surface + ledgered commit + M3 gated delivery + exact reconciliation + degraded FD-2 rule. Принимаю. Пишем итог. LGTM на протокол при заполненных пяти таблицах и ≥19 cases; исполнение кода/M7 — вне комнаты.

[Структурщик]: Принимаю LIGD. Словарь операций замкнут; слабая связанность Panel/M3 ↔ storage/M4 ↔ registry/M2 ↔ Affine/M5 соблюдена через gate, не через shared mutable store.

[Архитектор]: Принимаю LIGD. Границы M1–M5 не сдвинуты; commit point один; M7 не открыт. Форма решения достаточна для carrier.

[Верстальщик]: Принимаю LIGD. Exposure и redaction зафиксированы; после DoD текста не будет.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| E1 модель | **LIGD** — Ledgered Intake + Gated Delivery |
| Carrier | `docs/seanses/static-mmbrn-container-m6-intake-delivery-2026-08-06.md` (единственный) |
| M2/M3/M4/M5 | Сохранены буквально; M7 не решается |
| Commit | verified FD-1 + safe registry append + durable ledger COMMITTED binding |
| Idempotency | `(principal, intentId) → ≤1 fingerprint ∧ ≤1 recordId` |
| Archive | две операции; лимиты 64 MiB / ratio 10:1 / 256 entries / depth 2 |
| FD-2 degraded | intake iff `now - cut_at ≤ 24h`, иначе NO-GO; FD-1 reads ok |
| Verdict | **Принято** единогласно шестью ролями |

### Модель LIGD (нормативная)

**Порядок intake (write path):** untrusted bytes → hash/size → malware/format → class ∈ {standard, sensitive+reason} (unknown→hold/fail) → collection quota `U_c + logical_delta ≤ Q_c` → capacity `free_after ≥ 12 GiB ∧ utilisation_after < 0.90` → class-scoped key → store FD-1 → verify hash/bytes on storage → ledger binding intent/fingerprint/proposedRecordId → append M2 row → durable COMMITTED. Attempt, M2 row, lifecycle event не смешиваются.

**CAS revise:** новый `id`, same root/`canonicalRef`, `supersedes=expectedCurrentTip`; content field payload name = `content`; `bytes` = positive integer size.

**Delivery:** до gate `recordId → canonicalRef + tip + policy/object version`; отдельные M3 actions на metadata/ref/bytes/download; preview = derived `read-bytes`; no storage/Affine bypass.

**Recovery:** crash до commit → replay same intentId; после COMMITTED → return same recordId; cleanup unreferenced only with class-aware ref + ownership marker + M4 live join; shared blob retained; recovery never deletes referenced bytes.

**Reconciliation:** exact bidirectional join recordId/fingerprint/ref; legacy without ledger → `legacy_uncovered`/NO-GO.

**Audit:** write-time redaction (no raw ref/path/key/bytes); `action` = exact M3; M3 decision + M4 evidence explicit.

### Таблица Operations

| operation | M3 action | input | result | mutation | audit evidence |
|-----------|-----------|-------|--------|----------|----------------|
| `intake` | `upload-revision` | principal, intentId, content, metadata, class, collectionId | record \| outcome | ledger+FD-1+registry append | principal, intentId, fingerprint, proposedRecordId, action, M3 decision, M4 class/quota, recordId |
| `revise` | `upload-revision` | principal, intentId, expectedCurrentTip, content\|metadata-patch, class | record \| outcome | new M2 row+CAS | + supersedes, casResult, canonicalRef |
| `list-container` | `discover` | principal, containerId, policyVersion | recordList | none | action=discover, object=container, count |
| `list-lineage` | `discover` | principal, canonicalRef\|rootId | recordList | none | action=discover, object=lineage, tip |
| `read-metadata` | `read-metadata` | principal, recordId | metadata (no location.ref) | none | action, recordId, allow/deny |
| `read-ref` | `read-ref` | principal, recordId | `{location.ref}` only | none | action, recordId, allow/deny (ref redacted in audit) |
| `read-bytes` | `read-bytes` | principal, recordId | content bytes | none | action, recordId, bytes, sha256, allow/deny |
| `download` | `download` | principal, recordId | content bytes + disposition | none | action=download, recordId, bytes |
| `preview` | `read-bytes` | principal, recordId, previewProfile | derived-preview \| preview_unavailable | none | operation=preview, action=read-bytes, derived=true |
| `extract-archive` | `read-bytes` | principal, archiveRecordId, memberPath | member bytes (temp) \| outcome | no registry write | operation=extract-archive, action=read-bytes, limits 64MiB/10:1/256/depth2 |
| `intake-archive-component` | `upload-revision` | principal, intentId, archiveRecordId, memberPath, content, source, about | record \| outcome | full intake mutation + provenance | + archiveRecordId, source, about, same archive limits |
| `verify-schema` | `read-metadata` | principal, recordId | verifyReport | none | operation=verify-schema, action=read-metadata |
| `verify-reachability` | `read-ref` | principal, recordId | verifyReport | none | operation=verify-reachability, action=read-ref |
| `verify-integrity` | `read-bytes` | principal, recordId | verifyReport | none | operation=verify-integrity, action=read-bytes |
| `verify-durability` | `read-metadata` | principal, recordId | verifyReport | none | operation=verify-durability, action=read-metadata, M4 evidence |
| `verify-authorization` | `discover` | principal, recordId, targetAction | verifyReport | none | operation=verify-authorization, action=discover, targetAction |
| `verify-portability` | `read-metadata` | principal, recordId | verifyReport | none | operation=verify-portability, action=read-metadata, class/key scope |

### Таблица State machine

| state | entry predicate | allowed transition | durable evidence | recovery |
|-------|-----------------|--------------------|------------------|----------|
| `RECEIVED` | bytes buffer accepted, intentId reserved | → FINGERPRINTED \| FAILED | attempt row | drop buffer if expired attempt |
| `FINGERPRINTED` | sha256+bytes computed; fingerprint fixed | → CLASSIFIED \| FAILED | attempt.fingerprint | replay same fingerprint only |
| `CLASSIFIED` | class∈{standard,sensitive+reason} | → ADMITTED \| HELD \| REJECTED | attempt.class | unknown → HELD/fail-closed |
| `HELD` | class unknown OR policy hold | → CLASSIFIED \| REJECTED | hold reason | manual class OR reject |
| `ADMITTED` | quota&capacity predicates true; malware/format pass | → STORED \| QUARANTINED \| REJECTED | M4 admission evidence | re-check quota on resume |
| `QUARANTINED` | malware/format fail | → REJECTED | quarantine ticket | never auto-register |
| `STORED` | FD-1 object verified hash/bytes | → COMMITTED \| FAILED | storage ref + verify receipt | keep bytes; retry append |
| `COMMITTED` | registry appended ∧ ledger COMMITTED | terminal success | M2 row + binding | return recordId on replay |
| `REJECTED` | hard fail before commit | terminal | attempt final status | new intentId for new try; same intent retry rules |
| `FAILED` | crash/timeout/internal pre-commit | → RECEIVED replay \| REJECTED | attempt failed | reconcile then replay or cleanup orphan |

### Таблица Outcomes

| code/class | meaning | retryable | caller exposure | audit consequence |
|------------|---------|-----------|-----------------|-------------------|
| `accepted` | COMMITTED record | no | recordId, canonicalRef, metadata per gates | binding COMMITTED |
| `duplicate_intent` | same intentId already COMMITTED | no | existing recordId | replay hit |
| `intent_fingerprint_conflict` | same intentId, different fingerprint | no | conflict | audit conflict; no second record |
| `rejected_class_unknown` | class not standard/sensitive+reason | conditional | code only | hold/reject logged |
| `rejected_quota` | `U_c + logical_delta > Q_c` | later | code, class | M4 quota evidence |
| `rejected_capacity` | free/utilisation gate fail | later | code | M4 capacity evidence |
| `rejected_malware` | malware check fail | no | code | quarantine path |
| `rejected_format` | format/archive structure fail | no | code | no bytes register |
| `rejected_cas` | supersedes ≠ tip | yes (refresh tip) | tip observed | cas fail |
| `quarantined` | held in quarantine | no | ticket id | not registered |
| `outcome_unknown` | timeout; commit unclear | yes (same intentId) | code | reconcile required |
| `not_found` | no authorized existence | no | code | no leak |
| `forbidden` | M3 deny after discoverable existence | no | code, action | M3 deny |
| `hash_mismatch` | integrity fail | no | code, recordId | verify-integrity fail |
| `unreachable` | reachability fail | later | code, recordId | verify-reachability fail |
| `schema_invalid` | M2 shape fail | no | code | verify-schema fail |
| `preview_unavailable` | derived path fail/absent | later | code; original ok | preview isolation |
| `archive_limit` | >64MiB member ∨ ratio>10:1 ∨ entries>256 ∨ depth>2 | no | code, limit | extract blocked |
| `m3_bypass_blocked` | direct storage/Affine path | no | code | security audit |
| `degraded_fd2_nogo` | FD-2 stale >24h on intake | later | code | intake blocked |
| `legacy_uncovered` | registry row without ledger | no | code | readiness NO-GO |
| `conflict_shared_cleanup` | blob still live-referenced | no | code | no delete |

### Таблица Cases

| Случай | Ожидаемое решение | Источник истины | Вещдок |
|--------|-------------------|-----------------|--------|
| 1. новый PDF | `accepted`, new root+record | M2 append + FD-1 | recordId, sha256, bytes |
| 2. те же bytes как новое независимое поступление | new root/record, no merge | M2 identity (no hash merge) | two recordIds, same sha256 |
| 3. retry того же intent | `duplicate_intent` → same recordId | ledger (principal,intentId) | binding |
| 4. новая редакция | new id, same canonicalRef, CAS | M2 supersedes tip | supersedes, tip |
| 5. metadata correction | new id, same bytes/hash, CAS | M2 append-only fields | new row metadata |
| 6. address move | new id, same hash, new location | M2 location statement | location.kind/ref |
| 7. sensitive classification unknown | `rejected_class_unknown` / HELD | class authority fail-closed | attempt hold |
| 8. quota/capacity deny | `rejected_quota` or `rejected_capacity` | M4 predicates | U_c,Q_c,free_after |
| 9. crash до registry commit | no row OR resume to one row; bytes not silent-registered | state machine + ledger | attempt + storage reconcile |
| 10. timeout unknown commit | `outcome_unknown`; replay same intentId | ledger reconcile | COMMITTED∨absent |
| 11. hash mismatch | `hash_mismatch` on verify-integrity | bytes proof vs row | sha256 compute |
| 12. unreachable historical ∧ reachable live tip | historical unreachable; tip ok; history not rewritten | row-scoped reachability | two verifyReports |
| 13. metadata allow, ref/bytes/download deny | metadata ok; others forbidden | M3 per-action | three decisions |
| 14. preview failure | `preview_unavailable`; original intact | M5 derived non-authority | original verify ok |
| 15. archive component | extract read-bytes; intake-archive-component new record with source/about | archive two-op flow | archiveRecordId, limits |
| 16. direct storage или Affine bypass | `m3_bypass_blocked` | M3/M5 gate | audit bypass |
| 17. same intent, other fingerprint | `intent_fingerprint_conflict` | idempotency invariant | ledger fingerprint |
| 18. failed intent retry without erasing history | attempt history append-only; retry rules | attempt log | failed+new attempts |
| 19. shared blob при cleanup | no delete while live ref exists | M4 live join + ownership | live_ref_count>0 |

### Таблица Readiness

| gate | machine predicate | evidence | fail result |
|------|-------------------|----------|-------------|
| atomicity | ∀ COMMITTED binding ∃ FD-1 object ∧ ∃1 M2 row | crash-injection report; join | NO-GO |
| replay/idempotency | replay 10³ same intentId → ≤1 recordId ∧ ≤1 fingerprint | property test log | NO-GO |
| hash/size | stored sha256/bytes == computed | verify-integrity sample | NO-GO |
| class/quota | admission enforces class key ∧ `U_c+Δ≤Q_c` ∧ free/util gates | M4 measure on corpus C | NO-GO |
| registry/storage reconciliation | bidirectional exact join clean on non-legacy | join diff empty | NO-GO |
| legacy gap | legacy rows labeled `legacy_uncovered`; not fake-bound | uncovered set | NO-GO prod intake |
| M3 bypass | no read/write path without Panel action | bypass probe deny | NO-GO |
| preview isolation | preview fail ⇏ original mutate; derived flag set | fault injection | NO-GO |
| archive safety | enforce 64 MiB, 10:1, 256 entries, depth 2 fail-closed | bomb/traversal fixtures | NO-GO |
| degraded FD-2 | intake blocked when `now-cut_at>24h` | cut_at metric | NO-GO intake |
| audit redaction | audit samples contain no raw ref/path/key/bytes | log scan | NO-GO |
| shared cleanup | delete only if live_ref_count==0 ∧ marker ∧ class_ns | cleanup dry-run | NO-GO |

---

## Список посылок

- Контейнер принимает originals как конкретные bytes; Affine и preview — сменные поверхности, не source of truth (M1/M5).
- Единица регистрации — файл/архив целиком; component — только при независимом поступлении или фактическом предоставлении M6 (M1/agenda).
- M2 record append-only с полями id, sha256, positive integer bytes, addedAt, source, location{kind,ref}; optional supersedes, sensitive.reason, about, measured; любая правка поля → новый id (M2).
- canonicalRef = "urn:mmbrn:static:" + rootId; дубль bytes не сливает records/lineages; редакция продолжает lineage; перенос меняет location новой record с прежним hash (M2).
- registry.jsonl — truth регистрации/identity/history; location — заявление; reachability — внешнее состояние; bytes — независимое доказательство (M2).
- Panel авторизует отдельные M3 actions: discover, read-metadata, read-ref, read-bytes, download, write-metadata, upload-revision, manage-access; read-metadata не выдаёт location.ref (M3).
- M4: FD-1 primary bytes, FD-2 complete backup, FD-3 registry/lifecycle; до записи — class-scoped key, capacity/quota admission, hash/bytes verification, fail-closed; office VDS = storage NO-GO (M4).
- M5: Affine — optional projection; обращение требует Panel allow и valid binding; отсутствие движка не отменяет container/registry/bytes/authority (M5).
- Фактура: yarn evidence add/verify/list/inspect/decompose; registry.jsonl 12 rows location.kind=local; verify 06.08: hash-mismatch, unreachable superseded, duplicate hash groups; README «bytes к нам, потом опись»; server API backlog #1303; CLI предшествует M2–M5 (workshop evidence).
- Agenda constraints: один carrier; M7 не решать; не чинить 12 rows/README/CLI/live store в протоколе; не выдавать local reachability за production readiness; five tables; ≥14 cases; premises without selected M6 conclusions; DoD last.
- Run1–run4 binding constraints on literal M2 content/bytes/kinds/CAS, one M3 action per operation row, M4 quota/capacity formulas and 24h FD-2 RPO rule, exact reconciliation including legacy gap, two-operation archive flow with four repeated constants, write-time audit redaction — as closed external budget for this final run.

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
