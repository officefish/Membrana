<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-08-06T09:46:40.851Z |
| Команда | `yarn consilium` |
| Модель | anthropic/claude-sonnet-4-6 |
| Файл | `docs/seanses/static-mmbrn-container-m5-affine-role-2026-08-06.md` |
| Порядок ролей | Верстальщик → Teamlead → Структурщик → Архитектор → Музыкант → Математик |
| Повестка | `docs\meeting\static-mmbrn-container\M5_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs\meeting\static-mmbrn-container\M5_AGENDA.md` | 11987 | `307bae8fceff` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs\meeting\static-mmbrn-container\M5_AGENDA.md` | 11987 · 1 п. | `307bae8fceff` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --no-memory --min-replies 36 --seed 223`

**Вопрос:**

F1 — выберите один минимальный заменяемый контракт Affine по повестке M5: точная семантика M3 и owner-only manage-access, fail-closed binding, независимая биекция projection set, immutable event ledger, доказанная durable boundary, переносимые annotations; M6/M7 не решать; один carrier.

---

# Консилиум: M5 — минимальный заменяемый контракт Affine

**Повестка:** F1 — назначить один минимальный исполнимый контракт Affine как необязательной, заменяемой человеческой поверхности под `static.mmbrn.tech`. Точная семантика M3, owner-only manage-access, fail-closed binding, независимая биекция projection set, immutable event ledger, доказанная durable boundary, переносимые annotations. M6/M7 не решать. Один carrier.

**Участники:** Teamlead (Тарасов), Архитектор (Веснин), Структурщик (Ожегов), Математик (Дынин), Музыкант (Курёхин), Верстальщик (Родченко).

**Порядок реплик:** Верстальщик → Teamlead → Структурщик → Архитектор → Музыкант → Математик (циклически, ≥36 реплик)

---

[Верстальщик]: Прежде чем называть модель — уточню задачу с поверхности. Affine здесь не редактор стратегических документов и не хранилище. Пользователь через Proxy видит только то, что Panel разрешил: строго восемь action из M3 над тремя типами объектов. Любой UI-контракт, который я мог бы сверстать поверх этого, обязан иметь явные состояния: нет binding — нет отображения, нет forwarding. Это fail-closed по смыслу, не по дизайну.

[Teamlead]: Хорошо. Ставлю задачу: нам нужна одна модель, не список вариантов. Affine — сменный движок; его нативные роли не видны пользователю. Proxy — единственная точка прохода. Значит контракт задаётся не Affine-интерфейсом, а тем, что Panel разрешил и что binding подтвердил. Всё, что за пределами этих восьми action на container/collection/lineage, — вне контракта. Поехали строить.

[Структурщик]: Первое, что нужно зафиксировать: binding — не поле M2 и не URL. Это отдельный immutable event ledger. Его владелец — Panel-сторона (не Affine). Запись: `(canonicalRef, engineKind, engineObjectId, seq, eventType, ts)`. `affineDocId` существует только внутри этого ledger и нигде больше. Никакого «проброса» engineObjectId в M2 record или в location.ref. Структура ledger должна допускать полную замену engineKind без единой мутации M2.

[Архитектор]: Конструкция такова: три слоя — M2/M4 как источники истины, binding ledger как мост, Affine как сменная поверхность. Boundary проходит по Proxy: он проверяет Panel-решение, актуальный binding и version vector до каждого обращения к Affine. Если любой из трёх элементов недоступен или неоднозначен — deny. Это и есть fail-closed по форме. `requiredProjectionSet` задаётся Panel независимо и является контрактным инвариантом, не параметром Affine.

[Музыкант]: Мне важно, что annotations переносимы и не зависят от сегментации движка. Если Affine завтра меняется на Notion или самописный viewer, анкор аннотации должен указывать на canonical revision hash и byte/structural span из M4, а не на Affine-paragraph-id. Иначе при смене движка мы теряем смысл комментариев. Portable annotation store — отдельный компонент с engine-neutral сериализацией.

[Математик]: Биекция — формальный инвариант. `refs(activeLedger) = requiredProjectionSet` и `engineIds(activeLedger) = liveEngineObjectSet` — это два множества, и отображение между ними должно быть взаимно однозначным. Deleted, stale или conflict-строки не входят в activeLedger по определению: статус есть reducer output, не хранимая мутация. Нарушение биекции — это NOT ACTIVE, а не «почти активно». Никакой нечёткости здесь быть не может.

[Верстальщик]: Отсюда следует: Panel хранит `requiredProjectionSet` как явный список canonicalRef, который он ожидает увидеть покрытым binding. Это не список страниц Affine — это независимо назначенный intent. Affine-страницы существуют лишь как evidence биекции, не как определение множества. Пользователь не видит «управление Affine» — он видит объекты container/collection/lineage с допустимыми action.

[Teamlead]: Фиксирую: `requiredProjectionSet` живёт в Panel, назначается независимо от Affine, проверяется тройным инвариантом. Теперь про durable boundary. Binding ledger и portable annotation store — не FD-3 автоматически. Нам нужны явные численные пороги: RPO, RTO, retention. Без измеренных evidence readiness gate честно даёт NO-GO. Это не пожелание — это условие закрытия.

[Структурщик]: Предлагаю назначить durable owner binding ledger и portable annotation store — Panel-сторона, та же служба, что держит registry.jsonl. Логически это один домен ответственности: identity, binding и переносимые аннотации управляются одним владельцем, независимо от движка. Физически это может быть отдельное хранилище, но ownership не делится. FD-3 не наследуется — назначается явно с evidence.

[Архитектор]: Capability-таблица строится так: для каждого из восьми action — один row с M3 action, input object (container/collection/lineage), output, допустимая мутация в движке и запрещённая authority. `manage-access` — owner-only: никаких grants из этого action, только чтение и изменение своих прав. `write-metadata` создаёт новую immutable M2 record в той же lineage — это не редактирование, это добавление записи. `upload-revision` — canonical revision, не draft и не локальная копия.

[Музыкант]: По аннотациям добавлю точность: annotation record содержит `stableId`, `versionScope` (canonical revision hash из M4), `authorPrincipal` (Panel principal, не Affine user), `bodyNormalized` (UTF-8, ключи по алфавиту, newline нормализован), `contentHash` и `anchor` (byte/structural span без предположения о preview). Это engine-neutral. При rehydration новый движок получает этот JSON и воссоздаёт отображение. Если хэши не совпадают — NO-GO, не waiver.

[Математик]: Immutable event ledger для binding: каждый event имеет ключ `(canonicalRef, engineKind, engineObjectId)`, уникальный `seq` в stream, обязательный `eventType` из закрытого enum: `create | replace | delete | stale | conflict | reconcile`. `delete` и `conflict` называют точные engine ids и seq. Строка никогда не мутирует — статус восстанавливается редьюсером по цепочке событий от начала до последнего. Это доказуемая история без пробелов.

[Верстальщик]: State classes нужно развести явно, потому что это не просто таксономия — это predicates. Canonical originals: owner M4/FD-1-3, immutable, export not required from engine, loss is total loss. Registry/lifecycle: owner registry.jsonl, immutable append, export required. Engine projection: owner Affine, derived, disposable on engine swap, rebuild from binding+M4. Navigation/layout: owner Affine, derived, disposable. Annotations/comments: owner portable store, significant, export required, waiver запрещён. Cache/session: owner Affine, disposable, честная потеря.

[Teamlead]: Верно. «Значимое» и «можно молча потерять» — несовместимые предикаты. Если аннотация признана значимой, она обязана жить в portable store и иметь двустороннюю проверку: portable store = engine export = rehydrated state. Это три равенства по множеству и по хэшу. Отсутствие одного из них блокирует readiness gate «замена без потери значимого состояния».

[Структурщик]: По capability для `manage-access`: Panel проверяет, что caller — owner этого lineage, до forward. Affine получает только service-level команду «применить policy X». Пользователь не получает native Affine token, native Affine role, capability токен или любой обходной credential. Если в allowlist сервиса появляется незнакомый principal — deny без исключений.

[Архитектор]: Заменяемость: что rehydrate-ится. Из M2 — canonicalRef, lineage, M2 record fields. Из M4 — location.ref, bytes address, revision hash. Из binding ledger — engineObjectId нового движка (после create event). Из portable annotation store — все аннотации с anchor. Что строится заново: engine projection (страницы нового движка), navigation/layout, cache/session. Что disposable честно: старые engine projections, layout, session. canonicalRef, M2 storage address, grants, policy versions и audit history не меняются ни при каком сценарии замены.

[Музыкант]: Degraded mode: Affine недоступен. Что остаётся: container boundary, registry, bytes, authority — всё из M1–M4. Что исчезает: human browsing через Affine UI, engine projection view, navigation tree в движке. Никакого fallback на Affine cache как источник истины. Affine cache — не registry. Если Panel разрешил read-bytes — байты доступны через M4, не через Affine.

[Математик]: Readiness gates — формальные predicates. Gate 1: `∀ ref ∈ requiredProjectionSet: ∃! active row in ledger with status=active`. Gate 2: `refs(activeLedger) = requiredProjectionSet` — set equality. Gate 3: `engineIds(activeLedger) ⊆ liveEngineObjectSet` AND `liveEngineObjectSet ⊆ engineIds(activeLedger)` — bijection. Gate 4: `portableAnnotationStore.set = engineExport.set` AND `portableAnnotationStore.hashes = engineExport.hashes`. Gate 5: rehydration drill — новый движок, те же predicates выполняются. Gate 6: access-bypass test — ни один пользовательский principal не имеет native Affine role. Gate 7: durable evidence — RPO/RTO/retention заявлены с measurement.

[Верстальщик]: Дополню Gate 7: если evidence отсутствует — поле `durableEvidence` пусто, и gate возвращает NO-GO, а не «условно выполнен». Это требование повестки, не пожелание. Аналогично Gate 4 — waiver запрещён явно.

[Teamlead]: Теперь случаи. Случай 1: Affine недоступен. Решение: deny всех Affine-зависимых human capabilities, container/registry/bytes доступны через M1–M4. Источник истины: M2/M4/registry.jsonl. Вещдок: binding ledger не изменяется, статус Affine-объектов не влияет на canonicalRef. Это честная недоступность, не потеря данных.

[Структурщик]: Случай 2: Affine удалён, новый движок. Решение: Panel создаёт новый `create` event в ledger для нового engineKind/engineObjectId. canonicalRef, M2 record, location.ref, grants не меняются. Источник истины: binding ledger (история) + M2. Вещдок: старый delete event с точными ids и seq, новый create event; M2 identity без мутации.

[Архитектор]: Случай 3: affineDocId изменился при том же материале. Решение: binding получает `replace` event — старый engineObjectId помечается stale, новый create event с новым engineObjectId. M2 identity не мутирует. История полная. Источник истины: binding ledger. Вещдок: seq старого и нового event, canonicalRef неизменен в обоих.

[Музыкант]: Случай 4: native Affine reader существует, Panel запрещает action. Решение: Proxy получает Panel deny, no-forward к Affine. Пользователь видит deny. Native reader не компенсирует Panel deny. Источник истины: Panel. Вещдок: audit log — Panel deny зафиксирован, Affine не вызывался.

[Математик]: Случай 5: Panel разрешает action, native user role его не поддерживает. Решение: service identity выполняет action через Affine native API. Пользователь credential не получает. Результат возвращается пользователю через Proxy. Источник истины: Panel (authority) + Affine (execution через service identity). Вещдок: allowlist содержит только service principal, пользовательский principal отсутствует.

[Верстальщик]: Случай 6: binding отсутствует, неоднозначен или stale. Решение: deny всех Affine actions без исключений. Нет активного binding — нет forwarding. Неоднозначность (два active rows для одного canonicalRef) — conflict event, статус не active, deny. Stale — deny. Источник истины: binding ledger. Вещдок: reducer возвращает статус не-active.

[Teamlead]: Случай 7: две страницы претендуют на один canonicalRef. Решение: ledger фиксирует conflict event. Обе строки получают статус conflict (не active). Reconciliation event создаётся после ручного разрешения с явным engineObjectId победителя и seq проигравшего. До reconciliation — deny. Источник истины: binding ledger. Вещдок: conflict event с обоими engineObjectId и seq.

[Структурщик]: Случай 8: попытка редактировать стратегический документ через Affine. Решение: объект не принадлежит container/collection/lineage в реестре — unknown/out-of-container. Deny без создания вымышленного M2 record или class. Источник истины: registry.jsonl — документ не зарегистрирован. Вещдок: lookup в registry.jsonl возвращает пустой результат.

[Архитектор]: Случай 9: перед заменой найдено несинхронизированное значимое annotation state. Решение: readiness gate 4 не пройден — portable store ≠ engine export. Замена блокируется. Требуется reconciliation: экспорт из движка, merge в portable store, повторная проверка. Источник истины: portable annotation store (canonical) + engine export (evidence). Вещдок: hash mismatch между portable store и engine export в gate 4.

[Музыкант]: Случай 10: cache/session/layout state потеряно после замены. Решение: если state был классифицирован как disposable — честная потеря, acceptable. Если как portable — readiness gate 4 не пройден, замена была заблокирована или нарушена. Источник истины: state class table (M5 контракт). Вещдок: state class label = disposable → loss acceptable; label = portable → gate должен был заблокировать.

[Математик]: Хочу зафиксировать строгость annotation contract. `stableId` — UUID v4, назначается при создании, не меняется при edit. `versionScope` — canonical revision hash из M4 (именно тот, к которому привязана аннотация). `anchor` — `{byteOffset: number, byteLength: number, structuralPath?: string}` — без предположений о preview. `contentHash` — SHA-256 от `bodyNormalized`. Canonical JSON: UTF-8, ключи по алфавиту, `\n` нормализован к `\n`, не `\r\n`. Это достаточно для engine-neutral round-trip.

[Верстальщик]: Уточню таблицу состояний. Engine projection — derived от M2+M4+binding, не canonical. Его потеря при замене движка не является потерей данных — это плановая утрата производного. Navigation/layout аналогично. Именно поэтому state label и predicate должны совпадать: если мы говорим «disposable», в readiness gate не должно быть проверки его сохранности. Если говорим «portable» — обязана быть двусторонняя проверка.

[Teamlead]: Теперь durable boundary. Binding ledger и portable annotation store требуют явных threshold: RPO ≤ 24h (измеренный backup), retention ≥ 7 лет (соответствует retention registry.jsonl), RTO ≤ 4h (restore drill). Evidence — поле `durableEvidence` с датой последней проверки и результатом drill. Без заполненного evidence gate 7 = NO-GO. M4 topology не меняется. Это не архитектурная мечта — это условие readiness.

[Структурщик]: По owner binding ledger финально: владелец — Panel-служба (та же, что registry.jsonl). Физическое хранилище — отдельный append-only файл или таблица вне Affine-инстанса. Ни при каком сценарии binding ledger не живёт внутри Affine: это нарушало бы независимость от движка. Reconciliation rule: при conflict — manual resolution создаёт reconcile event с полями `resolvedTo: engineObjectId`, `supersededSeq: seq`, `resolvedBy: principalId`, `ts`.

[Архитектор]: Резюмирую конструкцию F1 для вердикта. Один контракт: Affine — сменный engine-projection сервис с ровно восемью capabilities из M3 над тремя типами объектов. Authority: Panel → Proxy → (binding check) → Affine service identity. Binding: immutable event ledger, владелец Panel-сторона, биективный маппинг, шесть eventType. State: шесть классов, два значимых (canonical originals, registry/lifecycle), два переносимых (annotations), два disposable (engine projection, navigation/layout, cache/session). Замена: rehydrate из M2+M4+binding+portableAnnotations, rebuild engine projection, dispose navigation/layout/cache. Readiness: семь gates, все machine-predicate, NO-GO при отсутствии evidence.

[Музыкант]: Добавлю про service identity allowlist — это не абстракция. Allowlist содержит ровно один principal: service identity Proxy. Любой другой principal (включая admin-пользователя, тестовый аккаунт, временный credential) — deny. Это проверяется gate 6: enumeration native Affine principals; результат должен равняться singleton `{proxy-service-id}`.

[Математик]: Gate 5 — rehydration drill — должен быть воспроизводимым. Процедура: (a) зафиксировать состояние portable annotation store и binding ledger; (b) поднять новый engine instance; (c) воспроизвести binding create events для нового engineKind; (d) загрузить аннотации; (e) проверить gates 1–4 на новом instance. Если все пять predicates выполняются — drill passed. Если нет — drill failed, замена заблокирована.

[Верстальщик]: Таблица capabilities — финальная форма. Восемь строк, колонки: capability name, M3 action, input object, output, allowed engine mutation, forbidden authority. `manage-access` — только owner-only, mutation в движке — только service-level policy update, forbidden: grants, credential issuance, native role assignment. `write-metadata` — mutation: новый M2 record append в той же lineage, forbidden: изменение существующего M2 record. `upload-revision` — mutation: canonical revision в M4 через Proxy, forbidden: draft, local copy, engine-internal versioning как canonical.

[Teamlead]: Готов к вердикту. Одна модель принята. Carrier — `docs/seanses/static-mmbrn-container-m5-affine-role-2026-08-06.md`. Второго carrier нет. DoD проверяем по предикатам, не по намерениям.

[Структурщик]: Принимаю.

[Архитектор]: Принимаю.

[Музыкант]: Принимаю.

[Математик]: Принимаю.

[Верстальщик]: Принимаю.

---

## Итоговое решение консилиума

### Пропозиция F1 (единственная)

Affine назначается **одной сменной engine-projection поверхностью** под `static.mmbrn.tech` с ровно восемью capabilities из M3, fail-closed binding через immutable event ledger, независимо назначенным `requiredProjectionSet` на стороне Panel, переносимым annotation store вне движка и семью машинно проверяемыми readiness gates.

---

### Таблица 1 — Capabilities

| Capability | M3 action | Input object | Output | Allowed engine mutation | Forbidden authority |
|---|---|---|---|---|---|
| browse-container | `discover` | container | list of collections (no refs, no bytes) | none | native role, credential |
| read-meta | `read-metadata` | container / collection / lineage | metadata fields (no ref) | none | ref exposure, native token |
| read-ref | `read-ref` | lineage | canonicalRef only | none | metadata, bytes, native role |
| read-bytes-view | `read-bytes` | lineage | byte content view via service identity | read-only engine fetch | user credential, native reader token |
| download-pack | `download` | lineage | downloadable package via service identity | none | user credential, direct storage access |
| write-meta | `write-metadata` | lineage | new immutable M2 record in same lineage | append M2 record (via Panel) | mutate existing M2, engine-internal edit |
| upload-revision | `upload-revision` | lineage | canonical revision registered in M4 | new revision object in engine | draft, local copy, engine versioning as canonical |
| manage-own-access | `manage-access` | container / collection / lineage | own access policy update | service-level policy write | grants to others, credential issuance, native role assignment |

---

### Таблица 2 — Классы состояния

| State class | Owner / source of truth | Canonical / derived | Portable / disposable | Export / rebuild rule | Loss consequence |
|---|---|---|---|---|---|
| Canonical originals | M4 (FD-1/FD-2/FD-3) | canonical | portable (M4) | no export from engine required; bytes in M4 | total loss if M4 lost — engine irrelevant |
| Registry / lifecycle | registry.jsonl (Panel) | canonical | portable (registry) | no export from engine; ledger is source | identity loss — engine irrelevant |
| Engine projection | Affine (derived) | derived | disposable | rebuild from M2+M4+binding on engine swap | expected loss on engine swap; not data loss |
| Navigation / layout | Affine (derived) | derived | disposable | rebuild by new engine | acceptable on engine swap |
| Annotations / comments | Portable annotation store (Panel) | canonical | portable | export required before swap; gate 4 enforced; waiver forbidden | significant loss if store ≠ engine export — blocks swap |
| Cache / session state | Affine (runtime) | derived | disposable | no export required | acceptable; pre-classified as disposable |

---

### Таблица 3 — Binding ledger

| Field | Value / rule |
|---|---|
| Owner | Panel-служба (та же, что registry.jsonl) |
| Physical location | append-only store вне Affine-инстанса |
| Event key | `(canonicalRef, engineKind, engineObjectId)` |
| `seq` | уникален в пределах объявленного stream, монотонно возрастает |
| `eventType` | закрытый enum: `create \| replace \| delete \| stale \| conflict \| reconcile` |
| `delete` event | содержит точный `engineObjectId` и `seq` удаляемой строки |
| `conflict` event | содержит оба conflicting `engineObjectId` и оба `seq` |
| `reconcile` event | `resolvedTo: engineObjectId`, `supersededSeq: seq`, `resolvedBy: principalId`, `ts` |
| Status | reducer output по цепочке событий; stored row не мутирует никогда |
| Active row | eventType = create или reconcile, не superseded последующим replace/delete/stale/conflict |
| `affineDocId` scope | существует только внутри ledger; не является полем M2, не входит в canonicalRef, не является location.ref |
| Reconciliation rule | conflict → manual resolution → reconcile event; до reconcile — deny всех Affine actions для этого canonicalRef |
| Durable owner | Panel-сторона; RPO ≤ 24h (measured); retention ≥ 7 лет; RTO ≤ 4h (drill required); evidence field обязателен |

---

### Таблица 4 — Случаи

| Случай | Ожидаемое решение | Источник истины | Вещдок |
|---|---|---|---|
| 1. Affine недоступен | deny всех Affine human capabilities; container/registry/bytes доступны через M1–M4 | M2/M4/registry.jsonl | binding ledger не изменяется; canonicalRef и bytes живы независимо от Affine |
| 2. Affine удалён, новый движок | Panel создаёт delete event (старый) + create event (новый engineKind/engineObjectId); canonicalRef, M2 record, location.ref, grants без мутации | binding ledger + M2 | delete event со старым engineObjectId и seq; create event с новым; M2 identity неизменна |
| 3. affineDocId изменился при том же материале | replace event: stale старый engineObjectId, create новый; M2 identity не мутирует | binding ledger | seq старого и нового event; canonicalRef одинаков в обоих |
| 4. Native Affine reader существует, Panel запрещает action | Proxy → Panel deny → no-forward; native reader не компенсирует | Panel | audit log: Panel deny зафиксирован, Affine не вызывался |
| 5. Panel разрешает action, native user role не поддерживает | service identity выполняет через Affine native API; пользователь credential не получает | Panel (authority) + allowlist (execution) | allowlist содержит только service principal; пользовательский principal отсутствует |
| 6. Binding отсутствует, неоднозначен или stale | deny всех Affine actions; no forwarding | binding ledger | reducer возвращает статус != active для canonicalRef |
| 7. Две страницы претендуют на один canonicalRef | conflict event; обе строки status=conflict; deny до reconcile event | binding ledger | conflict event с обоими engineObjectId и seq |
| 8. Попытка редактировать стратегический документ через Affine | unknown/out-of-container → deny; нет вымышленного M2 record | registry.jsonl | lookup в registry.jsonl возвращает пустой результат для данного объекта |
| 9. Перед заменой найдено несинхронизированное значимое annotation state | gate 4 fail: portable store ≠ engine export; замена заблокирована; требуется reconciliation | portable annotation store (canonical) | hash mismatch между portableAnnotationStore.hashes и engineExport.hashes в gate 4 |
| 10. Cache/session/layout state потеряно после замены | если disposable — честная потеря, acceptable; если portable — gate 4 должен был заблокировать | state class table (M5 контракт) | state class label = disposable → loss acceptable; label = portable → gate 4 = NO-GO до замены |

---

### Таблица 5 — Readiness gates

| Gate | Machine predicate | Evidence | Fail result |
|---|---|---|---|
| G1: полный inventory | `∀ ref ∈ requiredProjectionSet: ∃! row in activeLedger where status=active` | export activeLedger, проверить set equality с requiredProjectionSet | NO-GO: missing или extra refs |
| G2: биекция refs | `refs(activeLedger) = requiredProjectionSet` (set equality, не subset) | set diff = ∅ в обоих направлениях | NO-GO: dangling или unmapped refs |
| G3: биекция engineIds | `engineIds(activeLedger) = liveEngineObjectSet` (set equality) | enumeration live engine objects vs ledger active rows | NO-GO: orphan engine objects или unmapped engine ids |
| G4: annotation equality | `portableAnnotationStore.set = engineExport.set` AND `portableAnnotationStore.hashes = engineExport.hashes` | двусторонняя проверка по stableId и contentHash; waiver запрещён | NO-GO: any set или hash mismatch |
| G5: rehydration drill | новый engine instance проходит G1–G4 после воспроизведения binding create events и загрузки annotations | drill log с датой, результатом и engine version | NO-GO: любой из G1–G4 не выполняется на новом instance |
| G6: access-bypass test | `nativeAffinePrincipals = {proxy-service-id}` (singleton) | enumeration Affine principals; ни одного пользовательского credential | NO-GO: любой non-service principal обнаружен |
| G7: durable evidence | binding ledger и portableAnnotationStore имеют заполненное поле `durableEvidence` с датой drill и результатом; RPO ≤ 24h, RTO ≤ 4h, retention ≥ 7 лет | backup log + restore drill report | NO-GO: evidence пусто или drill не пройден |

---

### Annotation contract (финальный)

```
stableId:        UUID v4, назначается при создании, не изменяется при edit
versionScope:    canonical revision hash из M4 (SHA-256, hex)
authorPrincipal: Panel principal id (не Affine user)
bodyNormalized:  UTF-8; ключи объектов — алфавитный порядок; массивы — исходный порядок;
                 newline нормализован к \n; no trailing whitespace
contentHash:     SHA-256(bodyNormalized), hex
anchor:          { byteOffset: number, byteLength: number, structuralPath?: string }
                 — без предположений о preview segmentation
```

Round-trip: portable store → engine load → engine export → hash verify = contentHash. Несовпадение → NO-GO.

---

### Degraded mode (честный список)

**Остаётся доступным при недоступности Affine:**
- container boundary (M1)
- registry.jsonl, canonicalRef, lineage identity (M2)
- bytes, location.ref, revision history (M4)
- Panel authority, audit log, grants (M3)
- binding ledger (Panel-сторона, вне Affine)
- portable annotation store (Panel-сторона, вне Affine)

**Честно недоступно при недоступности Affine:**
- human browsing через Affine UI
- engine projection view (страницы движка)
- navigation tree в движке
- engine-side annotation display

**Запрещено:**
- fallback на Affine cache как источник истины
- объявление engine projection источником bytes
- обход Panel через прямой Affine доступ в degraded mode

---

## Список посылок

**Закрытые нормы M1–M4:**
- `static.mmbrn.tech` — контейнер канонических оригиналов; Affine — сменный движок под ним, не граница контейнера.
- Страница Affine — состояние движка, не канонический материал.
- `registry.jsonl` — единственный источник истины о регистрации, record/lineage identity и истории.
- `canonicalRef = "urn:mmbrn:static:" + rootId` — не URL, не storage key, не Affine id.
- Смена `location.ref` создаёт новую immutable M2 record в той же lineage; M5 не переопределяет M2.
- Panel — единственный авторизатор; Proxy проверяет каждое classifed action, версию и binding до Affine.
- Пользователь не получает native Affine role/token; статической таблицы Panel role → Affine role нет.
- Нативная роль Affine принадлежит только service identity; неизвестные action/object/identity/binding → deny.
- M4: FD-1/FD-2/FD-3; `location.kind=local`, `location.ref=static:{class}:{sha256_64hex}`; Affine не в storage truth.
- M1–M4 не выбирали API, transport, ingest/download workflow, preview/OCR, DNS, миграционный rollout.

**Измеренные факты (снимок, не таксономия):**
- Живой Affine: 82 страницы в Strategy/Templates/Releases, один участник, повторы, 57 PNG/SVG; корпуса чеков/PDF нет.
- Strategic publish заморожен; редактор строится в Panel; передачи Panel authority нет.
- M3 требовал binding `canonicalRef ↔ affineDocId`, не назначив владельца, форму, историю и переносимость.

**Нормы повестки M5:**
- Capability — ровно восемь actions из M3 над container/collection/lineage; annotation write disabled.
- `read-metadata` не возвращает ref; `read-ref` возвращает только ref; `write-metadata` → новая immutable M2 record; `upload-revision` → canonical revision; `manage-access` — owner-only, grants запрещены.
- Отсутствие, неоднозначность или stale binding → deny всех Affine actions.
- `requiredProjectionSet` назначается Panel независимо от Affine.
- Тройная биекция: `refs(activeLedger) = requiredProjectionSet`; `engineIds(activeLedger) = liveEngineObjectSet`; mapping взаимно однозначен.
- Binding — immutable event ledger; статус — reducer output; строка не мутирует.
- Durable owner binding ledger и portable annotation store — Panel-сторона; численные RPO/RTO/retention с evidence.
- Annotation contract: stableId, versionScope, authorPrincipal, bodyNormalized, contentHash, engine-neutral anchor.
- Gate 4: двустороннее set+hash equality; waiver запрещён.
- State labels совпадают с predicates; rehydration заново доказывает annotations и биекцию.
- `manage-access` — только owner; grants запрещены.
- Case 8: unknown/out-of-container → deny без вымышленного M2 record.
- DoD — последняя секция; carrier не закрывает ролевые пункты сам.

---

## Definition of Done

- [ ] Выбран один минимальный vendor-neutral контракт Affine
- [ ] Способности, классы состояния и binding описаны обязательными таблицами
- [ ] Источники истины M2/M4 и authority M3 не переданы Affine
- [ ] Значимое переносимое и допустимо disposable состояние разведены без скрытой потери
- [ ] Десять обязательных случаев имеют ожидаемое решение и вещдок
- [ ] Readiness gates машинно проверяемы и включают rehydration и access bypass
- [ ] M6–M7 и стратегический редактор не спроектированы
- [ ] Один carrier, один F1, список посылок до последней секции DoD
- [ ] Не меньше 36 ролевых реплик и не меньше шести от каждой роли
