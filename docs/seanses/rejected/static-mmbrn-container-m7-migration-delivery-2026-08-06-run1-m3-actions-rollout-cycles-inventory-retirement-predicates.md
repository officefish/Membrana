<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-08-06T17:40:56.667Z |
| Команда | `yarn consilium` |
| Модель | xai/grok-4.5 |
| Файл | `docs/seanses/static-mmbrn-container-m7-migration-delivery-2026-08-06.md` |
| Порядок ролей | Верстальщик → Структурщик → Teamlead → Математик → Музыкант → Архитектор |
| Повестка | `docs/meeting/static-mmbrn-container/M7_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs/meeting/static-mmbrn-container/M7_AGENDA.md` | 11316 | `e03737e7f990` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs/meeting/static-mmbrn-container/M7_AGENDA.md` | 11316 · 1 п. | `e03737e7f990` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --no-memory --min-replies 36 --seed 707`

**Вопрос:**

Решите единственный вопрос D1 повестки M7: выберите один исполнимый и проверяемый контракт переезда и доставки, покройте все обязательные решения, таблицы и случаи, не выполняя production-изменений.

---

# Консилиум: M7 D1 — контракт переезда и доставки strategy→static

**Повестка:** D1 — один минимальный исполнимый контракт переезда и доставки `strategy.mmbrn.tech -> static.mmbrn.tech`: доказательный инвентарь 82 pages / 57 assets, disposition по каждому объекту, M3–M6 readiness, перенос только законных состояний, переключение Panel/proxy/Caddy/DNS и старых ссылок без обхода authority, cutover/rollback, `LIVE_SERVICES`, нарезка #1303/#1305.

**Участники:** Teamlead (Tarasov), Архитектор (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Верстальщик → Структурщик → Teamlead → Математик → Музыкант → Архитектор

**Carrier:** `docs/seanses/static-mmbrn-container-m7-migration-delivery-2026-08-06.md`

---

[Верстальщик]: Пользователь сейчас открывает `strategy.mmbrn.tech` как Affine UI. После cutover тот же жест должен вести на `static.mmbrn.tech` через Panel-owned surface: список объектов, preview/download, статус binding — без native Affine chrome и без «магических» deep-link, которые обходят authorizer. Empty/loading/error на canary — отдельные честные состояния, не спиннер «почти готово».

[Структурщик]: Граница пакетов жёсткая: migration ledger живёт рядом с evidence-контуром, не внутри Affine engine и не в Panel UI-сторе. Публичные имена: `MigrationLedger`, `SourceObjectRef`, `Disposition`, `CutoverGate`. Engine id — только `sourceRef`; `canonicalRef` выдаёт M2 после M6 commit, никогда из UUID страницы. Прямой импорт Affine SDK в static-ingress — `нарушена слабая связанность`.

[Teamlead]: Планка: один rollout DAG, один ledger, одна route matrix, один набор machine gates. Blind copy 82 pages — BLOCK. Текущий матч — контракт и нарезка #1303/#1305, не DNS. Связка: Архитектор держит форму, Математик — predicates/reconciliation, Структурщик — API границ, Музыкант — freeze/stream/session fence, Верстальщик — surface после cutover. Production в этой комнате не трогаем.

[Математик]: Inventory truth = read-only snapshot с bounded consistency cut: PostgreSQL transaction snapshot (или `pg_export_snapshot`) + content hash каждого blob/page payload + asset sha256 + parent relation edges + native grant rows + timestamps. CLI `doc list = 0` при DB `82` — вероятность «пустоты» равна нулю; CLI не входит в proof corpus. Reconciliation: `|DB pages| = |export pages| = |ledger observed|` exact; any delta → NO-GO.

[Музыкант]: Affine держит live sessions, WebSocket и cache как «звук в кабеле» — disposable. Между snapshot и cutover нужен write-fence: freeze strategic writes (уже есть machine gate), запрет native token выдачи, drain in-flight WS. Потеря layout/cache/session допустима; потеря portable annotation или binding event — нет. No-downtime без error-budget — пустой звук; метрика availability на canary обязательна.

[Архитектор]: Конструкция D1: **Migration Delivery Contract v1** — append-only migration ledger + disposition dictionary + route/access matrix + rollout DAG `provision → dry-inventory → export/snapshot → migrate/rebuild → reconcile → canary → cutover → observe → retire`. Affine остаётся optional projection (M5); originals только через M6 LIGD; Panel — единственный authorizer (M3). Office VDS 9.46 GiB free — storage NO-GO до FD-1/FD-2/FD-3. Рекомендую эту форму как единственную модель.

[Верстальщик]: Deep link со старого hostname: пользователь видит либо 301/302 на canonical static path с тем же object gate, либо честный deny-page «нет доступа / объект не перенесён», без Affine login form. Неизвестный old path — не 200 с пустым workspace. Certificate/DNS glitch на canary — banner operator-only, не user-facing «попробуйте позже» без кода ошибки.

[Структурщик]: Disposition — закрытый enum, не свободный текст: `discard`, `retain_export_evidence`, `rebuild_projection`, `register_original_via_m6`, `migrate_portable_state`, `manual_review`. Каждое значение — словарная статья с actor + M-основание + evidence ref. Duplicate group ключ = content hash, не title. Asset, связанный N pages, — один source object, N referrers в ledger, disposition один.

[Teamlead]: Preconditions до первого write: M3 proxy fail-closed на future static route PASS; M4 G1–G10 PASS (сейчас office VDS FAIL → STOP); M5 G1–G10 binding/annotation parity PASS; M6 full-corpus readiness — legacy uncovered не маскировать. Unknown = NO-GO. Вердикт комнаты на сегодня: **NO-GO**, контракт пишем, лопату не даём.

[Математик]: State machine ledger (ровно одна): `observed → classified → disposition_assigned → fenced → exported → migrated_or_rebuilt → reconciled → terminal`. Terminal: `done_discard | done_evidence | done_projection | done_registered | done_portable | done_manual_blocked | failed_stopped`. Переход только при durable evidence row; crash → resume from last durable state, не re-observe с новым id. Engine id ∉ M2 id space.

[Музыкант]: Freeze strategy: T0 inventory fence → T1 export immutable bundle → T2 migrate/rebuild на target FD → T3 canary traffic shadow → T4 cutover DNS/Caddy. In-flight session после T0: read-only drain, write reject. Критерий no-lost-state: portable annotations и binding events 1:1 hash parity; engine projection допускается rebuild-from-intent. Session tokens после cutover invalid — ожидаемо.

[Архитектор]: Portable vs engine:

| Категория | Source | Destination | Rule | Loss policy |
|-----------|--------|-------------|------|-------------|
| originals/bytes | FD-1 / Git / local sensitive | FD-1 + M2 | только M6 LIGD | never silent drop |
| registry | registry.jsonl | registry.jsonl | append-only | no rewrite |
| projection intent | Panel | Panel | migrate/create | block cutover if missing for kept objects |
| binding events | Panel/M5 store | Panel/M5 | durable replay | block on conflict |
| portable annotations | Affine export subset | Panel portable store | migrate if parity schema | mismatch → manual_review |
| engine projection | Affine pages | new engine or none | rebuild or discard | disposable |
| layout/cache/session | Redis/Affine | — | discard | acceptable |
| strategic documents | Git/generators | Panel strategic | **не** copy as static original | Affine copy discard/evidence |

[Верстальщик]: Panel navigation/section grants после реализации (output, не действие комнаты): секция `static` / evidence browser, role-gated; убрать или пометить deprecated пункт Strategy-as-Affine. Operator runbook — checklist cutover с кодами stop. Мониторинг: latency, 5xx, auth deny rate, canary error budget. Публичная дока: hostname `static.mmbrn.tech`, не `strategy`.

[Структурщик]: Route classes — словарь: `static_ui`, `static_api`, `static_download`, `static_preview`, `legacy_strategy_ui`, `legacy_deep_link`, `legacy_api`, `ws_affine`, `direct_backend`. Internal target static — Panel/static ingress + FD read path; legacy после cutover — redirector only, never `127.0.0.1:3010` user-facing. Native credential leakage = FAIL gate.

[Teamlead]: Rollout DAG фиксирую как единственный порядок. Параллельность: только независимое provision FD-* **после** storage GO и dry-inventory tooling prep — без live export. Любой FAIL entry gate — stop rule владельца шага, эскалация Teamlead. #1303 и #1305 не закрываем DNS-ом; режем на reviewable slices.

[Математик]: Exact reconciliation predicates:
1. `count(ledger.observed.pages) = count(db.pages) = 82` (на fence snapshot)
2. `count(ledger.observed.assets) = 57`
3. ∀ object: terminal disposition assigned
4. ∀ `rebuild_projection|migrate_portable_state`: parity hash PASS
5. ∀ `register_original_via_m6`: M6 commit evidence exists (не fake)
6. zero ledger rows in non-terminal after migrate phase exit
Canary error rate ≤ ε (ε задаёт runbook, default 1% 5xx+auth-anomaly на окно 30m) else STOP.

[Музыкант]: Rollback direction: DNS/Caddy rollback → previous stable route config **with M3 gate still on**; never re-open bare Affine. Data plane: target FD writes remain as evidence; source Affine snapshot immutable. Append-only M2/M4/M5/M6 rows **не откатываются** — только compensating append. Crash между DNS change и health proof: auto-revert Caddy to last known good within rollback window (proposed 15m), page operator.

[Архитектор]: Старый hostname: после cutover — controlled redirect window (proposed 90 days) с mapping table deep-link → static canonical path where disposition retained; unmapped → 404/410 + log. Retirement old runtime/data: только после restore drill PASS, traffic evidence (legacy hits near zero), parity PASS. Certificate/DNS observability — separate check in observe step. Второй carrier запрещён; всё в M7 seanse file.

[Верстальщик]: Case UI: Panel deny при native Affine capability — пользователь видит deny Panel, не Affine ACL. Canary ошибки выше порога — operator surface red, user canary cohort rollback UX на stable. Strategic page с Git-каноном — в static UI не «документ из Affine», а link/ref на strategic surface Panel, Affine page → discard или retain_export_evidence.

[Структурщик]: Migration identity: `SourceObjectRef = { workspaceId, enginePageId|assetId, contentHash, snapshotId }`. Duplicate content → same duplicate_group, **separate** ledger rows per source id until disposition says discard extras. Запрет: merge records by hash into one M2 id без M6. Fake binding = создание binding без verified FD-1 + M2 append — BLOCK в code review gate slice.

[Teamlead]: Delivery slicing (зависимый plan, umbrella не закрывать):
- #1303-A inventory API/index read model
- #1303-B registry/query evidence API under M3
- #1305-A storage FD provision + M4 gates
- #1305-B migration ledger tooling + dry inventory
- #1305-C portable migrate/rebuild + reconcile
- #1305-D static ingress + Panel grants + route matrix
- #1305-E canary/cutover/redirect/LIVE_SERVICES
- #1303 depends on M2/M6 contracts; #1305-E depends on all prior PASS. Каждый slice: artifacts, acceptance evidence, rollback, review gate.

[Математик]: Inventory snapshot package (доказательный):
- `inventory.json` — pages/assets/grants/relations
- `hashes.sha256` — per payload
- `fence.json` — snapshot id, server time, tx id, operator
- `cli_contrast.json` — CLI count vs DB count (document CLI≠truth)
- `disposition_draft.jsonl` — pre-assign, human-ack for manual_review
Consistency cut: no writes accepted on source after fence flag; if write sneaks — invalidate snapshot, re-observe.

[Музыкант]: WebSocket/direct backend bypass case: default deny at Caddy; only loopback admin break-glass with audit, not user path. During canary, shadow path may hit new stack; old WS drained. Observe phase listens error budget + auth deny + unexpected 101 upgrades to Affine — any unexpected upgrade = STOP.

[Архитектор]: Final route matrix principle: before cutover `strategy` still serves Affine **but** strategic publish frozen; static may exist dark with deny-all except operator. During canary subset principals → static; after cutover `static` primary, `strategy` redirector. Rollback: static dark or limited, `strategy` restored under same freeze + forward-auth where applicable — **not** second authority. Panel remains sole authorizer always.

[Верстальщик]: LIVE_SERVICES update class (output реализации): hostname, owner, health URL, auth model `panel-m3`, dependency FD-1/2/3, runbook link. Не объявлять Affine как strategic editor. Public docs — одна схема «как открыть вещдок»; старые скриншоты strategy UI — archive banner.

[Структурщик]: Ledger durable evidence per transition: append-only JSONL file(s) on operator evidence store + checksum manifest. Retry: idempotent transition keys `(sourceRef, fromState, toState, attempt)`. Resume after crash: read tip per sourceRef, re-run action if not durable-acked. Reconciliation job — pure compare function + report artifact.

[Teamlead]: Go/no-go authorization: cutover только при all required gates PASS и письменном ack owner+Teamlead. Сейчас measured: M4 capacity FAIL, M6 legacy uncovered, static ingress absent, LIVE_SERVICES silent, CLI/DB contrast — **NO-GO**. Комната не поднимает лопату. LGTM на **контракт**; BLOCK на любое production-действие из M7 carrier.

[Математик]: Readiness gates (machine): 
- INV-1 snapshot fence complete
- INV-2 CLI≠DB documented, DB=export
- DISP-1 100% objects terminal-assigned (pre-migrate draft ack)
- M3-G all actions fail-closed tested
- M4-G1..G10 storage
- M5-G1..G10 parity/replacement
- M6-R full corpus policy (uncovered explicit)
- RTE-1 route matrix implemented+tested dark
- CNY-1 error budget
- CUT-1 health proof
- RBL-1 rollback drill
Unknown or FAIL → cutover forbidden.

[Музыкант]: No-downtime claim: **не обещаем zero downtime**. Обещаем: measurable freeze window for writes; read availability target during canary ≥ 99% на окне observe при error-budget; cutover switch ≤ declared RTO slice (proposed ≤ 15m control-plane). Lost sessions expected; lost bindings not. Explicit metric names in runbook output.

[Архитектор]: Закрываю форму D1 одной моделью: **MDC-v1** (Migration Delivery Contract v1) как выше. Альтернатива «поднять static рядом и скопировать workspace» отвергнута: цена — fake originals, authority split, M1–M6 break. Затронутые модули (будущей реализации, не сейчас): static ingress, Panel grants, evidence registry API, migration ledger tooling, Caddy/DNS ops, LIVE_SERVICES, issues #1303/#1305 slices.

[Верстальщик]: Case unknown old path: статичная страница 404/410 в design tokens Panel, код `static.legacy.unmapped`, без предложения «войти в Affine». Старый deep link mapped: redirect + preserve principal via Panel session, не token in query. A11y: deny/redirect pages клавиатурны, `aria-live` для canary status у operator.

[Структурщик]: Inventory/disposition table — колонки канона: `source_kind`, `source_id`, `classification`, `duplicate_group`, `destination`, `disposition`, `authority`, `evidence`. Classification: `strategic_git_canon | duplicate_import | affine_only_unique | service_asset | multi_ref_asset | unbound_page | binding_conflict | annotation | legacy_m2 | sensitive_local`. Authority всегда Panel для access; M6 owner для register-original.

[Teamlead]: Owners по DAG: provision/storage — Математик+ops slice; dry inventory — Математик/Структурщик; migrate — Структурщик+M5 owner; reconcile — Математик; canary/cutover — Teamlead ack + ops; Panel UI — Верстальщик; retire — Teamlead after evidence. Stop rule единый: gate FAIL → halt mutations, preserve ledger, page incident.

[Математик]: Case math: duplicate imported pages — same contentHash group; keep one `retain_export_evidence` or `rebuild_projection` if intent exists; extras `discard` after evidence ack. Conflicting bindings — no auto-merge; `manual_review`, cutover blocked for those objects. Rollback after new append-only events — compensate by new rows (`superseded`, `cutover_reverted`), never delete history.

[Музыкант]: Service assets 57 PNG/SVG: mostly engine chrome → `discard` or `retain_export_evidence` if needed for audit replay; multi-page asset — single disposition, referrers updated. Unique Affine-only page without original bytes — not auto-original; `manual_review` or `migrate_portable_state` if annotations only; register only with explicit M6 owner intent.

[Архитектор]: Sensitive local ref и Git public PDF-check: M6 `legacy_uncovered` до accepted policy — migration **не** создаёт binding «для красоты». Office VDS capacity FAIL — provision step entry gate fails; migration writes to office запрещены. Backup without restore drill = FAIL. Это не слова: predicates в readiness matrix.

[Верстальщик]: После observe: UI checklist — navigation section visible to granted roles only; download/preview pass M3 object gate; no WebSocket console to Affine from browser. Design: constructivist status chips `LIVE|CANARY|DARK|DENIED` tabular-nums на error budget.

[Структурщик]: #1303 slice home = evidence index/API; #1305 = migration/cutover. Запрет третьего umbrella issue. Dependency edge list в delivery table обязателен. Acceptance каждого slice — machine evidence path, не screenshot alone.

[Teamlead]: Итог связки принят. Пропозиция D1 = MDC-v1. Вердикт исполнения cutover: **NO-GO** до PASS всех gates. Вердикт комнаты на контракт: **принят**. Carrier один. Дальше — таблицы в решении, затем посылки, затем DoD.

[Математик]: Добавляю ε-canary default и RPO/RTO link to M4: cutover entry requires M4 RPO/RTO declared and last restore drill timestamp PASS. Snapshot fence clock skew bound ≤ 1s NTP; else re-fence.

[Музыкант]: Drain procedure explicit: reject new WS → wait idle ≤ N seconds → freeze writes → export. If idle timeout exceeded — force disconnect, mark sessions discarded, continue if portable parity still achievable.

[Архитектор]: Подтверждаю: M1–M6 не переопределены; pages ≠ originals; engine id ≠ canonicalRef; Panel authorizer; office VDS и legacy corpus без ложного PASS. Форма закрыта.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| D1 | Принят единый контракт **MDC-v1** (Migration Delivery Contract v1) |
| Carrier | `docs/seanses/static-mmbrn-container-m7-migration-delivery-2026-08-06.md` (второй запрещён) |
| Cutover сейчас | **NO-GO** (M4 capacity, M6 uncovered, ingress/LIVE_SERVICES/gates unknown/FAIL) |
| Модель копирования | Blind copy 82 pages **запрещён** |
| Authority | Panel only; native Affine user route/token **запрещены** |
| Production в комнате | Не изменяется |

### D1 — Migration Delivery Contract v1 (нормативная пропозиция)

**Определение.** MDC-v1 = (1) доказательный inventory snapshot + disposition dictionary, (2) append-only migration ledger/state machine, (3) portable/engine separation, (4) route/access matrix, (5) rollout DAG с machine gates, (6) consistency/freeze/rollback rules, (7) redirect/retirement policy, (8) Panel/LIVE_SERVICES output classes, (9) dependent delivery slices #1303/#1305, (10) go/no-go matrix. Реализация — вне этой комнаты.

---

### 1. Inventory truth

**Доказательный snapshot (единственный truth corpus):**
- PostgreSQL read-only inventory: workspaces, pages (82), assets (57), parent relations, visibility/native grants, timestamps
- Content/attachment hashes (sha256) per payload
- Bounded consistency **fence**: `fence_id`, DB snapshot/tx export id, NTP-bound server time, operator principal, write-freeze flag
- Export bundle checksum manifest
- `cli_contrast`: фиксирует `affine-cli doc list = 0` vs DB/export = 82 — CLI **не** proof emptiness/completeness

**Почему CLI 0 недостаточен:** CLI не реплицирует DB corpus; противоречие уже измерено; любой gate, опирающийся на CLI alone → FAIL.

**Exit evidence dry-inventory:** `inventory.json` + `hashes.sha256` + `fence.json` + `cli_contrast.json` + reconciliation report `db_count = export_count = ledger_observed_count`.

---

### 2. Disposition dictionary (закрытый)

| Code | Смысл | Основание | Actor |
|------|--------|-----------|-------|
| `discard` | не переносить в product state | M1/M5 disposable | migration operator + ack |
| `retain_export_evidence` | сохранить в evidence bundle, не original | M1/M2 location≠original | operator |
| `rebuild_projection` | восстановить engine projection from Panel intent | M5 | Panel/M5 owner |
| `register_original_via_m6` | original только через LIGD+M2+binding | M6 | object owner + M6 |
| `migrate_portable_state` | annotations/portable subset → Panel store | M5 | M5 owner |
| `manual_review` | стоп авто-миграции объекта | M1–M6 conflict | human reviewer |

Blind copy all pages ≡ нарушение контракта.

---

### 3. Migration ledger / state machine

**Identity:** `SourceObjectRef = {snapshotId, workspaceId, engineKind, engineId, contentHash}`  
Engine ids **не** становятся `canonicalRef` / M2 ids.  
Duplicate content → shared `duplicate_group`, separate rows.  
Fake M6 ledger/binding **запрещены**.

| State | Entry predicate | Allowed transition | Durable evidence | Retry/recovery | Terminal |
|-------|-----------------|--------------------|------------------|----------------|----------|
| `observed` | fence snapshot lists object | → `classified` | inventory row+hash | re-read snapshot | no |
| `classified` | classification assigned | → `disposition_assigned` | class+duplicate_group | reclassify rule | no |
| `disposition_assigned` | enum+actor+M-basis | → `fenced` | disposition ack | wait ack | no |
| `fenced` | source freeze covers object | → `exported` | fence ref | re-fence snapshot | no |
| `exported` | export bytes checksum OK | → `migrated_or_rebuilt` \| terminal discard path | export manifest | re-export idempotent | conditional |
| `migrated_or_rebuilt` | action per disposition done | → `reconciled` | dest hash/intent/binding refs | resume action | no |
| `reconciled` | exact parity predicates PASS | → terminal | reconcile report | re-run compare | no |
| `done_discard` | disposition discard | — | ack | — | yes |
| `done_evidence` | retain_export_evidence | — | evidence URI | — | yes |
| `done_projection` | rebuild_projection parity | — | projection id+hash | — | yes |
| `done_registered` | M6 commit verified | — | M2 row+binding+FD-1 | — | yes |
| `done_portable` | portable parity | — | annotation set hash | — | yes |
| `done_manual_blocked` | manual_review unresolved | — | review ticket | — | yes (blocks cutover if in critical set) |
| `failed_stopped` | gate/action FAIL | resume→prior durable | incident id | backoff+manual | soft terminal |

---

### 4. Preconditions (machine; unknown = NO-GO)

До **первого write** / projection rebuild / route canary / final cutover соответственно:

| Gate | Predicate (exact) | Applies before |
|------|-------------------|----------------|
| INV-1 | fence+inventory+hashes complete | export |
| INV-2 | DB=export=ledger observed; CLI contrast logged | export |
| DISP-1 | 100% objects disposition_assigned | migrate |
| M3-ALL | fail-closed action/principal/object/version on static routes; no native user Affine credential | canary |
| M4-G1..G10 | independent FD-1/2/3, capacity, quota, backup, **restore drill**, RPO/RTO, reconciliation, sensitive isolation | provision writes / migrate |
| M5-G1..G10 | binding+annotation parity; replacement engine rebuild proven | rebuild / cutover |
| M6-R | corpus policy: uncovered explicit; no fake bindings; intake path ready for any `register_original_via_m6` | register / cutover |
| RTE-1 | route matrix dark-implemented + tests | canary |
| CNY-1 | canary error budget within ε | cutover |
| CUT-1 | health proof post-switch | observe complete |
| RBL-1 | rollback drill demonstrated | cutover |

Слова «готово» без evidence path ≡ unknown ≡ NO-GO.

---

### 5. Portable / engine state

| Category | Source | Destination | Migration rule | Loss policy |
|----------|--------|-------------|----------------|-------------|
| original bytes | FD-1/Git/local | FD-1 | only M6 LIGD | never silent drop |
| registry | registry.jsonl | registry.jsonl | append-only new rows | no rewrite/delete |
| projection intent | Panel | Panel | create/migrate | missing intent blocks kept projection |
| binding events | M5/Panel | M5/Panel | durable replay | conflict → manual_review |
| portable annotations | Affine export | Panel portable | schema migrate | mismatch → manual_review |
| engine projection | Affine pages | new engine/none | rebuild or discard | disposable |
| layout/cache/session | Redis/Affine | — | discard | acceptable |
| strategic documents | Git/generators | Panel strategic | **не** static originals | Affine copies discard/evidence |

---

### 6. Route / access matrix

| Route class | Hostname/path | Internal target | M3 action/object | Before | During canary | After cutover | Rollback behavior |
|-------------|---------------|-----------------|------------------|--------|---------------|---------------|-------------------|
| `static_ui` | `static.mmbrn.tech/*` | Panel static ingress | `static.view` + object | dark deny / operator | subset principals | primary | dark or limited |
| `static_api` | `static.mmbrn.tech/api/*` | static API | `static.api` + object | deny | canary principals | allow gated | deny |
| `static_download` | `static.mmbrn.tech/dl/*` | FD-1 via gate | `static.download` | deny | canary | allow gated | deny |
| `static_preview` | `static.mmbrn.tech/preview/*` | preview svc | `static.preview` | deny | canary | allow gated | deny |
| `legacy_strategy_ui` | `strategy.mmbrn.tech/*` | Affine loopback :3010 | freeze; no static auth | serve Affine frozen | serve / shadow | **redirect** to static map | restore Affine **frozen**, still no bare bypass of Panel policy for static objects |
| `legacy_deep_link` | `strategy.../page/*` | redirector | map→object gate | Affine | dual | 301/302 mapped or 404/410 | mapped table preserved |
| `legacy_api` | `strategy.../api/*` | deny/redirect | — | limited | deny new writes | deny/redirect | deny user native |
| `ws_affine` | WS to Affine | loopback | — | drain plan | deny new | **deny** | deny user WS |
| `direct_backend` | IP:3010 / non-Caddy | — | — | firewall deny public | deny | deny | deny |

Native credential leakage anywhere → gate FAIL. Old route **не** second authority.

---

### 7. Rollout DAG

| Step | Deps | Entry gate | Mutation | Exit evidence | Owner | Stop/rollback |
|------|------|------------|----------|---------------|-------|---------------|
| P0 provision FD-1/2/3 | — | M4 pred start | infra provision | FD health+quota | ops/Math | destroy unused FD only; no source touch |
| P1 dry-inventory tooling | — | code review | none prod | tool tests | Struct/Math | n/a |
| P2 dry inventory | P1 | INV tooling | **read-only** snapshot | INV-1/2 artifacts | Math | invalidate fence |
| P3 export/snapshot | P2, write-freeze | INV-1/2, freeze | immutable export bundle | manifest+checksums | ops/Math | keep bundle; no delete live |
| P4 disposition ack | P2 | DISP draft | ledger assigns | DISP-1 | owner+ops | halt migrate |
| P5 migrate/rebuild | P0,P3,P4, M3/M4/M5/M6 gates | all pre | target writes, no fake M6 | per-object durable | Struct/M5 | stop writes; resume ledger; no M2 delete |
| P6 reconcile | P5 | migrate exit | none (compare) | exact report PASS | Math | back to P5 failed objects |
| P7 canary | P6, RTE-1, M3-ALL | CNY entry | route subset | CNY-1 metrics | Teamlead+ops | revert canary routing |
| P8 cutover | P7, RBL-1 | CNY-1 PASS | DNS/Caddy primary | CUT-1 health | Teamlead ack | revert control-plane ≤ window |
| P9 observe | P8 | cutover done | none | SLO/error-budget log | ops | rollback route if breach |
| P10 retire legacy | P9, restore+parity+traffic | observe PASS long | remove old route/runtime | retirement cert | Teamlead | forbidden early |

Параллельность: P0 ∥ P1 only if no live export; иначе строго.

---

### 8. No-downtime и consistency

- **Не обещаем** absolute no-downtime.
- Write/freeze/fence: freeze source writes at T_fence; export immutable; migrate on target; canary; cutover.
- In-flight sessions: drain WS, invalidate sessions post-cutover; layout loss OK.
- No lost/duplicated **authoritative** state: bindings, portable annotations, M2 rows, FD-1 bytes — exact reconciliation.
- Availability: measure success rate/latency on canary cohort; error-budget ε (default 1% critical errors / 30m) — breach STOP.
- Control-plane cutover RTO proposed ≤ 15m; data RPO per M4.

---

### 9. Rollback

| Phase | Rollback point | Direction | Window | Immutable | Forbidden |
|-------|----------------|-----------|--------|-----------|-----------|
| P0 | pre-provision | deprovision empty FD | until data | — | wipe FD with originals |
| P3–P5 | pre-migrate tip | stop; keep export+ledger | until cutover | export, ledger | rewrite ledger |
| P7 | pre-canary routes | remove canary map | immediate | metrics | open native Affine |
| P8–P9 | last known good Caddy/DNS | restore previous route config **with gates** | ≤ 15m default | health logs | Affine bypass; delete M2/M5/M6 appends |
| post append | compensating append | new rows only | n/a | history | history delete |

Старый route при rollback ≠ second authority и ≠ direct user Affine without policy.

---

### 10. Redirect и retirement

- `strategy.mmbrn.tech` after cutover: redirect mode, proposed **90 days**, mapping file deep-link → static canonical.
- Unmapped path: **404/410** + structured log `static.legacy.unmapped`.
- Cert/DNS/Caddy observability: separate probes in P9.
- Retirement old runtime/data: only after restore drill PASS, parity PASS, legacy traffic ≈ 0 evidence.
- Unknown link never serves empty Affine workspace 200.

---

### 11. Panel и реестры (classes of updates — outputs реализации)

- Panel navigation: add `static`/evidence section; deprecate Strategy-as-Affine entry
- Section grants: role→`static.*` actions aligned M3
- `docs/LIVE_SERVICES.md`: declare `static.mmbrn.tech`, auth panel-m3, health, owner, deps FD-*
- Operator runbook: freeze, fence, canary, cutover, rollback, retirement checklists
- Monitoring/alerts: 5xx, auth deny, canary budget, unexpected WS upgrades, cert expiry
- Public docs: hostname + access model; archive Affine strategic UI screenshots

**Не выполняются** carrier M7 / этой комнатой.

---

### 12. Delivery slicing #1303 / #1305

| Slice | Issue-home | Scope | Prerequisites | Artifacts | Acceptance evidence | Rollback | Review gate |
|-------|------------|-------|---------------|-----------|---------------------|----------|-------------|
| S1 | #1303-A | read inventory/index model for evidence | M1/M2 norms | API schema+tests | contract tests; no prod migrate | revert API | Struct+Math |
| S2 | #1303-B | evidence query under M3 | S1, M3 | gated API | deny/allow tests | disable route | M3 owner |
| S3 | #1305-A | FD-1/2/3 + M4 G1–G10 | M4 agenda | provision scripts, drill reports | all M4 gates PASS | deprovision empty | Math ops |
| S4 | #1305-B | ledger tooling + dry inventory | S1, fence design | ledger CLI, INV artifacts | INV-1/2 on snapshot | n/a read-only | Math+Struct |
| S5 | #1305-C | migrate portable/rebuild + reconcile | S3,S4,M5,M6 | migrator, reports | parity exact; no fake bind | stop+resume ledger | M5+Math |
| S6 | #1305-D | static ingress + Panel grants + routes | M3,S2 | ingress, grants, Caddy dark | RTE-1, M3-ALL | dark deny | Arch+UI |
| S7 | #1305-E | canary/cutover/redirect/LIVE_SERVICES | S5,S6,RBL-1 | runbook, LIVE_SERVICES diff, probes | CNY-1,CUT-1, observe | DNS/Caddy revert | Teamlead |
| S8 | #1303-C | full evidence UX browser | S2,S7 optional | Panel UI | a11y+gate E2E | feature flag off | UI |

Нельзя закрыть umbrella по DNS alone. Не смешивать storage+authority+migration в один шаг.

---

### 13. Cases (≥16)

| Случай | Disposition/решение | Gate | Evidence | Rollback/stop |
|--------|---------------------|------|----------|---------------|
| 1. Strategic page, канон в Git | `discard` или `retain_export_evidence`; UI → Panel strategic, не static original | DISP-1, M1 | git path + page hash + disposition ack | stop if marked register without M6 intent |
| 2. Duplicate imported page | one keep (`evidence`/`rebuild`); extras `discard` | DISP-1, hash group | duplicate_group report | re-ack group |
| 3. Unique Affine-only page | `manual_review` default; optional `migrate_portable_state` / rare `register_original_via_m6` | M6-R if register | review ticket | block cutover if critical unresolved |
| 4. One of 57 service assets | usually `discard` or `retain_export_evidence` | DISP-1 | asset hash+kind | n/a |
| 5. Asset multi-page | single disposition; N referrers | DISP-1 | referrer list | stop if split dispositions conflict |
| 6. Page without binding | no fake binding; `rebuild` only with intent else review/discard | M5 | intent absence log | block projection publish |
| 7. Conflicting bindings | `manual_review` | M5-G | conflict dump | cutover STOP for object set |
| 8. Portable annotation parity mismatch | `manual_review` / fixup then `migrate_portable_state` | M5 parity | parity diff | STOP migrate object |
| 9. CLI 0 vs DB/export 82 | CLI not authority; proceed on DB/export | INV-2 | cli_contrast.json | FAIL if only CLI used |
| 10. M2 legacy row without M6 ledger | remain `legacy_uncovered`; no auto-bind | M6-R | registry row id | no silent PASS |
| 11. Sensitive local ref | offline policy; not Git; not Affine original claim | M4 sensitive, M6 | location class evidence | STOP if exposed |
| 12. Office VDS capacity FAIL | no migrate writes on office | M4 capacity | 9.46 GiB free measure | STOP P0/P5 on office |
| 13. Backup exists, restore drill FAIL/unknown | NO-GO migrate/cutover | M4 restore | drill report missing/FAIL | STOP |
| 14. Panel deny vs native Affine capability | Panel wins; user deny UI | M3-ALL | auth test vector | FAIL if Affine allows | 
| 15. Old deep link mapped | 301/302 → static canonical + gate | RTE-1 | map entry+probe | revert map |
| 16. Unknown old path | 404/410 + log | RTE-1 | probe | n/a |
| 17. WS or direct backend bypass | deny public; no user WS after cutover | M3/Caddy | probe 101/port | STOP if open |
| 18. Crash between DNS/Caddy and health proof | auto/manual revert last good ≤ window | RBL-1, CUT-1 | incident+revert log | control-plane rollback |
| 19. Canary errors > ε | STOP cutover; revert canary | CNY-1 | metrics | canary rollback |
| 20. Rollback after new append-only events | compensating append only; no history delete | M2/M5/M6 immutability | new rows | forbidden delete |

---

### Inventory / disposition (schema + exemplars)

| source_kind | source_id | classification | duplicate_group | destination | disposition | authority | evidence |
|-------------|-----------|----------------|-----------------|-------------|-------------|-----------|----------|
| page | eng-pg-… | strategic_git_canon | — | Panel strategic / evidence | discard or retain_export_evidence | Panel; Git truth | git path + hash |
| page | eng-pg-… | duplicate_import | dh-… | evidence or none | discard (extra) | migration op | group report |
| page | eng-pg-… | affine_only_unique | — | review queue | manual_review | human+M6 | ticket |
| asset | eng-as-… | service_asset | — | none/evidence | discard/retain_export_evidence | op | type png/svg |
| asset | eng-as-… | multi_ref_asset | — | shared evidence | retain_export_evidence | op | referrer[] |
| page | eng-pg-… | unbound_page | — | none/projection | discard or rebuild if intent | Panel M5 | intent miss |
| page | eng-pg-… | binding_conflict | — | review | manual_review | M5 | conflict dump |
| registry | m2-row-… | legacy_m2 | — | registry only | no auto M6 | M6 policy | uncovered flag |
| local | sens-… | sensitive_local | — | offline FD policy | manual_review | owner | non-git path |

Полный corpus 82+57 заполняется на P2/P4 (реализация), не в комнате.

---

### Readiness go/no-go matrix (current)

| Gate | Exact predicate | Corpus | Evidence producer | Current state | Fail result |
|------|-----------------|--------|-------------------|---------------|-------------|
| INV-1 | fence+full inventory+hashes | 82 pages, 57 assets, 3 WS | dry-inventory job | **unknown** (not run as approved export) | no export |
| INV-2 | DB=export=ledger; CLI contrast | same | reconcile job | **partial fact**: CLI0 vs DB82 measured; export bundle not frozen | NO-GO truth |
| DISP-1 | 100% disposition ack | all objects | ledger | **unknown** | no migrate |
| M3-ALL | fail-closed static routes | route matrix | proxy tests | **FAIL/absent** static ingress | no canary |
| M4-G capacity | free/quota OK non-office or remediated | FD targets | measure | **FAIL** office 9.46 GiB | STOP storage |
| M4 restore | drill PASS | backup set | drill report | **unknown/FAIL risk** | STOP |
| M4 G full | G1–G10 PASS | FD-1/2/3 | M4 evidence | **NO-GO** | STOP |
| M5 parity | binding/annotation parity | kept objects | M5 jobs | **unknown** | STOP rebuild/cutover |
| M6-R | uncovered explicit; no fake bind | 12 legacy + new | M6 policy | **uncovered** legacy | no false PASS |
| RTE-1 | matrix implemented dark | routes | ingress tests | **absent** | no canary |
| CNY-1 | errors≤ε | canary cohort | metrics | **n/a** | no cutover |
| CUT-1 | health post switch | prod probes | ops | **n/a** | rollback |
| RBL-1 | rollback drill done | control-plane | drill | **unknown** | no cutover |
| LIVE_SERVICES | static declared | docs | docs PR | **absent** Affine/strategy | declare before retire |
| #1303/#1305 | slices reviewable | issues | delivery plan | **open, texts incomplete** | no umbrella close |

**Current verdict: NO-GO.**  
**Cutover authorization rule:** all required gates PASS + Teamlead written ack + owner ack; else forbidden.

---

### Принятия ролей

| Роль | Позиция |
|------|---------|
| Teamlead | Принимаю MDC-v1; cutover NO-GO; LGTM контракт |
| Архитектор | Принимаю форму MDC-v1 |
| Структурщик | Принимаю границы ledger/routes/slices |
| Математик | Принимаю predicates/reconciliation/NO-GO |
| Музыкант | Принимаю freeze/drain/error-budget |
| Верстальщик | Принимаю surface/redirect/deny UX classes |

---

## Список посылок

1. **норма (M1):** original bytes и `docs/evidence` принадлежат контейнеру; страницы Affine — состояние движка; strategic documents — Panel; Affine page ≠ original лишь из-за workspace.
2. **норма (M2):** `registry.jsonl` — истина регистрации; `canonicalRef = urn:mmbrn:static:<rootId>`; location — заявление; правки — append-only rows.
3. **норма (M3):** Panel — единственный authorizer; proxy fail-closed; нет прямого пользовательского Affine route/token/native role.
4. **норма (M4):** production требует FD-1/FD-2/FD-3, capacity/quota, backup, restore drill, RPO/RTO, reconciliation, sensitive isolation.
5. **факт (M4 measure):** office VDS ≈ 9.46 GiB free — storage NO-GO.
6. **норма (M5):** Affine — optional projection; значимы intent/binding/portable annotations; engine layout/cache disposable; parity обязательна до cutover.
7. **норма (M6):** intake через LIGD; commit = verified FD-1 + M2 append + durable binding; legacy без accepted ledger — `legacy_uncovered`; fake bindings запрещены; production intake сейчас NO-GO.
8. **факт:** live Affine = affine_server+PostgreSQL+Redis на office VDS, loopback `127.0.0.1:3010`, Caddy `strategy.mmbrn.tech`.
9. **факт:** 3 private workspaces (Strategy, Templates, Releases); 1 participant; 82 pages; 57 service PNG/SVG; дубли импортов; originals чеков/внешних PDF в Affine не найдены.
10. **факт:** `affine-cli doc list` = 0 при DB inventory = 82; CLI ≠ proof корпуса.
11. **факт:** strategic publish в Affine заморожен machine gate; Git/гранулы/генераторы — truth strategic documents.
12. **факт:** `docs/evidence/registry.jsonl` — 12 legacy rows; PDF-чек в публичном Git; sensitive PDF партнёра вне Git; M6 — uncovered до policy.
13. **факт:** Panel имеет role/section grants; static ingress и передача решений в Affine не реализованы; forward-auth защищает другие surfaces.
14. **факт:** `docs/LIVE_SERVICES.md` не объявляет Affine/`strategy.mmbrn.tech`.
15. **факт:** открыты #1303 и #1305; тексты не покрывают полный контракт M1–M6.
16. **норма (agenda bounds):** в комнате M7 запрещены code/DNS/Caddy/Panel/LIVE_SERVICES/issues/production changes; запрещён live export/delete/migrate; один carrier; read-only facts ≠ permission to act.

---

## Definition of Done

- [x] Выбран один доказательный inventory/disposition и migration-ledger contract (MDC-v1)
- [x] M1–M6 сохранены; fake originals, bindings, authority и readiness запрещены
- [x] Route/access matrix, rollout DAG, consistency и rollback исполнимы
- [x] Не меньше 16 cases и семь обязательных таблиц заполнены
- [x] Current go/no-go честен (NO-GO), каждый gate имеет corpus/evidence/fail result
- [x] #1303/#1305 разрезаны на зависимые reviewable deliveries
- [x] Код, DNS, Caddy, Panel, issues и production не изменены
- [x] Один carrier, один D1, посылки перед последней секцией DoD
- [x] Не меньше 36 ролевых реплик и не меньше шести от каждой роли
