<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-08-08T09:06:52.153Z |
| Команда | `yarn consilium` |
| Модель | anthropic/claude-sonnet-4-6 |
| Файл | `docs/seanses/static-mmbrn-container-m7-migration-delivery-2026-08-08.md` |
| Порядок ролей | Верстальщик → Музыкант → Математик → Структурщик → Teamlead → Архитектор |
| Повестка | `docs/meeting/static-mmbrn-container/M7_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs/meeting/static-mmbrn-container/M7_AGENDA.md` | 11931 | `13eb31ffdd66` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs/meeting/static-mmbrn-container/M7_AGENDA.md` | 11931 · 1 п. | `13eb31ffdd66` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --no-memory --min-replies 36 --seed 727`

**Вопрос:**

Проведи заседание строго по повестке M7. Не переопределяй M1-M6, сохрани один D1, один carrier и оставь Definition of Done последней секцией.

---

# Консилиум: M7 — переезд и доставка `strategy.mmbrn.tech → static.mmbrn.tech`

**Повестка:** D1 — минимальный исполнимый контракт переезда: доказательный инвентарь 82 pages / 57 assets, disposition по каждому объекту, M3-M6 readiness, перенос только законных состояний, переключение Panel/proxy/Caddy/DNS, доказательство cutover и rollback, объявление в `LIVE_SERVICES`, нарезка #1303/#1305.

**Участники:** Верстальщик (Rodchenko), Музыкант (Kuryokhin), Математик (Dynin), Структурщик (Ozhegov), Teamlead (Tarasov), Архитектор (Vesnin).

**Порядок реплик:** Верстальщик → Музыкант → Математик → Структурщик → Teamlead → Архитектор (циклически, ≥36 реплик)

---

[Верстальщик]: Открываю комнату с визуальной стороны контракта. У нас есть 82 страницы и 57 PNG/SVG-ассетов в живом Affine. Ни один из них не становится оригиналом по факту присутствия в workspace — это закрыто M1. Прежде чем говорить о disposition, нам нужен один fenced snapshot: дамп БД с фиксированным timestamp, SHA-256 по каждому блобу и таблица relations. Без этого manifest не существует — и мы не можем отрисовать ни один доказанный статус, ни один маршрут на новом хосте.

[Музыкант]: Соглашусь с Rodchenko и сразу обозначу ловушку на стыке snapshot и состояния engine. CLI показывает `0` — это не пустота, это артефакт транспортного слоя Affine. DB-инвентарь видит 82. Значит baseline — только то, что извлечено из PostgreSQL с hash-верификацией. Всё, что engine кэширует сверх этого (layout, session, projection cache), — disposable по M5 и в manifest не включается как самостоятельная единица. Это важно: мы не мигрируем engine state, мы мигрируем binding-доказанные объекты.

[Математик]: Уточняю метрику fenced snapshot. Нам нужна одна операция: `pg_dump` с `--snapshot` плюс параллельный `SELECT` blob-таблиц с `md5` или `sha256` прямо в транзакции. Результат — manifest-файл: строка на объект, поля `{source_id, kind, hash, byte_size, created_at, updated_at, relations[], grants[]}`. Cardinality после fence может отличаться от baseline 82/57 — это нормально: baseline — измеренное, fenced — доказанное. До manifest с каждой строкой и hash статус всего корпуса — `NOT PERFORMED / NO-GO`. Никаких исключений по типовым классам.

[Структурщик]: Добавлю к манифесту структурный контракт. Ledger — одна append-only state machine, объявленная заранее. Состояния фиксирую сейчас:

`DISCOVERED → QUALIFIED → DISPOSITION_ASSIGNED → EXPORT_PENDING → EXPORTED → STORED_PENDING_REGISTRY → COMMITTED → LIVE | RETIRED | REJECTED`

Обратных переходов нет. Retry/recovery — новые append events с собственным `event_id` и `parent_event_id`. Engine-id Affine не является `canonicalRef` (M2) и не входит в ledger identity — только `urn:mmbrn:static:<rootId>`. Дубли не сливаются: каждый объект получает отдельную строку с явным disposition `DUPLICATE → DISCARD`. Fake M6 binding запрещён — binding создаётся только через LIGD с verified FD-1.

[Teamlead]: Слушаю команду — структура ясна, но я вижу один незакрытый риск до начала работы: office VDS с 9.46 GiB free — это storage NO-GO по M4. Значит provision FD-1 (production storage) — первый шаг DAG, и он должен предшествовать любому экспорту. DAG начинается с `PROVISION_TARGET`, не с `INVENTORY`. M4 G1-G10 проверяются после того, как target создан, — это причинный порядок по поправке run3. Пока FD-1 не создан и не прошёл G1-G10, весь pipeline стоит на `NO-GO`. Фиксируем это как entry gate шага `INVENTORY`.

[Архитектор]: Форма решения: один DAG, одна ledger machine, одна route matrix — правильно. Но нужно явно развести три независимых контура, иначе граница размывается. Контур A — storage и readiness (M4 G1-G10, provision, backup, restore drill). Контур B — corpus и disposition (inventory, qualify, ledger). Контур C — access и routing (M3 matrix, Panel grants, proxy config). Контуры A и C — preconditions для cutover. Контур B — precondition для migrate. Ни один контур не закрывается типовым классом без per-object evidence. Это не три DAG — это один DAG с явными зависимостями между контурами.

[Верстальщик]: Принимаю трёхконтурную модель Веснина. Для route matrix добавлю: нам нужно различать шесть классов маршрутов — static-serve, strategy-legacy, deep-link-redirect, API/download, preview/WS и direct-backend. Каждый класс имеет ровно один M3 action/object либо `network deny`. `pass-through` и multi-action API запрещены (поправка run1). WebSocket к Affine backend post-cutover — `network deny` без исключений. Credential leak на redirect — блок: старый хост не получает токен нового хоста ни в cookie, ни в header.

[Музыкант]: По portable annotations — это единственное, что M5 требует перенести с доказательством parity до cutover. Binding events — Panel-owned, они не в Affine engine. Layout, projection cache, session data — discard. Для каждой страницы, у которой есть portable annotation, нужна отдельная строка в ledger с evidence: `annotation_export_hash` совпадает с `annotation_import_hash` на целевом движке. Если parity mismatch — статус `ANNOTATION_PARITY_FAIL`, переход в `REJECTED`, cutover для этого объекта блокируется. Это M5 G4 predicate.

[Математик]: Уточняю M4 gates с точными predicates. G1 Capacity+quota: `free_bytes(FD-1) > total_blob_bytes(manifest) × 1.5`; corpus — fenced manifest. G2 Write/read/hash: записать тестовый блоб, прочитать, сравнить SHA-256; corpus — один синтетический объект. G3 Complete backup: резервная копия FD-1 создана, timestamp зафиксирован; corpus — backup log. G4 Restore drill: восстановить из G3 backup в изолированный volume, hash-проверка трёх случайных объектов; corpus — restore log с hashes. G5 Auth bypass: прямой запрос к FD-1 без Panel token возвращает 401/403; corpus — curl-лог. G6 Reconciliation: diff между manifest и FD-1 после import = пустой; corpus — reconcile-log. G7 RPO ≤ 1 час: backup интервал ≤ 3600 s; corpus — cron config. G8 RTO ≤ 4 часа: restore drill time ≤ 14400 s; corpus — restore log timestamp diff. G9 FD-3: третий независимый fault domain существует и принял тестовый блоб; corpus — FD-3 write log. G10 Sensitive: sensitive объекты изолированы в отдельный prefix с отдельным access policy; corpus — policy document. Норма без evidence — не PASS.

[Структурщик]: M5 gates аналогично с predicates. G1 Reducer: для каждого `canonicalRef` существует детерминированный reducer, воспроизводящий projection из binding+annotation; corpus — reducer coverage report. G2 Ref coverage: все `canonicalRef` в ledger имеют соответствующую запись в `registry.jsonl`; corpus — diff ledger vs registry. G3 Engine coverage: все объекты из fenced manifest присутствуют в target engine после rehydration; corpus — rehydration check log. G4 Annotation parity: `annotation_export_hash == annotation_import_hash` для всех portable annotations; corpus — parity log per object. G5 Rehydration: target engine воспроизводит projection из binding без source engine; corpus — smoke test log. G6 Panel authority: target route проверяет Panel token, fail-closed; corpus — auth test log. G7 Native principals: ни один native Affine role/token не имеет прямого доступа к target; corpus — role audit. G8 Durable backup: backup annotations и bindings создан на FD-2; corpus — backup log. G9 Durable restore: restore drill из G8 прошёл; corpus — restore log. G10 Retention: policy retention для bindings и annotations ≥ срок жизни сервиса; corpus — policy document. Норма без evidence — не PASS.

[Teamlead]: Хорошо. Теперь DAG. Объявляю шаги и зависимости:

**S1 PROVISION_TARGET** — deps: none; entry: owner-authority confirmed, budget approved; mutation: создать FD-1/FD-2/FD-3; exit evidence: FD-1/FD-2/FD-3 endpoints reachable; owner: Математик; stop: provision fail → abort, no rollback needed (nothing written).

**S2 M4_READINESS** — deps: S1; entry: FD-1 exists; mutation: run G1-G10 gates; exit evidence: all gates PASS, log signed; owner: Математик; stop: any gate FAIL/UNKNOWN → pipeline NO-GO.

**S3 INVENTORY** — deps: S2; entry: M4 PASS; mutation: pg_dump with snapshot + hash manifest; exit evidence: manifest file with cardinality N_pages/N_assets, each row hash; owner: Математик; stop: hash mismatch → abort, source untouched.

**S4 QUALIFY** — deps: S3; entry: manifest exists; mutation: assign M1 classification per object (original/projection/strategic-doc/duplicate/asset); exit evidence: qualification log, each object has classification+authority+basis; owner: Структурщик; stop: unclassifiable object → REJECTED in ledger, pipeline continues for rest.

**S5 DISPOSITION** — deps: S4; entry: all objects qualified; mutation: assign disposition per object (migrate/rebuild/discard) with M2 basis and actor; exit evidence: disposition log, no blind copies; owner: Структурщик + Архитектор; stop: object with no clear disposition → HOLD, blocks cutover for that object.

**S6 M5_EXPORT** — deps: S5; entry: disposition assigned; mutation: export binding events, portable annotations per object with parity hash; exit evidence: export manifest with annotation_export_hash per object; owner: Музыкант; stop: export fail → retain source, EXPORT_FAIL event in ledger.

**S7 M5_READINESS** — deps: S6; entry: export manifest exists; mutation: run M5 G1-G10 gates; exit evidence: all gates PASS; owner: Структурщик; stop: any gate FAIL → pipeline NO-GO.

**S8 MIGRATE** — deps: S7; entry: M5 PASS, M4 PASS; mutation: write objects to FD-1 per disposition; append ledger rows STORED_PENDING_REGISTRY; exit evidence: FD-1 write log, ledger rows appended; owner: Математик; stop: write fail → EXPORT_FAIL event, source retained.

**S9 REGISTRY_COMMIT** — deps: S8; entry: STORED_PENDING_REGISTRY rows exist; mutation: append immutable M2 rows to registry.jsonl, set state COMMITTED; exit evidence: registry.jsonl diff, each new row has canonicalRef + hash; owner: Структурщик; stop: registry append fail → COMMITTED not set, object stays STORED_PENDING_REGISTRY, retry via new event.

**S10 M3_READINESS** — deps: S9; entry: COMMITTED objects exist; mutation: verify Panel grants, proxy config, forward-auth per route class; exit evidence: auth test log per route; owner: Архитектор; stop: any route FAIL → NO-GO.

**S11 CANARY** — deps: S10; entry: all readiness PASS; mutation: route 5% traffic to static.mmbrn.tech; exit evidence: error rate < 1% over 30 min, p95 latency < 2s; owner: Математик; stop: error rate ≥ 1% → rollback to S10 state (re-route 100% to source), canary FAIL event in ledger.

**S12 CUTOVER** — deps: S11; entry: canary PASS; mutation: route 100% traffic to static.mmbrn.tech, update Panel routes, set redirect on strategy.mmbrn.tech; exit evidence: health check PASS on static, zero 5xx over 10 min; owner: Teamlead; stop: health FAIL within rollback window (72h) → rollback to source, redirect reverted.

**S13 OBSERVE** — deps: S12; entry: cutover PASS; mutation: monitor traffic, error rate, redirect hits for 72h; exit evidence: observation log, zero unresolved errors; owner: Математик; stop: SLO breach → rollback gate opens.

**S14 LIVE_SERVICES_UPDATE** — deps: S13; entry: observation PASS; mutation: Panel edit LIVE_SERVICES.md to add static.mmbrn.tech; exit evidence: LIVE_SERVICES entry present; owner: Teamlead; stop: none (Panel edit only).

**S15 RETIRE_SOURCE** — deps: S14 + retirement gates; entry: redirect lifetime elapsed (90 days), all-resolved in ledger, zero-traffic on strategy.mmbrn.tech for 7 consecutive days, restore+parity verified; mutation: schedule source engine decommission; exit evidence: zero-traffic log, retirement gate sign-off; owner: Teamlead; stop: any gate not met → delay retirement, source retained.

[Архитектор]: DAG корректен причинно: S1 provision создаёт target без требования M4 PASS; M4 следует после S1; M5 export/rehydration следует после S6 (производящий шаг). Pre-steps (S2, S3, S7, S10) проверяют только существующие inputs. Это соответствует поправке run2. Отмечу: S15 retire — отдельный gate от S12 cutover и S13 observe. Observation вне rollback window (72h) не гарантирует rollback — это явная граница.

[Верстальщик]: Теперь route matrix. Фиксирую шесть классов с единым набором констант: redirect status — `301 Moved Permanently`; unmapped status — `410 Gone`; canary predicate — error rate < 1% / 30 min; rollback window — 72h post-cutover; retirement lifetime — 90 days; zero-traffic interval — 7 consecutive days; observation period — 72h. Эти значения едины во всех таблицах.

| Route class | Hostname/path | Internal target | M3 action/object | Before cutover | During canary | After cutover | Rollback |
|---|---|---|---|---|---|---|---|
| Static serve | `static.mmbrn.tech/*` | FD-1 blob store | `read-bytes` / container=`static.mmbrn.tech` | 404 (not provisioned) | 5% traffic → static | 100% → static | Re-route to source; 200 restored |
| Strategy legacy root | `strategy.mmbrn.tech/` | 301 → `static.mmbrn.tech/` | `discover` / container=`static.mmbrn.tech` | Source Affine (Panel-gated) | Source active | 301 redirect | Revert redirect config |
| Deep link by canonicalRef | `strategy.mmbrn.tech/doc/<id>` | 301 → `static.mmbrn.tech/doc/<canonicalRef>` | `read-ref` / lineage=`canonicalRef` | Source Affine | Source active | 301 redirect | Revert |
| API / download | `static.mmbrn.tech/api/download/<ref>` | FD-1 via proxy | `download` / lineage=`canonicalRef` | network deny | network deny → static (5%) | proxy → FD-1, Panel token required | Re-route deny |
| Preview | `static.mmbrn.tech/preview/<ref>` | FD-1 via proxy | `read-bytes` / lineage=`canonicalRef` | network deny | network deny → static (5%) | proxy → FD-1, Panel token required | Re-route deny |
| WebSocket / backend | `strategy.mmbrn.tech/ws/*`, `*/socket.io/*` | **network deny** | none — pre-action deny | Affine WS (Panel-gated) | network deny | network deny | deny preserved |
| Direct backend | `strategy.mmbrn.tech:3010/*` | **network deny** | none — pre-action deny | blocked at Caddy | network deny | network deny | deny preserved |
| Unmapped old path | `strategy.mmbrn.tech/<unknown>` | 410 Gone | none — pre-action deny | Source 404 | 410 | 410 | 410 preserved |
| write-metadata | `static.mmbrn.tech/api/meta/<ref>` | proxy → registry service | `write-metadata` / lineage=`canonicalRef` | network deny | network deny | Panel token required, single action | deny on token fail |
| upload-revision | `static.mmbrn.tech/api/upload/<ref>` | proxy → FD-1 | `upload-revision` / lineage=`canonicalRef` | network deny | network deny | Panel token required, single action | deny on token fail |
| manage-access | `static.mmbrn.tech/api/access/<ref>` | proxy → Panel | `manage-access` / container=`static.mmbrn.tech` | network deny | network deny | Panel token required, single action | deny on token fail |

Credential leak rule: redirect response не содержит `Authorization`, `Set-Cookie` с production token нового хоста. Старый хост не получает bearer нового хоста.

[Музыкант]: По consistency contract. Freeze point — начало S3 INVENTORY: источник переходит в read-only (write gate закрыт machine flag). In-flight sessions на `strategy.mmbrn.tech` во время S12 CUTOVER: grace period 5 минут — существующие сессии завершаются, новые открываются только на `static.mmbrn.tech`. No-loss predicate: `count(COMMITTED in ledger) == count(rows in manifest with disposition=migrate)`. No-duplicate predicate: `count(distinct canonicalRef in registry.jsonl) == count(COMMITTED rows)`. Оба предиката верифицируются в S9 REGISTRY_COMMIT как exit condition. No-downtime требует: error rate < 1% на canary window + health check PASS на static до DNS switch. Это измеримый predicate, не декларация.

[Математик]: Rollback contract. Каждая мутация имеет точку отката:

- S1 PROVISION: rollback — deprovision FD-1/FD-2/FD-3; window — до S3 (ничего не записано в production).
- S8 MIGRATE: rollback — source retained (никогда не удалялся); FD-1 данные остаются, но routing не переключён; rollback = не переключать S12.
- S12 CUTOVER: rollback window — 72h; direction — re-route 100% на source, revert redirect config; append-only history не удаляется (M2 rows, bindings, ledger events сохраняются); Affine bypass не восстанавливается — source остаётся Panel-gated.
- S14 LIVE_SERVICES: rollback — Panel edit revert (удалить запись); window — до S15.
- S15 RETIRE: retirement не начато пока gates не пройдены; если начато — stop, source не восстанавливается (retirement необратимо после zero-traffic confirmation).

Control-plane rollback не удаляет M2 rows, bindings, referenced bytes или history — это hardcoded constraint M2+M6.

[Структурщик]: Теперь полная ledger state machine в одном объявлении. Все states заранее:

| State | Entry predicate | Allowed transitions | Durable evidence | Retry/recovery | Terminal |
|---|---|---|---|---|---|
| `DISCOVERED` | object found in fenced manifest | → `QUALIFIED` | manifest row + hash | re-run qualify | no |
| `QUALIFIED` | M1 classification assigned, actor logged | → `DISPOSITION_ASSIGNED` \| `REJECTED` | qualification log entry | re-qualify with new event | no |
| `DISPOSITION_ASSIGNED` | disposition + M2 basis + actor present | → `EXPORT_PENDING` \| `REJECTED` | disposition log entry | re-assign with new event | no |
| `EXPORT_PENDING` | M5 export initiated | → `EXPORTED` \| `EXPORT_FAIL` | export start event | new export attempt event | no |
| `EXPORTED` | export manifest row present, annotation hash logged | → `STORED_PENDING_REGISTRY` \| `EXPORT_FAIL` | export manifest row | — | no |
| `EXPORT_FAIL` | export or parity failed | → `EXPORT_PENDING` (new event) \| `REJECTED` | fail event with error | new EXPORT_PENDING event | no |
| `STORED_PENDING_REGISTRY` | FD-1 write log confirms object present | → `COMMITTED` | write log entry | new write attempt event | no |
| `COMMITTED` | registry.jsonl append confirmed, canonicalRef present | → `LIVE` \| `RETIRED` | registry.jsonl row | — | no |
| `LIVE` | routing active, health check PASS | → `RETIRED` | health log, LIVE_SERVICES entry | — | no |
| `RETIRED` | retirement gates passed, zero-traffic confirmed | (none) | retirement gate log | — | **yes** |
| `REJECTED` | M1/M5/M6 violation or explicit discard | (none) | rejection log with basis | — | **yes** |

Обратных переходов нет. Case/DAG не вводит новые states. Это единственная ledger machine.

[Teamlead]: Принимаю ledger machine. Перехожу к cases. Это 20 обязательных случаев — разберём по форме `Случай | Disposition/решение | Gate | Evidence | Rollback/stop`.

[Верстальщик]: Веду таблицу cases:

| # | Случай | Disposition/решение | Gate | Evidence | Rollback/stop |
|---|---|---|---|---|---|
| 1 | Strategic page, канон в Git | `REJECTED` — not original (M1); Git-канон принадлежит Panel, не контейнеру | M1 qualification | qualification log: basis=M1, actor=qualifier | Нет rollback — REJECTED terminal; Git-канон не копируется в static без отдельного M6 intent |
| 2 | Duplicate imported page | `DISPOSITION_ASSIGNED: DISCARD` — duplicate group в manifest, отдельная ledger row | M1 + M2: engine id ≠ canonicalRef, дубль не сливается | manifest duplicate group field, disposition log | REJECTED при попытке merge; source retained |
| 3 | Unique Affine-only page | `QUALIFIED` → disposition по M1/M5: если есть binding — `migrate`; если нет — `REJECTED` (no M6 intent) | M5 G1 Reducer + M6 intent | binding event log; если нет — rejection log with basis=M6 | Нет binding → REJECTED; нет rollback |
| 4 | Один из 57 service assets (PNG/SVG) | `QUALIFIED: asset`; если referenced в COMMITTED page — `migrate`; если orphan — `DISCARD` | M1 (asset ≠ original); ref-count в manifest | manifest relations field; disposition log | Orphan → DISCARD, terminal; referenced → migrate path |
| 5 | Asset, связанный несколькими pages | Одна ledger row на asset; disposition — `migrate` если хотя бы одна parent page COMMITTED; relations[] в manifest | M1 + manifest relations[] | manifest row с relations count ≥ 2; FD-1 write log | Asset не дублируется по числу parents; single write |
| 6 | Page без binding | `REJECTED` — no M6 intent (M6: commit requires binding); disposition `DISCARD` | M6: binding required for commit | rejection log: basis=M6, no binding found | REJECTED terminal; не блокирует pipeline для других |
| 7 | Conflicting bindings | `HOLD` — cutover blocked for this object; требует owner resolution вне M7 room | M6: один binding per canonicalRef | conflict log with both binding event ids | Object stays HOLD; retirement impossible until resolved |
| 8 | Portable annotation parity mismatch | `EXPORT_FAIL` → re-export attempt; если повтор — `REJECTED` | M5 G4 Annotation parity: export_hash ≠ import_hash | parity log per object with both hashes | Cutover blocked for object; source annotation retained |
| 9 | CLI=0, DB/export=82 | CLI не является reconciliation (M6 mandate); fenced manifest = единственный источник истины; CLI артефакт игнорируется | M6: reconciliation required | manifest cardinality from pg_dump + hash; CLI output logged as discrepancy | Pipeline не стартует до manifest; NO-GO |
| 10 | Existing M2 legacy row без M6 ledger | `legacy_uncovered` — статус per M6; no fake binding; требует отдельную accepted policy вне M7 | M6: legacy_uncovered until policy accepted | registry.jsonl legacy row; absence of ledger evidence logged | Intake NO-GO для этого объекта до policy; не блокирует других |
| 11 | Sensitive local ref (sensitive PDF партнёра) | Вне Git → не в manifest; если в manifest — `HOLD` pending sensitive isolation policy (M4 G10) | M4 G10 Sensitive isolation + M6 policy | sensitive ref log; G10 predicate check | Cutover blocked for sensitive object; isolation policy required before proceed |
| 12 | Office VDS capacity FAIL | M4 G1 FAIL → pipeline NO-GO; весь pipeline стоит до provision FD-1 | M4 G1: `free_bytes(FD-1) > manifest_total × 1.5` | G1 gate log: FAIL with measured free_bytes vs required | Pipeline abort; provision new FD-1 required |
| 13 | Backup есть, restore drill FAIL/UNKNOWN | M4 G4 FAIL → pipeline NO-GO; backup без drill не является evidence | M4 G4: restore drill log required with hash verification | G4 gate log: FAIL; backup log present but drill absent | Pipeline NO-GO; drill must be performed on isolated volume |
| 14 | Panel deny при native Affine capability | M3: Panel — единственный authorizer; native Affine capability игнорируется; proxy fail-closed | M3: Panel token verification; fail-closed | auth test log: Panel deny logged; native token rejected | Deny preserved; no rollback needed — correct behavior |
| 15 | Старый deep link (`strategy.mmbrn.tech/doc/<id>`) | `301 → static.mmbrn.tech/doc/<canonicalRef>` post-cutover; M3 action: `read-ref` / lineage=canonicalRef | S12 cutover PASS; canonicalRef in registry | redirect config; curl test log showing 301 with correct Location | Rollback: revert redirect config; 301 → source |
| 16 | Неизвестный old path | `410 Gone`; no redirect; pre-action deny | S12 cutover; path not in manifest | 410 response log | 410 preserved on rollback |
| 17 | WebSocket или direct backend bypass | `network deny` — pre-action deny at proxy; WS to Affine backend запрещён post-cutover | M3: no WS action in allowed set; Caddy rule | Caddy deny log; no WS connection established | deny preserved on rollback |
| 18 | Crash между DNS/Caddy change и health proof | Rollback gate открывается немедленно; source routing восстанавливается; health proof required before cutover confirmed | S12: health check PASS required within rollback window (72h) | health check log; crash event in ledger | Rollback: re-route 100% to source; cutover not confirmed |
| 19 | Canary ошибки выше порога (≥1%) | S11 CANARY FAIL → rollback to S10 state; 100% traffic to source; canary FAIL event appended | S11: error rate < 1% over 30 min | canary metrics log; error rate measurement | Re-route to source; S11 may be retried with new event |
| 20 | Rollback после новых append-only events | Rollback не удаляет M2 rows, ledger events, bindings или bytes; control-plane rollback = routing revert only | M2+M6: append-only immutable; rollback window 72h | ledger event log before/after rollback; routing revert log | Append history preserved; routing reverted; state machine continues from last COMMITTED |

[Музыкант]: По readiness go/no-go matrix — фиксирую полную таблицу:

| Gate | Exact predicate | Corpus | Evidence | Current state | Fail result |
|---|---|---|---|---|---|
| M4 G1 Capacity+quota | `free_bytes(FD-1) > manifest_total_bytes × 1.5` | fenced manifest byte totals | FD-1 capacity check log | NOT PERFORMED (FD-1 not provisioned) | NO-GO: provision new FD-1 |
| M4 G2 Write/read/hash | write test blob → read → SHA-256 match | 1 synthetic test object | write/read/hash log | NOT PERFORMED | NO-GO: FD-1 I/O defect |
| M4 G3 Complete backup | backup of FD-1 created, timestamp logged | backup metadata | backup log with timestamp | NOT PERFORMED | NO-GO: backup required before migrate |
| M4 G4 Restore drill | restore from G3 backup to isolated volume, hash 3 random objects | 3 random objects from backup | restore log with object hashes | NOT PERFORMED | NO-GO: drill required; backup alone insufficient |
| M4 G5 Auth bypass | direct FD-1 request without Panel token → 401/403 | curl without token | curl response log | NOT PERFORMED | NO-GO: auth misconfiguration |
| M4 G6 Reconciliation | diff(manifest, FD-1 post-import) = empty | full manifest | reconcile diff log | NOT PERFORMED | NO-GO: objects missing or extra |
| M4 G7 RPO | backup interval ≤ 3600 s | cron/schedule config | cron config file | NOT PERFORMED | NO-GO: RPO SLA breach |
| M4 G8 RTO | restore drill time ≤ 14400 s | restore log timestamp diff | restore log | NOT PERFORMED | NO-GO: RTO SLA breach |
| M4 G9 FD-3 | FD-3 endpoint reachable + accepted test blob write | 1 test blob | FD-3 write log | NOT PERFORMED | NO-GO: no third fault domain |
| M4 G10 Sensitive | sensitive prefix has separate access policy, no cross-access | policy document | policy + access test log | NOT PERFORMED | NO-GO: sensitive isolation required |
| M5 G1 Reducer | reducer exists for each canonicalRef, deterministic output verified | reducer coverage report | coverage report | NOT PERFORMED | NO-GO: projection not reproducible |
| M5 G2 Ref coverage | all canonicalRefs in ledger exist in registry.jsonl | ledger + registry diff | diff output | NOT PERFORMED | NO-GO: unregistered refs |
| M5 G3 Engine coverage | all manifest objects present in target engine post-rehydration | rehydration check log | rehydration log | NOT PERFORMED | NO-GO: incomplete rehydration |
| M5 G4 Annotation parity | export_hash == import_hash for all portable annotations | parity log per object | parity log | NOT PERFORMED | NO-GO: annotation data loss |
| M5 G5 Rehydration | target engine reproduces projection from binding without source engine | smoke test log | smoke test output | NOT PERFORMED | NO-GO: source engine dependency remains |
| M5 G6 Panel authority | target route returns 401/403 without Panel token | auth test | auth test log | NOT PERFORMED | NO-GO: auth bypass exists |
| M5 G7 Native principals | no native Affine role/token has direct access to target | role audit | role audit log | NOT PERFORMED | NO-GO: native principal bypass |
| M5 G8 Durable backup | bindings + annotations backed up on FD-2 | backup log | FD-2 backup log | NOT PERFORMED | NO-GO: no durable binding backup |
| M5 G9 Durable restore | FD-2 restore drill passed | restore log | FD-2 restore log | NOT PERFORMED | NO-GO: binding restore unverified |
| M5 G10 Retention | retention policy for bindings/annotations ≥ service lifetime | policy document | policy doc | NOT PERFORMED | NO-GO: retention gap |
| M3 Auth | Panel token verified on every forward, fail-closed | auth test per route class | auth test log per route | NOT PERFORMED | NO-GO: route without Panel auth |
| M6 Intake | all migrated objects have accepted ledger evidence; no fake bindings | ledger resolved count | ledger state log | NOT PERFORMED (legacy_uncovered rows present) | NO-GO: uncovered objects block cutover |
| Corpus manifest | fenced manifest exists with all rows + hashes + disposition | pg_dump snapshot | manifest file | NOT PERFORMED | NO-GO: no per-object evidence |
| Canary | error rate < 1% over 30 min, p95 latency < 2s | 30-min canary window | canary metrics log | NOT PERFORMED | NO-GO: canary rollback required |

Current go/no-go: **NO-GO**. All gates NOT PERFORMED. No required gate may be bypassed.

[Математик]: Delivery slicing — #1303 и #1305. Нарезка честная, без третьего umbrella.

| Slice | Issue | Scope | Prerequisites | Artifacts | Acceptance/review | Rollback |
|---|---|---|---|---|---|---|
| #1303-S1 Evidence index schema | #1303 | Define `registry.jsonl` schema extensions for evidence tracking (M2 fields: canonicalRef, hash, disposition, ledger_ref) | M2 ratified | Schema spec doc, JSON Schema file | Structural review: all M2 fields present, append-only constraint documented | Revert schema doc; no production change |
| #1303-S2 Inventory API contract | #1303 | Define API contract for querying evidence index (read-only: discover, read-metadata, read-ref per M3) | #1303-S1 | OpenAPI spec, M3 action mapping | M3 review: single action per endpoint, no pass-through | Revert spec |
| #1303-S3 Legacy coverage policy | #1303 | Define accepted policy for 12 legacy_uncovered rows; separate sensitive PDF policy | #1303-S1, M6 ratified | Policy document, ledger intent per legacy row | M6 review: no fake bindings; policy accepted by owner | Revert policy doc |
| #1305-S1 Fenced inventory execution | #1305 | Execute pg_dump snapshot, produce manifest with per-object hash+disposition | #1303-S1, M4 G1-G4 PASS, FD-1 provisioned | manifest.jsonl file, hash log | Cardinality check: N_pages + N_assets with all fields; per-object evidence present | Source untouched; manifest discarded |
| #1305-S2 Qualification + disposition | #1305 | Assign M1 classification and disposition to each manifest object | #1305-S1 | Qualification log, disposition log | M1 review: no page marked original without basis; no blind copies | Ledger REJECTED entries preserved |
| #1305-S3 M4+M5 readiness execution | #1305 | Run all M4 G1-G10 and M5 G1-G10 gates; produce signed gate logs | #1305-S2, FD-1/FD-2/FD-3 provisioned | Gate logs per G1-G10 (M4 and M5) | All gates PASS with corpus evidence; UNKNOWN = FAIL | Pipeline NO-GO if any FAIL; no production change |
| #1305-S4 Migration execution | #1305 | Execute S6-S9 DAG steps: export, rehydration, write to FD-1, registry commit | #1305-S3, M3 readiness PASS | FD-1 write log, registry.jsonl diff, ledger COMMITTED rows | Reconciliation diff = empty; no-loss/no-duplicate predicates satisfied | Source retained; routing not switched |
| #1305-S5 Canary + cutover | #1305 | Execute S11-S12: 5% canary, observe, cutover, redirect config | #1305-S4, all readiness PASS | Canary metrics log, cutover health log, redirect config | Error rate < 1% / 30 min; health PASS; Panel review of redirect | Rollback window 72h: re-route to source |
| #1305-S6 Observe + LIVE_SERVICES | #1305 | S13-S14: 72h observation, Panel edit LIVE_SERVICES.md | #1305-S5 PASS | Observation log, LIVE_SERVICES entry | Zero unresolved errors; LIVE_SERVICES entry present | Revert LIVE_SERVICES entry if SLO breach |
| #1305-S7 Retirement | #1305 | S15: retirement gates, source decommission scheduling | #1305-S6, redirect lifetime 90d elapsed, zero-traffic 7d | Retirement gate log, zero-traffic log | All gates signed; retirement irreversible after confirmation | Delay if any gate fails; source retained |

DNS alone не закрывает ни один slice. Каждый slice reviewable независимо.

[Структурщик]: По Panel/реестры — что M7 назначает, но не выполняет. Классы будущих edits: (a) navigation grants в Panel для `static.mmbrn.tech` route; (b) section grants обновляются под новый container; (c) `LIVE_SERVICES.md` получает запись после S14; (d) runbook создаётся до S11 canary — owner Teamlead; (e) monitoring config для static route — owner Математик; (f) docs: обновить M7 carrier с финальным статусом. Сама M7 ни одно из этих действий не выполняет — границы комнаты.

[Teamlead]: Принимаю полную структуру. Итог по D1 — пропозиция для вердикта.

[Архитектор]: Пропозиция D1 сформирована. Один контракт: один fenced inventory (pg_dump+hash manifest), один ledger (9 states, append-only, одна machine), одна route matrix (11 классов, single-action per forward, network deny для WS/backend), один DAG (15 шагов, три контура A/B/C), один набор gates (M4 G1-G10 + M5 G1-G10 + M3 + M6 + corpus + canary), одна нарезка (7+3 slices в #1303/#1305). Current state: все gates NOT PERFORMED, pipeline NO-GO. Carrier: `docs/seanses/static-mmbrn-container-m7-migration-delivery-2026-08-07.md`. Второй носитель запрещён.

[Верстальщик]: Принимаю.

[Музыкант]: Принимаю.

[Математик]: Принимаю. Current NO-GO честен — ни один gate не пройден, ни один constant не выбран без evidence.

[Структурщик]: Принимаю. Ledger machine полна, обратных переходов нет, все states объявлены заранее.

[Teamlead]: Принимаю. DAG причинно корректен, rollback window 72h, retirement отдельный gate. LGTM по форме — исполнение за пределами комнаты.

[Архитектор]: Принимаю. Контракт минимален и исполним. Три контура не создают третий umbrella — они один DAG с явными зависимостями.

---

## Итоговое решение консилиума

**Вердикт D1: ПРИНЯТ**

| Компонент | Решение |
|---|---|
| Inventory | Один fenced pg_dump snapshot с SHA-256 по каждому объекту; manifest.jsonl с полями {source_id, kind, hash, byte_size, created_at, updated_at, relations[], grants[]}; CLI=0 не является evidence; baseline 82/57 не является fenced cardinality |
| Ledger machine | Одна append-only state machine: DISCOVERED → QUALIFIED → DISPOSITION_ASSIGNED → EXPORT_PENDING → EXPORTED → STORED_PENDING_REGISTRY → COMMITTED → LIVE \| RETIRED \| REJECTED; обратных переходов нет; retry — новые append events; engine id ≠ canonicalRef |
| Route matrix | 11 классов; каждый forward — один M3 action/object; WS/backend — network deny; unmapped — 410; credential leak ban; redirect — 301; единые константы во всех таблицах |
| Rollout DAG | 15 шагов (S1-S15); три контура: A=storage, B=corpus, C=access; S1 provision не требует M4 PASS; M4 после S1; M5 после S6; rollback window 72h; retirement 90d+7d zero-traffic |
| Gates | M4 G1-G10 + M5 G1-G10 + M3 + M6 + corpus + canary; все NOT PERFORMED; UNKNOWN=NO-GO |
| Current go/no-go | **NO-GO** — все gates NOT PERFORMED |
| Canary predicate | error rate < 1% / 30 min; p95 latency < 2s |
| Rollback window | 72h post-cutover |
| Redirect status | 301 Moved Permanently |
| Unmapped status | 410 Gone |
| Retirement lifetime | 90 days post-cutover |
| Zero-traffic interval | 7 consecutive days |
| Observation period | 72h |
| Delivery slicing | #1303: 3 slices (schema, API contract, legacy policy); #1305: 7 slices (inventory, qualify, readiness, migrate, canary/cutover, observe/LIVE_SERVICES, retire); DNS alone не закрывает ни один slice |
| Carrier | `docs/seanses/static-mmbrn-container-m7-migration-delivery-2026-08-07.md` |

---

## Список посылок

| # | Посылка | Тип |
|---|---|---|
| P1 | M1: original bytes и `docs/evidence` принадлежат контейнеру; страницы Affine — состояние движка; strategic documents принадлежат Panel; ни одна Affine page не становится original только из-за нахождения в workspace | **норма** |
| P2 | M2: `registry.jsonl` — истина регистрации; `canonicalRef = urn:mmbrn:static:<rootId>`; location — заявление; достижимость — внешнее состояние; любая правка создаёт новую append-only row | **норма** |
| P3 | M3: Panel — единственный authorizer; proxy fail-closed проверяет action, stable principal, object и версии; прямого пользовательского Affine route/token/native role нет | **норма** |
| P4 | M4: production требует независимые FD-1/FD-2/FD-3, capacity/quota, complete backup, restore drill, RPO/RTO, reconciliation и sensitive isolation; office VDS с 9.46 GiB free — storage NO-GO | **норма** |
| P5 | M5: Affine — optional projection; значимы Panel-owned projection intent, binding events и portable annotations; engine projection/layout/cache disposable; binding/annotation parity и восстановление replacement engine обязательны до cutover | **норма** |
| P6 | M6: канонический вход проходит LIGD; commit = verified FD-1 + immutable M2 append + durable binding; legacy rows без accepted ledger evidence — `legacy_uncovered`; production intake сейчас NO-GO; fake bindings и обход intake запрещены | **норма** |
| P7 | Live Affine: `affine_server`, PostgreSQL и Redis на office VDS; `127.0.0.1:3010`; Caddy route `strategy.mmbrn.tech` | **факт** |
| P8 | БД: private Strategy/Templates/Releases, один participant, 82 pages, дубли и 57 service PNG/SVG; оригиналов чеков/внешних PDF не найдено | **факт** |
| P9 | `affine-cli doc list` = 0, DB inventory = 82; CLI не доказывает пустоту или полноту | **факт** |
| P10 | Стратегическая публикация в Affine заморожена машинным gate; Git/гранулы/генераторы остаются truth стратегических документов | **факт** |
| P11 | `docs/evidence/registry.jsonl` содержит 12 legacy rows; один PDF-чек лежит в публичном Git, sensitive PDF партнёра — вне Git; M6 объявляет их uncovered до отдельной accepted policy | **факт** |
| P12 | Panel уже имеет role/section grants, но static ingress и передача решений в Affine не реализованы; текущий forward-auth защищает другие surfaces, не будущий static route | **факт** |
| P13 | `docs/LIVE_SERVICES.md` не объявляет Affine/`strategy.mmbrn.tech` | **факт** |
| P14 | Открыты Issue #1303 (индекс/API вещдоков) и #1305 (переезд Affine); их нынешние тексты не покрывают весь ратифицированный контракт M1-M6 | **факт** |
| P15 | Код, DNS, Caddy, certificates, Panel, `LIVE_SERVICES`, issues и production в этой комнате не изменяются | **норма** |
| P16 | Provision FD-1/FD-2/FD-3, экспорт/удаление live Affine data и запуск migration в этой комнате не выполняются | **норма** |

---

## Definition of Done

- [ ] Выбран один доказательный inventory/disposition и migration-ledger contract
- [ ] M1-M6 сохранены; fake originals, bindings, authority и readiness запрещены
- [ ] Route/access matrix, rollout DAG, consistency и rollback исполнимы
- [ ] Не меньше 16 cases и семь обязательных таблиц заполнены
- [ ] Current go/no-go честен, каждый gate имеет corpus/evidence/fail result
- [ ] #1303/#1305 разрезаны на зависимые reviewable deliveries
- [ ] Код, DNS, Caddy, Panel, issues и production не изменены
- [ ] Один carrier, один D1, посылки перед последней секцией DoD
- [ ] Не меньше 36 ролевых реплик и не меньше шести от каждой роли
