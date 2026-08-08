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
Carrier — `docs/seanses/static-mmbrn-container-m7-migration-delivery-2026-08-08.md`; второй
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

- Live Affine: `affine_server`, PostgreSQL и Redis на office VDS; `127.0.0.1:3010`; Caddy
  route `strategy.mmbrn.tech`.
- БД: private Strategy/Templates/Releases, один participant, 82 pages, дубли и 57 service
  PNG/SVG; оригиналов чеков/внешних PDF не найдено.
- `affine-cli doc list` = 0, DB inventory = 82; CLI не доказывает пустоту или полноту.
- Affine strategic publish заморожен; Git/гранулы/генераторы — truth.
- Registry: 12 legacy rows, PDF-чек в public Git, sensitive PDF вне Git; M6: uncovered.
- Panel grants есть; static ingress/передача решений не реализованы, forward-auth его не покрывает.
- `docs/LIVE_SERVICES.md` не объявляет Affine/`strategy.mmbrn.tech`.
- Issues #1303 (индекс/API) и #1305 (Affine) открыты и не покрывают M1-M6.

## Обязательные решения

1. **Inventory:** один fenced DB/export snapshot с pages/assets, hashes, relations, grants и
   timestamps; CLI `0` не заменяет reconciliation.
2. **Disposition:** закрытая судьба каждого source object с M1/M2/M5 основанием, actor и
   evidence; blind copy 82 pages запрещён.
3. **State classes:** развести originals/registry, projection intent, binding, annotations,
   engine projection, layout/cache/session и strategic docs; назначить source/destination,
   migrate/rebuild/discard и loss policy.
4. **Panel/реестры:** классы будущих edits navigation/grants, `LIVE_SERVICES`, runbook,
    monitoring и docs; сама M7 их не выполняет.
5. **Slicing:** зависимые reviewable slices #1303/#1305 со scope, prerequisites, artifacts,
    acceptance, rollback и review; DNS alone не закрывает umbrella.

## Обязательные поправки run1-run4

Бюджет **4/5**. Run1-run4 в `rejected`; их решения не посылки run5.

1. **M3 routes:** только `discover|read-metadata|read-ref|read-bytes|download|write-metadata|
   upload-revision|manage-access`; object только container=`static.mmbrn.tech`, collectionId
   или lineage=`canonicalRef`. Каждый forward имеет один action/object либо pre-action deny;
   `pass-through`, multi-action API и неклассифицированный WS запрещены.
2. **Причинный DAG:** provision создаёт target и не требует его M4 PASS. M4 следует после
   target; M5 export/rehydration/parity — после производящего шага. Pre-step проверяет только
   существующие input/authority/backup.
3. **M4 exact:** G1 `B=min(P-12GiB,floor(.90P))`, versioned `Q_c`, and at zero-size
   `physical_delta=0`: `free_after>=12GiB AND utilisation<.90 AND U_c+logical_delta<=Q_c`;
   unknown DENY. G2 test-object
   `sha256+bytes`; G3 independent FD-2 `complete.json`+all hashes; G4 full isolated restore,
   zero mismatch; G5 direct access DENY+M3 checks; G6 zero unexplained dangling/orphan;
   G7 `now-cut_at<=24h`; G8 `t_fixed+protected_bytes/v_verified<=4h`; G9 FD-3
   registry/lifecycle append+snapshot+restore; G10 encrypt/backup/decrypt+credential isolation.
4. **M5 exact:** G1 replay has no unknown/gap/duplicate/missing cause/group; G2 `refs(A)=R` and
   unique canonicalRef; G3 `engineIds(A)=E` and unique engine identity; G4
   store=export=rehydrated by `stableId->recordHash`; G5 G1-G4 true on replacement; G6 each
   Panel deny has Affine forward count 0; G7 native principals=service allowlist; G8 backup
   interval<=12h, age<=24h, hashes/counts match; G9 restore<=4h and drill age<=30d; G10 retain
   every event/version through lineage lifetime and >=7y after close. Норма без evidence не PASS.
5. **M6 exact:** `C_all`=all M2 rows; `C_live`=lifecycle current tips; `L_proposed`=all durable
   proposedRecordId intents incl. FAILED/reconciliation; `C_managed`=rows whose ids occur in
   `L_proposed`; `C_legacy=C_all\\C_managed`. Before STORED: row/object `0/0`; STORED: `0/1`
   verified FD-1; COMMITTED: `1 row/1 verified object/1 binding`. Crash without binding allows
   `0/0,0/1,1/1`, forbids `1/0`; reconcile repairs/rejects and full ledger/registry/FD-1 diff
   covers every intent/state and reverse-joins every managed row. Validation до write не требует
   future row/binding; COMMITTED only after verified FD-1+M2 append+durable binding.
6. **Одна ledger machine:** заранее объявить все states/transitions; case/DAG не вводит state.
   Обратных переходов нет: retry/recovery — новые append events.
   Control-plane rollback не удаляет M2 rows, bindings, referenced bytes или history.
7. **Per-object evidence:** source id различает page и asset; `82/57` — baseline, не fenced
   cardinality. До manifest с каждой row+hash+disposition статус `NOT PERFORMED/NO-GO`;
   типовые classes не заменяют корпус.
   Page/asset требует M1 qualification и отдельного M6 intent; ref-count недостаточен.
8. **Retirement:** source/engine copy не удаляется post-cutover; superseded bytes >=365d.
   Cutover, rollback и retirement
   разные gates; deletion лишь после redirect lifetime, restore/parity, all-resolved и exact
   zero-traffic interval. Observation вне rollback window не обещает rollback. Выбрать один
   redirect/unmapped status, canary predicate, rollback window, lifetime, observation и
   zero-traffic; значения едины во всех tables.
9. **Run4 mechanics:** фактический carrier обязан совпасть с `2026-08-08` выше. До конца должно
   быть >=36 реплик и >=6 каждой роли. Все семь обязательных таблиц — реальные Markdown tables:
   inventory/disposition и rollout DAG нельзя заменять prose. `HOLD`, `DISCARD`, parity/fail
   events либо объявлены в единой machine, либо запрещены.

Ролевой DoD остаётся `[ ]`; поправки не выбирают за run5 constants, states или DAG.

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
