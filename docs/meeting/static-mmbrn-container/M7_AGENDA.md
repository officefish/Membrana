# M7 — переезд и доставка

> Заседание `static-mmbrn-container`, последняя фаза M7. M1-M6 закрыты; M2-M6
> ратифицированы:
> [`M1`](../../seanses/static-mmbrn-container-m1-boundary-2026-08-03.md) ·
> [`M2`](../../seanses/static-mmbrn-container-m2-identity-2026-08-03.md) ·
> [`M3`](../../seanses/static-mmbrn-container-m3-access-2026-08-04.md) ·
> [`M4`](../../seanses/static-mmbrn-container-m4-storage-2026-08-04.md) ·
> [`M5`](../../seanses/static-mmbrn-container-m5-affine-role-2026-08-06.md) ·
> [`M6`](../../seanses/static-mmbrn-container-m6-intake-delivery-2026-08-06.md).
> Общий бриф: [`MEETING_BRIEF.md`](MEETING_BRIEF.md).

## Вопрос заседания

**D1 — назначьте один минимальный исполнимый контракт переезда и доставки
`strategy.mmbrn.tech -> static.mmbrn.tech`: как получить доказательный инвентарь нынешних
82 Affine pages и 57 assets, вынести по каждому объекту явный disposition, подготовить
M3-M6 readiness, перенести только законные состояния, переключить Panel/proxy/Caddy/DNS и
старые ссылки без обхода authority, доказать cutover и rollback, объявить сервис в
`LIVE_SERVICES` и разрезать #1303/#1305 на зависимые поставки. Выберите один rollout DAG,
одну migration ledger/state machine, одну route/access matrix и один набор machine gates.
Carrier — `docs/seanses/static-mmbrn-container-m7-migration-delivery-2026-08-07.md`; второй
носитель запрещён. Список посылок обязателен. Код, DNS, Caddy, Panel и production в этой
комнате не изменяются.**

## Закрытые посылки M1-M6

- M1: original bytes и `docs/evidence` принадлежат контейнеру; страницы Affine — состояние
  движка, strategic documents принадлежат Panel. Ни одна Affine page не становится
  original только из-за нахождения в workspace.
- M2: `registry.jsonl` — истина регистрации, record/lineage identity и истории;
  `canonicalRef = urn:mmbrn:static:<rootId>`. Location — заявление; достижимость — внешнее
  состояние. Любая правка создаёт новую append-only row.
- M3: Panel — единственный authorizer. Proxy fail-closed проверяет action, stable principal,
  object и версии; прямого пользовательского Affine route/token/native role нет.
- M4: production требует независимые FD-1/FD-2/FD-3, capacity/quota, complete backup,
  restore drill, RPO/RTO, reconciliation и sensitive isolation. Office VDS с 9.46 GiB
  free — storage NO-GO.
- M5: Affine — optional projection. Значимы Panel-owned projection intent, binding events и
  portable annotations; engine projection/layout/cache disposable. Binding/annotation
  parity и восстановление replacement engine обязательны до cutover.
- M6: канонический вход проходит LIGD; commit = verified FD-1 + immutable M2 append + durable
  binding. Legacy rows без accepted ledger evidence — `legacy_uncovered`; production intake
  сейчас NO-GO. Миграция не вправе создавать fake bindings или обходить intake.

## Измеренная фактура переезда

- Live Affine: `affine_server` + PostgreSQL + Redis на office VDS, loopback
  `127.0.0.1:3010`, Caddy route `strategy.mmbrn.tech`.
- В БД три private workspaces: Strategy, Templates, Releases; один participant; 82 pages.
  Наблюдаются дубли импортированных документов и 57 служебных PNG/SVG. Оригиналов чеков и
  внешних PDF в Affine не найдено.
- `affine-cli doc list` показал ноль документов, но read-only DB inventory опроверг его.
  CLI-листинг не является доказательством пустоты или полноты корпуса.
- Стратегическая публикация в Affine заморожена машинным gate; Git/гранулы/генераторы
  остаются truth стратегических документов.
- `docs/evidence/registry.jsonl` содержит 12 legacy rows; один PDF-чек лежит в публичном Git,
  sensitive PDF партнёра — вне Git. M6 объявляет их uncovered до отдельной accepted policy.
- Panel уже имеет role/section grants, но static ingress и передача решений в Affine не
  реализованы. Текущий forward-auth защищает другие surfaces, не будущий static route.
- `docs/LIVE_SERVICES.md` не объявляет Affine/`strategy.mmbrn.tech`.
- Открыты Issue #1303 (индекс/API вещдоков) и #1305 (переезд Affine); их нынешние тексты не
  покрывают весь ратифицированный контракт M1-M6.

## Обязательные решения

1. **Inventory:** один fenced DB/export snapshot с pages/assets, hashes, relations, grants и
   timestamps; CLI `0` не заменяет reconciliation.
2. **Disposition:** закрытая судьба каждого source object с M1/M2/M5 основанием, actor и
   evidence; blind copy 82 pages запрещён.
3. **Ledger:** append-only state machine до resolved outcome; engine id не M2 identity,
   duplicates не сливаются, fake M6 binding запрещён; retry/crash/reconcile обязательны.
4. **Preconditions:** stage-specific machine gates M3, M4 G1-G10, M5 G1-G10 и полного M6;
   unknown = NO-GO.
5. **State classes:** развести originals/registry, projection intent, binding, annotations,
   engine projection, layout/cache/session и strategic docs; назначить source/destination,
   migrate/rebuild/discard и loss policy.
6. **Routes:** одна matrix для static/strategy/deep links/API/download/preview/WS/backend:
   target, exact M3 action/object либо network deny, outcome и credential-leak ban.
7. **Rollout:** один DAG provision/inventory/export/migrate/reconcile/canary/cutover/observe/
   retire или строгий эквивалент; у шага deps, entry, mutation, exit evidence, owner, stop.
8. **Consistency:** freeze/fence, in-flight sessions/links и exact no-loss/no-duplicate proof;
   no-downtime требует availability/error predicate.
9. **Rollback:** point/direction/window каждой mutation без отката append-only history и без
   возврата Affine bypass/второй authority.
10. **Redirect/retirement:** один old-host/deep-link contract, observability и machine
    deletion gates; restore/parity/traffic evidence обязательны.
11. **Panel/реестры:** классы будущих edits navigation/grants, `LIVE_SERVICES`, runbook,
    monitoring и docs; сама M7 их не выполняет.
12. **Slicing:** зависимые reviewable slices #1303/#1305 со scope, prerequisites, artifacts,
    acceptance, rollback и review; DNS alone не закрывает umbrella.
13. **Readiness:** go/no-go matrix с corpus, predicate, producer, current state и cutover
    authorization; любой required unknown/FAIL сохраняет NO-GO.

## Обязательные поправки run1

Бюджет **1/5**. Run1 только в `rejected`; его MDC-v1/constants/verdict не посылки run2.

1. **M3:** только `discover|read-metadata|read-ref|read-bytes|download|write-metadata|
   upload-revision|manage-access`; у каждого route ровно один action/object либо pre-action
   network deny. Canary/rollback сохраняют Panel gate и current versions; `static.*` нельзя.
2. **Без циклов:** freeze/fence до единственного proof snapshot/disposition/export. M5
   replacement/rehydration gates — после результата; у каждого M4-M6 gate указан первый шаг,
   где evidence уже существует.
3. **Exact sets:** corpus выводится из fence snapshot; `82/57` лишь baseline drift. DB/export/
   ledger равны двусторонне по stable `SourceObjectRef`+hash, не counts. M6 буквально сохраняет
   `C_all,C_live,L_proposed,C_managed,C_legacy`, state cardinalities и full three-way diff.
4. **Retirement:** manual/blocked/failed unresolved не terminal; каждый source object требует
   resolved outcome+complete evidence, неопределённый `critical set` запрещён.
5. **Constants:** выбрать по одному redirect/unmapped status, canary window+error predicate,
   rollback window, redirect lifetime, observation interval и zero-traffic predicate;
   `301/302`, `404/410`, `default/proposed/long/≈0` запрещены и значения повторяются во всех
   проверяющих route/case/readiness/rollback rows.

Ролевой DoD остаётся `[ ]`; поправки не выбирают за run2 routes/constants/state/DAG.

## Обязательные случаи

Таблица `Случай | Disposition/решение | Gate | Evidence | Rollback/stop` включает не меньше
16 строк:

1. Strategic page, канон которой есть в Git; 2. duplicate imported page; 3. unique Affine-only
page; 4. один из 57 service assets; 5. asset, связанный несколькими pages; 6. page без
binding; 7. conflicting bindings; 8. portable annotation parity mismatch; 9. CLI говорит
`0`, DB/export видят `82`; 10. существующий M2 legacy row без M6 ledger; 11. sensitive local
ref; 12. office VDS capacity FAIL; 13. backup есть, restore drill FAIL/unknown; 14. Panel deny
при native Affine capability; 15. старый deep link; 16. неизвестный old path; 17. WebSocket
или direct backend bypass; 18. crash между DNS/Caddy change и health proof; 19. canary
ошибки выше порога; 20. rollback после новых append-only events.

## Обязательные таблицы

- **Inventory/disposition:** source kind/id, classification, duplicate group, destination,
  disposition, authority, evidence.
- **Migration ledger/state machine:** state, entry predicate, allowed transition, durable
  evidence, retry/recovery, terminal outcome.
- **Route/access matrix:** route class, hostname/path, internal target, M3 action/object,
  outcome before/during/after cutover, rollback behavior.
- **Rollout DAG:** step/dependencies, entry gate, mutation, exit evidence, owner, stop/rollback.
- **Cases:** по форме выше.
- **Readiness:** gate, exact predicate, corpus, evidence, current state, fail result.
- **Delivery slicing:** #1303/#1305 slice, dependency, artifact, acceptance/review, rollback.

## Границы комнаты

- Не менять code, DNS, Caddy, certificates, Panel, `LIVE_SERVICES`, issues или production.
- Не provision FD-1/FD-2/FD-3, не экспортировать/удалять live Affine data и не запускать
  migration. Read-only measured facts являются входом, не разрешением на действие.
- Не переопределять M1-M6: страницы Affine не originals; engine id не canonicalRef; Panel
  остаётся authorizer; office VDS и legacy corpus не получают ложный PASS.
- Не возвращать Affine в роль strategic editor и не копировать Git strategic documents в
  static как originals без отдельного M6 intent владельца.
- Не объявлять no-downtime, rollback, redirect или readiness без machine predicate/evidence.
- Не создавать третий umbrella вместо честной нарезки #1303/#1305 и не закрывать их в
  протоколе.

## Требования к форме

- Не меньше 36 предметных ролевых реплик и не меньше шести от каждой из шести ролей.
- Одна пропозиция D1, один verdict, один carrier. Итог выбирает одну модель.
- `Список посылок` после решения и до DoD содержит только M1-M6, измеренные факты и
  ограничения agenda; выбранные M7 state/routes/constants не становятся посылками.
- Meta/self-count запрещены; ролевой пункт DoD оставляется внешнему аудиту.
- `Definition of Done` — последняя секция; после неё нет текста/footer.

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
