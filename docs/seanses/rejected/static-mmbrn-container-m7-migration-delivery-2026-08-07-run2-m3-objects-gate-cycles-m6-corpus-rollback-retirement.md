<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-08-07T05:58:34.416Z |
| Команда | `yarn consilium` |
| Модель | anthropic/claude-sonnet-4-6 |
| Файл | `docs/seanses/static-mmbrn-container-m7-migration-delivery-2026-08-07.md` |
| Порядок ролей | Teamlead → Архитектор → Математик → Музыкант → Структурщик → Верстальщик |
| Повестка | `docs/meeting/static-mmbrn-container/M7_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs/meeting/static-mmbrn-container/M7_AGENDA.md` | 11120 | `598a763e6fc6` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs/meeting/static-mmbrn-container/M7_AGENDA.md` | 11120 · 1 п. | `598a763e6fc6` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --no-memory --min-replies 36 --seed 717`

**Вопрос:**

Решите единственный вопрос D1 повестки M7 с учётом обязательных поправок run1; выберите один исполнимый контракт, не выполняя production-изменений.

---

# Консилиум: D1 — Контракт переезда strategy.mmbrn.tech → static.mmbrn.tech

**Повестка:** M7, вопрос D1 — один минимальный исполнимый контракт миграции и доставки: доказательный инвентарь 82 страниц и 57 ассетов, disposition каждого объекта, M3-M6 readiness, перенос только законных состояний, переключение Panel/proxy/Caddy/DNS, доказательство cutover и rollback, объявление в `LIVE_SERVICES`, нарезка #1303/#1305.

**Участники:** Teamlead (Тарасов), Архитектор (Веснин), Математик (Дынин), Музыкант (Курёхин), Структурщик (Ожегов), Верстальщик (Родченко).

**Порядок реплик:** Teamlead → Архитектор → Математик → Музыкант → Структурщик → Верстальщик (циклически, ≥36 реплик)

---

**[Teamlead]:** Вводная. M1-M6 закрыты, поправки run1 обязательны. Нам нужен один контракт — не набор пожеланий. Фиксирую рамку: production не трогаем, код не меняем, DNS не переключаем. Задача сегодня — протокол, который позже исполняется командой. Первый вопрос к Веснину: какая форма контракта выдержит все тринадцать обязательных решений без циклических зависимостей?

**[Архитектор]:** Форма — DAG с семью стадиями: Fence → Inventory → Disposition → Ledger-Init → Precondition-Gates → Migrate → Cutover+Observe → Retire. Критичное правило run1-2: Fence и единственный snapshot идут первыми, до любого disposition и export. Никаких петель назад к инвентарю после открытия Ledger. Каждый gate знает свой первый шаг, где evidence уже существует. Это исключает цикл «сделали disposition — обнаружили новый объект — перезапустили инвентарь».

**[Математик]:** Уточняю измеримые предикаты. Corpus выводится из fence snapshot, а не из baseline «82/57». После fence: `N_pages = count(pages WHERE workspace_id IN (Strategy,Templates,Releases) AND deleted_at IS NULL)`, `N_assets = count(blobs WHERE ref_count > 0)`. Двусторонняя равность: `DB_set = Export_set` по `SourceObjectRef+sha256`, не по counts. Это единственное доказательство полноты инвентаря. CLI-ноль — не свидетель.

**[Музыкант]:** Меня беспокоит in-flight состояние. На момент fence в Affine могут быть открытые WebSocket-сессии и незакоммиченные CRDT-дельты. Если мы делаем snapshot до закрытия этих сессий — получаем грязное состояние. Предлагаю: шаг Fence включает machine gate «active_ws_connections = 0 AND pending_crdt_ops = 0» перед снятием snapshot. Это даёт нам чистую точку без ручного вмешательства.

**[Структурщик]:** Поддерживаю предикат Курёхина, но добавляю структурное требование. Ledger — отдельный append-only log-файл, не колонка в той же БД Affine. Каждая запись: `{SourceObjectRef, sha256, state, timestamp, actor, evidence_ref}`. Engine id Affine (`block_id`, `workspace_id`) — это не `canonicalRef` по M2; в Ledger они идут как `engine_ref`, отдельным полем. Слияние дублей в Ledger запрещено — каждый duplicate получает собственную строку с `disposition=discard` и указанием на canonical sibling.

**[Верстальщик]:** С точки зрения наблюдаемости: cutover должен давать машинный сигнал, а не «визуально похоже». Gate «zero-traffic на strategy.mmbrn.tech» я определяю как: `req_rate(strategy.mmbrn.tech, 15min) = 0` — ноль запросов за пятнадцать минут по метрике proxy-лога. Это единственная проверяемая форма нулевого трафика. Аналогично для canary: окно 30 минут, предикат `error_rate > 1%` — порог остановки. Эти числа повторяются во всех строках таблиц без исключения.

**[Teamlead]:** Принимаю константы Родченко: redirect — HTTP 308, unmapped — HTTP 410, canary window — 30 минут, error predicate — >1%, rollback window — 4 часа после cutover, redirect lifetime — 1 год, observation interval — 15 минут, zero-traffic predicate — `req_rate=0 за 15 минут`. Эти значения не меняются ни в одной строке протокола. Дынин, нужна формальная спецификация state machine Ledger — сколько состояний, какие переходы?

**[Архитектор]:** Пока Дынин считает — уточняю границу route matrix. По run1-1: у каждого route ровно один M3 action/object либо pre-action network deny. `static.*` маршруты не появляются до завершения Provision шага. Canary и rollback сохраняют Panel gate и current versions — это не опция, это hard constraint. Отдельно: deep links вида `strategy.mmbrn.tech/doc/<id>` после cutover → 308 на `static.mmbrn.tech/ref/<canonicalRef>` — только если для данного `SourceObjectRef` в Ledger есть `state=delivered` с `canonicalRef`. Без этого — 410.

**[Математик]:** State machine Ledger: шесть состояний. `PENDING` → `FENCED` → `CLASSIFIED` → `DISPOSED` → `MIGRATED` → `DELIVERED`. Плюс два terminal rejection: `BLOCKED` (resolved, negative) и `DISCARDED` (resolved, positive discard). Переход `DISPOSED → MIGRATED` требует entry predicate: все M4 G1-G10 gates = PASS. Переход `MIGRATED → DELIVERED` требует: M5 binding+annotation parity verified, M6 commit = verified FD-1 + immutable M2 append + durable binding. `BLOCKED` и `DISCARDED` — terminal только при `complete_evidence = true`; manual/failed без evidence — не terminal, остаются в `DISPOSED` с retry-флагом.

**[Музыкант]:** По поправке run1-4: manual/blocked/failed unresolved не terminal. Значит в Ledger нужен recovery path. Предлагаю: `DISPOSED` с `retry_flag=true` и `evidence_missing` → scheduled review event → при поступлении evidence → transition attempt снова. Crash recovery: если процесс упал между `CLASSIFIED` и `DISPOSED` — при restart сверяем Ledger с snapshot по `SourceObjectRef+sha256`; расхождение → re-enter `CLASSIFIED` без потери предыдущих записей (append-only: добавляем строку `{state: CLASSIFIED, reason: crash_recovery}`).

**[Структурщик]:** Важное уточнение по M6. Три-way diff для каждого объекта: `C_all` (полный corpus из snapshot), `C_live` (объекты с `state != DISCARDED` в Ledger), `L_proposed` (объекты с disposition=migrate или deliver), `C_managed` (объекты с `state=DELIVERED`), `C_legacy` (объекты, ссылающиеся на legacy rows без M6 ledger evidence). Cardinalities всех пяти множеств фиксируются в Ledger-header после Fence и не меняются ретроактивно — только дополняются новой строкой при изменении.

**[Верстальщик]:** Для route matrix добавляю observability-требование. Каждый route class должен иметь named metric в proxy-логе: `route_class` label. Это даёт нам возможность после cutover проверить `req_rate(route_class=strategy_legacy, 15min) = 0` как машинный gate отключения старого хоста. Без этого label «zero-traffic» — ненаблюдаемое утверждение.

**[Teamlead]:** Структурщик, уточни: как именно M6 three-way diff связан с шагами DAG? Мне нужно понять, на каком шаге `C_managed` впервые становится непустым — это точка cutover readiness.

**[Архитектор]:** Отвечу за структуру: `C_managed` становится непустым на шаге Migrate, когда первый объект достигает `state=DELIVERED` в Ledger. Но cutover readiness — не «хотя бы один», а `C_managed = C_live` (все живые объекты доставлены). Это exit gate шага Migrate → Cutover. Дополнительно: M5 replacement engine должен пройти rehydration gate именно на этом шаге — после того как `C_managed` сформирован, до переключения DNS.

**[Математик]:** Для reconciliation: двусторонняя проверка после Migrate. `DB_delivered = {SourceObjectRef+sha256 : state=DELIVERED в Ledger}`. `Static_served = {SourceObjectRef+sha256 : объект доступен в static.mmbrn.tech по canonicalRef}`. Условие no-loss: `DB_delivered ⊆ Static_served`. Условие no-duplicate: `|Static_served| = |DB_delivered|`. Оба предиката — машинные, запускаются автоматически как exit gate шага Reconcile. Если хотя бы один FAIL — шаг Cutover не начинается.

**[Музыкант]:** По consistency во время cutover: in-flight сессии. Caddy переключает upstream с `127.0.0.1:3010` на static backend. В момент переключения существующие WebSocket-соединения на strategy.mmbrn.tech разрываются — это неустранимо при смене upstream. Предикат availability: `HTTP 200 rate(static.mmbrn.tech, 5min) > 99%` — это entry gate шага Observe, не обещание zero-downtime. Для WebSocket-bypass: pre-action network deny на уровне Caddy до Provision — `wss://strategy.mmbrn.tech/*` → 403 Forbidden, это не обход authority, это deny.

**[Структурщик]:** По disposition классам (M5 state classes). Семь классов: (1) originals/registry — source: Git/docs/evidence, dest: без изменений, policy: no-migrate; (2) projection intent — source: Panel, dest: Panel, policy: preserve; (3) binding events — source: Ledger, dest: Ledger, policy: append-only-migrate; (4) portable annotations — source: Affine export, dest: static backend, policy: migrate+verify-parity; (5) engine projection — source: Affine engine, dest: replacement engine, policy: rebuild; (6) layout/cache/session — source: Affine engine, dest: discard, policy: discard-on-fence; (7) strategic docs — source: Git, dest: Git, policy: no-copy-to-static без explicit M6 intent.

**[Верстальщик]:** Retirement contract: после zero-traffic gate (`req_rate=0 за 15 минут` — та же константа) и 1 год redirect lifetime — machine deletion gate для старого Affine route. Этот gate требует: (a) `LIVE_SERVICES.md` содержит запись `static.mmbrn.tech`, (b) all Ledger entries `state IN (DELIVERED, DISCARDED, BLOCKED)` с `complete_evidence=true`, (c) redirect probe: `curl -I strategy.mmbrn.tech/healthz` → 308. Только при всех трёх — gate открывается для ручного подтверждения удаления Caddy route.

**[Teamlead]:** Веснин, мне нужна финальная форма rollout DAG — восемь шагов с зависимостями, entry gates, mutations, exit evidence, owner и stop/rollback для каждого. Это скелет контракта.

**[Архитектор]:** DAG. Шаг 1 — Provision: deps=none, entry=M4 G1-G5 PASS (capacity на новом FD-1/FD-2, не office VDS), mutation=none в production, exit=infrastructure readiness report, owner=Математик, stop=M4 FAIL → NO-GO. Шаг 2 — Fence: deps=Provision, entry=`active_ws=0 AND pending_crdt=0`, mutation=read-only lock на Affine DB, exit=fence timestamp + `SourceObjectRef` set, owner=Математик, stop=lock FAIL → retry 3x → abort. Шаг 3 — Inventory: deps=Fence, entry=fence lock confirmed, mutation=none (read-only snapshot), exit=`N_pages, N_assets, sha256 per object, DB_set=Export_set двусторонне`, owner=Математик, stop=mismatch → abort до manual review.

**[Математик]:** Продолжаю DAG. Шаг 4 — Disposition: deps=Inventory, entry=`C_all known, C_legacy identified`, mutation=Ledger-Init (append-only, первые записи PENDING→CLASSIFIED), exit=все объекты в `CLASSIFIED` с explicit disposition и M1/M5 authority, owner=Структурщик+Архитектор, stop=любой unclassified object → HOLD. Шаг 5 — Precondition-Gates: deps=Disposition, entry=`C_all CLASSIFIED`, mutation=none, exit=M3/M4 G1-G10/M5 G1-G10/M6 gates — все PASS, owner=Математик, stop=любой gate FAIL или UNKNOWN → NO-GO. Шаг 6 — Migrate: deps=Precondition-Gates PASS, entry=all gates green, mutation=export+ingest в static backend+Ledger CLASSIFIED→DISPOSED→MIGRATED→DELIVERED, exit=reconciliation predicate `DB_delivered = Static_served` двусторонне, owner=Структурщик, stop=любое расхождение → abort+rollback.

**[Музыкант]:** Шаг 7 — Canary+Cutover: deps=Migrate (reconciliation PASS), entry=`C_managed=C_live, M5 parity PASS, M6 commit verified`, mutation=Caddy upstream switch (Panel-authorized), exit=`HTTP 200 rate(static.mmbrn.tech, 5min) > 99%`, canary window=30 минут, error predicate=`>1%` → rollback, owner=Математик+Teamlead, stop=error_rate>1% → immediate rollback. Rollback window=4 часа. Шаг 8 — Observe+Retire: deps=Canary PASS + 15min observation, entry=`req_rate(strategy, 15min)=0`, mutation=308 redirect activation + `LIVE_SERVICES.md` edit (Panel-authorized), exit=redirect probe PASS + LIVE_SERVICES entry confirmed, owner=Верстальщик+Teamlead, stop=redirect FAIL → restore Caddy upstream.

**[Структурщик]:** По Panel/реестрам (обязательное решение 11): M7 сама не выполняет эти правки. Классы будущих edits после завершения M7: (a) navigation grants в Panel — отдельный task после LIVE_SERVICES; (b) runbook — отдельный документ, не этот carrier; (c) monitoring — отдельный issue после canary PASS; (d) `LIVE_SERVICES.md` — правится на шаге Retire, не сейчас. Протокол фиксирует намерение, не исполнение.

**[Верстальщик]:** Rollback contract. Каждая mutation имеет точку отката: Fence → unlock Affine DB (append-only Ledger остаётся, Affine продолжает работать). Ledger-Init → нет отката данных Ledger, но Affine production не затронут. Migrate → удаление ingested objects из static backend + Ledger entries сохраняются (append новых строк с `state=ROLLBACK`). Canary switch → Caddy upstream revert к `127.0.0.1:3010`, Panel gate сохраняется. Без возврата Affine bypass и без второй authority — Caddy просто возвращает старый upstream, Panel остаётся authorizer.

**[Teamlead]:** Хорошо. Теперь нарезка #1303 и #1305. Ожегов, дай структуру зависимых слайсов — scope, prerequisites, artifacts, acceptance, rollback, review.

**[Архитектор]:** Перед слайсами — уточнение по M6 буквальным сохранениям. `C_all` = fence snapshot total. `C_live` = объекты без `deleted_at`. `L_proposed` = объекты с disposition=migrate в Ledger. `C_managed` = objects с `state=DELIVERED`. `C_legacy` = objects с ссылкой на legacy rows без M6 ledger evidence. Все пять cardinalities фиксируются в Ledger-header на шаге Disposition и воспроизводятся в full three-way diff отчёте как exit gate шага Reconcile.

**[Математик]:** Добавлю к M6 three-way diff: формальные предикаты. `L_proposed ⊆ C_live` (нельзя предложить миграцию удалённого объекта). `C_managed ⊆ L_proposed` (только задиспозиционированные объекты могут быть delivered). `C_legacy ∩ C_managed = ∅` (legacy_uncovered не могут быть delivered без отдельной accepted policy). Эти три инварианта проверяются машинно на шаге Reconcile; любое нарушение = FAIL.

**[Музыкант]:** По чувствительным объектам (sensitive local ref, случай 11): sensitive PDF партнёра — вне Git, вне Affine (не найден в DB inventory). Disposition: `NOT_IN_CORPUS` — объект не входит в fence snapshot, в Ledger не регистрируется. Но в Readiness matrix это gate: `sensitive_isolation PASS` требует подтверждения, что sensitive ref не просочился в static backend через косвенные ссылки из pages. Это отдельная проверка на шаге Precondition-Gates.

**[Структурщик]:** #1303 — индекс/API вещдоков. Slice 1a: scope=M2 registry reconciliation (12 legacy rows → full three-way diff, `C_legacy` classification); prerequisites=Fence+Inventory complete; artifacts=updated `registry.jsonl` entries + reconciliation report; acceptance=`C_legacy` fully classified + no unresolved legacy_uncovered in migrate-path; rollback=no production change, Ledger-only; review=Архитектор+Математик. Slice 1b: scope=API endpoint для canonicalRef lookup; prerequisites=Slice 1a PASS + static backend provisioned; artifacts=API spec + implementation; acceptance=`GET /ref/{canonicalRef}` returns correct object or 410; rollback=disable endpoint; review=Структурщик.

**[Верстальщик]:** #1305 — переезд Affine. Slice 2a: scope=Disposition+Ledger-Init для всех 82 pages + 57 assets; prerequisites=Inventory complete + M4 G1-G10 PASS; artifacts=complete Ledger с `C_all` classified; acceptance=zero unclassified objects; rollback=Ledger append ROLLBACK rows, Affine untouched; review=Архитектор. Slice 2b: scope=Migrate+Reconcile; prerequisites=Slice 2a PASS + Precondition-Gates PASS; artifacts=static backend populated + reconciliation report; acceptance=`DB_delivered=Static_served` двусторонне; rollback=purge static backend; review=Математик+Структурщик. Slice 2c: scope=Canary+Cutover+Retire; prerequisites=Slice 2b PASS + M5 parity PASS; artifacts=Caddy config change + LIVE_SERVICES entry; acceptance=canary 30min `error_rate ≤ 1%` + redirect probe 308; rollback=Caddy revert, window=4 часа; review=Teamlead.

**[Teamlead]:** Сворачиваю обсуждение в пропозицию D1. Контракт: один rollout DAG из восьми шагов (Provision→Fence→Inventory→Disposition→Precondition-Gates→Migrate→Canary-Cutover→Observe-Retire), один Ledger с шестью состояниями + два terminal, одна route matrix с M3-exact actions, один набор machine gates с константами (308/410/30min/1%/4h/1year/15min/req_rate=0). Corpus — из fence snapshot, не baseline. `C_all,C_live,L_proposed,C_managed,C_legacy` — machine-verified. #1303 → 1a+1b, #1305 → 2a+2b+2c. GO только при всех gates PASS, текущее состояние — NO-GO.

**[Архитектор]:** Принимаю. Форма выдержит. Единственная оговорка: DAG не исполняется в этой комнате — это контракт для execution phase. Carrier — `docs/seanses/static-mmbrn-container-m7-migration-delivery-2026-08-07.md`, второй носитель запрещён.

**[Математик]:** Принимаю. Все предикаты вычислимы. Двусторонняя равность по `SourceObjectRef+sha256` — единственная форма доказательства инвентаря. CLI-ноль не является свидетелем.

**[Музыкант]:** Принимаю. In-flight session gate (`active_ws=0`) перед Fence — в контракте. WS-bypass → pre-action network deny. Consistency честная: downtime при Caddy switch признан, availability predicate сформулирован.

**[Структурщик]:** Принимаю. Ledger структурно отделён от Affine DB. Engine id ≠ canonicalRef. Duplicates — отдельные строки с `disposition=discard`. `C_legacy ∩ C_managed = ∅` — machine-invariant.

**[Верстальщик]:** Принимаю. Константы едины во всех таблицах. Route class labels в proxy-логе обеспечивают observability. Retirement gate — три предиката машинно.

**[Teamlead]:** Вердикт: **ПРИНЯТО**. Контракт M7 D1 зафиксирован. Исполнение — вне этой комнаты.

---

## Итоговое решение консилиума

### Пропозиция D1

Единственный исполнимый контракт миграции `strategy.mmbrn.tech → static.mmbrn.tech` состоит из:

| Компонент | Выбор |
|---|---|
| Rollout DAG | 8 шагов: Provision→Fence→Inventory→Disposition→Precondition-Gates→Migrate→Canary-Cutover→Observe-Retire |
| Migration Ledger | Append-only log, 6 состояний + 2 terminal, `SourceObjectRef+sha256` как ключ |
| Route/access matrix | M3-exact actions, pre-action deny где нет M3 permission, `static.*` только после Provision |
| Machine gates | Единый набор констант: 308/410/30min/1%/4h/1year/15min/req_rate=0 |
| Delivery slicing | #1303→1a+1b; #1305→2a+2b+2c |
| Current go/no-go | **NO-GO** — office VDS storage FAIL (M4), legacy_uncovered без policy, static ingress не реализован, Panel forward-auth не покрывает будущий static route |

### Verdict: ПРИНЯТО единогласно

---

## Таблица 1 — Inventory/Disposition (представительные классы)

| Source kind/id | Classification | Duplicate group | Destination | Disposition | Authority | Evidence |
|---|---|---|---|---|---|---|
| Affine page / strategic, Git-canonical | projection (engine) | — | discard engine copy | discard | M1+M5 | Git SHA present в docs/evidence |
| Affine page / duplicate imported | engine-duplicate | dup-group-N | discard all but canonical | discard | M5 | Ledger duplicate-ref |
| Affine page / unique Affine-only | portable-annotation candidate | — | static backend (annotations only) | migrate-annotations | M5+M6 | M6 intent required |
| Service asset PNG/SVG / unreferenced | engine-asset | — | discard | discard | M5 | ref_count=0 in snapshot |
| Service asset / multi-page ref | engine-asset-shared | shared-N | static backend (if pages migrate) | migrate-with-referencing-pages | M5 | ref_count>1 в snapshot |
| Affine page / no binding | unbound-projection | — | BLOCKED pending owner decision | blocked | M6 | no binding event in Ledger |
| Affine page / conflicting bindings | ambiguous | conflict-N | BLOCKED pending resolution | blocked | M2+M6 | two+ binding rows same object |
| Legacy row без M6 ledger | legacy_uncovered | — | C_legacy, no migrate | blocked | M6 | registry.jsonl row without accepted policy |
| Sensitive PDF партнёра | NOT_IN_CORPUS | — | not in Ledger | out-of-scope | M4+M6 | not found in DB inventory |
| Strategic doc (Git truth) | original/registry | — | Git, no copy to static | no-migrate | M1 | Git SHA в docs/evidence |
| Portable annotation | binding-event | — | static backend | migrate | M5 | annotation export + parity check |
| Engine projection/layout/cache | engine-disposable | — | discard on Fence | discard | M5 | snapshot timestamp |

---

## Таблица 2 — Migration Ledger / State Machine

| State | Entry predicate | Allowed transition | Durable evidence | Retry/recovery | Terminal outcome |
|---|---|---|---|---|---|
| PENDING | Object в fence snapshot | → FENCED | SourceObjectRef+sha256+timestamp в Ledger | На re-fence: append новой строки, не перезапись | Нет |
| FENCED | fence lock confirmed, active_ws=0 | → CLASSIFIED | fence lock timestamp | Retry 3x, затем abort | Нет |
| CLASSIFIED | C_all known, explicit disposition assigned | → DISPOSED (если migrate) / → DISCARDED (если discard) | disposition record с M1/M2/M5 authority + actor | На crash: re-enter CLASSIFIED, append crash_recovery | Нет |
| DISPOSED | Disposition assigned, M4 G1-G10 = PASS | → MIGRATED | export artifact hash + static backend ingest receipt | На FAIL: retry_flag=true, evidence_missing → scheduled review | Нет |
| MIGRATED | DB_delivered ⊆ Static_served, M5 parity PASS | → DELIVERED | reconciliation report двусторонний | На mismatch: rollback ingest, re-enter DISPOSED | Нет |
| DELIVERED | M6 commit = verified FD-1 + M2 append + durable binding | (terminal) | M6 commit record | Нет | **DELIVERED** (positive) |
| BLOCKED | Complete evidence of block reason | (terminal только при complete_evidence=true) | block reason + actor + evidence_ref | Без complete_evidence → остаётся DISPOSED+retry | **BLOCKED** (negative, resolved) |
| DISCARDED | Discard authority + evidence | (terminal только при complete_evidence=true) | discard record + M1/M5 basis | Без evidence → не terminal | **DISCARDED** (positive, resolved) |

---

## Таблица 3 — Route/Access Matrix

Константы: redirect=**308**, unmapped=**410**, canary window=**30 мин**, error predicate=**>1%**, rollback window=**4 ч**, redirect lifetime=**1 год**, observation interval=**15 мин**, zero-traffic=**req_rate=0 за 15 мин**.

| Route class | Hostname/path | Internal target | M3 action/object | Before cutover | During canary (30 мин) | After cutover | Rollback behavior |
|---|---|---|---|---|---|---|---|
| Static serve | static.mmbrn.tech/* | static backend | `read-bytes / static-object` | 503 (not provisioned) | 200 (Panel gate) | 200 (Panel gate) | Caddy upstream revert |
| Strategy legacy root | strategy.mmbrn.tech/ | Affine 127.0.0.1:3010 | `read-metadata / affine-workspace` | 200 (Affine) | 308 → static.mmbrn.tech/ | 308 → static.mmbrn.tech/ (1 год) | Caddy upstream revert, 308 снимается |
| Deep link с canonicalRef | strategy.mmbrn.tech/doc/\<id\> | Affine / static | `read-ref / affine-doc` | 200 Affine | 308 → static.mmbrn.tech/ref/\<canonicalRef\> если DELIVERED | 308 или 410 | revert mapping |
| Unmapped old path | strategy.mmbrn.tech/\<unknown\> | none | pre-action network deny | Affine 404 | 410 | 410 | N/A (stateless) |
| API endpoint | static.mmbrn.tech/api/* | static API | `read-metadata / registry-object` | 503 | 200 (Panel gate) | 200 (Panel gate) | disable endpoint |
| Download | static.mmbrn.tech/download/\<ref\> | static backend | `download / static-object` | 503 | 200 (Panel gate) | 200 (Panel gate) | Caddy upstream revert |
| Preview | static.mmbrn.tech/preview/\<ref\> | static backend | `read-bytes / static-object` | 503 | 200 (Panel gate) | 200 (Panel gate) | Caddy upstream revert |
| WebSocket strategy | wss://strategy.mmbrn.tech/* | none | pre-action network deny | 403 (deny) | 403 (deny) | 403 (deny) | N/A (permanent deny) |
| Direct backend bypass | 127.0.0.1:3010/* | none | pre-action network deny (loopback) | network deny | network deny | network deny | N/A |
| Write-metadata (Panel-authorized) | static.mmbrn.tech/meta/* | static backend | `write-metadata / static-object` | 503 | Panel gate | Panel gate | revert |
| Upload-revision (Panel-authorized) | static.mmbrn.tech/upload/* | static backend | `upload-revision / static-object` | 503 | Panel gate | Panel gate | revert |
| Manage-access (Panel only) | static.mmbrn.tech/access/* | Panel | `manage-access / static-object` | N/A | Panel only | Panel only | N/A |

**Credential-leak ban:** ни один route не передаёт Affine-native token или session cookie во внешний ответ; Panel gate — единственная credential path.

---

## Таблица 4 — Rollout DAG

| Шаг | Зависимости | Entry gate | Mutation | Exit evidence | Owner | Stop/rollback |
|---|---|---|---|---|---|---|
| 1. Provision | none | M4 G1-G5 PASS на новом FD-1/FD-2 (не office VDS); office VDS storage = NO-GO | Infrastructure setup (вне production Affine) | Infrastructure readiness report signed | Математик | M4 FAIL → NO-GO, не продолжать |
| 2. Fence | Provision PASS | `active_ws_connections=0 AND pending_crdt_ops=0` | Read-only lock на Affine DB (не удаление данных) | Fence timestamp + full `SourceObjectRef` set | Математик | Lock FAIL → retry 3×, затем abort; Affine продолжает работу |
| 3. Inventory | Fence lock confirmed | Fence timestamp present in Ledger | Read-only DB snapshot + export | `N_pages, N_assets, sha256 per object`; `DB_set=Export_set` двусторонне по `SourceObjectRef+sha256` | Математик | Mismatch → abort; manual review required; no production change |
| 4. Disposition | Inventory complete | `C_all known, C_legacy identified, Ledger-Init empty` | Ledger-Init: append PENDING→CLASSIFIED for each object | All objects in CLASSIFIED с explicit disposition, M1/M2/M5 authority, actor, evidence_ref; `C_all,C_live,L_proposed,C_managed,C_legacy` cardinalities in Ledger-header | Структурщик+Архитектор | Any unclassified object → HOLD; no migration until resolved |
| 5. Precondition-Gates | Disposition complete (`C_all` classified) | `C_all CLASSIFIED` | None | M3 check PASS; M4 G1-G10 PASS; M5 G1-G10 PASS; M6 full PASS; `sensitive_isolation PASS`; `C_legacy ∩ C_managed = ∅` verified | Математик | Any gate FAIL or UNKNOWN → NO-GO; не продолжать |
| 6. Migrate | Gates PASS | All precondition gates green | Export от Affine (read); ingest в static backend; Ledger CLASSIFIED→DISPOSED→MIGRATED→DELIVERED per object | Reconciliation: `DB_delivered = Static_served` двусторонне; M5 annotation parity PASS; M6 commit per delivered object | Структурщик | Any reconciliation mismatch → abort + rollback (purge static backend ingested objects; Ledger: append ROLLBACK rows) |
| 7. Canary-Cutover | Migrate PASS (`C_managed=C_live`) + M5 parity PASS + M6 verified | `C_managed=C_live; HTTP 200 rate(static, 5min) > 99%` | Caddy upstream switch (Panel-authorized); 308 redirects activation | Canary: 30 мин window, `error_rate ≤ 1%`; `HTTP 200 rate(static.mmbrn.tech, 5min) > 99%` | Математик+Teamlead | `error_rate > 1%` → immediate Caddy revert; rollback window = 4 ч |
| 8. Observe-Retire | Canary PASS + 15 мин observation | `req_rate(strategy.mmbrn.tech, 15min) = 0` | `LIVE_SERVICES.md` добавить запись `static.mmbrn.tech` (Panel-authorized edit) | Redirect probe: `curl -I strategy.mmbrn.tech/healthz` → 308; LIVE_SERVICES entry confirmed; all Ledger entries terminal с complete_evidence | Верстальщик+Teamlead | Redirect FAIL → restore Caddy upstream; rollback window = 4 ч |

---

## Таблица 5 — Cases

Константы те же: 308/410/30min/1%/4h/1year/15min/req_rate=0.

| Случай | Disposition/решение | Gate | Evidence | Rollback/stop |
|---|---|---|---|---|
| 1. Strategic page, канон в Git | DISCARD engine copy; Git остаётся truth | M1: not original; M5: engine projection disposable | Git SHA в docs/evidence; Ledger: DISCARDED с M1 basis | Нет rollback нужен; append DISCARDED в Ledger |
| 2. Duplicate imported page | DISCARD все дубли; canonical sibling — отдельная строка | M5: duplicates не сливаются | Ledger: отдельная DISCARDED строка per duplicate с canonical_sibling_ref | Append ROLLBACK row если ошибочно discarded |
| 3. Unique Affine-only page | MIGRATE annotations если M6 intent подтверждён; иначе BLOCKED | M5 parity check; M6 owner intent | Annotation export + parity report; M6 intent record от owner | BLOCKED → scheduled review; no migration without intent |
| 4. Один из 57 service assets | DISCARD если ref_count=0; MIGRATE если ref_count>0 и referencing page мигрирует | M5: engine asset disposable; ref_count в snapshot | snapshot ref_count; Ledger entry | Append ROLLBACK если ошибочно discarded; check referencing pages |
| 5. Asset, связанный несколькими pages | MIGRATE вместе с мигрирующими pages | M5: shared asset follows migrating pages | ref_count>1 в snapshot; all referencing pages Ledger state | Rollback: purge asset from static if all referencing pages rollback |
| 6. Page без binding | BLOCKED pending owner decision | M6: no binding = no M6 commit possible | Ledger: DISPOSED с retry_flag=true, evidence_missing | Scheduled review; no cutover until resolved or explicitly DISCARDED |
| 7. Conflicting bindings | BLOCKED pending resolution | M2: два binding row на один object = ambiguous | Ledger: BLOCKED с conflict-ref список | Manual resolution required; append resolution row to Ledger |
| 8. Portable annotation parity mismatch | HOLD migration; re-export и re-verify | M5: binding/annotation parity обязательна до cutover | Parity report с mismatch detail | Re-export cycle; if unresolvable → BLOCKED |
| 9. CLI говорит 0, DB/export видят 82 | CLI-ноль игнорируется; DB inventory = ground truth | M7 inventory rule: DB/export reconciliation, не CLI | `DB_set=Export_set` двусторонне по sha256 | No action on CLI output; investigation of CLI bug in #1305 scope |
| 10. M2 legacy row без M6 ledger | `legacy_uncovered`; C_legacy член; NO migration | M6: legacy_uncovered → production intake NO-GO | registry.jsonl row + absence of accepted ledger evidence | Cannot migrate until separate accepted policy; BLOCKED |
| 11. Sensitive local ref | NOT_IN_CORPUS (не в DB inventory); sensitive_isolation gate | M4: sensitive isolation required; NOT found in Affine DB | DB inventory negative; gate: no sensitive ref in static backend ingested objects | If found in static backend: immediate purge; abort migration |
| 12. Office VDS capacity FAIL | Storage NO-GO; Provision must use separate FD-1/FD-2 | M4 G1: independent storage, not office VDS (9.46 GiB free) | M4 capacity report on new FD | DAG halts at Provision; не продолжать без PASS |
| 13. Backup есть, restore drill FAIL/UNKNOWN | M4 G-restore: NO-GO | M4: complete backup + restore drill required | Backup artifact exists; drill result = FAIL or UNKNOWN | DAG halts at Precondition-Gates; restore drill must pass before Migrate |
| 14. Panel deny при native Affine capability | Network deny enforced; no bypass | M3: Panel = sole authorizer; no native Affine route | Proxy log: Panel deny + network deny на Affine direct | No rollback needed; this is correct behaviour |
| 15. Старый deep link | 308 → `static.mmbrn.tech/ref/<canonicalRef>` если DELIVERED; иначе 410 | Ledger: DELIVERED с canonicalRef | Ledger state=DELIVERED; redirect probe | Caddy revert в rollback window=4 ч |
| 16. Неизвестный old path | 410 (unmapped) | Route matrix: pre-action network deny для unmapped | proxy log 410 response | Stateless; no rollback needed |
| 17. WebSocket или direct backend bypass | Pre-action network deny → 403 / network deny | M3: no WS route authorised; loopback deny | proxy/firewall log 403 | Permanent deny; не rollback |
| 18. Crash между DNS/Caddy change и health proof | Rollback window=4 ч; Caddy revert к 127.0.0.1:3010 | Health probe: `HTTP 200 rate(static, 5min) > 99%` | Health probe FAIL record + Caddy revert log | 4-часовое окно; если revert успешен — Affine продолжает; Ledger сохраняется |
| 19. Canary ошибки выше порога | `error_rate > 1%` за 30 мин → immediate rollback | Canary gate: error_rate ≤ 1% за 30 мин | canary metric log | Caddy revert; rollback window=4 ч; append ROLLBACK в Ledger |
| 20. Rollback после новых append-only events | Rollback не трогает Ledger history; только Caddy revert + static backend purge | Append-only invariant M2; rollback window=4 ч | Ledger append ROLLBACK rows; Caddy revert log | Affine возвращается как primary; Panel gate сохраняется; no Affine bypass |

---

## Таблица 6 — Readiness (Go/No-Go Matrix)

Константы: error_rate threshold=**1%**, observation interval=**15 мин**.

| Gate | Exact predicate | Corpus | Evidence | Current state | Fail result |
|---|---|---|---|---|---|
| M3-auth | Panel = sole authorizer; proxy fail-closed; no native Affine token route | All routes в matrix | Panel auth config; proxy log sample | Panel grants exist; static ingress NOT configured → **FAIL** | NO-GO: static ingress must be provisioned |
| M4-G1 capacity | FD-1/FD-2/FD-3 независимы; office VDS NOT used for production storage | New storage target | Capacity report на new FD | Office VDS 9.46 GiB free → storage **FAIL** | NO-GO: new FD required |
| M4-G2 backup | Complete backup exists на FD независимом от primary | Affine DB + static backend | Backup artifact + timestamp | Unknown (not measured) → **UNKNOWN** | NO-GO: UNKNOWN = FAIL |
| M4-G3 restore drill | Restore drill completed successfully | Backup artifact | Drill log + restored hash match | FAIL or UNKNOWN → **FAIL** | NO-GO |
| M4-G4 RPO/RTO | RPO ≤ defined target; RTO ≤ defined target | Production data | RPO/RTO measurement | Not defined → **UNKNOWN** | NO-GO |
| M4-G5 reconciliation | Post-restore: `restored_set = backup_set` двусторонне | Full backup | Reconciliation report | Not run → **UNKNOWN** | NO-GO |
| M5-G1 binding parity | All migrating pages: binding event exists in Ledger | L_proposed | Ledger binding rows | Incomplete: Panel grants exist but static ingress bindings not yet created → **FAIL** | NO-GO |
| M5-G2 annotation parity | All portable annotations present in export matching source | C_live annotations | Parity report | Not measured → **UNKNOWN** | NO-GO |
| M5-G3 replacement engine | Replacement engine can rehydrate all DELIVERED objects | C_managed | Rehydration test log | Not provisioned → **FAIL** | NO-GO |
| M6-full | `C_legacy ∩ C_managed = ∅`; no fake bindings; each DELIVERED has M6 commit | C_all | Ledger M6 commit records | 12 legacy_uncovered, no accepted policy → **FAIL** | NO-GO |
| Sensitive isolation | No sensitive ref in static backend | NOT_IN_CORPUS objects | Static backend scan | Not scanned → **UNKNOWN** | NO-GO |
| Fence predicate | `active_ws=0 AND pending_crdt_ops=0` | Live Affine sessions | Affine session log | Not measured → **UNKNOWN** | NO-GO (block Fence step) |
| DB=Export equality | `DB_set=Export_set` двусторонне по `SourceObjectRef+sha256` | C_all | Reconciliation report | Not run (no export done) → **UNKNOWN** | NO-GO |
| Canary health | `error_rate ≤ 1%` за 30 мин; `HTTP 200 rate > 99%` | static.mmbrn.tech traffic | Canary metric log | Not applicable yet → **PENDING** | Stop canary if FAIL |
| Zero-traffic retire | `req_rate(strategy.mmbrn.tech, 15min) = 0` | Proxy log | Proxy metric | Not applicable yet → **PENDING** | Extend observation; do not retire |
| **Overall current** | All required gates PASS | All of above | All evidence | Multiple FAIL/UNKNOWN → **NO-GO** | **Migration cannot start** |

---

## Таблица 7 — Delivery Slicing

| Slice | Issue | Scope | Prerequisites | Artifacts | Acceptance/review | Rollback |
|---|---|---|---|---|---|---|
| 1a — Registry reconciliation | #1303 | M2 `registry.jsonl`: 12 legacy rows → full three-way diff; `C_legacy` classification; `C_all,C_live,L_proposed,C_managed,C_legacy` cardinalities | Fence+Inventory complete; Ledger-Init | Updated registry.jsonl (append-only rows); reconciliation report с five-set cardinalities; `C_legacy` fully classified | Zero unclassified legacy rows; `C_legacy ∩ C_managed = ∅` verified; review: Архитектор+Математик | Ledger-only; no production change; append ROLLBACK rows |
| 1b — Registry API | #1303 | `GET /ref/{canonicalRef}` endpoint в static backend; lookup по Ledger DELIVERED entries | Slice 1a PASS; static backend provisioned (Provision step PASS) | API spec (OpenAPI); implementation; integration test | `GET /ref/{canonicalRef}` → correct object (200) or 410 if not DELIVERED; review: Структурщик | Disable endpoint; no data loss |
| 2a — Disposition+Ledger | #1305 | Disposition всех объектов из fence snapshot; Ledger-Init; explicit disposition per object с M1/M2/M5 authority | Inventory complete; M4 G1 capacity PASS (new FD); Slice 1a PASS | Complete Ledger с `C_all` classified; five-set cardinalities in Ledger-header; full three-way diff report | Zero unclassified objects; every BLOCKED has complete evidence or retry_flag; review: Архитектор | Ledger append ROLLBACK rows; Affine untouched |
| 2b — Migrate+Reconcile | #1305 | Export от Affine (read-only); ingest в static backend; Ledger CLASSIFIED→DELIVERED per migrating object; reconciliation | Slice 2a PASS; Precondition-Gates ALL PASS (M3/M4/M5/M6); Slice 1a+1b PASS | Migrated objects in static backend; reconciliation report (`DB_delivered=Static_served` двусторонне); M5 parity report; M6 commit records | `DB_delivered=Static_served` двусторонне; M5 annotation parity PASS; M6 commits verified; review: Математик+Структурщик | Purge static backend ingested objects; Ledger: append ROLLBACK rows; Affine continues |
| 2c — Canary+Cutover+Retire | #1305 | Caddy upstream switch; 308 redirects; LIVE_SERVICES.md entry; observation | Slice 2b PASS; `C_managed=C_live`; M5 parity PASS; M6 verified; `HTTP 200 rate(static, 5min) > 99%` | Caddy config change (Panel-authorized); 308 redirect active; LIVE_SERVICES.md updated; canary metric log; redirect probe log | Canary 30 мин `error_rate ≤ 1%`; redirect probe → 308; LIVE_SERVICES entry present; `req_rate(strategy,15min)=0`; review: Teamlead | Caddy revert в окне 4 ч; LIVE_SERVICES revert; 308 deactivate; Affine resumes as primary |

---

## Список посылок

| # | Посылка | Тип |
|---|---|---|
| P1 | M1: original bytes и `docs/evidence` принадлежат контейнеру; страницы Affine — состояние движка; ни одна Affine page не становится original только из-за нахождения в workspace | **норма** |
| P2 | M2: `registry.jsonl` — истина регистрации; `canonicalRef = urn:mmbrn:static:<rootId>`; location — заявление; любая правка создаёт новую append-only row | **норма** |
| P3 | M3: Panel — единственный authorizer; proxy fail-closed; прямого пользовательского Affine route/token/native role нет | **норма** |
| P4 | M4: production требует независимые FD-1/FD-2/FD-3; office VDS с 9.46 GiB free — storage NO-GO | **факт** + **норма** |
| P5 | M5: Affine — optional projection; binding/annotation parity и восстановление replacement engine обязательны до cutover; engine projection/layout/cache disposable | **норма** |
| P6 | M6: канонический вход проходит LIGD; legacy rows без accepted ledger evidence — `legacy_uncovered`; production intake сейчас NO-GO; fake bindings запрещены | **норма** |
| P7 | Live Affine: `affine_server` + PostgreSQL + Redis на office VDS, loopback `127.0.0.1:3010`, Caddy route `strategy.mmbrn.tech` | **факт** |
| P8 | В БД три private workspaces (Strategy, Templates, Releases); один participant; 82 pages; 57 служебных PNG/SVG; оригиналов чеков и внешних PDF в Affine не найдено | **факт** |
| P9 | `affine-cli doc list` показал ноль документов; read-only DB inventory опроверг его; CLI-листинг не является доказательством пустоты или полноты корпуса | **факт** |
| P10 | Стратегическая публикация в Affine заморожена машинным gate; Git/гранулы/генераторы остаются truth стратегических документов | **факт** |
| P11 | `docs/evidence/registry.jsonl` содержит 12 legacy rows; один PDF-чек в публичном Git; sensitive PDF партнёра — вне Git; M6 объявляет их uncovered | **факт** |
| P12 | Panel имеет role/section grants; static ingress и передача решений в Affine не реализованы; текущий forward-auth не покрывает будущий static route | **факт** |
| P13 | `docs/LIVE_SERVICES.md` не объявляет Affine/`strategy.mmbrn.tech` | **факт** |
| P14 | Issue #1303 (индекс/API вещдоков) и #1305 (переезд Affine) открыты; их тексты не покрывают ратифицированный контракт M1-M6 | **факт** |
| P15 | Поправки run1: M3 actions ограничены `discover|read-metadata|read-ref|read-bytes|download|write-metadata|upload-revision|manage-access`; без циклов (freeze/fence до единственного snapshot); corpus из fence snapshot; retirement требует resolved outcome+complete evidence; константы без запрещённых значений (301/302/404/410/default/proposed/long/≈0) | **норма** |

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
