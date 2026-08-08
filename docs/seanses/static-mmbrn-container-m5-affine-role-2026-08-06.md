<!-- канал: llm — исходные протоколы произведены yarn consilium -->
<!-- local-synthesis: председательская редакция из run1-run5 после исчерпания 5/5 внешних попыток; сырой run5 сохранён в rejected/static-mmbrn-container-m5-affine-role-2026-08-06-run5-final-external-m6-reducer-annotations.md -->

# Метаданные сеанса

| Поле | Значение |
|---|---|
| Каноническая комната | M5 «Роль Affine» заседания `static-mmbrn-container` |
| Локальная сборка | 2026-08-06 после закрытия внешнего бюджета 5/5 |
| Последний внешний вызов | `yarn consilium`, `anthropic/claude-sonnet-4-6` |
| Файл | `docs/seanses/static-mmbrn-container-m5-affine-role-2026-08-06.md` |
| Повестка | `docs/meeting/static-mmbrn-container/M5_AGENDA.md` |
| Корпус | rejected run1-run5, ратифицированные M2-M4, независимые постаудиты |

Локальная редакция использует только доставленную повестку, закрытые M1-M4, сохранённые
внешние прогоны и их постаудиты. Новых внешних вызовов не производилось.

---

# Консилиум: F1 — минимальный заменяемый контракт Affine

[Архитектор]: Выбираю одну модель: Affine является только сменной человеческой проекцией. Канонические originals, identity, authority, binding и переносимые annotations остаются вне движка. Контракт Affine не становится новым интерфейсом контейнера.

[Teamlead]: Граница исполнения начинается с решения Panel и актуального binding. Если Panel дал deny либо binding отсутствует, неоднозначен или stale, к Affine не передаётся ничего. Это правило действует для каждой из восьми способностей без исключений.

[Структурщик]: Закрытый словарь M3 сохраняется дословно: `discover`, `read-metadata`, `read-ref`, `read-bytes`, `download`, `write-metadata`, `upload-revision`, `manage-access`. Объекты только container, collection и lineage; annotation write не добавляется.

[Математик]: `requiredProjectionSet` должен быть независим от фактических страниц движка. Panel назначает множество требуемых `canonicalRef`, а readiness сравнивает его с reducer output binding ledger и полным inventory живых engine objects на одном snapshot.

[Верстальщик]: Пользователь видит контейнерные identities и разрешённые результаты, а не нативные роли и ids Affine. Исчезновение движка может убрать browsing и layout, но не должно изменить адрес, права или историю материала.

[Музыкант]: Значимые annotations нельзя смешать с удобствами интерфейса. Они получают engine-neutral identity, version scope и anchor; navigation, layout и session state заранее объявляются disposable и не маскируются словом «значимое».

[Архитектор]: `read-ref` возвращает только `location.ref`; `read-metadata` его не включает, а `read-bytes` и `download` остаются отдельными действиями. Здесь назначаются логические классы результатов, но не transport, endpoint, file flow или UI.

[Teamlead]: `manage-access` доступен только baseline owner. Grants для этого действия не рассматриваются, пользовательский native credential не выдаётся, а техническая способность service identity не превращается в пользовательскую authority.

[Структурщик]: Binding не является полем M2, `canonicalRef`, `location.ref` или Affine page metadata. Это внешний Panel-owned immutable event ledger, в котором engine id можно заменить, не меняя identity материала.

[Математик]: Event stream имеет scope одного `canonicalRef`; `seq` внутри него строго возрастает и уникален. Каждое событие содержит ровно один engine object в key, поэтому conflict и reconcile записываются согласованными группами событий, а не строкой с двумя ids.

[Верстальщик]: Состояние `active` не хранится в event row и не редактируется. Оно вычисляется reducer-ом; при conflict, stale или delete человеческая поверхность показывает недоступность, но не предлагает обходной read-only режим.

[Музыкант]: Annotation hash должен защищать не только текст. В hash входят identity, revision scope, автор и anchor; иначе комментарий можно незаметно перенести к другой версии или позиции, сохранив тот же body hash.

[Архитектор]: M4 topology остаётся нетронутой: FD-1 хранит primary bytes, FD-2 complete backup, FD-3 registry и lifecycle. Binding и annotations не объявляются частью FD-3 без отдельного доказательства их durable boundary.

[Teamlead]: Для Panel portable state назначаем требования, а не ложный факт готовности: backup каждые 12 часов, RPO не больше 24 часов, RTO не больше 4 часов, restore drill раз в 30 дней. Пока нет измеренного evidence, production readiness равен NO-GO.

[Структурщик]: Binding events и версии annotations хранятся весь срок жизни lineage и не меньше семи лет после её закрытия. Само требование не выбирает physical store; оно запрещает считать новый store живучим по наследству от M4.

[Математик]: Биекция требует четырёх условий одновременно: refs active rows равны `requiredProjectionSet`, engine ids равны live inventory, каждый ref встречается один раз и каждая пара engine kind/id встречается один раз. Равенства множеств без обеих уникальностей недостаточно.

[Верстальщик]: Все проверки замены связываются `snapshotId`. Required set, ledger cut, engine inventory, annotation export и rehydrated export должны ссылаться на один cut; сравнение снимков разных моментов не является доказательством.

[Музыкант]: Для произвольного original допустим byte anchor с проверяемыми bounds. Structural anchor разрешён только для JSON revision как RFC 6901 JSON Pointer; для остальных media type выдумывать структуру движка запрещено.

[Архитектор]: Replace — два связанных immutable события: `replace` закрывает старый object и называет successor, затем `create` открывает successor и ссылается на replace event. M2 record и `canonicalRef` при этом не мутируют.

[Teamlead]: Conflict — по одному событию на каждый спорящий object с общим `conflictGroupId`; до reconcile для ref нет active row. Reconcile также пишет по одному решению на object: один winner, остальные losers, после чего reducer снова может получить ровно один active row.

[Структурщик]: Stale и delete терминальны для конкретного engine object. Повторное оживление той же stored row запрещено; новый projection получает новый create event с новым `eventId` и последующим `seq`.

[Математик]: Полнота reducer проверяется таблицей переходов и replay от пустого stream. Любая неизвестная event type, gap/duplicate seq, отсутствующая cause-ссылка или противоречивая conflict group делает весь ref non-active и блокирует forward.

[Верстальщик]: Degraded mode честен: без Affine недоступны его projection, browsing, layout и engine-side display annotations. Container, registry, bytes и Panel authority продолжают жить по M1-M4, но эта комната не проектирует способ их доставки пользователю.

[Музыкант]: Rehydration означает проверяемое свойство результата, а не пошаговый pipeline. Новый движок обязан дать тот же set+hash annotations и новую биекцию на том же snapshot; способ загрузки и transport остаются вопросом M6.

[Архитектор]: Capability `write-metadata` сохраняет M2: результатом является новая immutable record в той же lineage. `upload-revision` создаёт новую canonical revision; Affine не объявляется источником её bytes, address или version history.

[Teamlead]: Разделяем два access gate. Первый доказывает `Panel deny -> zero Affine forwards`; второй доказывает, что полный набор native Affine principals точно равен ратифицированному service allowlist и не содержит пользователей.

[Структурщик]: Audit evidence замены обязано сохранить неизменными `canonicalRef`, M2 records, `location.ref`, grants, policy version vector и audit history. Смена engine kind/id разрешена только в binding ledger.

[Математик]: Case с двумя refs на один engine id должен падать даже при совпадении размеров множеств. Predicate уникальности пары `(engineKind, engineObjectId)` устраняет эту ложную зелёнку.

[Верстальщик]: Strategic document находится вне контейнера. Попытка открыть или редактировать его через Affine классифицируется как unknown/out-of-container и получает deny без вымышленной M2 record или новой object class.

[Музыкант]: Canonical annotation serialization использует UTF-8 JSON Canonicalization Scheme; body сначала нормализуется в NFC и LF без trailing spaces. Массивы сохраняют порядок, поэтому hash воспроизводим и не зависит от Affine export formatting.

[Архитектор]: Durable evidence включает cut, backup identity, retention bound, counts, hashes и измеренное время restore. Заполненное словами поле без successful drill не проходит gate и не превращает thresholds в измеренный факт.

[Teamlead]: Readiness не закрывается по counts. Нужны set diff в обе стороны, обе uniqueness проверки, reducer replay, annotation triple equality, rehydration, access no-forward, principal allowlist и durable drill.

[Структурщик]: Portable store, engine export и rehydrated export должны иметь один `snapshotId` и одинаковые пары `stableId -> recordHash`. Waiver и ручное «считаем совпавшим» запрещены.

[Математик]: Если хотя бы один gate имеет unknown evidence, итог не PARTIAL PASS, а NO-GO. Это сохраняет заменяемость как доказуемое свойство, а не обещание будущей реализации.

[Верстальщик]: Минимальная поверхность не объясняет endpoints, routes, response schema, download form, preview или migration UI. Она только связывает человеческие способности с M3 action и допустимым состоянием движка.

[Музыкант]: Итоговый образ прост: Affine можно потерять и восстановить как инструмент восприятия, не потеряв голос оригинала, его адрес, права и значимые пометки. Всё, что мешает такой замене, остаётся NO-GO до доказательства.

---

## Итоговое решение F1

Выбран **Panel-owned projection contract**. Affine — необязательный сменный движок
человеческой поверхности. Panel остаётся владельцем authority, intent, binding и portable
annotations; M2/M4 остаются владельцами identity и originals. Любое Affine action требует
Panel allow, актуальный version vector и единственный active binding; иначе deny/no-forward.

### Способности

| Capability | M3 action | Input | Логический результат | Допустимая engine mutation | Запрещено |
|---|---|---|---|---|---|
| discover | `discover` | container/collection/lineage | разрешённые object identities | нет | native id/token |
| metadata | `read-metadata` | container/collection/lineage | metadata без `location.ref` | нет | ref/bytes |
| ref | `read-ref` | lineage | только `location.ref` | нет | metadata/bytes |
| bytes | `read-bytes` | lineage | разрешённые canonical bytes | нет | ref/transport choice |
| download | `download` | lineage | разрешённый original для download | нет | форма/route/file flow |
| metadata revision | `write-metadata` | lineage | новая immutable M2 record той же lineage | invalidation derived projection | мутация прежней record |
| canonical revision | `upload-revision` | lineage | новая canonical revision | invalidation derived projection | draft как canonical |
| own access | `manage-access` | container/collection/lineage | собственная policy state | нет | grants, native role/credential |

Все восемь строк требуют valid current binding. Annotation write отсутствует. Семантика
результатов не выбирает API, transport, endpoint, UI или storage pipeline.

### Классы состояния

| State class | Owner/source of truth | Nature | Portable | Потеря при замене |
|---|---|---|---|---|
| Primary original bytes | M4 FD-1 | canonical | через M4 contract | недопустима |
| Complete backup | M4 FD-2 | canonical evidence | через M4 contract | недопустима |
| Registry/lifecycle | M2/M4 FD-3 | canonical | через M2/M4 contract | недопустима |
| Required projection intent | Panel | significant | обязательна | блокирует readiness |
| Binding events | Panel portable-state boundary | significant | обязательна | блокирует readiness |
| Annotations/comments | Panel portable-state boundary | significant | обязательна | блокирует readiness |
| Engine projection | Affine | derived | нет, rebuildable | допустима |
| Navigation/layout | Affine | derived | нет, disposable | допустима |
| Cache/session | Affine | runtime | нет, disposable | допустима |

Panel portable-state boundary не считается FD-3 и не меняет topology M4. Для binding и
annotations обязательны: backup каждые 12 часов; `RPO <= 24h`; `RTO <= 4h` по измеренному
restore; drill не реже 30 дней; retention весь срок lineage и минимум 7 лет после закрытия.
До появления evidence readiness имеет NO-GO.

### Binding ledger и reducer

Каждое immutable событие имеет поля:

| Поле | Контракт |
|---|---|
| `eventId` | глобально уникальный stable id |
| `canonicalRef` | scope stream; M2 identity, не engine id |
| `seq` | уникальный contiguous integer `>=1` внутри stream `canonicalRef` |
| `engineKind`, `engineObjectId` | ровно один object, составная engine identity |
| `eventType` | `create`, `replace`, `delete`, `stale`, `conflict`, `reconcile` |
| `causeEventId` | обязателен для replace/reconcile и связанного create |
| `groupId`, `decision` | для conflict/reconcile; `decision` только winner/loser |
| `successorEngineObjectId` | обязателен у replace |
| `actorPrincipal`, `ts` | Panel principal и время события |

Reducer читает stream по `seq`; rows не мутируют. `create` открывает candidate. `replace`
терминирует старый candidate, после него связанный `create` открывает successor. `stale` и
`delete` терминируют object. Conflict создаёт по событию на каждый object с одним `groupId`
и даёт ref статус conflict без active row. Reconcile даёт ровно один winner и не меньше
одного loser в той же группе; только winner может стать active. Unknown type, gap/duplicate
seq, missing cause или неполная group дают status invalid и deny.

Для одного `snapshotId`:

```text
A = activeRows(reduce(eventsCut(snapshotId)))
R = requiredProjectionSet(snapshotId)
E = liveEngineObjectSet(snapshotId)
refs(A) = R
engineIds(A) = E
count(A) = count(R) = count(E)
unique(A.canonicalRef)
unique(A.(engineKind, engineObjectId))
```

Deleted/stale/conflict/invalid rows не входят в `A`.

### Annotation contract

Portable annotation record содержит `stableId`, `canonicalRef`, `versionScope` равный
SHA-256 canonical revision, `authorPrincipal` Panel, `bodyNormalized`, `anchor` и
`recordHash`. Body: Unicode NFC, LF, без trailing spaces. Anchor — tagged union:

- `byte`: `{kind, revisionSha256, start, end}`, где целые `0 <= start < end <= byteLength`;
- `json-pointer`: `{kind, revisionSha256, pointer}`, где media type canonical revision —
  JSON, а `pointer` валиден по RFC 6901; для прочих media type этот kind запрещён.

`recordHash = SHA-256(UTF-8 RFC 8785 JCS)` от всех полей record, кроме самого hash. Для
одного `snapshotId` gate требует двустороннее равенство множеств пар `stableId -> recordHash`
у portable store, engine export и rehydrated export. Любой diff или разные snapshot ids
дают NO-GO; waiver запрещён.

### Обязательные случаи

| Случай | Ожидаемое решение | Источник истины | Вещдок |
|---|---|---|---|
| 1. Affine недоступен | Affine capabilities deny; M1-M4 продолжают жить | M1-M4 | health state + zero forward |
| 2. Движок заменён | identity/address/grants/policy vector/audit history неизменны; новый binding | M2-M4 + ledger | before/after invariant diff + events |
| 3. Engine id изменился | replace old, затем linked create successor | binding ledger | contiguous seq + cause links |
| 4. Panel deny при native reader | no-forward | Panel | decision id + forward count zero |
| 5. Panel allow без user native role | исполнение только service identity | Panel + allowlist | principals set equality |
| 6. Binding absent/ambiguous/stale | deny всех Affine actions | reducer | non-active status + zero forward |
| 7. Два objects на один ref или object на два refs | conflict/invalid, deny до reconcile | ledger + inventory | uniqueness failures + group events |
| 8. Strategic document | unknown/out-of-container deny | registry | absent registration + deny |
| 9. Annotation diff перед заменой | NO-GO без waiver | portable snapshot | three-way set/hash diff |
| 10. Layout/cache/session потеряны | допустимо только для disposable classes | state table | class label + absence portable claim |

### Readiness

| Gate | Machine predicate | Evidence | Fail result |
|---|---|---|---|
| G1 Reducer | replay valid; no unknown/gap/duplicate/missing cause/group | event cut + replay report | NO-GO |
| G2 Ref coverage | `refs(A)=R` и `unique(A.canonicalRef)` | same-snapshot set diff | NO-GO |
| G3 Engine coverage | `engineIds(A)=E` и unique engine identity | same-snapshot inventory diff | NO-GO |
| G4 Annotation parity | store = export = rehydrated по `stableId->recordHash` | one snapshot, two-way diffs | NO-GO |
| G5 Rehydration | G1-G4 true for replacement result | result predicates + snapshot id | NO-GO |
| G6 Panel authority | каждый Panel deny имеет Affine forward count `0` | decision/trace correlation | NO-GO |
| G7 Native principals | native principals = approved service allowlist | full principal inventory | NO-GO |
| G8 Durable backup | interval `<=12h`, age `<=24h`, hashes/counts match | cut/backup ids, timestamps, hashes | NO-GO |
| G9 Durable restore | measured restore `<=4h`, successful drill age `<=30d` | start/end, corpus bounds, result | NO-GO |
| G10 Retention | every event/version retained through required bound | retained-until audit | NO-GO |

Неизвестное или отсутствующее evidence равно NO-GO. Текущая production readiness этой
комнатой не доказана.

### Degraded mode и заменяемость

При недоступности Affine сохраняются M1 boundary, M2 identity/registry, M3 authority, M4
bytes/backup/lifecycle, Panel intent, binding и portable annotations. Недоступны engine
projection, browsing, layout и engine-side annotation display. Cache не становится truth,
direct Affine access не открывается. Замена обязана сохранить `canonicalRef`, M2 records,
`location.ref`, grants, policy version vector и audit history; меняются только engine
identity и derived/disposable state. Способ transport, preview и migration остаётся M6/M7.

## Список посылок

- Норма M1: `static.mmbrn.tech` — контейнер originals; Affine — сменный human engine.
- Норма M2: `registry.jsonl` — truth identity/history; `canonicalRef` не URL и не engine id.
- Норма M2: смена `location.ref` создаёт новую immutable record в той же lineage.
- Норма M3: Panel — единственный авторизатор; Proxy проверяет action/version/binding.
- Норма M3: восемь actions закрыты; `manage-access` только baseline owner без grants.
- Норма M3: `read-metadata` не включает `location.ref`; `read-ref` возвращает только его.
- Норма M4: FD-1 primary bytes, FD-2 complete backup, FD-3 registry/lifecycle.
- Норма M4: Affine не является storage truth; transport/download form остаются M6.
- Измеренный факт: живой Affine содержит 82 strategy/template/release pages и не содержит
  корпуса originals чеков/PDF; это снимок, не таксономия.
- Измеренный факт: strategic publish заморожен, редактор строится в Panel.
- Норма повестки M5: required set независим, binding portable, annotations no-loss,
  M6-M7 и стратегический редактор не проектируются.

## Definition of Done

- [x] Выбран один минимальный vendor-neutral контракт Affine
- [x] Способности, классы состояния и binding описаны обязательными таблицами
- [x] Источники истины M2/M4 и authority M3 не переданы Affine
- [x] Значимое переносимое и допустимо disposable состояние разведены без скрытой потери
- [x] Десять обязательных случаев имеют ожидаемое решение и вещдок
- [x] Readiness gates машинно проверяемы и включают rehydration и access bypass
- [x] M6-M7 и стратегический редактор не спроектированы
- [x] Один carrier, один F1, список посылок до последней секции DoD
- [ ] Не меньше 36 ролевых реплик и не меньше шести от каждой роли — внешний аудит
