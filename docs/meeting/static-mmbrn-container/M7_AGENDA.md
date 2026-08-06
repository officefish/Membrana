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
Carrier — `docs/seanses/static-mmbrn-container-m7-migration-delivery-2026-08-06.md`; второй
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

1. **Inventory truth.** Назначить доказательный snapshot Affine: DB/workspace/page/asset
   inventory, content/attachment hashes, parent relations, visibility/native grants и
   timestamps. Указать bounded consistency cut/fence и почему CLI `0` не может заменить
   DB/export reconciliation.
2. **Disposition.** Дать закрытый словарь судьбы каждого page/asset: например discard,
   retain-as-export-evidence, rebuild-projection, register-original-through-M6,
   migrate-portable-state, manual-review. Названия выбирает carrier; каждое решение имеет
   основание M1/M2/M5, actor и evidence. Blind copy всех 82 pages запрещён.
3. **Migration identity.** Задать append-only migration ledger и state machine от observed
   source object до terminal disposition. Engine ids не становятся M2 ids/canonicalRef;
   duplicate content не сливает records; fake M6 ledger/binding запрещены. Retry/crash/
   resume и exact reconciliation обязательны.
4. **Preconditions.** Назвать machine predicates, которые должны PASS до первого write,
   projection rebuild, route canary и final cutover. M3 bypass, M4 G1-G10, M5 G1-G10 и M6
   full-corpus readiness не заменяются словами «готово»; unknown = NO-GO.
5. **Portable/engine state.** Развести originals/registry, projection intent, binding,
   annotations, engine projection, layout/cache/session и strategic documents. Для каждой
   категории выбрать source, destination, migration/rebuild/discard rule и loss policy.
6. **Routes и authority.** Выбрать конечную route/access matrix для `static`, старого
   `strategy`, deep links, API/download/preview/WebSocket и direct backend. Для каждого
   маршрута указать public hostname, internal target, M3 action/object gate, redirect/proxy/
   deny outcome и запрет native credential leakage.
7. **Rollout DAG.** Выбрать один порядок provision -> dry inventory -> export/snapshot ->
   migrate/rebuild -> reconcile -> canary -> cutover -> observe -> retire либо более строгий
   эквивалент. Для каждого шага задать entry gate, mutation, exit evidence, owner и stop rule;
   параллельность разрешена только при явной независимости.
8. **No-downtime и consistency.** Выбрать write/freeze/fence strategy между source snapshot и
   cutover, обработку in-flight sessions/links и критерий отсутствия lost/duplicated state.
   Нельзя обещать no downtime без измеримой availability и error-budget метрики.
9. **Rollback.** Задать rollback point и direction для каждой мутационной фазы, предельное
   окно, неизменяемые evidence и запрет отката M2/M4/M5 append-only history. Старый route не
   может возвращать direct Affine bypass или становиться второй authority.
10. **Redirect и retirement.** Выбрать статус/срок старого hostname и deep-link mapping,
    поведение неизвестной ссылки, certificate/DNS/Caddy observability и критерии удаления
    старого route/runtime/data. Retirement запрещён до restore/parity/traffic evidence.
11. **Panel и реестры.** Назвать точные классы обновлений Panel navigation/section grants,
    `LIVE_SERVICES`, operator runbook, monitoring/alerts и публичной документации. Эти edits
    являются outputs реализации, не выполняются carrier M7.
12. **Delivery slicing.** Разрезать #1303/#1305 на зависимый delivery plan с для каждого slice:
    issue-home, scope, prerequisites, artifacts, acceptance evidence, rollback и review gate.
    Нельзя закрыть umbrella по DNS alone или смешать storage, authority и migration в один
    недоказуемый шаг.
13. **Readiness и финальный verdict.** Дать one-page go/no-go matrix, current measured state,
    responsible evidence producer и правило cutover authorization. Текущий verdict обязан
    оставаться NO-GO, пока хотя бы один required gate unknown/FAIL.

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
