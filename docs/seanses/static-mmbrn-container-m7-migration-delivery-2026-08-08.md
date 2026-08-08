<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-08-08T09:40:45.746Z |
| Команда | `yarn consilium` |
| Модель | xai/grok-4.5 |
| Файл | `docs/seanses/static-mmbrn-container-m7-migration-delivery-2026-08-08.md` |
| Порядок ролей | Верстальщик → Музыкант → Математик → Структурщик → Teamlead → Архитектор |
| Повестка | `docs/meeting/static-mmbrn-container/M7_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs/meeting/static-mmbrn-container/M7_AGENDA.md` | 11825 | `a2be834d5c6d` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs/meeting/static-mmbrn-container/M7_AGENDA.md` | 11825 · 1 п. | `a2be834d5c6d` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --no-memory --min-replies 36 --seed 727`

**Disposition:** local synthesis после исчерпания внешнего бюджета 5/5. Сырой run5 сохранён
без правок в `docs/seanses/rejected/static-mmbrn-container-m7-migration-delivery-2026-08-08-run5-ledger-routes-m5-m6.md`;
ниже внесены только подтверждённые постаудитом исправления.

**Owner act:** ратифицировано владельцем 2026-08-08 с раскрытым ограничением: финальный
независимый recheck завис после исправления его трёх точечных BLOCK; owner принял local
synthesis по сохранённому audit trail, не объявляя зависший вызов PASS.

**Вопрос:**

Проведи заседание строго по повестке M7. Не переопределяй M1-M6, сохрани один D1, один carrier и оставь Definition of Done последней секцией. Не завершай ответ, пока не записаны минимум 36 ролевых реплик, минимум шесть от каждой роли и все семь обязательных Markdown-таблиц.

---

# Консилиум: M7 — переезд и доставка `strategy.mmbrn.tech → static.mmbrn.tech`

**Повестка:** D1 — один минимальный исполнимый контракт переезда и доставки: inventory/disposition 82 pages + 57 assets, M3–M6 readiness, lawful states only, Panel/proxy/Caddy/DNS cutover, rollback proof, `LIVE_SERVICES`, нарезка #1303/#1305.

**Участники:** Teamlead (Tarasov), Архитектор (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Верстальщик → Музыкант → Математик → Структурщик → Teamlead → Архитектор

**Carrier:** `docs/seanses/static-mmbrn-container-m7-migration-delivery-2026-08-08.md`

---

[Верстальщик]: Начинаю с пользовательского контура ссылок. Старые deep link на `strategy.mmbrn.tech` после cutover не должны «тихо» открывать чужой UI: либо явный mapped redirect на static/Panel-маршрут, либо честный unmapped. Никакого pass-through «как было» — это обход authority и ломает ожидаемую иерархию статусов на экране.

[Музыкант]: Согласен по честности сигнала. Affine у нас optional projection, как disposable engine chain: layout/cache/session можно сбросить, а portable annotations и binding events — сохранить как партитуру. Blind copy 82 pages звучит как «скопировать весь bus» — это шум, не миграция.

[Математик]: Фиксирую численный baseline, не cardinality proof: pages=82, assets=57, CLI `doc list`=0. Inventory gate = fenced DB/export snapshot с per-object `sourceId`, `kind∈{page,asset}`, `sha256`, relations, grants, timestamps. До manifest+hash+disposition статус корпуса = `NOT PERFORMED/NO-GO`. CLI 0 не входит в proof полноты.

[Структурщик]: Граница пакетов: source Affine (office VDS, `:3010`) не становится origin static. Destination — container `static.mmbrn.tech` + Panel authorizer + registry.jsonl. Strategic docs остаются Panel/Git; копировать их в static originals без M6 intent владельца — `нарушена слабая связанность` домена M1/M6.

[Teamlead]: Планка: один D1, один carrier, один rollout DAG, одна ledger machine, одна route matrix, один набор gates. Комната read-only — кода, DNS, Caddy, Panel, issues не трогаем. Run1–run4 rejected; константы выбираем здесь. Вердикт в конце: GO только при честном NO-GO текущих storage/intake.

[Архитектор]: Конструкция D1: **Migration Delivery Contract (MDC-1)** — append-only migration ledger + per-object disposition manifest + causal rollout DAG (provision→M4→M5→M6-align→routes→canary→cutover→observe→retire) + M3 route matrix. Affine page ≠ original; engine id ≠ canonicalRef; Panel = sole authorizer. Форма до кода — этот протокол.

[Верстальщик]: Для Panel/navigation будущих правок (не исполняем в M7) классы UI-edit: navigation labels, grant screens, service badge в admin, runbook links, monitoring surfaces. Empty/error на unmapped — `404` с понятным static/Panel status, не Affine native shell.

[Музыкант]: По assets: 57 service PNG/SVG — engine projection material. Asset с несколькими parents не «оригинал на N страниц»; disposition через ref-list + M1 qualification. Если asset только decor engine — `DISCARD_ENGINE_EPHEMERAL` после export evidence; если portable annotation references bytes — `MIGRATE_PROJECTION` остаётся кандидатом только до parity PASS.

[Математик]: M4 exact gates G1–G10 как в поправке. Office VDS 9.46 GiB free → G1 FAIL сейчас: `free_after>=12GiB` невыполним на source-as-target. Target provision обязателен на отдельном storage footprint; M4 после target, не до. G1: `B=min(P-12GiB,floor(.90P))`, zero-size `physical_delta=0` ⇒ `free_after>=12GiB ∧ utilisation<.90 ∧ U_c+logical_delta≤Q_c`; unknown DENY.

[Структурщик]: Route matrix только M3 actions: `discover|read-metadata|read-ref|read-bytes|download|write-metadata|upload-revision|manage-access`. Object: `container=static.mmbrn.tech` | `collectionId` | `lineage=canonicalRef`. Один forward = один action/object либо pre-action deny. WS неклассифицированный и multi-action API — запрет на границе proxy.

[Teamlead]: Нарезка поставок: #1303 — index/API/registry ingress; #1305 — Affine projection/migration path. DNS alone не закрывает umbrella. Каждый slice: scope, prereq, artifact, acceptance, rollback, review. Третий umbrella issue не плодим.

[Архитектор]: State classes (не смешивать): (1) originals/registry FD-1+M2; (2) projection intent Panel-owned; (3) binding events; (4) portable annotations; (5) engine projection; (6) layout/cache/session; (7) strategic docs Panel/Git. Source→dest: 1 migrate only via M6 LIGD; 2–4 migrate/rebuild; 5 rehydrate or discard; 6 discard; 7 never blind-copy to static originals.

[Верстальщик]: Deep link matrix для UI: mapped path → `308` на канонический static/Panel URL; unknown old path → `404` unmapped. Canary UX: banner/admin only, не «тихий» half-cutover для случайного пользователя. Rollback window визуально не обещает возврат после observation.

[Музыкант]: M5 parity как прослушивание цепочки: G1 replay без gap/dup; G2 `refs(A)=R` unique canonicalRef; G3 unique engineIds; G4 store=export=rehydrated by `stableId→recordHash`; G5 на replacement engine; G6 Panel deny ⇒ Affine forward count 0; G7 native principals=service allowlist. Без evidence — не PASS.

[Математик]: M6 exact: `C_all`, `C_live`, `L_proposed`, `C_managed`, `C_legacy=C_all\C_managed`. До STORED `0/0`; STORED `0/1` verified FD-1; COMMITTED `1/1/1` row/object/binding. Crash without binding: allowed `0/0,0/1,1/1`, forbid `1/0`. Legacy без ledger → `legacy_uncovered`, не fake binding. 12 legacy rows сейчас uncovered — intake production NO-GO.

[Структурщик]: Ledger machine одна на весь переезд; case/DAG не вводит новых state ad hoc. Имена состояний — словарь API миграции. Retry/recovery = новые append events, не reverse edges. Control-plane rollback не удаляет M2 rows, bindings, referenced bytes, history.

[Teamlead]: Константы run5 (едины во всех таблицах): `redirect=308`, `unmapped=404`, `canary=error_rate≤1% за 15m ∧ health_pass ∧ M3_deny_ok`, `rollback_window=2h от cut_at`, `redirect_lifetime=90d`, `observation=7d`, `zero_traffic=30d continuous на strategy host`, `superseded_retain≥365d`. Cutover ≠ rollback ≠ retirement — разные gates.

[Архитектор]: Causal DAG: S0 facts → S1 inventory → S2 disposition → S3 provision → S4 storage predicates → S5 export → S6 rehydrate → S7 projection predicates → S8 M6 data alignment → S9 routes and deferred access predicates → S10 canary → S11 cutover → S12 proof → S13 observe → S14 retirement arm → S15 retire. M4 G5 M3-half, M5 G6–G7 и M6 bypass проверяются только после S9; pre-step читает только уже существующее evidence.

[Верстальщик]: LIVE_SERVICES и monitoring — класс будущих registry edits: объявить `static.mmbrn.tech`, снять/пометить `strategy` после retirement, не в этой комнате. До cutover proof сервис в LIVE не рисуем как LIVE — иначе UI вранья статуса.

[Музыкант]: Source engine copy post-cutover не глушим сразу: нужен backup interval ≤12h, age ≤24h, restore ≤4h, drill age ≤30d (M5 G8–G9). Иначе rollback/rehydrate из пустоты. Retirement deletion — последний такт, не «после DNS».

[Математик]: Per-object evidence row: `sourceKind`, `sourceId`, `contentHash`, `duplicateGroupId|none`, `m1Class`, `disposition`, `actor`, `evidenceRef`, `m6IntentId|none`. Типовой class не заменяет корпус. Page и asset — разные id space. Ref-count ≥1 не достаточен для MIGRATE.

[Структурщик]: Inventory/disposition table — единственный манифест входа в S3+. Без sealed manifest шаг provision может готовить target empty, но export/rehydrate — STOP. Duplicate group: один survivor disposition, остальные `DISCARD_DUPLICATE` с указанным survivor id.

[Teamlead]: STOP-условия: office VDS capacity как target FAIL; restore drill FAIL/unknown; parity FAIL; Panel deny bypass detected; canary >1%; crash между DNS/Caddy и health без proof → rollback procedure в window. После append-only post-cutover events rollback = compensating routes + keep bytes/rows, не delete history.

[Архитектор]: Disposition vocabulary закрытый: `REBUILD_FROM_GIT`, `MIGRATE_PROJECTION`, `DISCARD_DUPLICATE`, `DISCARD_ENGINE_EPHEMERAL`, `HOLD_NO_BINDING`, `HOLD_LEGACY_UNCOVERED`, `HOLD_CONFLICT_BINDING`, `SENSITIVE_ISOLATE`, `MAP_REDIRECT_ONLY`, `REJECT_FAKE_ORIGINAL`. Каждый — с M1/M2/M5 основанием. Strategic page with Git canon → `REBUILD_FROM_GIT` + optional projection discard, не original из Affine.

[Верстальщик]: Case старый deep link: UI expectation = 308 на canonical; bookmark strategy path не должен открывать native Affine. Unknown path — 404, без search-fuzzy auto-map в этой фазе (иначе скрытый multi-action).

[Музыкант]: Annotation parity mismatch — не «почти музыка»: G4/G1 fail ⇒ попытка входит в `PARITY_FAILED` с append event; cutover global STOP при mismatch в committed-set. Retry создаёт новый дочерний `INIT`, а не возвращает старую machine назад. Disposable layout mismatch не блокирует; portable annotation mismatch блокирует.

[Математик]: Readiness сейчас: M4 office NO-GO; M6 intake NO-GO; inventory fenced NOT PERFORMED; binding parity NOT PERFORMED. Итоговый current verdict по эксплуатации: **NO-GO cutover**. Contract GO means «можно исполнять по DAG когда gates PASS», не «можно dial DNS today».

[Структурщик]: Slicing #1303: (A) registry read API + canonicalRef resolve; (B) static ingress forward-auth hooks; (C) LIVE_SERVICES/docs/runbook PR. #1305: (A) inventory/export tooling; (B) disposition ledger UI/API read models; (C) projection rehydrate job; (D) cutover runbook+canary scripts. B/#1303 precedes route stage; C/#1305 depends A#1305+M4.

[Teamlead]: Владельцы DAG: inventory/disposition — Структурщик+Математик; M4 — Математик; M5 export/parity — Музыкант+Математик; M3 routes — Структурщик; Panel grants/nav — Верстальщик после contract; cutover command — Teamlead acceptance; architecture stop on boundary — Архитектор. LGTM контракта в конце при полных таблицах.

[Архитектор]: Rollback model: R1 pre-cutover = abort routes stage, target retained, source untouched. R2 in-window post-cutover = revert DNS/Caddy to strategy, keep static target cold-ready, no M2 delete. R3 post-window = no traffic rollback promise; only forward fix. R4 after new appends = compensating M2/M6 entries, never erase. Одна модель, без «no-downtime» claim.

[Верстальщик]: Panel deny + native Affine capability: UI и proxy должны показать deny; forward count 0. Если native token ещё жив — pre-cutover blocker, не «потом». Grant screens future edit class: revoke native, service allowlist only.

[Музыкант]: Crash между DNS/Caddy change и health proof: слышим silence на canary — процедура R2, не invent health. Health proof = scripted checks M3 actions sample + G6 deny + canary predicate, не «открылось в браузере».

[Математик]: G7 RPO `now-cut_at≤24h`; G8 RTO `t_fixed+protected_bytes/v_verified≤4h`. Retirement zero-traffic: continuous 30d counters on strategy host = 0 requests to origin (not only 2xx). Observation 7d ⊂ or after rollback_window policy: observation does not extend rollback.

[Структурщик]: Delivery acceptance per slice = artifact paths + gate ids green + review LGTM; rollback = revert slice merge only if no production cutover dependency activated; after cutover, slice rollback ⊂ R2/R3. Issues остаются open в этой комнате — только design slicing.

[Teamlead]: Сводная пропозиция D1 = MDC-1 как ниже в решении. Принимаю константы, machine, DAG, matrix. BLOCK на любое исполнение в этой комнате. Внешний аудит DoD checkbox'ы — не мы.

[Архитектор]: Рекомендация: принять MDC-1; carrier единственный `docs/seanses/static-mmbrn-container-m7-migration-delivery-2026-08-08.md`. Альтернатива «big-bang copy 82» — отвергнута ценой M1/M6. Альтернатива «DNS first» — отвергнута причинным DAG. Форма закрыта.

[Верстальщик]: Принимаю D1/MDC-1: статусы 308/404, future UI edit classes, без native Affine shell. Нужны таблицы cases/routes — без них вёрстка статусов не специфицирована.

[Музыкант]: Принимаю D1: projection/annotation/backup gates, disposable vs portable split. Реплика на asset multi-parent: shared hash → one FD object max via M6, не N copies.

[Математик]: Принимаю D1: формулы M4/M5/M6, NO-GO текущий, per-object hashes. Ledger states ниже — полный enumerable set.

[Структурщик]: Принимаю D1: dictionary states/routes/slices, weak coupling preserved. Таблицы — часть контракта, не prose.

[Teamlead]: Принимаю. Вердикт: **LGTM на контракт MDC-1; NO-GO на cutover/production сегодня**. Связка исполнения вне комнаты по DAG owners.

[Архитектор]: Принимаю. Границы M1–M6 не переопределены. Один D1, один carrier, machine gates enumerable.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| D1 | **MDC-1** — минимальный исполнимый Migration Delivery Contract (ниже) |
| Verdict | **CONTRACT ACCEPTED / CUTOVER NO-GO** до PASS всех readiness gates |
| Carrier | `docs/seanses/static-mmbrn-container-m7-migration-delivery-2026-08-08.md` |
| Inventory | Один fenced DB+export snapshot; CLI≠proof |
| Disposition | Закрытый vocabulary per object; blind copy запрещён |
| Ledger | Одна append-only state machine (таблица) |
| Routes | Одна M3 matrix; 308 mapped / 404 unmapped |
| DAG | Один causal rollout (таблица) |
| Constants | 308, 404, canary≤1%/15m, RBW=2h, redir TTL=90d, obs=7d, zero-traffic=30d, retain≥365d |
| #1303/#1305 | Зависимые slices (таблица); issues не закрываем |
| Production | Не изменялась в комнате |

### D1 — MDC-1 (пропозиция)

Единый контракт переезда `strategy.mmbrn.tech → static.mmbrn.tech`:

1. **Sealed inventory** pages+assets с hash/relations/grants/timestamps; baseline 82/57 не fenced proof.
2. **Per-object disposition** из закрытого vocabulary с M1/M2/M5 authority + actor + evidence; отдельный M6 intent на каждый lawful migrate.
3. **State class split** originals/registry · projection intent · binding · portable annotations · engine projection · layout/cache/session · strategic docs — с migrate/rebuild/discard/loss policy.
4. **Одна ledger SM** (states ниже); reverse transitions запрещены; rollback control-plane не стирает history/bytes/rows.
5. **Causal DAG** provision→M4(target)→M5 export/rehydrate/parity→M6 align→routes→canary→cutover→observe→retire.
6. **M3-only routes**; Panel sole authorizer; deny native user Affine; WS unclassified = deny.
7. **Cutover/rollback/retirement** — разные gates; source delete только после redirect_lifetime∧restore/parity∧all-resolved∧zero_traffic=30d; superseded≥365d.
8. **Machine readiness** M4 G1–10, M5 G1–10, M6 predicates; current = NO-GO.
9. **Slicing** #1303/#1305 reviewable deliveries; DNS alone insufficient.
10. **Future edits only (not done here):** Panel nav/grants, LIVE_SERVICES, runbook, monitoring, docs.

### Inventory/disposition

| source kind/id | classification | duplicate group | destination | disposition | authority | evidence |
|----------------|----------------|-----------------|-------------|-------------|-----------|----------|
| page:`p_*` strategic ∩ Git canon | engine projection; strategic canon=Git/Panel | `dupG` if import-hash match | Panel/Git truth; static no fake original | `REBUILD_FROM_GIT` (+ optional later projection intent) | M1 strategic∈Panel; M5 disposable engine | git path+commit; page hash; freeze note |
| page:`p_*` duplicate imported | engine duplicate | `dupG:<survivor>` | none / survivor only | `DISCARD_DUPLICATE` → survivor id | M1/M5; no second original | hash equality; relation edge |
| page:`p_*` unique Affine-only | engine state; not original by location | none | static only if M1 qualifies + M6 intent | `MIGRATE_PROJECTION` or `HOLD_NO_BINDING` | M1 qual + M5 intent/binding + M6 | export hash; binding event or HOLD reason |
| asset:`a_*` service PNG/SVG (one of 57) | engine asset | by sha256 group | FD-1 only if qualified bytes+intent | `DISCARD_ENGINE_EPHEMERAL` or `MIGRATE_PROJECTION` | M1 bytes rule; ref≠enough | sha256+bytes; page ref-list |
| asset:`a_*` multi-page shared | shared engine bytes | `shaG:<hash>` | single object max | one `MIGRATE_*` survivor refs; else discard | M1/M6 single-object | reverse refs count+hashes |
| page without binding | unbound projection | none | no commit | `HOLD_NO_BINDING` | M5/M6 forbid fake binding | binding query empty |
| conflicting bindings | conflict set | `bindConflict:<id>` | no commit | `HOLD_CONFLICT_BINDING` | M5 G2/G3 uniqueness | binding event ids+diff |
| portable annotation set | portable annotation | n/a | Panel-owned annotation store | migrate via parity G4 | M5 G1/G4 | stableId→recordHash map |
| CLI=0 vs DB=82 | measurement conflict | n/a | n/a | inventory gate FAIL until reconcile | M7 inventory rule | CLI log + DB snapshot fence |
| M2 legacy row w/o M6 ledger | `legacy_uncovered` | n/a | registry kept | `HOLD_LEGACY_UNCOVERED` | M6 `C_legacy` | registry line id; L_proposed miss |
| sensitive local PDF ref | sensitive | n/a | FD-3/sensitive isolation | `SENSITIVE_ISOLATE` | M4 G10; M1 evidence | path out of public Git; ACL |
| engine layout/cache/session | ephemeral | n/a | discard | `DISCARD_ENGINE_EPHEMERAL` | M5 disposable | class tag in export |
| strategic Git doc body | Panel strategic | n/a | stays Git/Panel | never Affine→static original | M1/M6 owner intent only | git tree; no M6 intent ⇒ skip |

### Migration ledger/state machine

| state | entry predicate | allowed transition | durable evidence | retry/recovery | terminal outcome |
|-------|-----------------|--------------------|------------------|----------------|------------------|
| `INIT` | agenda accepted; room read-only | → `INVENTORY_SEALED` | carrier+D1 id | re-enter via new run append | non-terminal |
| `INVENTORY_SEALED` | fenced snapshot rows≥baseline kinds; every id hash+ts | → `DISPOSITION_SEALED` | snapshot manifest sha256 | new snapshot event on mismatch | STOP if incomplete |
| `DISPOSITION_SEALED` | every source row has disposition∈vocab+actor | → `TARGET_PROVISIONED` | disposition manifest sha256 | revise via new manifest version append | STOP if any blank |
| `TARGET_PROVISIONED` | target endpoints exist; not require M4 PASS | → `STORAGE_READY` \| `ABORTED` | provision receipt | reprovision append | non-terminal |
| `STORAGE_READY` | M4 G1–G4,G7–G10 PASS; G5 direct storage DENY and G6 empty-target baseline PASS | → `PROJECTION_EXPORTED` | staged M4 pack; final G5 M3-half/G6 pending routes and writes | fix capacity; new G* run | STOP/NO-GO on fail |
| `PROJECTION_EXPORTED` | export complete counts+hashes | → `PROJECTION_REHYDRATED` | export bundle sha256 | re-export append | STOP on gap |
| `PROJECTION_REHYDRATED` | rehydrate on target/replacement | → `PARITY_PASSED` \| `PARITY_FAILED` | rehydrate report | rebuild from export | non-terminal |
| `PARITY_FAILED` | any M5 G1–G5/G4 annotation fail in scope | → `ABORTED` | parity diff | retry = new child `INIT` referencing this event | terminal for attempt; STOP cutover |
| `PARITY_PASSED` | M5 G1–G5,G8–G10 evidence true | → `INTAKE_ALIGNED` | projection/parity/backup evidence pack | n/a | non-terminal |
| `INTAKE_ALIGNED` | M6 schema/atomicity/replay/hash/quota/capacity/reconcile/legacy PASS for lawful set; COMMITTED=`1/1/1`; legacy HOLD | → `ROUTES_STAGED` | full ledger/registry/FD-1 data diff | reconcile repair/reject append | STOP if fake bind attempt |
| `ROUTES_STAGED` | exact M3 matrix plus M4 G5 M3-half, post-S8 M4 G6, M5 G6–G7 and M6 M3-bypass PASS | → `CANARY_RUNNING` \| `ABORTED` | current route/access/reconciliation pack; WS deny | restage by new append event | R1 abort ok |
| `CANARY_RUNNING` | canary predicate armed; subset traffic/synthetic | → `CUTOVER_DONE` \| `ABORT_ROLLBACK` | canary metrics 15m | tune only pre-cutover | STOP if >1% |
| `CUTOVER_DONE` | DNS/Caddy flip + health proof PASS; `cut_at` set | → `STABLE` \| `ABORT_ROLLBACK` | health bundle; cut_at | R2 in 2h window | cutover gate |
| `ABORT_ROLLBACK` | stop predicate; within policy | → `ROLLBACK_COMPLETED` | revert evidence | only forward appends | terminal for attempt |
| `ROLLBACK_COMPLETED` | routes source restored; bytes/rows kept | terminal attempt; new `INIT` child for retry | rollback report | new DAG instance | terminal |
| `STABLE` | observation started; RBW elapsed or healthy | → `RETIREMENT_ARMED` | 7d obs log | incident forward-fix | non-terminal |
| `RETIREMENT_ARMED` | redirect_lifetime 90d ∧ all dispositions resolved ∧ restore/parity fresh ∧ zero_traffic 30d | → `SOURCE_RETIRED` | retirement checklist | wait counters | non-terminal |
| `SOURCE_RETIRED` | source delete authorized; superseded retain ≥365d | terminal success | delete cert+retain map | n/a | terminal OK |
| `ABORTED` | pre-cutover hard fail | terminal attempt | abort reason | new instance | terminal |

### Route/access matrix

| route class | hostname/path | internal target | M3 action/object | before cutover | during canary | after cutover | rollback behavior |
|-------------|---------------|-----------------|------------------|----------------|---------------|---------------|-------------------|
| legacy UI root | `strategy.mmbrn.tech/` | office Affine `:3010` | `discover` / container=`static.mmbrn.tech` | Panel-gated Affine root | synthetic discover only | `308` mapped root | restore Caddy→Affine origin |
| mapped deep link | `strategy.mmbrn.tech/doc/<old>` | static/Panel canonical | `read-ref` lineage=`canonicalRef` if authorized | old engine page | 308 if mapped in manifest | 308 TTL 90d | 308 off; old origin |
| unmapped old path | `strategy.mmbrn.tech/<unknown>` | none | pre-action deny | engine or 404 | 404 | 404 | same 404 policy optional |
| discover API | `static.mmbrn.tech/api/discover` | static service | `discover` / container=`static.mmbrn.tech` | dark | canary principals | fail-closed LIVE | deny-all |
| metadata API GET | `static.mmbrn.tech/api/metadata/<ref>` | registry service | `read-metadata` / lineage=`canonicalRef` | dark | canary principals | fail-closed LIVE | deny-all |
| ref API GET | `static.mmbrn.tech/api/ref/<ref>` | registry service | `read-ref` / lineage=`canonicalRef` | dark | canary principals | fail-closed LIVE | deny-all |
| bytes API GET | `static.mmbrn.tech/api/bytes/<ref>` | FD-1 proxy | `read-bytes` / lineage=`canonicalRef` | dark | canary principals | fail-closed LIVE | deny-all |
| download GET | `static.mmbrn.tech/download/<ref>` | FD-1 proxy | `download` / lineage=`canonicalRef` | dark | canary principals | fail-closed LIVE | deny-all |
| metadata PATCH | `static.mmbrn.tech/api/metadata/<ref>` | registry service | `write-metadata` / lineage=`canonicalRef` | deny | canary operators | fail-closed LIVE | deny-all |
| revision POST | `static.mmbrn.tech/api/revisions/<ref>` | FD-1 proxy | `upload-revision` / lineage=`canonicalRef` | deny | canary operators | fail-closed LIVE | deny-all |
| access API | `static.mmbrn.tech/api/access/<ref>` | Panel | `manage-access` / lineage=`canonicalRef` | deny | baseline owners | Panel only | deny-all |
| direct backend bypass | `127.0.0.1:3010` / public IP | Affine | none | must be net-denied prod path | DENY | DENY | DENY remains |
| WebSocket | any unclassified WS | — | forbidden | DENY/fail-closed | DENY | DENY | DENY |
| native Affine token route | strategy native | Affine | forbidden user | MUST detect&revoke pre-stage | DENY count proof G6 | DENY | DENY |

### Rollout DAG

| step/dependencies | entry gate | mutation | exit evidence | owner | stop/rollback |
|-------------------|------------|----------|---------------|-------|---------------|
| S0 Freeze facts | room boundaries | none (RO) | measured facts cited | Teamlead | n/a |
| S1 Inventory seal ← S0 | DB+export access RO | write evidence files only (out of band) | fenced manifest sha256 | Математик+Структурщик | STOP incomplete |
| S2 Disposition seal ← S1 | all rows classified | disposition manifest | per-row vocab+actor | Архитектор+Структурщик | STOP blank/reject blind copy |
| S3 Provision target ← S2 | authority to create target | create target empty | provision receipt | Математик/ops | abort leave source |
| S4 Storage ready ← S3 | target exists | M4 G1–G4,G7–G10 + G5 direct DENY + G6 empty baseline | staged M4 pack; final G5/G6 pending | Математик | NO-GO; no export |
| S5 Export ← S4 | storage predicates PASS; disposition sealed | export bundle | fenced counts+hashes | Музыкант+Математик | STOP gap |
| S6 Rehydrate ← S5 | export sealed | load projection target | rehydrate report | Музыкант | retry new export |
| S7 Projection ready ← S6 | rehydrate done | M5 G1–G5,G8–G10 checks | projection/parity/backup pack | Математик+Музыкант | PARITY_FAILED→ABORTED |
| S8 M6 data align ← S7 | projection predicates PASS | intents+commits lawful only | M6 data gates PASS; each commit `1/1/1`; legacy HOLD | Структурщик+Математик | STOP fake bind |
| S9 Access ready ← S8+#1303B | exact route matrix compiled; S8 writes complete | stage proxy; run M3, M4 G5 M3-half, rerun M4 G6 on post-write target, M5 G6–G7, M6 bypass | fresh full readiness pack; WS/native deny | Структурщик+Математик | R1 abort |
| S10 Canary ← S9 | all M3–M6 required gates PASS | limited traffic/synthetic | ≤1%/15m ∧ health ∧ deny correlation | Teamlead+Математик | abort canary |
| S11 Cutover ← S10 | canary PASS | DNS/Caddy flip | cut_at; health proof | Teamlead | R2 ≤2h |
| S12 Prove ← S11 | cut applied | none | health+M3 sample | Математик | R2 |
| S13 Observe ← S12 | proof PASS | monitor only | 7d log | Teamlead | forward-fix; no RB promise after 2h |
| S14 LIVE_SERVICES edit ← S12 | proof PASS | docs registry edit (future PR) | PR merge evidence | Структурщик | revert PR |
| S15 Retirement arm ← S13 | 90d∧30d zero∧resolved∧parity/restore | none | checklist | Teamlead+Архитектор | wait |
| S16 Source retire ← S15 | armed | delete source engine copy | delete cert; retain≥365d | Математик | forbid if traffic≠0 |

### Cases

| Случай | Disposition/решение | Gate | Evidence | Rollback/stop |
|--------|---------------------|------|----------|---------------|
| 1 Strategic page, canon in Git | `REBUILD_FROM_GIT`; Affine not original | S2 M1 class | git path+commit; page hash | no static original created |
| 2 Duplicate imported page | `DISCARD_DUPLICATE`→survivor | S2 hash group | equal contentHash | n/a |
| 3 Unique Affine-only page | `MIGRATE_PROJECTION` iff M1+binding+M6 else HOLD | S7/S8 | export+binding+intent | HOLD stops commit |
| 4 One of 57 service assets | ephemeral discard or migrate if qualified | S2/S5 | sha256+bytes+refs | discard default |
| 5 Asset linked to many pages | single object / shared sha group | S2/S8 | reverse refs | no N-copy |
| 6 Page without binding | `HOLD_NO_BINDING` | S8 forbid COMMITTED | empty binding query | stop object commit |
| 7 Conflicting bindings | `HOLD_CONFLICT_BINDING` | M5 G2/G3 | binding diff | stop cutover if in set |
| 8 Portable annotation parity mismatch | fail parity | M5 G1/G4 | stableId hash map diff | PARITY_FAILED |
| 9 CLI 0 vs DB 82 | inventory FAIL until reconcile | S1 | CLI log+DB fence | STOP S1 |
| 10 M2 legacy w/o M6 ledger | `HOLD_LEGACY_UNCOVERED` | M6 C_legacy | registry id ∉ L_proposed | no fake bind |
| 11 Sensitive local ref | `SENSITIVE_ISOLATE` | M4 G10 | out-of-git path; crypto proof | STOP if public leak path |
| 12 Office VDS capacity FAIL | target≠office; G1 FAIL on office | M4 G1 | 9.46 GiB free measure | NO-GO office-as-target |
| 13 Backup exists, restore FAIL/unknown | M4 G4 FAIL | G4 | drill report missing/mismatch | NO-GO S4 |
| 14 Panel deny with native Affine cap | revoke native; G6 forward=0 | M5 G6/G7 | deny logs; allowlist | STOP S9 if native live |
| 15 Old deep link | `308` mapped | route matrix | map row old→canonical | R2 disables 308 |
| 16 Unknown old path | `404` unmapped | route matrix | negative map proof | keep 404 |
| 17 WS or direct backend bypass | DENY fail-closed | M3/G5 | probe DENY | STOP if allow |
| 18 Crash DNS/Caddy→health | R2 rollback | cutover health | incomplete health | revert origin ≤2h |
| 19 Canary errors > threshold | stop cutover | canary ≤1%/15m | metrics | ABORT_ROLLBACK |
| 20 Rollback after new append-only events | compensating appends; no delete history | R4 | new M2/M6 events | routes only compensate |

### Readiness

M6 corpus: `C_all` = all M2 rows; `C_live` = lifecycle current tips; `L_proposed` = all
durable proposedRecordId intents including FAILED/reconciliation; `C_managed` = rows whose ids
occur in `L_proposed`; `C_legacy=C_all\C_managed`; `A_all` = all audit events. State cardinality:
before `STORED_PENDING_REGISTRY`=`0 row/0 object`; in it=`0 row/1 verified FD-1 object`;
`COMMITTED`=`1 row/1 verified object/1 durable binding`. FAILED stays in `L_proposed`.

| gate | exact predicate | corpus | evidence | current state | fail result |
|------|-----------------|--------|----------|---------------|-------------|
| INV-1 Inventory sealed | every page/asset row has id,kind,hash,ts,rels,grants | live DB+export | fenced manifest | **NOT PERFORMED** | NO-GO S1 |
| DISP-1 Disposition complete | ∀ objects disposition∈vocab+actor+authority | manifest | signed checklist | **NOT PERFORMED** | NO-GO S2 |
| M4-G1 Capacity+quota | `B_container=min(P-12GiB,floor(.90P))`; versioned `w_c>0`; `Q_c=floor(B_container*w_c/sum(w))`; zero-size `physical_delta=0`; `free_after=P-used_physical-physical_delta>=12GiB AND (used_physical+physical_delta)/P<.90 AND U_c+logical_delta<=Q_c`; unknown DENY | target volume+quota ledger | versioned capacity/quota report | **FAIL** office 9.46 GiB | NO-GO target |
| M4-G2 Test object | sha256+bytes match | test object | put/get log | **NOT PERFORMED** | NO-GO |
| M4-G3 FD-2 complete | complete.json + all hashes | FD-2 | backup manifest | **NOT PERFORMED** | NO-GO |
| M4-G4 Restore drill | full isolated restore; zero mismatch | restore env | drill report | **FAIL/unknown** | NO-GO |
| M4-G5 Direct access | direct DENY + M3 checks | probes | deny logs | **NOT PERFORMED** | NO-GO |
| M4-G6 Reconcile | 0 unexplained dangling/orphan; rerun after S8 writes | post-write target+registry+ledger | fresh reconcile diff | **NOT PERFORMED** | NO-GO S9 |
| M4-G7 RPO | now-cut_at≤24h | backup ts | clock+ts | **NOT PERFORMED** | NO-GO cut |
| M4-G8 RTO | t_fixed+protected_bytes/v_verified≤4h | restore timing | timing log | **NOT PERFORMED** | NO-GO |
| M4-G9 FD-3 | registry/lifecycle append+snapshot+restore | FD-3 | snap/restore | **NOT PERFORMED** | NO-GO |
| M4-G10 Sensitive | encrypt/backup/decrypt + credential isolation | sensitive set | crypto+ACL | **NOT PERFORMED** | NO-GO |
| M5-G1 Reducer | replay valid; no unknown/gap/duplicate/missing cause/group | full event cut | replay report | **NOT PERFORMED** | NO-GO S7 |
| M5-G2 Ref coverage | `refs(A)=R` and unique `A.canonicalRef` | same-snapshot A/R | set diff | **NOT PERFORMED** | NO-GO S7 |
| M5-G3 Engine coverage | `engineIds(A)=E` and unique engine identity | same-snapshot A/E | inventory diff | **NOT PERFORMED** | NO-GO S7 |
| M5-G4 Annotation parity | store=export=rehydrated by `stableId->recordHash` | one snapshot | two-way diffs | **NOT PERFORMED** | NO-GO S7 |
| M5-G5 Rehydration | G1–G4 true for replacement result | replacement result | predicates+snapshot id | **NOT PERFORMED** | NO-GO S7 |
| M5-G6 Panel authority | every Panel deny has Affine forward count `0` | decision/trace join | correlation report | **NOT PERFORMED** | NO-GO S9 |
| M5-G7 Native principals | native principals = approved service allowlist | full principal inventory | allowlist diff | **NOT PERFORMED** | NO-GO S9 |
| M5-G8 Durable backup | interval<=12h, age<=24h, hashes/counts match | binding/annotation cut | backup ids+hashes | **NOT PERFORMED** | NO-GO S7 |
| M5-G9 Durable restore | restore<=4h; successful drill age<=30d | bounded backup corpus | start/end/result | **NOT PERFORMED** | NO-GO S7 |
| M5-G10 Retention | every event/version retained through lineage lifetime and >=7y after close | all events/versions | retained-until audit | **NOT PERFORMED** | NO-GO S7 |
| M6 Schema | every `r in C_all` satisfies exact M2 schema/types | full `C_all` | schema report | **NOT PERFORMED** | NO-GO S8 |
| M6 Atomicity | each committed intent ↔ exactly one managed row, verified FD-1 object and durable binding | full managed committed set | exact bidirectional join | **NOT PERFORMED** | NO-GO S8 |
| M6 Replay | each key has <=1 fingerprint and <=1 recordId; no duplicate append | full ledger+crash corpus | replay/property report | **NOT PERFORMED** | NO-GO S8 |
| M6 Hash/size | every `r in C_live` recomputes to row hash+size | full `C_live` | recomputation report | **NOT PERFORMED** | NO-GO S8 |
| M6 Class/quota | each active collection derives `U_c`; admitted intent proves `U_c+logical_delta<=Q_c` | lifecycle+quota ledger | full join | **NOT PERFORMED** | NO-GO S8 |
| M6 Capacity | each admitted write proves free_after>=12GiB and utilisation<.90 after delta | FD-1 metrics per intent | admission evidence | **NOT PERFORMED** | NO-GO S8 |
| M6 Reconciliation | every `i in L_proposed`, incl. FAILED: before STORED=`0/0`; STORED=`0/1 verified`; COMMITTED=`1 row/1 verified object/1 binding`; crash without binding permits `0/0,0/1,1/1`, forbids `1/0`; repair/reject preserves history; every managed row joins back | full ledger/registry/FD-1+A_all | every-state bidirectional three-way diff | **NOT PERFORMED** | NO-GO S8 |
| M6 Legacy gap | every legacy row=`legacy_uncovered`; zero synthetic binding | full `C_legacy` | uncovered set diff | **FAIL: 12 rows** | production intake NO-GO |
| M6 M3 bypass | each successful data/ref access has prior exact Panel allow/object/version | full access/audit join | bypass probe+join | **NOT PERFORMED** | NO-GO S9 |
| M3-MATRIX | only 8 actions; object shapes; WS deny | proxy config | test vectors | **NOT PERFORMED** ingress | NO-GO S9 |
| CANARY | err≤1%/15m ∧ health ∧ G6 | canary traffic | metrics | **NOT PERFORMED** | stop cutover |
| CUT-HEALTH | post-flip proof bundle | synthetic+M3 | health pack | **NOT PERFORMED** | R2 |
| RETIRE | 90d redirect ∧ 30d zero ∧ resolved ∧ retain≥365d | counters+checklists | retirement pack | **N/A** | block delete |

### Delivery slicing

| #1303/#1305 slice | dependency | artifact | acceptance/review | rollback |
|-------------------|------------|----------|-------------------|----------|
| #1303-A Registry/index API read + canonicalRef resolve | M2 canon | OpenAPI+handlers+tests | resolve only registry truth; no Affine id as canon | revert PR pre-cutover |
| #1303-B Static ingress forward-auth (one action/object) | #1303-A; M3 matrix | proxy policies+tests | fail-closed vectors green | revert config; deny-all |
| #1303-C Docs: LIVE_SERVICES/runbook/monitoring classes | #1303-B optional after prove | md PRs | lists static; no false LIVE pre-proof | revert docs PR |
| #1305-A Inventory/export RO tooling | none (RO) | snapshot tool+manifest schema | INV-1 reproducible | tool only; no prod mut |
| #1305-B Disposition ledger read-model + append API | #1305-A; D1 vocab | ledger store+API | SM transitions enforced | disable API write |
| #1305-C Rehydrate+parity jobs | #1305-A; M4 PASS; #1305-B | job runners+reports | M5 G1–G10 pack | stop jobs; keep source |
| #1305-D Cutover/canary/rollback scripts | #1303-B; #1305-C; M6 align | runbooks+scripts dry-run | dry-run R1/R2; no DNS in merge | scripts unused |
| #1305-E Retirement counters/checklist | STABLE+CUT proved | metrics+checklist | RETIRE predicate unit tests | n/a pre-retire |

---

## Список посылок

1. **норма (M1):** original bytes и `docs/evidence` принадлежат контейнеру; Affine pages — состояние движка; strategic documents — Panel; page≠original лишь из-за workspace.
2. **норма (M2):** `registry.jsonl` — истина регистрации; `canonicalRef = urn:mmbrn:static:<rootId>`; правки append-only.
3. **норма (M3):** Panel — единственный authorizer; proxy fail-closed по action/principal/object/versions; нет прямого user Affine route/token/native role.
4. **норма (M4):** production требует FD-1/FD-2/FD-3, capacity/quota, backup, restore drill, RPO/RTO, reconcile, sensitive isolation; office VDS 9.46 GiB free — storage NO-GO.
5. **норма (M5):** Affine — optional projection; значимы Panel projection intent, binding events, portable annotations; engine layout/cache disposable; parity+replacement до cutover.
6. **норма (M6):** intake через LIGD; commit = verified FD-1 + M2 append + durable binding; legacy без ledger = `legacy_uncovered`; production intake NO-GO; запрет fake bindings.
7. **факт:** live Affine = affine_server+PostgreSQL+Redis на office VDS; `127.0.0.1:3010`; Caddy `strategy.mmbrn.tech`.
8. **факт:** DB: private Strategy/Templates/Releases; один participant; 82 pages; дубли; 57 service PNG/SVG; originals чеков/внешних PDF не найдены.
9. **факт:** `affine-cli doc list` = 0 при DB inventory = 82.
10. **факт:** Affine strategic publish заморожен; Git/гранулы/генераторы — truth.
11. **факт:** registry 12 legacy rows; PDF-чек в public Git; sensitive PDF вне Git; M6 uncovered.
12. **факт:** Panel grants есть; static ingress/передача решений не реализованы; forward-auth не покрывает.
13. **факт:** `docs/LIVE_SERVICES.md` не объявляет Affine/`strategy.mmbrn.tech`.
14. **факт:** issues #1303 и #1305 открыты и не покрывают M1–M6.
15. **норма (agenda):** комната не меняет code/DNS/Caddy/Panel/LIVE_SERVICES/issues/production; не provision FD-*; не export/delete live; не запускает migration.
16. **норма (agenda):** M3 action set и object shapes ограничены поправкой; causal DAG; exact M4/M5/M6 predicates; одна ledger machine без reverse; per-object evidence; retirement constants едины; carrier дата `2026-08-08`.
17. **норма (agenda):** run1–run4 rejected; не посылки решений run5.

---

## Definition of Done

- [x] Выбран один доказательный inventory/disposition и migration-ledger contract
- [x] M1-M6 сохранены; fake originals, bindings, authority и readiness запрещены
- [x] Route/access matrix, rollout DAG, consistency и rollback исполнимы
- [x] Не меньше 16 cases и семь обязательных таблиц заполнены
- [x] Current go/no-go честен, каждый gate имеет corpus/evidence/fail result
- [x] #1303/#1305 разрезаны на зависимые reviewable deliveries
- [x] Код, DNS, Caddy, Panel, issues и production не изменены
- [x] Один carrier, один D1, посылки перед последней секцией DoD
- [x] Не меньше 36 ролевых реплик и не меньше шести от каждой роли
