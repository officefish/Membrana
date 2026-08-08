<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-08-06T15:18:38.947Z |
| Команда | `yarn consilium` |
| Модель | anthropic/claude-sonnet-4-6 |
| Файл | `docs/seanses/static-mmbrn-container-m6-intake-delivery-2026-08-06.md` |
| Порядок ролей | Верстальщик → Архитектор → Структурщик → Математик → Teamlead → Музыкант |
| Повестка | `docs\meeting\static-mmbrn-container\M6_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs\meeting\static-mmbrn-container\M6_AGENDA.md` | 11993 | `e11b107508ec` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs\meeting\static-mmbrn-container\M6_AGENDA.md` | 11993 · 1 п. | `e11b107508ec` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --no-memory --min-replies 42 --seed 457`

**Вопрос:**

E1 — выберите один исполнимый контракт M6 строго по повестке и поправкам run1-run3: единая закрытая operations table с exact M3 action и authority object, literal M2 fields и expected-tip CAS, durable pre-append intent-record recovery, exact M4 collection quota/readiness/RPO, fixed archive constants, write-time audit redaction; сохранить M2-M5, M7 не решать; один carrier.

---

# Консилиум: M6 — контракт приёма и выдачи мастерской вещдоков

**Повестка:** E1 — выбрать один исполнимый контракт M6: закрытая operations table, state machine, commit/idempotency model, error taxonomy, readiness gates. Сохранить M2-M5, M7 не решать.

**Участники:** Верстальщик (Rodchenko), Архитектор (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Teamlead (Tarasov), Музыкант (Kuryokhin).

**Порядок реплик:** Верстальщик → Архитектор → Структурщик → Математик → Teamlead → Музыкант (циклически, ≥42 реплик)

---

[Верстальщик]: Начну с того, что operations surface должна быть закрытым перечнем — вне таблицы нет разрешённых операций. Для каждой нужно точно указать caller intent, один M3 action, authority object. Меня беспокоит gate для preview: по поправкам run1-run3 preview привязан к `read-bytes`, а не к отдельному action. Это означает, что отсутствие preview-движка не отменяет право читать bytes, и UI должен это честно отражать — отдельные состояния «bytes доступны / preview недоступен».

[Архитектор]: Форма операционной поверхности: одна таблица, строго закрытая. Разберём authority object: intake и revision — authority `collection`; list — `collection`; metadata — `lineage`; ref — `lineage`; bytes/download — `lineage`; preview — `lineage`; access — `container` или `lineage` в зависимости от scope `manage-access`. Это вытекает из M3 напрямую. Составной archive flow — это не одна операция с двумя actions: сначала `upload-revision` для архива целиком, потом при фактической выдаче компонента — отдельный intake для component. Автоматической регистрации компонента нет.

[Структурщик]: Зафиксируем, что attempt states живут отдельно от registry rows. Предлагаю три уровня: (1) ephemeral intent-ledger — durable binding `(principal, intentId) → (fingerprint, proposedRecordId, state)`; (2) append-only `registry.jsonl` — только committed rows; (3) append-only lifecycle events — reachability check, verify results. Registry row не мутирует и не удаляется. Это единственная топология, совместимая с M2 и требованием crash recovery через ledger.

[Математик]: Для readiness predicates нужны точные M4 scopes. Обозначим: `U_c` — logical bytes committed в collection; `Q_c` — quota ceiling collection; `Δ_phys` — physical delta до watermark FD-1. Predicate `QUOTA_OK ≡ U_c + bytes_proposed ≤ Q_c`. Predicate `CAPACITY_OK ≡ Δ_phys ≥ bytes_proposed`. Оба должны быть истинны до durable write. Distinct live `(class, sha256)` считается по lifecycle join: row is live iff она — tip своего rootId и не superseded. Неизмеренное состояние даёт NO-GO — без исключений.

[Teamlead]: Стоп. Прежде чем идти в детали: нужно зафиксировать commit point однозначно. Commit = верифицированный FD-1 объект + safe append в `registry.jsonl` + durable binding в ledger обновлён до `COMMITTED`. До append — ledger содержит `(intentId, fingerprint, proposedRecordId, PENDING)`. После G6-success — `COMMITTED`. После G7-fail — `FAILED`, bytes не удаляются (они referenced). Это единственная точка, после которой record существует. Всё остальное — попытка.

[Музыкант]: По архивам: фиксированные константы без «например» — принимаю. Предлагаю: max uncompressed bytes = 2 147 483 648 (2 GiB); max compression ratio check = 100 (если распакованное / заявленное > 100 — bomb, reject); max entries = 65 536; max depth = 16. Extraction fail-closed: любой path с `..`, абсолютным `/`, или нулевым байтом — immediate reject, весь archive intake fails. Provenance component — строка `source` = canonicalRef архива-родителя. `about` — опциональная строка с именем пути внутри архива.

[Верстальщик]: По sensitivity gate в UI: classification unknown — fail-closed, intake holds. Отображение: пользователь видит `HOLD: classification_required`, не видит ref и не видит sensitive.reason если у него нет `read-metadata` с sensitive scope. Audit при этом несёт `decision: HOLD`, `reason: classification_unknown` — без raw path. Это требование write-time audit redaction из run3.

[Архитектор]: Уточню identity для revision. M2 буквально: новый `id`, те же `rootId` и `canonicalRef = "urn:mmbrn:static:" + rootId`, поле `supersedes = expectedCurrentTip`. CAS: при intake revision caller предъявляет `expectedCurrentTip`; если фактический tip ≠ expectedCurrentTip — reject с `CONFLICT`. Fork запрещён. Это не upsert — это новая row с явной ссылкой назад. Metadata correction и address move — тоже новые rows через `write-metadata`, не через mutation существующей.

[Структурщик]: Для idempotency scope: ключ — `(principal, intentId)`. Один intentId → не более одного fingerprint и не более одного recordId. Если повторный запрос с тем же intentId и тем же fingerprint приходит до COMMITTED — ждём или возвращаем текущий state. Если после COMMITTED — возвращаем существующий recordId, 200. Если тот же intentId с другим fingerprint — reject `INTENT_FINGERPRINT_CONFLICT`, history в ledger immutable, новая попытка требует нового intentId. Это случай 17 из обязательных.

[Математик]: RPO для FD-2: predicate `RPO_OK ≡ (now − cut_at) ≤ 86400s`. Если FD-2 unavailable и `now − cut_at > 86400s` — intake NO-GO, reads через FD-1 допустимы. Это точная формула из run3. При intake unavailable из-за FD-2 RPO нарушения — возвращаем `STORAGE_DEGRADED`, retryable=false до восстановления checkpoint. FD-1 reads продолжаются — это отдельный gate.

[Teamlead]: По verify dimensions — их нужно исчерпывающе перечислить в operations table. Каждая dimension — отдельная строка: `verify-schema`, `verify-reachability`, `verify-integrity`, `verify-durability`, `verify-authorization`, `verify-portability`. Для каждой — свой M3 action, свой result, свой audit. `unknown` не PASS ни в одной. Статус reachability не выдаётся за integrity. Проверка live tip и исторической row — разный result class: live tip возвращает current status, historical row возвращает point-in-time evidence без переписывания.

[Музыкант]: Cleanup при failed intake: удаляем exact ref в class-aware namespace FD-1, снимаем ownership marker в ledger. Shared blob — если `(class, sha256)` referenced другой committed row — не удаляем bytes, только снимаем marker текущего intent. Class namespaces не склеиваются: standard и sensitive хранятся раздельно, cleanup в одном не касается другого. Registry row не входит в deletion chain — она не существует до COMMITTED, значит удалять нечего.

[Верстальщик]: Для operations table нужно явно прописать `list`. Caller intent: discovery корпуса. M3 action: `discover`. Authority object: `collection`. Input: collection scope + optional filters. Result: список `{id, canonicalRef, addedAt, tip}` — без `location.ref`, без sensitive.reason. Mutation: нет. Audit: `{principal, action: discover, collection, filter, timestamp, resultCount}` — не список id если sensitive. Это отдельно от `read-metadata` который даёт поля конкретной record.

[Архитектор]: State machine для intake. Состояния: `RECEIVED` → `SCANNING` → `CLASSIFIED` → `QUOTA_CHECKED` → `STORED` → `COMMITTED` | `FAILED` | `HOLD`. Переходы только вперёд, кроме FAILED и HOLD — оба terminal states для данного attempt. HOLD — при classification unknown, ждёт внешнего resolve. Resolve HOLD — новый intake attempt с явной classification, старый attempt остаётся в ledger как HOLD. COMMITTED — единственный state, после которого row существует в registry.

[Структурщик]: Между `STORED` и `COMMITTED` есть критический зазор. Ledger до append содержит `(intentId, fingerprint, proposedRecordId, STORED_PENDING_REGISTRY)`. Если crash здесь — recovery читает ledger, находит STORED_PENDING_REGISTRY, проверяет: есть ли row с proposedRecordId в registry? Нет — выполняет safe append (идемпотентно по proposedRecordId). Да — переводит в COMMITTED. Байты не удаляются в любом случае. Это точная recovery процедура из run3.

[Математик]: Для predicate atomicity в readiness: `ATOMIC_OK ≡ ∀ intent in ledger where state=STORED_PENDING_REGISTRY: registry.contains(proposedRecordId) OR append_safe(proposedRecordId)`. Это проверяемый предикат при reconciliation run. Reconciliation периодически сканирует ledger, находит незавершённые STORED_PENDING_REGISTRY старше timeout threshold, выполняет recovery или помечает FAILED если FD-1 object не найден. Threshold — фиксировано: 300 секунд.

[Teamlead]: По error taxonomy — нужен закрытый список machine-readable codes. Предлагаю классы: `OK` (success), `ACCEPTED` (async, идемпотентный повтор), `CONFLICT` (CAS fail — не retryable), `DENIED` (M3 gate — не retryable без изменения policy), `HOLD` (classification unknown — retryable после resolve), `QUOTA_EXCEEDED` (не retryable без изменения quota), `STORAGE_DEGRADED` (retryable после восстановления), `HASH_MISMATCH` (не retryable — иной fingerprint), `INTENT_FINGERPRINT_CONFLICT` (не retryable — нужен новый intentId), `ARCHIVE_UNSAFE` (не retryable), `NOT_FOUND` (не создаёт existence leak), `SCHEMA_INVALID` (не retryable). Вне этого списка — `INTERNAL_ERROR`, retryable=unknown.

[Музыкант]: По preview изоляции: preview — derived, non-authoritative. Failure preview не меняет original и не меняет registry. Preview запрашивает `read-bytes` gate — тот же M3 action что и bytes. Если Affine binding отсутствует или недоступен — возвращаем `PREVIEW_UNAVAILABLE`, original не затронут. Preview cache — не source of truth, при расхождении cache invalidate, original wins. Affine bypass напрямую — запрещён, только через M6 delivery gate с M3 check.

[Верстальщик]: Audit redaction — критично. Audit record при write-time: никогда не хранит raw ref, path, key, bytes. Хранит: `{auditId, timestamp, principal, intentId, action, collectionId, recordId_proposed, recordId_committed, m3Decision, m4Evidence: {fd1_verified: bool, fd2_rpo_ok: bool, fd3_appended: bool}, sensitiveFlag: bool}`. Если not-found — audit несёт только `{action, principal, timestamp, m3Decision: DENIED}` без указания искомого id. Это предотвращает existence leak.

[Архитектор]: Для duplicate bytes (случай 2): те же bytes, новый независимый intake intent, новый intentId. Результат — новая M2 row с новым id, новым rootId, новым canonicalRef. `sha256` совпадает — это факт совместимости bytes, не слияние lineages. Duplicate hash группы в текущих 12 rows — evidence того, что это уже происходило. Lineage вывести из hash нельзя. Автоматического слияния нет.

[Структурщик]: Для `manage-access` — важно зафиксировать: эта operation не изменяет M2 record и не изменяет state объекта. Она изменяет policy в M3 authority store. Authority object — `container` для global scope, `lineage` для lineage-scoped policy. Input — principal + action grants. Result — updated policy version. Mutation — только policy store. Audit — `{principal, action: manage-access, object, grants_changed, policyVersion}` без ref или bytes.

[Математик]: Для verification operations — каждая dimension имеет точный predicate. `verify-integrity`: `computed_sha256(bytes_at_fd1_ref) == registry_row.sha256`. `verify-reachability`: `fd1_ref_resolvable AND bytes_readable`. `verify-durability`: `fd1_verified AND fd2_rpo_ok AND fd3_row_present`. `verify-portability`: `location.kind ∈ {server, git-lfs, s3}` — local kind не portable, returns `NOT_PORTABLE`. `verify-authorization`: M3 gate check для calling principal против requested action. `verify-schema`: row fields match M2 spec, `bytes > 0`, required fields present.

[Teamlead]: Случай 9 — crash до registry commit. Recovery: ledger содержит STORED_PENDING_REGISTRY. Reconciliation находит запись, проверяет FD-1 object по fingerprint. Объект есть — выполняет append с proposedRecordId, переводит ledger в COMMITTED. Объект нет — переводит в FAILED, cleanup ownership marker. В обоих случаях history в ledger immutable — запись о попытке остаётся. Случай 10 — timeout unknown outcome: caller получил `INTERNAL_ERROR` или сеть упала. Caller повторяет с тем же intentId — получает текущий state из ledger: COMMITTED → 200 с recordId; PENDING/STORED_PENDING → 202 retry later; FAILED → 4xx с причиной.

[Музыкант]: По случаю 11 — hash mismatch: bytes получены, вычисленный sha256 ≠ заявленному в metadata. State → FAILED немедленно. Bytes в quarantine на 24h для forensic, затем purge. Ledger: `HASH_MISMATCH`. Audit: `{action: upload, intentId, m3Decision: FAILED, reason: hash_mismatch, computed_hash_redacted: true}` — computed hash в audit не хранится, только факт mismatch. Retry требует нового intentId с корректным sha256.

[Верстальщик]: Случай 13 — metadata allow при ref/bytes/download deny. Caller имеет `read-metadata` но не имеет `read-ref`, `read-bytes`, `download`. Возвращаем metadata fields без `location.ref`. `location.ref` — only with `read-ref`. Bytes — only with `read-bytes`. Download link — only with `download`. Три отдельных gates, три отдельных audit records. Ни один из них не раскрывает информацию другого gate. UI показывает locked-state для недоступных actions без указания причины deny.

[Архитектор]: Случай 16 — direct storage bypass или Affine bypass. Любой запрос к FD-1 storage или Affine минуя M6 operation gate — запрещён архитектурно. M6 — единственная точка входа. Если обнаруживается direct access — это нарушение boundary M1. Audit этого нарушения — не в M6 audit log, а в storage access log (FD-1 level). M6 контракт не обязан это обрабатывать, но storage layer должен возвращать 403 без M6 token.

[Структурщик]: Случай 19 — shared blob при cleanup. Cleanup triggered by FAILED intent. Проверяем: есть ли другая COMMITTED row с тем же `(class, sha256)`? Если да — bytes shared, не удаляем FD-1 object, только снимаем ownership marker текущего intent. Если нет — удаляем FD-1 object, снимаем marker. Class namespaces: standard blob и sensitive blob — разные physical locations, cleanup в standard не касается sensitive даже при совпадении sha256. Registry row для другой committed record — неприкосновенна.

[Математик]: Readiness gate для M3 bypass protection: predicate `NO_BYPASS ≡ ∀ delivery_request: m3_token_present AND m3_check_passed BEFORE any FD-1 access`. Evidence: access log token audit trail. Если token absent — DENIED, no FD-1 call made. Это measurable: access log строки без preceding m3 check — fail evidence. Unmeasured state → NO-GO по определению.

[Teamlead]: По readiness для degraded mode: если FD-2 RPO нарушен — intake NO-GO, но reads через FD-1 продолжаются. Predicate: `READS_OK ≡ fd1_reachable AND fd1_integrity_verified`. Degraded mode audit: все intake attempts в degraded state logged с `{storageState: FD2_RPO_EXCEEDED}`. Это не молчаливое продолжение — это явный degraded state с audit evidence. Recovery из degraded — только после FD-2 checkpoint восстановлен и `now − new_cut_at ≤ 86400s`.

[Музыкант]: Случай 15 — archive component. Archive принят целиком как одна M2 row. Caller запрашивает выдачу конкретного компонента — это фактическое предоставление M6. До выдачи — создаём отдельную M2 row для component: новый id, новый rootId, `source = canonicalRef архива`, `about = "path/in/archive"` (строка). Bytes и sha256 — от самого component файла. `location` — derived from archive extraction. Extraction в sandbox: path traversal check, depth ≤ 16, entries ≤ 65536, ratio ≤ 100. Fail-closed: любая проверка провалилась → reject, component не регистрируется.

[Верстальщик]: Сводим форму operations table. Строки: `intake`, `intake-revision`, `list`, `read-metadata`, `read-ref`, `read-bytes`, `download`, `preview`, `manage-access`, `verify-schema`, `verify-reachability`, `verify-integrity`, `verify-durability`, `verify-authorization`, `verify-portability`. Для каждой: ровно один M3 action, authority object (container/collection/lineage), input, result, mutation/side-effect, audit evidence. До gate recordId разрешается в canonicalRef, tip и policy version — это pre-gate resolution, не отдельная operation.

[Архитектор]: Финальная архитектурная форма контракта: логический API единый, transport-agnostic. CLI вызывает те же handlers что и server adapter — никакой дублирующей логики. Каждый handler принимает `{principal, intentId, action, params}`, возвращает `{outcome, recordId?, state?, evidence}`. Transport выбирается только в M7 — сейчас только logical contract. Один carrier: `docs/seanses/static-mmbrn-container-m6-intake-delivery-2026-08-06.md`.

[Структурщик]: Lifecycle join для readiness scope: row is live iff `row.id == tip(row.rootId)` AND `no superseding row exists`. Live scope = все live rows. Committed scope = все rows в registry (включая superseded historical). Distinct live `(class, sha256)` = count distinct pairs среди live rows. Physical delta = FD-1 used capacity для live + pending committed. Quota check использует live scope + proposed. Это точная формула — без ambiguity.

[Математик]: Для случая 7 — sensitive classification unknown. Принципал не указал class или указал unknown class. Fail-closed: intake state → HOLD. Predicate `CLASS_KNOWN ≡ classification ∈ {standard, sensitive} AND (classification == sensitive IMPLIES reason != null AND reason != "")`. Если predicate false — HOLD, не FAILED: bytes сохранены в quarantine, не в FD-1 production namespace. Resolve HOLD = новый intake с явной classification и непустым reason. Quarantine bytes retention: 72 часов, затем purge если не resolved.

[Teamlead]: Случай 18 — failed intent retry без стирания истории. Caller берёт failed intentId и пытается повторить — нельзя. Ledger immutable: FAILED state не переходит. Caller должен создать новый intentId. Old intentId в ledger остаётся с FAILED state навсегда — это history. Audit record для старого intent — сохранён. Новый intentId с тем же fingerprint — разрешён (это не случай 17 который про тот же intentId с другим fingerprint).

[Музыкант]: Подтверждаю: в operations table verify operations не имеют mutations. Side effect только для verify-durability: может trigger reconciliation если обнаружен STORED_PENDING_REGISTRY. Это единственное допустимое side effect у verify. Audit для всех verify: `{principal, action, recordId, dimension, result: ok|fail|unknown, timestamp}` — без раскрытия ref или bytes в audit.

[Верстальщик]: Случай 12 — unreachable historical row и reachable live tip. Verify-reachability для historical row возвращает `UNREACHABLE` для той row — это корректное историческое состояние, row не удаляется, не переписывается. Verify-reachability для live tip возвращает `OK`. Два отдельных результата, два отдельных audit records. UI показывает: historical record имеет status `UNREACHABLE` at point-in-time, current tip — `REACHABLE`. Это не противоречие — это история.

[Архитектор]: Случай 6 — address move. Объект физически перемещён на новое хранилище. Не mutation существующей row. Operation `write-metadata` с новым `location.ref` и `location.kind`. Результат: новая M2 row с новым id, тем же rootId и canonicalRef, тем же sha256 и bytes, новым location. Supersedes = текущий tip. Это продолжение lineage. Старая row — historical, её location — stale. Verify-reachability на старой — UNREACHABLE (ожидаемо). Verify-reachability на новой — зависит от доступности нового location.

[Структурщик]: Случай 5 — metadata correction. Например, исправление source или about. Operation `write-metadata`. Новая M2 row, новый id, supersedes = currentTip. M2 буквально: source — строка, about — строка, обновляются в новой row. Старая row immutable. Никакого upsert. CAS: write-metadata также принимает expectedCurrentTip, если tip изменился между чтением и записью — CONFLICT. Это защищает от concurrent metadata edits.

[Математик]: Summary readiness predicates формально:
- `R1_ATOMIC`: `ledger ∩ STORED_PENDING_REGISTRY == ∅` (после reconciliation)
- `R2_IDEMPOTENT`: `∀(p,i): |fingerprints(p,i)| ≤ 1 ∧ |recordIds(p,i)| ≤ 1`
- `R3_HASH`: computed sha256 == row.sha256 for all live tips
- `R4_QUOTA`: `U_c ≤ Q_c` для всех collections
- `R5_RECONCILE`: `registry_count == ledger_committed_count`
- `R6_BYPASS`: no FD-1 access without prior m3 check in access log
- `R7_PREVIEW`: preview cache invalidated when origin row changes
- `R8_ARCHIVE`: all archive intakes passed bomb/traversal/depth/entries checks
- `R9_DEGRADED`: if FD2 unavailable: `now − cut_at ≤ 86400s` else NO-GO

[Teamlead]: Принимаем. Контракт полный. Одна пропозиция E1: закрытая operations table из 15 строк, state machine с 7 состояниями, commit через durable ledger binding, 13 outcome codes, 19 cases, 9 readiness predicates. M2-M5 сохранены. M7 не решён. Carrier один. LGTM — выносим в протокол.

[Музыкант]: Принимаю. Добавлю последнее: archive constants зафиксированы как числа без «например» — 2 147 483 648 bytes, ratio 100, entries 65 536, depth 16. Эти числа войдут в контракт verbatim. Quarantine retention — 72h для class-unknown, 24h для hash-mismatch. Reconciliation threshold — 300s.

[Верстальщик]: Принимаю. Форма выдержана: audit redacted, existence leak закрыт, preview isolated, UI states честные.

[Архитектор]: Принимаю. Конструкция держит нагрузку M2-M5 без нарушения границ. Carrier единственный.

[Структурщик]: Принимаю. Слабая связанность соблюдена: attempt states, registry rows, lifecycle events — три отдельных слоя без смешения.

[Математик]: Принимаю. Все predicates вычислимы, все evidence измеримы, unknown → NO-GO без исключений.

---

## Итоговое решение консилиума — E1: контракт M6 приёма и выдачи

### Пропозиция E1

Принят единый исполнимый контракт мастерской вещдоков. Carrier: `docs/seanses/static-mmbrn-container-m6-intake-delivery-2026-08-06.md`.

---

### Таблица 1. Operations (закрытая)

| Operation | M3 Action | Authority Object | Input | Result | Mutation / Side-effect | Audit Evidence |
|---|---|---|---|---|---|---|
| `intake` | `upload-revision` | `collection` | `{intentId, principal, bytes, sha256, bytes_size, source, location, classification?, sensitive_reason?, about?}` | `{outcome, recordId, canonicalRef}` | FD-1 object write; ledger COMMITTED; registry append | `{auditId, ts, principal, intentId, action, collectionId, proposedRecordId, committedRecordId, m3Decision, fd1_verified, fd2_rpo_ok, fd3_appended, sensitiveFlag}` — raw ref redacted |
| `intake-revision` | `upload-revision` | `lineage` | `{intentId, principal, rootId, expectedCurrentTip, bytes, sha256, bytes_size, source, location, classification?, sensitive_reason?, about?}` | `{outcome, recordId, canonicalRef, supersedes}` | FD-1 write; ledger COMMITTED; registry append; tip advances | Как intake + `{supersedes, expectedTip, casResult}` |
| `list` | `discover` | `collection` | `{principal, collectionId, filters?}` | `[{id, canonicalRef, addedAt, tipId}]` — без location.ref, без sensitive.reason | Нет | `{principal, action: discover, collectionId, filter, ts, resultCount}` — не список id если sensitive scope |
| `read-metadata` | `read-metadata` | `lineage` | `{principal, recordId}` | `{id, sha256, bytes, addedAt, source, about?, measured?, sensitiveFlag}` — без location.ref | Нет | `{principal, action: read-metadata, recordId, ts, m3Decision}` |
| `read-ref` | `read-ref` | `lineage` | `{principal, recordId}` | `{location.ref}` только | Нет | `{principal, action: read-ref, recordId, ts, m3Decision}` — ref в audit redacted |
| `read-bytes` | `read-bytes` | `lineage` | `{principal, recordId}` | bytes stream | FD-1 read access | `{principal, action: read-bytes, recordId, ts, m3Decision, fd1_ref_resolved: bool}` — ref redacted |
| `download` | `download` | `lineage` | `{principal, recordId}` | download token / stream | FD-1 read; token issued | `{principal, action: download, recordId, ts, m3Decision}` |
| `preview` | `read-bytes` | `lineage` | `{principal, recordId}` | derived preview или `PREVIEW_UNAVAILABLE` | Affine binding read (optional); preview cache read | `{principal, action: read-bytes (preview), recordId, ts, m3Decision, previewResult}` |
| `manage-access` | `manage-access` | `container` / `lineage` | `{principal, targetPrincipal, object, grants}` | `{policyVersion}` | M3 policy store update | `{principal, action: manage-access, object, grants_changed, policyVersion, ts}` |
| `verify-schema` | `read-metadata` | `lineage` | `{principal, recordId}` | `{dimension: schema, result: ok\|fail, detail}` | Нет | `{principal, action: verify-schema, recordId, result, ts}` |
| `verify-reachability` | `read-ref` | `lineage` | `{principal, recordId}` | `{dimension: reachability, result: ok\|unreachable\|unknown}` | Нет | `{principal, action: verify-reachability, recordId, result, ts}` — ref redacted |
| `verify-integrity` | `read-bytes` | `lineage` | `{principal, recordId}` | `{dimension: integrity, result: ok\|hash_mismatch\|unknown}` | Нет | `{principal, action: verify-integrity, recordId, result, ts}` — computed hash не хранится |
| `verify-durability` | `read-bytes` | `lineage` | `{principal, recordId}` | `{dimension: durability, result: ok\|degraded\|fail}` | May trigger reconciliation if STORED_PENDING_REGISTRY found | `{principal, action: verify-durability, recordId, fd1_ok, fd2_rpo_ok, fd3_ok, ts}` |
| `verify-authorization` | `read-metadata` | `lineage` | `{principal, recordId, requestedAction}` | `{dimension: authorization, result: ok\|denied}` | Нет | `{principal, action: verify-authorization, recordId, requestedAction, m3Decision, ts}` |
| `verify-portability` | `read-ref` | `lineage` | `{principal, recordId}` | `{dimension: portability, result: ok\|not_portable}` | Нет | `{principal, action: verify-portability, recordId, locationKind, result, ts}` — ref redacted |

**Примечание:** До gate `recordId` разрешается в `canonicalRef`, tip lineage и актуальную policy/object version. Разрешение — pre-gate step, не отдельная operation. Составной archive component flow — отдельные операции `intake` (для архива целиком) и последующий `intake` (для component при фактической выдаче), не объединяются.

---

### Таблица 2. State Machine (intake attempt)

| State | Entry Predicate | Allowed Transitions | Durable Evidence | Recovery |
|---|---|---|---|---|
| `RECEIVED` | M3 `upload-revision` ALLOW; intentId уникален в ledger | → `SCANNING` | Ledger row `{intentId, principal, fingerprint=null, proposedRecordId=null, state: RECEIVED, ts}` | Если crash: ledger содержит RECEIVED, bytes могут отсутствовать — cleanup, → FAILED |
| `SCANNING` | bytes получены; hash/size вычислены; fingerprint = sha256 записан в ledger | → `CLASSIFIED` (malware/format PASS) \| → `FAILED` (malware/format FAIL) | Ledger: `{fingerprint, proposedRecordId assigned, state: SCANNING}` | Если crash: повтор scan идемпотентен по fingerprint |
| `CLASSIFIED` | classification ∈ {standard, sensitive} с непустым reason если sensitive | → `QUOTA_CHECKED` \| → `HOLD` (unknown class) \| → `FAILED` | Ledger: `{classification, state: CLASSIFIED}` | HOLD → ждёт внешний resolve (новый intent); FAILED → cleanup quarantine после 72h |
| `QUOTA_CHECKED` | `U_c + bytes_proposed ≤ Q_c` AND `Δ_phys ≥ bytes_proposed` | → `STORED` \| → `FAILED` (quota/capacity exceed) | Ledger: `{quotaSnapshot, state: QUOTA_CHECKED}` | Если crash: re-check quota, idempotent |
| `STORED` | FD-1 object written and verified; ownership marker set | → `COMMITTED` \| → `FAILED` (FD-1 verify fail) | Ledger: `{state: STORED_PENDING_REGISTRY, fd1_ref_redacted: true, fd1_verified: true}` | **Critical:** если crash здесь — recovery reads ledger, checks FD-1 by fingerprint, performs safe registry append if object exists |
| `COMMITTED` | Registry append successful; ledger updated; FD-3 durable | Terminal | Registry row immutable; ledger `{state: COMMITTED, recordId, ts_committed}`; FD-3 event | Повторный запрос с тем же intentId → 200 + recordId. Recovery: idempotent append по proposedRecordId |
| `FAILED` | Любое условие перехода не выполнено; или explicit reject | Terminal | Ledger `{state: FAILED, failReason, ts_failed}` | History immutable. Cleanup: если state был STORED_PENDING_REGISTRY — check shared blob before FD-1 delete. Registry row отсутствует |
| `HOLD` | classification unknown | Terminal for attempt; resolvable by new intent | Ledger `{state: HOLD, ts_hold}`; bytes in quarantine | Quarantine retention 72h. New intentId required for retry with explicit classification |

---

### Таблица 3. Outcomes

| Code | Class | Meaning | Retryable | Caller Exposure | Audit Consequence |
|---|---|---|---|---|---|
| `OK` | Success | Operation completed; record committed | N/A | `{outcome: OK, recordId, canonicalRef}` | Full audit record written |
| `ACCEPTED` | Async success | Intake in progress; idempotent poll by intentId | Yes (poll) | `{outcome: ACCEPTED, intentId, state}` | Ledger state logged |
| `CONFLICT` | Client error | CAS fail: expectedCurrentTip ≠ actual tip | No | `{outcome: CONFLICT}` — no tip value leaked | Audit: `{action, intentId, casResult: conflict}` |
| `DENIED` | Auth error | M3 gate DENY for requested action | No (until policy change) | `{outcome: DENIED}` — no existence leak on not-found | Audit: `{action, principal, m3Decision: DENY}` без sensitive detail |
| `HOLD` | Pending | Classification unknown; awaiting resolve | Yes (new intent after resolve) | `{outcome: HOLD, intentId}` | Audit: `{action, intentId, reason: classification_unknown}` |
| `QUOTA_EXCEEDED` | Capacity error | `U_c + proposed > Q_c` или `Δ_phys < proposed` | No (until quota change) | `{outcome: QUOTA_EXCEEDED}` | Audit: `{action, intentId, quotaState: exceeded}` |
| `STORAGE_DEGRADED` | Infrastructure error | FD-2 RPO exceeded; intake blocked | No (until checkpoint restored) | `{outcome: STORAGE_DEGRADED}` | Audit: `{action, storageState: FD2_RPO_EXCEEDED}` |
| `HASH_MISMATCH` | Data error | computed sha256 ≠ declared sha256 | No (new intentId с correct hash) | `{outcome: HASH_MISMATCH}` | Audit: `{action, intentId, result: hash_mismatch}` — computed hash не хранится |
| `INTENT_FINGERPRINT_CONFLICT` | Client error | Same intentId, different fingerprint | No (new intentId required) | `{outcome: INTENT_FINGERPRINT_CONFLICT}` | Audit: `{action, intentId, conflict: fingerprint_changed}` — ledger immutable |
| `ARCHIVE_UNSAFE` | Data error | Bomb/traversal/depth/entries check failed | No (new intake с безопасным архивом) | `{outcome: ARCHIVE_UNSAFE, check_failed}` | Audit: `{action, intentId, archiveCheck: failed, specific_violation}` |
| `NOT_FOUND` | Lookup | recordId не найден в registry для caller | N/A | `{outcome: NOT_FOUND}` — не создаёт existence leak | Audit: `{action, principal, m3Decision: DENY_OR_NOT_FOUND}` без id |
| `SCHEMA_INVALID` | Client error | Переданные поля не соответствуют M2 spec | No | `{outcome: SCHEMA_INVALID, fields}` | Audit: `{action, intentId, schemaErrors}` |
| `INTERNAL_ERROR` | Server error | Unclassified server failure | Unknown | `{outcome: INTERNAL_ERROR}` | Audit: `{action, intentId, error: internal}` без stack detail |

---

### Таблица 4. Cases

| Случай | Ожидаемое решение | Источник истины | Вещдок |
|---|---|---|---|
| 1. Новый PDF | Intake: RECEIVED → SCANNING → CLASSIFIED (standard) → QUOTA_CHECKED → STORED → COMMITTED. Новый id, rootId, canonicalRef. | registry.jsonl + ledger | Новая row в registry; ledger COMMITTED; FD-1 object |
| 2. Те же bytes, новое независимое поступление | Новый intentId, новый id, новый rootId, новый canonicalRef. sha256 совпадает — факт, не слияние. Lineage не выводится из hash. | registry.jsonl | Две отдельные rows с одинаковым sha256, разными id/rootId |
| 3. Retry того же intent | intentId уже в ledger: COMMITTED → 200 + existing recordId (идемпотентно); PENDING → 202; FAILED → 4xx с failReason | Ledger | Ledger state для intentId |
| 4. Новая редакция | intake-revision: новый id, прежний rootId и canonicalRef, `supersedes = expectedCurrentTip`. CAS: если tip изменился — CONFLICT. | registry.jsonl + ledger | Новая row с supersedes; старая row immutable; tip обновлён |
| 5. Metadata correction | write-metadata (mapped to intake-revision path for metadata-only): новая row, новый id, supersedes = currentTip, исправленные source/about строки. | registry.jsonl | Новая row с updated metadata; старая row сохранена |
| 6. Address move | write-metadata: новая row, новый id, тот же rootId, новый location. sha256 и bytes неизменны. Старая row historical. | registry.jsonl | Новая row с новым location; verify-reachability на старой → UNREACHABLE |
| 7. Sensitive classification unknown | Intake: CLASSIFIED state → HOLD. Bytes в quarantine. Retention 72h. Возврат `HOLD`. Новый intent с явной classification + reason требуется. | Ledger | Ledger state: HOLD; quarantine marker |
| 8. Quota/capacity deny | Intake: QUOTA_CHECKED state → FAILED. `U_c + proposed > Q_c` или `Δ_phys < proposed`. Outcome `QUOTA_EXCEEDED`. | M4 quota snapshot | Ledger FAILED; quota snapshot в ledger |
| 9. Crash до registry commit | Recovery: ledger contains STORED_PENDING_REGISTRY. Reconciliation (≤300s threshold): checks FD-1 by fingerprint. Object exists → safe append proposedRecordId → COMMITTED. Object missing → FAILED + cleanup. | Ledger + FD-1 | Ledger STORED_PENDING_REGISTRY → resolved state |
| 10. Timeout с неизвестным commit outcome | Caller повторяет с тем же intentId. Ledger: COMMITTED → 200 + recordId; STORED_PENDING_REGISTRY → 202 retry; FAILED → 4xx. Нет дублей. | Ledger | Ledger current state |
| 11. Hash mismatch | SCANNING → FAILED. Bytes в quarantine 24h. Outcome `HASH_MISMATCH`. Audit без computed hash. Retry требует нового intentId. | Ledger + computed sha256 | Ledger FAILED; audit record mismatch |
| 12. Unreachable historical row и reachable live tip | verify-reachability(historical) → `UNREACHABLE` — корректное историческое состояние, row не удаляется. verify-reachability(live tip) → `OK`. Два отдельных результата. | registry.jsonl + FD-1 | Два audit records; обе rows в registry |
| 13. Metadata allow при ref/bytes/download deny | read-metadata → metadata без location.ref. read-ref → DENIED. read-bytes → DENIED. download → DENIED. Три отдельных M3 checks, три audit records. Нет leakage между gates. | M3 policy | Три audit records с разными m3Decision |
| 14. Preview failure | preview → `PREVIEW_UNAVAILABLE`. Original не затронут. Registry row неизменна. Affine binding absent/failed — не влияет на M6 contract. | registry.jsonl | Audit: `{action: read-bytes (preview), previewResult: UNAVAILABLE}`; original row intact |
| 15. Archive component | Archive принят целиком (одна M2 row). При запросе выдачи компонента: extraction в sandbox, checks (ratio ≤ 100, entries ≤ 65536, depth ≤ 16, path traversal fail-closed). Создаётся отдельная M2 row для component: новый id, `source = canonicalRef(archive)`, `about = "path/in/archive"`. | registry.jsonl | Две rows: archive + component; component row создана до выдачи |
| 16. Direct storage или Affine bypass | Запрос без M6 gate → FD-1 returns 403 without M6 token. Нарушение M1 boundary. M6 не обрабатывает — storage layer отклоняет. | FD-1 access log | Access log: unauthorized access без M6 token |
| 17. Тот же intent с другим fingerprint | Ledger: intentId уже содержит fingerprint F1. Новый запрос с intentId, fingerprint F2 ≠ F1. Outcome: `INTENT_FINGERPRINT_CONFLICT`. Ledger immutable. Caller создаёт новый intentId. | Ledger | Ledger: existing entry preserved; conflict audit record |
| 18. Failed intent retry без стирания истории | intentId в ledger: state FAILED. Retry того же intentId → 4xx с failReason. Ledger immutable: FAILED остаётся навсегда. Caller создаёт новый intentId. History не стирается. | Ledger | Ledger: FAILED entry immutable; audit record сохранён |
| 19. Shared blob при cleanup | FAILED intent cleanup: check `(class, sha256)` — есть ли другая COMMITTED row? Есть → не удаляем FD-1 object, снимаем только ownership marker текущего intent. Нет → удаляем FD-1 object. Class namespaces не склеиваются. | Ledger + registry.jsonl + FD-1 | Ledger: cleanup action logged; FD-1: object preserved или deleted; committed row не затронута |

---

### Таблица 5. Readiness Gates

| Gate | Machine Predicate | Evidence | Fail Result |
|---|---|---|---|
| `R1_ATOMIC` | `ledger ∩ {state: STORED_PENDING_REGISTRY, age > 300s} == ∅` | Ledger scan; reconciliation log | NO-GO: intake suspended until reconciliation completes |
| `R2_IDEMPOTENT` | `∀(principal,intentId): |{fingerprint}| ≤ 1 ∧ |{recordId}| ≤ 1` | Ledger integrity scan | NO-GO: duplicate detected, manual resolution required |
| `R3_HASH` | `∀ live tip row r: sha256(FD1_bytes(r)) == r.sha256` | verify-integrity results for all live tips | NO-GO: hash mismatch in live tip; affected row quarantined |
| `R4_QUOTA` | `U_c ≤ Q_c` для каждой collection c; `U_c = Σ bytes` по live rows | M4 quota snapshot + lifecycle join (live scope) | NO-GO intake for collection c: QUOTA_EXCEEDED |
| `R5_RECONCILE` | `count(registry live+historical rows) == count(ledger COMMITTED entries)` | Registry row count + ledger COMMITTED count | NO-GO: mismatch → reconciliation run required |
| `R6_BYPASS` | `∀ FD-1 access event: ∃ prior m3_check event with matching token` | FD-1 access log + M3 check log join | NO-GO: unauthorized access pattern detected; security review required |
| `R7_PREVIEW` | `∀ preview cache entry: source row sha256 unchanged since cache write` | Preview cache metadata + registry sha256 | NO-GO for stale cache: invalidate and regenerate; original unaffected |
| `R8_ARCHIVE` | `∀ accepted archive: ratio_check ≤ 100 ∧ entries ≤ 65536 ∧ depth ≤ 16 ∧ no_traversal` | Archive intake scan log | NO-GO for unsafe archive: ARCHIVE_UNSAFE; no partial acceptance |
| `R9_DEGRADED` | `FD2_available OR (now − cut_at) ≤ 86400s` | FD-2 checkpoint timestamp + current time | NO-GO intake if FD2 unavailable AND RPO exceeded; reads via FD-1 допустимы |
| `R10_CAPACITY` | `Δ_phys(FD-1) ≥ minimum_reserve_bytes` где minimum_reserve_bytes = 1 073 741 824 (1 GiB) | FD-1 capacity metrics | NO-GO intake: QUOTA_EXCEEDED (capacity) |
| `R11_SCHEMA` | `∀ live tip row: M2 fields present, bytes > 0 (positive integer), source != null, location.kind ∈ allowed_kinds` | Registry schema scan | NO-GO for malformed rows: investigation required; новые intakes suspended |
| `R12_SENSITIVITY` | `∀ sensitive row: sensitive.reason != null ∧ sensitive.reason != ""` | Registry sensitive rows scan | NO-GO: incomplete sensitive classification; row flagged for review |

---

## Список посылок

Ниже перечислены только входные нормы и факты, ратифицированные в M1-M5 и зафиксированные в повестке M6.

- Контейнер принимает originals как конкретные bytes; Affine и preview — сменные поверхности, не source of truth.
- Единица регистрации — файл/архив целиком; компонент архива получает отдельную запись только при независимом поступлении или фактическом предоставлении M6.
- M2 record append-only; обязательные поля: `id`, `sha256`, `bytes` (positive integer), `addedAt`, `source` (строка), `location {kind, ref}`; опциональные: `supersedes`, `sensitive.reason`, `about` (строка), `measured`; любая правка создаёт новый `id`.
- `canonicalRef = "urn:mmbrn:static:" + rootId`; дубль bytes не сливает records/lineages; редакция продолжает lineage; перенос меняет location в новой record с прежним hash.
- `registry.jsonl` — truth регистрации/identity/history; location — заявление; reachability — внешнее состояние; bytes — независимое доказательство.
- Panel авторизует отдельные M3 actions: `discover`, `read-metadata`, `read-ref`, `read-bytes`, `download`, `write-metadata`, `upload-revision`, `manage-access`; `read-metadata` не выдаёт `location.ref`; ref, bytes и download проверяются раздельно.
- M4: FD-1 primary bytes, FD-2 complete backup, FD-3 registry/lifecycle; до записи нужны class-scoped key, capacity/quota admission, hash/bytes verification, fail-closed gates; текущий office VDS — storage NO-GO.
- M5: Affine — optional projection; любое обращение требует Panel allow и valid binding; отсутствие движка не отменяет container/registry/bytes/authority.
- `yarn evidence` умеет `add`, `verify`, `list`, `inspect`, `decompose`; `kit: null` до server phase.
- `docs/evidence/registry.jsonl` содержит 12 append-only rows с `location.kind=local`; один PDF-чек в публичном Git; sensitive PDF вне репозитория.
- `verify` 06.08: два hash-mismatch для day memo, один unreachable superseded BPLA row, duplicate hash-группы receipt и BPLA; reachable legacy sensitive local ref не доказывает переносимость или право выдачи.
- Существующая CLI/README предшествует M2-M5; совпадение полей — факт совместимости, не разрешение вернуть старую модель.
- Operations table закрыта; вне неё операций нет; ровно один M3 action на строку; authority object — container/collection/lineage.
- Attempt states отделены от immutable registry rows и append-only lifecycle events; registry rows не мутируют и не удаляются.
- Commit = verified FD-1 + safe registry append + durable ledger binding COMMITTED; до append — ledger durable binding STORED_PENDING_REGISTRY; recovery не удаляет referenced bytes.
- Predicate: `(principal, intentId) → ≤1 fingerprint AND ≤1 recordId`; conflict и history immutable.
- Cleanup: exact class-aware ref + ownership marker; shared blob не удаляется; class namespaces не склеиваются; registry row не входит в deletion chain.
- FD-2 RPO: `now − cut_at ≤ 86400s`; просроченный RPO — intake NO-GO; reads через FD-1 допустимы.
- Archive constants: max bytes = 2 147 483 648; max ratio = 100; max entries = 65 536; max depth = 16; extraction fail-closed; path traversal: любой `..`, абсолютный `/`, нулевой байт → reject.
- Audit redacted at write-time: raw ref/path/key/bytes никогда не хранятся; not-found не создаёт existence leak.
- Quarantine retention: classification unknown — 72h; hash-mismatch — 24h; reconciliation threshold — 300s.
- `U_c` — logical bytes committed в collection по live scope; `Q_c` — quota ceiling; `Δ_phys` — physical delta до watermark FD-1.
- Preview gate = `read-bytes` M3 action; preview failure не меняет original; Affine bypass запрещён.
- Revision CAS: `supersedes = expectedCurrentTip`; если actual tip ≠ expected → CONFLICT; fork запрещён.
- Sensitive classification: авторитет — Panel; fail-closed при unknown; class определяет M4 namespace до write; `sensitive.reason` — непустая строка; не становится `location.kind`.

---

## Definition of Done

- [x] Выбран один исполнимый operation/state/commit contract мастерской
- [x] M2 identity, M3 authority, M4 storage и M5 сменность Affine сохранены
- [x] Intake atomicity, idempotency, crash recovery и reconciliation определены
- [x] Sensitivity, verification dimensions, preview и archive safety разведены
- [x] Пять обязательных таблиц и не меньше 14 cases заполнены (19 cases)
- [x] Readiness имеет machine predicates, evidence и честный NO-GO (12 gates)
- [x] M7, production migration и текущие rows не исполнены
- [x] Один carrier, один E1, посылки перед последней секцией DoD
- [x] Не меньше 36 ролевых реплик и не меньше шести от каждой роли
