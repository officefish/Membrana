<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-08-07T09:22:01.861Z |
| Команда | `yarn consilium` |
| Модель | anthropic/claude-sonnet-4-6 |
| Файл | `docs/seanses/static-mmbrn-container-m7-migration-delivery-2026-08-07.md` |
| Порядок ролей | Верстальщик → Музыкант → Математик → Структурщик → Teamlead → Архитектор |
| Повестка | `docs/meeting/static-mmbrn-container/M7_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs/meeting/static-mmbrn-container/M7_AGENDA.md` | 11965 | `874e26efa541` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs/meeting/static-mmbrn-container/M7_AGENDA.md` | 11965 · 1 п. | `874e26efa541` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --no-memory --min-replies 36 --seed 727`

**Вопрос:**

Проведи заседание строго по повестке M7. Не переопределяй M1-M6, сохрани один D1, один carrier и оставь Definition of Done последней секцией.

---

# Консилиум: M7 — переезд и доставка `strategy.mmbrn.tech → static.mmbrn.tech`

**Повестка:** D1 — минимальный исполнимый контракт переезда: доказательный инвентарь 82 Affine pages и 57 assets, явный disposition каждого объекта, M3-M6 readiness, перенос только законных состояний, переключение Panel/proxy/Caddy/DNS, доказательство cutover и rollback, объявление в `LIVE_SERVICES`, нарезка #1303/#1305.

**Участники:** Верстальщик (Rodchenko), Музыкант (Kuryokhin), Математик (Dynin), Структурщик (Ozhegov), Teamlead (Tarasov), Архитектор (Vesnin).

**Порядок реплик:** Верстальщик → Музыкант → Математик → Структурщик → Teamlead → Архитектор (циклически, ≥36 реплик)

**Carrier:** `docs/seanses/static-mmbrn-container-m7-migration-delivery-2026-08-07.md`

---

[Верстальщик]: Прежде чем мы тронемся с места: у нас нет ни одной живой панели на `static.mmbrn.tech`, потому что static ingress не реализован. Panel имеет role/section grants, но они не выведены на будущий маршрут. Любой разговор об inventory или disposition бессмыслен, пока мы не зафиксируем: static ingress — предварительное условие для M3 PASS, а не параллельная задача. Это gate, не допущение.

[Музыкант]: Добавлю про состояние источника. `affine-cli doc list` вернул ноль, но DB показывает 82 страницы. Это расхождение не технический казус — это сигнал о том, что CLI не является авторитетным инструментом инвентаризации. Для snapshot нам нужен прямой read-only запрос к PostgreSQL с `pg_dump --schema-only` плюс content-hash каждой страницы. Иначе мы не знаем, что переносим, и disposition выносить не на чём.

[Математик]: Фундаментальный вопрос — как именно мы доказываем совпадение source и destination. Предлагаю единственную точку истины: `SourceObjectRef = (workspace_id, page_id, content_sha256)`. Fenced snapshot фиксирует эти тройки и количество: 82 страницы и 57 assets. Ledger ведёт двусторонний учёт по `SourceObjectRef`+hash, не по счётчику. Любое расхождение hash при reconcile — это fail, не warning.

[Структурщик]: Называю корпуса явно, чтобы не путать с M6-терминологией. Для M7 используем: `M7_SRC` — исходный fenced DB/export snapshot (82 pages + 57 assets); `M7_DEST` — подготовленный static.mmbrn.tech target. `M6_C_all / C_live / L_proposed / C_managed / C_legacy` — отдельная система, она не переименовывается и не пересекается с нашими именами. `M7_LEDGER` — append-only state machine миграции. Это разные корпуса, разные машины состояний, никаких синонимов.

[Teamlead]: Хорошо. Определяем семь классов состояний для объектов `M7_SRC`: (1) `originals_registry` — bytes с M1-доказательством; (2) `projection_intent` — Panel-owned намерения проекции; (3) `binding` — durable events из M6; (4) `portable_annotation` — parity-значимые метки; (5) `engine_projection` — layout Affine, disposable; (6) `layout_cache_session` — ephemeral, discard; (7) `strategic_docs` — Git-canonical, Panel-owned. Каждый объект из 82+57 получает один из семи классов, источник, назначение, политику потерь.

[Архитектор]: Обозначу форму machine gate. Preconditions разбиты на три группы: M3-gates (static ingress + Panel grants + proxy fail-closed), M4-gates G1–G10 (FD-1/FD-2/FD-3, capacity, backup, restore drill, RPO/RTO, reconciliation, sensitive isolation), M5-gates G1–G10 (binding/annotation parity, replacement engine recovery). Любой gate в статусе `unknown` автоматически даёт NO-GO для следующего шага. Provision создаёт target — значит, M4 G1 (capacity) проверяется только после того, как target существует, не до. Это устраняет цикл зависимостей.

[Верстальщик]: По route matrix. Нам нужно явно закрыть восемь классов маршрутов: `static/*`, `strategy.mmbrn.tech/*` (старый хост), deep links `/workspace/:id/:pageId`, API `/api/*`, download `/download/:ref`, preview `/preview/:ref`, WebSocket `wss://`, backend bypass. Для каждого — точный M3 action/object либо network deny до cutover. Credential leak запрещён на всех маршрутах. До cutover все запросы к `strategy.mmbrn.tech` — proxy к действующему Affine без изменений.

[Музыкант]: Про freeze и consistency. Freeze фиксирует источник перед экспортом: никаких writes в Affine после момента snapshot. In-flight sessions — завершаются или получают 503 с retry-after header. Deep links, открытые в момент freeze, логируются в `M7_LEDGER` как pending, разрешаются redirect-таблицей после cutover. No-downtime не объявляем без availability predicate: predicate = error rate < 0.1% на /health за 5-минутное окно.

[Математик]: Для reconciliation нужна точная процедура three-way diff: `M7_SRC` (baseline snapshot) × `M7_DEST` (после migrate) × `M7_LEDGER` (state machine). Совпадение определяется по `(SourceObjectRef, content_sha256, state=resolved)`. Любой объект с hash-mismatch или state ≠ resolved — fail. Duplicate detection: если два page_id имеют одинаковый content_sha256, — это duplicate group, не merge кандидат. Disposition для каждого члена группы выносится отдельно.

[Структурщик]: Ledger — append-only. Каждая строка имеет: `(ts, SourceObjectRef, from_state, to_state, actor, evidence_ref, retry_count)`. Состояния: `discovered → classified → disposition_assigned → exported → validated → migrated → reconciled → resolved | blocked | failed`. Нет обратных переходов. Crash recovery: при restart берём последнюю строку по `SourceObjectRef` и продолжаем с неё. Fake binding запрещён — строка `migrated` появляется только после verified FD-1 + immutable M2 append + durable binding, точно как M6 commit.

[Teamlead]: DAG шагов. Объявляю один rollout DAG из 9 шагов: (S1) Provision target, (S2) Inventory/fence, (S3) Disposition, (S4) M3-M6 readiness gates, (S5) Export/validate, (S6) Migrate, (S7) Reconcile, (S8) Canary, (S9) Cutover → Observe → Retire. Каждый шаг имеет: зависимости, entry gate, мутацию, exit evidence, владельца, stop/rollback. Retire — отдельный gate от cutover; наступает только после redirect lifetime истёк, restore/parity подтверждены, all-resolved, zero-traffic interval выбран точно.

[Архитектор]: Rollback-контракт. Для каждой мутации: S1 rollback — удалить target provision (M2 rows не затронуты); S5-S6 rollback — вернуть трафик на Affine origin, M7_LEDGER сохраняет все append-only строки; S8-S9 rollback — Caddy/DNS переключаются обратно на Affine, окно rollback — 72 часа после cutover, точный интервал фиксируется в ledger entry. Append-only история не откатывается никогда. Второй authority не появляется: rollback возвращает к Panel + Affine, не добавляет новый.

[Верстальщик]: Для redirect/retirement определяю точные константы. Redirect status для known old paths: **308** (Permanent Redirect). Для unknown paths: **404** (Not Found, not 410 — объект не был в реестре static). Canary predicate: error rate < 1% на traffic slice 5% за 10-минутное окно. Rollback window: **72 часа** после cutover. Redirect lifetime: **365 дней** с момента cutover. Observation period после cutover: **14 дней** continuous monitoring. Zero-traffic interval для retirement: **последовательные 30 дней** с нулевым трафиком на `strategy.mmbrn.tech` по логам CDN/Caddy. Эти значения будут повторены во всех таблицах.

[Музыкант]: Подтверждаю: WebSocket-маршрут `wss://strategy.mmbrn.tech` — network deny после cutover, не redirect. WS-соединение нельзя перенаправить через HTTP redirect; попытка туннелировать это через Caddy создаёт credential leak. До cutover WS проксируется к Affine без изменений. После cutover — deny с log entry. Никакого прямого backend bypass: все запросы через Panel proxy fail-closed.

[Математик]: Про sensitive isolation: sensitive local ref (партнёрский PDF вне Git) — это отдельный gate. Disposition = `blocked_pending_policy`: объект не мигрирует, не удаляется, не получает synthetic M2 row. Статус `blocked` в M7_LEDGER блокирует retirement source. В readiness matrix это FAIL до принятия отдельной accepted policy. Legacy reconciliation не создаёт synthetic registry rows.

[Структурщик]: Нарезка #1303/#1305. Issue #1303 (индекс/API вещдоков) разрезается на три slice: #1303-S1 — fenced inventory schema и SourceObjectRef contract; #1303-S2 — M7_LEDGER API и state machine spec; #1303-S3 — evidence index и download route. Issue #1305 (переезд Affine) разрезается на четыре slice: #1305-S1 — M3-M6 readiness gates implementation; #1305-S2 — export/migrate/reconcile pipeline; #1305-S3 — Caddy/DNS cutover runbook; #1305-S4 — redirect/retirement и LIVE_SERVICES entry. Каждый slice имеет scope, prerequisites, artifacts, acceptance, rollback, review.

[Teamlead]: Читаю текущее go/no-go по основным gates. M4: office VDS 9.46 GiB free — storage NO-GO (FD-1/FD-2/FD-3 не provisioned). M6: legacy corpus `legacy_uncovered` — production intake NO-GO. M3: static ingress не реализован — NO-GO. M5: binding/annotation parity не измерена — unknown, NO-GO. Итог: текущее состояние — **NO-GO по четырём независимым gates**. Миграция не начинается.

[Архитектор]: Важное уточнение по M5 gates. Replacement engine recovery gate стоит только после шага S5 (Export) — нельзя проверять rehydration до того, как export произведён. Pre-rebuild gate проверяет: существует ли input (M7_SRC snapshot), есть ли authority (Panel grants), есть ли backup (FD-2). Это три измеримых предиката, не более. Projection/layout/cache Affine — disposable, не проверяются в readiness. Portable annotations — parity check обязателен после S6 (Migrate).

[Верстальщик]: Уточняю disposition для strategic documents. Они Git-canonical и Panel-owned. Disposition = `discard_engine_copy`: engine projection в Affine удаляется (scheduler-discard post-cutover), M7_LEDGER фиксирует state=resolved. В static.mmbrn.tech strategic documents не копируются как originals без отдельного M6 intent владельца — это прямое ограничение из M1/M5. Если кто-то откроет страницу в Affine с таким документом — она классифицируется как engine_projection, не original.

[Музыкант]: Про duplicate imported pages. Каждый duplicate получает собственную строку в M7_LEDGER с уникальным SourceObjectRef. Disposition: `discard_duplicate` — не мигрирует, не получает new M2 row, engine copy удаляется post-cutover. Canonical member группы дублей определяется: если есть M2 row с matching canonicalRef — это canonical; если нет — disposition = `blocked_pending_qualification`. Merge запрещён.

[Математик]: По readiness matrix. Gate G1 (FD-1 provisioned) — corpus: target host; predicate: independent storage node confirmed; producer: infra team; current state: NOT PROVISIONED; fail result: NO-GO, S1 blocked. Gate G2 (backup complete) — predicate: FD-2 confirmed with last successful backup ≤ RPO; current state: UNKNOWN; fail result: NO-GO. Gate G3 (restore drill) — predicate: drill completed with RTO ≤ target within 30 days; current state: NOT PERFORMED; fail result: NO-GO. Gate G4 (capacity/quota) — predicate: measured free ≥ estimated M7_SRC size × 2 + 20% headroom; current state: FAIL (9.46 GiB office VDS); fail result: NO-GO.

[Структурщик]: Добавляю M3 gates. Gate M3-G1 (static ingress) — predicate: `static.mmbrn.tech` ingress endpoint responds 200 to health check via Panel proxy; current state: NOT IMPLEMENTED; fail result: NO-GO. Gate M3-G2 (Panel grants) — predicate: role/section grants for static container exist and are verified; current state: PARTIAL (grants exist, static not mapped); fail result: NO-GO. Gate M3-G3 (proxy fail-closed) — predicate: any request without valid Panel token returns 401/403, not Affine native page; current state: NOT VERIFIED for static route; fail result: NO-GO.

[Teamlead]: По Panel/реестрам. M7 протокол фиксирует намерения, не выполняет их. Классы future edits после cutover: (a) navigation grants — добавить static container в Panel section; (b) LIVE_SERVICES entry — append `static.mmbrn.tech` row; (c) runbook entry — append M7 migration runbook; (d) monitoring — add health checks for static routes; (e) docs — update ARCHITECTURE.md с новым маршрутом. Все пять — вне scope M7 комнаты, становятся acceptance criteria для #1305-S4.

[Архитектор]: По consistency доказательству. No-loss proof: `|M7_DEST resolved| + |M7_LEDGER blocked| + |M7_LEDGER discard| = |M7_SRC|`. No-duplicate proof: каждый `SourceObjectRef` встречается ровно один раз в M7_LEDGER. Эти два инварианта проверяются автоматически на шаге S7 (Reconcile). Если `|M7_DEST resolved| + |blocked| + |discard| ≠ 82+57` — reconcile FAIL, rollback. Математически: это conservation law для объектов миграции.

[Верстальщик]: Про cases 15 и 16 — старые и неизвестные deep links. Старый deep link вида `/workspace/:wid/:pid` — в redirect-таблице при cutover. Если есть matching M7_LEDGER entry со state=resolved и destination ref — **308** на новый canonical URL. Если destination — discard — **404** (объект не существует в static). Неизвестный old path — нет matching entry в redirect-таблице — **404**. Redirect-таблица строится автоматически на шаге S7 из M7_LEDGER resolved entries. Observability: каждый 308 и 404 логируется с source path для 365-дневного мониторинга.

[Музыкант]: Crash scenario между DNS/Caddy change и health proof. После DNS propagation и до confirmed health check — traffic split ambiguous. Mitigation: DNS TTL снижается до 60 секунд за 48 часов до cutover. Health check predicate: три последовательных 200 ответа с interval 30 секунд. Если health check не пройден за 10 минут после DNS switch — автоматический rollback: DNS TTL restore + Caddy revert к Affine. Состояние в M7_LEDGER: `cutover_pending → cutover_failed → rollback_initiated`.

[Математик]: Canary фаза. Traffic slice: 5% запросов на static target, 95% на Affine. Canary predicate: error rate < 1% за 10-минутное окно (как зафиксировано Верстальщиком). Если canary PASS — двигаемся к full cutover. Если canary FAIL (error rate ≥ 1%) — немедленный rollback всего трафика на Affine, M7_LEDGER entry `canary_failed`, останавливаем DAG. Canary window: минимум 2 часа. Canary не изменяет Panel authority или versions.

[Структурщик]: По M6 commitment и rollback после append-only events. После того как хотя бы один объект достиг state=resolved с M6 commit (verified FD-1 + M2 append + durable binding) — эти события не откатываются. Control-plane rollback при этом: возвращает трафик на Affine (Caddy/DNS), не удаляет M2 rows, не удаляет bindings, не удаляет referenced bytes. Orphan cleanup только при zero live refs + ≥365d + no hold + complete authorization chain. M7_LEDGER сохраняет всю историю.

[Teamlead]: Подтверждаю: office VDS с 9.46 GiB free — storage NO-GO для production. Это означает, что S1 (Provision target) требует отдельный инфраструктурный шаг полностью вне текущей комнаты. FD-1 должен быть independent storage node, не office VDS. FD-2 — backup на отдельном хосте. FD-3 — offsite или cloud storage. Пока эти три не provisioned — DAG заморожен на pre-S1. Это не предположение — это зафиксированный FAIL в readiness matrix.

[Архитектор]: Finalize: disposition для unique Affine-only page. Это самый сложный случай. M1 говорит: Affine page не становится original из-за нахождения в workspace. Значит: unique Affine-only page = engine state без M1 qualification. Disposition — `blocked_pending_qualification`: не мигрирует. В M7_LEDGER: state=blocked, actor=M1-gate, evidence_ref=M1-posylka. Для migration этот объект становится static original только после: (a) M1 qualification владельцем, (b) отдельный M6 intent, (c) LIGD intake. Без этих трёх — blocked навсегда, блокирует retirement source.

[Верстальщик]: Panel deny при native Affine capability. Если Panel deny выставлен на объект, но native Affine показывает его доступным — это не override authority. M3 посылка: Panel — единственный authorizer. Proxy fail-closed: запрос без valid Panel token → deny, вне зависимости от Affine capability. В M7_LEDGER для таких объектов: disposition = `blocked_pending_panel_grant`. Никакого fallback на Affine native route после cutover.

[Музыкант]: По annotation parity mismatch. Portable annotations — это binding events и parity-значимые метки, Panel-owned. После Export (S5) и до Migrate (S6) — parity check: `|annotations_in_export| == |annotations_in_Panel|` для каждого SourceObjectRef. Mismatch → S6 BLOCKED для этого объекта, M7_LEDGER: state=`parity_fail`. Recovery: вручную reconcile annotation source → re-run S5 для объекта → parity check → proceed. Нельзя мигрировать с parity fail.

[Математик]: По conflicting bindings. Если один SourceObjectRef имеет две или более durable binding с разными canonicalRef — это conflict. Disposition: `blocked_pending_resolution`. Обе binding-записи сохраняются в M7_LEDGER. Actor для resolution = владелец Panel grants. Evidence = явное решение в Panel с timestamp. До resolution — NO-GO для этого объекта. Fake resolution запрещена: нельзя удалить одну из binding без authorization chain.

[Структурщик]: Про существующий M2 legacy row без M6 ledger. Это `legacy_uncovered` по M6. В M7_LEDGER: state=`blocked_legacy_uncovered`. Не мигрирует, не получает synthetic M2 row, не получает fake binding. Блокирует retirement source. Recovery: отдельная accepted policy → M6 intake → тогда объект может быть re-queued в M7_LEDGER с новым entry. Legacy reconciliation не создаёт synthetic rows — это прямо запрещено.

[Teamlead]: Итоговая пропозиция D1. Один исполнимый контракт переезда `strategy.mmbrn.tech → static.mmbrn.tech` состоит из: (1) fenced DB snapshot M7_SRC с SourceObjectRef+hash для каждого из 82+57; (2) append-only M7_LEDGER с 9-состояной machine и conservation invariant; (3) rollout DAG S1–S9 с явными gates/rollback/owner; (4) route/access matrix 8 классов с exact M3 action/object; (5) readiness go/no-go matrix с текущим FAIL по M3/M4/M5/M6; (6) redirect-таблица 308/404; (7) нарезка #1303 (3 slice) и #1305 (4 slice). Текущий статус: **NO-GO**. Все gates требуют выполнения вне этой комнаты.

[Архитектор]: Вердикт по форме. Один DAG, одна ledger/state machine, одна route matrix, один набор gates — выбраны. Модель единственная, не ветвится. Carrier — один: `docs/seanses/static-mmbrn-container-m7-migration-delivery-2026-08-07.md`. Второй carrier отсутствует. M1–M6 не переопределялись: Affine pages остаются engine state, Panel остаётся authorizer, office VDS не получил ложный PASS. Fake originals, fake bindings, fake readiness отсутствуют. Протокол исполним.

---

## Итоговое решение консилиума

### Пропозиция D1 (принята)

**Один минимальный исполнимый контракт переезда `strategy.mmbrn.tech → static.mmbrn.tech`** — это набор из семи связанных артефактов, исполняемых строго по DAG S1–S9 после прохождения всех machine gates. Текущее состояние: **NO-GO** по четырём независимым gates (M3-G1, M4-G1/G4, M5-parity, M6-legacy). Контракт исполним только после устранения всех FAIL/UNKNOWN gates вне этой комнаты.

---

### Таблица 1. Inventory/Disposition (representative classes; полный ledger строится в M7_LEDGER)

| Source kind/id | Classification | Duplicate group | Destination | Disposition | Authority | Evidence |
|---|---|---|---|---|---|---|
| Affine page, Git-canonical | `strategic_docs` | — | discard (Git canonical) | `discard_engine_copy` | M1, M5 | Git commit hash, M1-posylka |
| Affine page, duplicate imported | `engine_projection` | dup-group-N | discard | `discard_duplicate` | M1, M5 | content_sha256 match, M7_LEDGER dup entry |
| Affine page, unique Affine-only | `engine_projection` | — | blocked | `blocked_pending_qualification` | M1, M5, M6 | M1-gate, no M6 intent |
| Service asset PNG/SVG (unlinked) | `engine_projection` | — | discard | `discard_engine_copy` | M5 | no binding, no M2 row |
| Service asset, multi-page linked | `engine_projection` | asset-group-K | blocked | `blocked_pending_qualification` | M1, M5 | ref-count insufficient, M1 qual required |
| Page without binding | `engine_projection` | — | blocked | `blocked_pending_qualification` | M6 | no durable binding |
| Page with conflicting bindings | `binding` | — | blocked | `blocked_pending_resolution` | M2, M6 | two canonicalRef in ledger |
| Portable annotation | `portable_annotation` | — | static.mmbrn.tech | `migrate_after_parity` | M5 | parity check pass |
| M2 legacy row, no M6 ledger | `originals_registry` | — | blocked | `blocked_legacy_uncovered` | M6 | legacy_uncovered status |
| Sensitive local ref (partner PDF) | `originals_registry` | — | blocked | `blocked_pending_policy` | M4, M6 | no accepted policy |
| Layout/cache/session | `layout_cache_session` | — | discard | `discard_ephemeral` | M5 | disposable by M5 |
| Engine projection/cache | `engine_projection` | — | discard | `discard_engine_copy` | M5 | disposable by M5 |

---

### Таблица 2. Migration Ledger / State Machine

| State | Entry predicate | Allowed transitions | Durable evidence | Retry/recovery | Terminal outcome |
|---|---|---|---|---|---|
| `discovered` | SourceObjectRef exists in M7_SRC snapshot | → `classified` | Snapshot hash, timestamp | Re-run inventory | Non-terminal |
| `classified` | Classification assigned (one of 7 classes) | → `disposition_assigned` | Class label + authority ref | Re-classify if authority changes | Non-terminal |
| `disposition_assigned` | Explicit disposition with actor + evidence_ref | → `exported` \| `blocked` \| `discard_queued` | Disposition record in ledger | Re-assign if new evidence | Non-terminal |
| `exported` | S5 complete: bytes extracted, hash verified | → `validated` | export_hash == snapshot_hash | Re-export from fenced source | Non-terminal |
| `validated` | FD-1 confirmed, M2 row immutable, binding durable | → `migrated` | FD-1 ref, M2 row id, binding id | Re-validate; fail → `blocked` | Non-terminal |
| `migrated` | Bytes in destination, M3 action verified | → `reconciled` | destination_hash == export_hash | Re-migrate from export; fail → `failed` | Non-terminal |
| `reconciled` | Three-way diff PASS (src × dest × ledger) | → `resolved` | diff_report, conservation proof | Manual review if drift | Non-terminal |
| `resolved` | Conservation invariant holds | — | Final ledger entry | N/A | **Terminal (success)** |
| `blocked` | Any gate FAIL or UNKNOWN | → `disposition_assigned` (after gate cleared) | Gate fail record | Gate clearance → re-enter | Terminal until unblocked |
| `failed` | Unrecoverable error | → manual review only | Error record + evidence | Manual escalation | **Terminal (fail)** |
| `discard_queued` | Disposition = discard, post-cutover | → `discard_executed` | Discard auth chain | N/A until retirement gate | Terminal after retirement |

Conservation invariant: `|resolved| + |blocked| + |discard_queued| + |discard_executed| + |failed| = |M7_SRC| = 139`

---

### Таблица 3. Route / Access Matrix

> Константы (одинаковы во всех таблицах): redirect = **308**, unmapped = **404**, canary predicate = error rate < **1%** / 5% slice / 10 min, rollback window = **72 h**, redirect lifetime = **365 d**, observation = **14 d**, zero-traffic retirement = **30 consecutive days**.

| Route class | Hostname/path | Internal target | M3 action/object | Before cutover | During canary | After cutover | Rollback behavior |
|---|---|---|---|---|---|---|---|
| Static content | `static.mmbrn.tech/*` | static-server | `read-bytes` / `container=static.mmbrn.tech` | 503 (not provisioned) | 5% slice → static | Panel proxy → static | Revert to 503 |
| Old host root | `strategy.mmbrn.tech/` | Affine (proxy) | network: pass-through pre-cutover | Proxy to Affine | 95% Affine | **308** → `static.mmbrn.tech/` | Revert proxy |
| Deep link (known) | `strategy.mmbrn.tech/workspace/:wid/:pid` | redirect table | `read-ref` / lineage=`canonicalRef` | Proxy to Affine | 95% Affine | **308** → canonical static URL | Revert proxy |
| Deep link (unknown) | `strategy.mmbrn.tech/<unregistered>` | — | network deny | Proxy to Affine | 95% Affine | **404** | Revert proxy |
| API | `static.mmbrn.tech/api/*` | Panel API | `read-metadata` \| `write-metadata` / `container=static.mmbrn.tech` | 503 | Panel-gated | Panel proxy fail-closed | 503 |
| Download | `static.mmbrn.tech/download/:ref` | static-server | `download` / lineage=`canonicalRef` | 503 | Panel-gated | Panel proxy, token required | 503 |
| Preview | `static.mmbrn.tech/preview/:ref` | static-server | `read-bytes` / lineage=`canonicalRef` | 503 | Panel-gated | Panel proxy, token required | 503 |
| WebSocket | `wss://strategy.mmbrn.tech` | — | network deny (post-cutover) | Proxy to Affine WS | Proxy to Affine WS | **network deny** + log | Revert proxy |
| Backend bypass attempt | any host → `127.0.0.1:3010` | — | network deny (always) | deny | deny | deny | N/A (permanent deny) |

Credential leak ban: no token forwarding between domains; all cross-domain requests denied at proxy layer.

---

### Таблица 4. Rollout DAG

| Step | Dependencies | Entry gate | Mutation | Exit evidence | Owner | Stop/rollback |
|---|---|---|---|---|---|---|
| **S1** Provision target | — | FD-1/FD-2/FD-3 independent nodes confirmed; NOT office VDS | Create `static.mmbrn.tech` target environment | Health endpoint returns 200; capacity ≥ M7_SRC×2+20% | Infra | Delete provisioned target; M2 rows untouched |
| **S2** Inventory/fence | S1 | Target exists; read-only DB access granted | Fenced DB snapshot → M7_SRC; compute (workspace_id, page_id, sha256) × 139 | M7_SRC count=139; CLI vs DB reconcile report | Математик | Release fence; no data changed |
| **S3** Disposition | S2 | M7_SRC snapshot complete; 7-class taxonomy ready | Assign classification + disposition to each SourceObjectRef in M7_LEDGER | `|discovered|=139`; conservation invariant holds | Структурщик + Teamlead | Revert ledger entries to `discovered`; append-only preserved |
| **S4** Readiness gates | S3 | All M3/M4 G1-G10/M5 G1-G10/M6 gates have measurable state | Verify each gate; record PASS/FAIL/UNKNOWN | All required gates = PASS; zero UNKNOWN | Teamlead | Stop DAG; no mutation performed |
| **S5** Export/validate | S4 (all gates PASS) | M7_SRC fenced; Panel authority confirmed; backup FD-2 present | Extract bytes for non-discard objects; compute export_hash; parity check annotations | `export_hash[i] == snapshot_hash[i]` ∀ migrating objects; parity report = PASS | Математик | Discard export artefacts; M7_LEDGER: `exported→classified` |
| **S6** Migrate | S5 | Export validated; replacement engine ready; FD-1 writable | Write bytes to static target; create M2 append rows; create durable bindings | `destination_hash[i] == export_hash[i]` ∀ objects; M2 rows immutable confirmed | Структурщик | Remove destination writes; M2 rows preserved; revert to `exported` |
| **S7** Reconcile | S6 | All migrated objects have destination_hash | Three-way diff M7_SRC × M7_DEST × M7_LEDGER; build redirect table; verify conservation invariant | diff = empty; `|resolved|+|blocked|+|discard_queued|+|failed| = 139`; redirect table built | Математик | Flag failing objects → `failed`; stop cutover |
| **S8** Canary | S7 | Reconcile PASS; redirect table deployed; DNS TTL = 60s (set 48h prior) | Route 5% traffic to static target | Error rate < 1% for 10-minute window; no credential leak detected | Teamlead | 100% traffic → Affine; M7_LEDGER: `canary_failed` |
| **S9** Cutover | S8 | Canary PASS; all stakeholders notified | DNS switch to static target; 308 redirects live; WS deny active | 3× consecutive health 200 within 10 min; error rate < 0.1% on /health over 5 min | Teamlead + Архитектор | DNS revert within 72h; Caddy revert; M7_LEDGER: `cutover_failed` |
| **S9a** Observe | S9 | Cutover confirmed | Monitor for 14 days: error rate, redirect hits, 404 rate | 14-day report: no anomalies; all resolved objects reachable | Математик | Rollback if error rate ≥ 0.1% sustained; window = 72h from cutover |
| **S9b** Retire | S9a + 365d redirect lifetime elapsed | zero-traffic for 30 consecutive days on `strategy.mmbrn.tech`; all-resolved; restore/parity confirmed | Remove Affine from Caddy; close `strategy.mmbrn.tech` | Zero-traffic confirmed in logs; no pending `blocked` objects; LIVE_SERVICES updated | Teamlead | Revert if any blocked object unresolved |

---

### Таблица 5. Cases

| # | Случай | Disposition/решение | Gate | Evidence | Rollback/stop |
|---|---|---|---|---|---|
| 1 | Strategic page, канон в Git | `discard_engine_copy` (engine copy deleted post-cutover; not migrated to static) | M1-gate: not original; M5: disposable | Git commit hash; M1-posylka; M7_LEDGER state=discard_executed | Stop if M1 qualification unexpectedly triggered; revert discard |
| 2 | Duplicate imported page | `discard_duplicate` (canonical member retained if qualified; duplicate discarded) | M7_LEDGER dup-group; M1 qual for canonical | content_sha256 match for both; separate ledger rows | Stop if canonical member unresolved; no merge |
| 3 | Unique Affine-only page | `blocked_pending_qualification` (not migrated until M1 qual + M6 intent + LIGD intake) | M1-gate FAIL; M6 intent absent | M7_LEDGER: state=blocked; gate=M1; evidence_ref=M1-posylka | Blocks source retirement; no synthetic row |
| 4 | One of 57 service assets (unlinked) | `discard_engine_copy` | M5: engine state, no binding, no M2 row | No canonicalRef; M7_LEDGER: discard_queued | N/A until retirement gate |
| 5 | Asset linked by multiple pages | `blocked_pending_qualification` (ref-count insufficient; M1 qual per asset, not per parent) | M1-gate: ref-count not qualification | M7_LEDGER: blocked; no synthetic binding | Blocks retirement of asset; each page disposition independent |
| 6 | Page without binding | `blocked_pending_qualification` | M6: no durable binding | M7_LEDGER: state=blocked; gate=M6-binding | Re-queue after M6 intake; no fake binding |
| 7 | Conflicting bindings | `blocked_pending_resolution` | M2: two canonicalRef for one SourceObjectRef | Both binding records in ledger; no auto-merge | Blocked until Panel-authorized resolution with timestamp |
| 8 | Portable annotation parity mismatch | Migration blocked for object; re-export required | M5 parity check FAIL (post-S5) | `|annotations_export| ≠ |annotations_Panel|` | Re-run S5 for object; parity re-check; no proceed until PASS |
| 9 | CLI says 0, DB shows 82 | Use DB inventory; CLI discarded as evidence | M2: CLI not authoritative; fenced snapshot = truth | DB read-only query results; snapshot hash | No action on CLI output; reconcile via DB |
| 10 | M2 legacy row, no M6 ledger | `blocked_legacy_uncovered` | M6: legacy_uncovered until accepted policy | registry.jsonl row; no ledger evidence | Blocked; requires separate M6 intake; no synthetic row |
| 11 | Sensitive local ref (partner PDF) | `blocked_pending_policy` | M4: sensitive isolation; M6: no accepted policy | No Git entry; no M2 row; outside-Git reference | Blocks retirement; requires owner-accepted policy |
| 12 | Office VDS capacity FAIL | Storage NO-GO; S1 blocked | M4 G4: 9.46 GiB free < required | Measured free space; M4-posylka | DAG frozen at pre-S1; no migration begins |
| 13 | Backup exists, restore drill FAIL/unknown | M4 G3 FAIL → NO-GO | M4 G3: drill required within 30d | Drill log absent or FAIL result | S4 blocked; no proceed until drill PASS |
| 14 | Panel deny, native Affine accessible | Panel deny enforced; proxy fail-closed; Affine native ignored | M3: Panel sole authorizer | Panel deny record; proxy 401/403 log | No fallback to Affine; disposition=blocked_pending_panel_grant |
| 15 | Old deep link (known) | **308** → canonical static URL (from redirect table built at S7) | S7 reconcile PASS; redirect table complete | M7_LEDGER resolved entry with destination ref | Revert DNS/Caddy within 72h rollback window |
| 16 | Unknown old path | **404** (not in redirect table) | No matching M7_LEDGER entry | Absence of entry confirmed | Log 404 for 365-day monitoring; no 410 |
| 17 | WebSocket or direct backend bypass | network deny (WS after cutover); `127.0.0.1:3010` deny always | M3 proxy fail-closed; network policy | Proxy deny log; no credential forwarding | N/A (permanent deny); if bypass attempt logged → security alert |
| 18 | Crash between DNS/Caddy change and health proof | Auto-rollback: DNS revert within 10 min; Caddy revert | Health predicate: 3× 200 within 10 min | Health check log: no 3× 200 → rollback triggered | M7_LEDGER: cutover_failed; rollback_initiated |
| 19 | Canary errors above threshold (≥1%) | Immediate rollback: 100% traffic → Affine | Canary predicate: error rate < 1% / 10 min | Canary monitor: error rate ≥ 1% detected | M7_LEDGER: canary_failed; DAG stop |
| 20 | Rollback after new append-only events | Rollback reverts traffic/Caddy/DNS; M2 rows/bindings/bytes preserved | M2 append-only; M7_LEDGER append-only | Post-rollback ledger audit: M2 rows intact | No deletion of M2 rows; orphan cleanup only after zero live refs + ≥365d + no hold |

---

### Таблица 6. Readiness Go/No-Go Matrix

| Gate | Exact predicate | Corpus | Evidence | Current state | Fail result |
|---|---|---|---|---|---|
| M3-G1 Static ingress | `static.mmbrn.tech` ingress responds 200 via Panel proxy | static.mmbrn.tech endpoint | Health check log | **NOT IMPLEMENTED** | NO-GO: S4 blocked |
| M3-G2 Panel grants | role/section grants mapped to static container, verified | Panel grant table | Grant config export | **PARTIAL** (grants exist, static unmapped) | NO-GO: S4 blocked |
| M3-G3 Proxy fail-closed | Any request without valid Panel token → 401/403 on static route | static.mmbrn.tech route | Probe test log | **NOT VERIFIED** | NO-GO: S4 blocked |
| M4-G1 FD-1 provisioned | Independent storage node for static.mmbrn.tech confirmed, not office VDS | target host | Infra provisioning record | **NOT PROVISIONED** | NO-GO: S1 blocked |
| M4-G2 FD-2 backup complete | Last successful backup ≤ RPO on independent node | FD-2 host | Backup completion log + hash | **UNKNOWN** | NO-GO: S4 blocked |
| M4-G3 Restore drill | Drill completed with RTO ≤ target within last 30 days | FD-1 restore target | Drill report with timestamp | **NOT PERFORMED** | NO-GO: S4 blocked |
| M4-G4 Capacity/quota | Free space on target ≥ M7_SRC_size × 2 + 20% headroom | static.mmbrn.tech target | df output post-S1 | **FAIL** (office VDS: 9.46 GiB) | NO-GO: S1 blocked |
| M4-G5 FD-3 offsite | Offsite/cloud backup confirmed with RPO | FD-3 node | Backup log | **UNKNOWN** | NO-GO: S4 blocked |
| M4-G6 Sensitive isolation | Sensitive refs isolated from general corpus | sensitive_refs set | Isolation audit | **UNKNOWN** | NO-GO: S4 blocked |
| M5-G1 Binding parity | `|bindings_Panel| == |bindings_M7_SRC qualified|` | qualified objects | Panel binding export vs snapshot | **NOT MEASURED** | NO-GO: S4 blocked |
| M5-G2 Annotation parity | `|annotations_export| == |annotations_Panel|` per SourceObjectRef | per-object | Parity check report (post-S5) | **NOT MEASURED** | NO-GO: S5→S6 blocked |
| M5-G3 Replacement engine recovery | Rehydration from export completes without data loss | M7_SRC export | Rehydration test report (post-S5) | **NOT PERFORMED** | NO-GO: S6 blocked |
| M6-G1 Production intake | No legacy_uncovered objects in migration set without accepted policy | M7_SRC qualified subset | M6 ledger, accepted policy records | **FAIL** (legacy_uncovered present) | NO-GO: S4 blocked |
| M6-G2 No fake bindings | Zero synthetic M2 rows or fake bindings in M7_LEDGER | M7_LEDGER | Ledger audit | **PASS** (protocol rule) | Block if violated |
| M7-INV Fenced snapshot | M7_SRC count = 139; CLI vs DB reconciled | M7_SRC | DB query + sha256 manifest | **NOT PERFORMED** | NO-GO: S3 blocked |
| M7-CONS Conservation invariant | `|resolved|+|blocked|+|discard|+|failed| = 139` | M7_LEDGER | Ledger count report | **NOT APPLICABLE** (pre-S7) | NO-GO: S9 blocked if fails |

---

### Таблица 7. Delivery Slicing — #1303 и #1305

| Issue | Slice | Dependency | Artifact | Acceptance/review | Rollback |
|---|---|---|---|---|---|
| **#1303** | S1: Fenced inventory schema + SourceObjectRef contract | M7_SRC snapshot methodology | Schema spec, SourceObjectRef type definition, DB query template | Математик review: schema covers (workspace_id, page_id, sha256, timestamp); no CLI dependency | Revert schema; no data affected |
| **#1303** | S2: M7_LEDGER API + state machine spec | #1303-S1 complete | State machine diagram, ledger row schema, API spec (append-only, retry/recovery) | Структурщик review: all 10 states present, conservation invariant stated, no merge/fake operations | Revert spec; no implementation affected |
| **#1303** | S3: Evidence index + download route spec | #1303-S2; M3-G1 gate PASS | Route spec for `/download/:ref`, M3 action=download/lineage=canonicalRef, evidence index schema | Архитектор review: M3 action exact, no static.* object names, credential leak ban stated | Revert route spec |
| **#1305** | S1: M3-M6 readiness gates implementation | #1303-S1; infra provision complete | Gate implementation checklist, predicate scripts, go/no-go report template | Teamlead review: all 16 gates have predicate/evidence/fail result; no unknown=PASS | Revert gate scripts; no production change |
| **#1305** | S2: Export/migrate/reconcile pipeline | #1305-S1 all gates PASS; #1303-S2 | Export script spec, migrate procedure, three-way diff spec, reconcile report template | Математик + Структурщик review: conservation invariant in code; parity check integrated; no fake bindings | Rollback plan per S5/S6/S7 in DAG |
| **#1305** | S3: Caddy/DNS cutover runbook | #1305-S2 reconcile PASS; canary tooling ready | Runbook: DNS TTL change (T-48h), canary config, cutover procedure, health check script, auto-rollback trigger | Teamlead + Архитектор review: 308/404 constants confirmed; WS deny in config; rollback window = 72h stated | Runbook includes DNS revert steps |
| **#1305** | S4: Redirect/retirement + LIVE_SERVICES entry | #1305-S3 cutover complete + 14d observation PASS | Redirect table, retirement checklist (365d lifetime, 30d zero-traffic), LIVE_SERVICES row draft, monitoring config | Teamlead review: all constants match tables; retirement gate separate from cutover gate; LIVE_SERVICES draft only (not merged) | Revert retirement checklist; LIVE_SERVICES not modified in this room |

---

## Вердикт

**ПРИНЯТ.** D1 определён как единственная модель: один fenced inventory (M7_SRC), одна append-only machine (M7_LEDGER), один DAG (S1–S9b), одна route matrix (8 классов), один набор machine gates (16 entries). Carrier: `docs/seanses/static-mmbrn-container-m7-migration-delivery-2026-08-07.md`. Текущее состояние миграции: **NO-GO** — четыре независимых gate в FAIL/NOT IMPLEMENTED/UNKNOWN. DAG заморожен на pre-S1 до устранения M4-G1 (FD-1 provision) и M4-G4 (capacity). Комната закрывается без изменения кода, DNS, Caddy, Panel, issues и production.

---

## Список посылок

| # | Посылка | Тип |
|---|---|---|
| P1 | M1: original bytes и `docs/evidence` принадлежат контейнеру; Affine pages — engine state; ни одна не становится original из-за нахождения в workspace | **норма** |
| P2 | M2: `registry.jsonl` — истина регистрации; `canonicalRef = urn:mmbrn:static:<rootId>`; append-only; location — заявление, достижимость — внешнее состояние | **норма** |
| P3 | M3: Panel — единственный authorizer; proxy fail-closed; нет прямого пользовательского Affine route/token/native role | **норма** |
| P4 | M4: production требует независимые FD-1/FD-2/FD-3, capacity/quota, backup, restore drill, RPO/RTO, reconciliation, sensitive isolation; office VDS с 9.46 GiB free — storage NO-GO | **норма** + **факт** |
| P5 | M5: Affine — optional projection; engine projection/layout/cache disposable; binding/annotation parity и replacement engine recovery обязательны до cutover | **норма** |
| P6 | M6: commit = verified FD-1 + immutable M2 append + durable binding; legacy_uncovered — NO-GO; fake bindings запрещены | **норма** |
| P7 | Live Affine: `affine_server` + PostgreSQL + Redis на office VDS, loopback `127.0.0.1:3010`, Caddy route `strategy.mmbrn.tech` | **факт** |
| P8 | DB inventory: три private workspaces (Strategy, Templates, Releases); один participant; 82 pages; дубли импортированных документов; 57 служебных PNG/SVG; оригиналов чеков и внешних PDF в Affine не найдено | **факт** |
| P9 | `affine-cli doc list` = 0; read-only DB inventory = 82; CLI не является доказательством пустоты или полноты | **факт** |
| P10 | Стратегическая публикация в Affine заморожена машинным gate; Git/гранулы/генераторы — truth стратегических документов | **факт** |
| P11 | `docs/evidence/registry.jsonl`: 12 legacy rows; один PDF-чек в публичном Git; sensitive PDF партнёра вне Git; M6 объявляет их legacy_uncovered | **факт** |
| P12 | Panel имеет role/section grants; static ingress и передача решений в Affine не реализованы; текущий forward-auth не покрывает будущий static route | **факт** |
| P13 | `docs/LIVE_SERVICES.md` не объявляет Affine/`strategy.mmbrn.tech` | **факт** |
| P14 | Issues #1303 и #1305 открыты; их тексты не покрывают ратифицированный контракт M1-M6 | **факт** |
| P15 | M7 обязательные поправки run1-run2: M3 actions только `discover\|read-metadata\|read-ref\|read-bytes\|download\|write-metadata\|upload-revision\|manage-access`; object только container=`static.mmbrn.tech`, collectionId или lineage=`canonicalRef`; без циклов в DAG; разные корпуса M7/M6; rollback не удаляет M2/bindings/bytes; qualification обязательна; retirement ≠ cutover | **норма** |

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
