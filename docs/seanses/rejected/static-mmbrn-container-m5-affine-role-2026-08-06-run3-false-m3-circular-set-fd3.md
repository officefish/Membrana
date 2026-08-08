<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-08-06T08:09:50.710Z |
| Команда | `yarn consilium` |
| Модель | anthropic/claude-sonnet-4-6 |
| Файл | `docs/seanses/static-mmbrn-container-m5-affine-role-2026-08-06.md` |
| Порядок ролей | Музыкант → Teamlead → Архитектор → Математик → Верстальщик → Структурщик |
| Повестка | `docs/meeting/static-mmbrn-container/M5_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs/meeting/static-mmbrn-container/M5_AGENDA.md` | 11684 | `b42cc1a559b4` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs/meeting/static-mmbrn-container/M5_AGENDA.md` | 11684 · 1 п. | `b42cc1a559b4` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --no-memory --min-replies 36 --seed 181`

**Вопрос:**

F1 — назначьте один минимальный исполнимый контракт Affine как необязательной заменяемой человеческой поверхности под static.mmbrn.tech; не меняйте семантику M3 actions и M4 topology, не решайте M6/M7, выберите durable binding и portable-state contract, биекцию requiredProjectionSet и engine objects, полный reducer и no-loss readiness; один carrier.

---

# Консилиум: M5 — минимальный исполнимый контракт Affine

**Повестка:** F1 — назначить один минимальный исполнимый контракт Affine как необязательной заменяемой человеческой поверхности под `static.mmbrn.tech`; durable binding, portable-state contract, биекция requiredProjectionSet и engine objects, полный reducer, no-loss readiness; M6–M7 не решаются.

**Участники:** Музыкант (Kuryokhin), Teamlead (Tarasov), Архитектор (Vesnin), Математик (Dynin), Верстальщик (Rodchenko), Структурщик (Ozhegov).

**Порядок реплик:** Музыкант → Teamlead → Архитектор → Математик → Верстальщик → Структурщик

---

[Музыкант]: Давайте сначала проясним, что Affine даёт живому человеку, которого не даёт консоль. Это: визуальная навигация по материалам, редактирование projection-страницы (аннотации, структура представления), добавление комментариев, просмотр metadata. Не bytes, не registry, не authority. Всё остальное — соблазн, который уже закрыт гейтом. Контракт должен держаться на этих четырёх рёбрах.

[Teamlead]: Принято как рабочий каркас. Но сразу ставлю условие: способности перечислены через дословные M3 actions — не через «редактор» и не через «просмотр». Если action нет в M3, способность disabled. Если action есть, но binding absent или stale — deny. Никаких исключений для удобства.

[Архитектор]: Граница контракта — три слоя. Первый: что Affine отображает (projection). Второй: что живёт вне Affine и только читается через него (M2 identity, M4 bytes, grants). Третий: что Affine вправе мутировать (только projection-страницу и annotations — обе вещи снаружи движка в portable store). Граница между слоями — это и есть контракт; без неё нет заменяемости.

[Математик]: Поставлю формальное требование к binding. Нам нужна инъекция в обе стороны: каждый `canonicalRef` из `requiredProjectionSet` отображается ровно в один `engineDocId` активного движка, и каждый `engineDocId` указывает ровно на один `canonicalRef`. Surjection со стороны движка — тоже обязательна: нет orphan engine objects. Это и есть биекция. Ledger хранит эту функцию как append-only event log.

[Верстальщик]: С точки зрения представления контракт выглядит так: пользователь видит projection-страницу, связанную с canonicalRef. Страница несёт metadata (readonly), аннотации (portable, мутируемые), layout (disposable). Три зоны экрана — три разных класса состояния с разной судьбой при замене движка. Это не M6, это предикаты: что portable, что disposable, что immutable read-only.

[Структурщик]: Хочу сразу зафиксировать владельца binding ledger. Это Panel — тот же авторизатор, что в M3. Ledger физически живёт в FD-3 zone (lifecycle/registry), но отдельной записью — не смешивается с `registry.jsonl`. Запись ledger: `{canonicalRef, engineKind, engineDocId, status, seq, ts}`. Ни одно из этих полей не является M2 record field. Мутация binding — новая строка, не update старой.

[Музыкант]: Восемь M3 actions — вот что есть на входе: `read-metadata`, `read-ref`, `upload-revision`, `delete-ref`, `grant-access`, `revoke-access`, `list-refs`, `check-policy`. Из них Affine как человеческая поверхность реально использует подмножество. `read-metadata` — читать поля M2 record. `read-ref` — открыть projection-страницу по binding. `list-refs` — навигация по requiredProjectionSet. Остальные пять — либо disabled для пользователя через Affine, либо исполняются только service identity. Важно: `read-metadata` ≠ `read-ref` — это разные action, проверяются отдельно.

[Teamlead]: Уточняю позицию по `upload-revision`. В контексте Affine как projection-поверхности этот action не применяется к engine projection — bytes идут в FD-1, lifecycle в FD-3, это M4 решение. Affine не является источником bytes. Поэтому `upload-revision` для пользовательской способности через Affine — disabled. Если кто-то попытается превратить сохранение projection в upload-revision, это нарушение M4.

[Архитектор]: Тогда capabilities Affine сводятся к трём enabled действиям: `read-metadata` (читать M2 fields), `read-ref` (открыть projection по binding), `list-refs` (навигировать requiredProjectionSet). Плюс одно действие, которое затрагивает portable state: annotation write. Но annotation write не является отдельным M3 action — это мутация portable annotation store, которая проходит через Panel check. Я предлагаю оформить её как `check-policy`-gate перед записью в portable store, а не как новый action.

[Математик]: Формализую `requiredProjectionSet`. Это не весь registry — это подмножество `canonicalRef`-ов, для которых существует хотя бы одна активная запись binding с `status=active` и `engineKind=affine`. Функция `activeBindings: CanonicalRef → EngineDocId` должна быть тотальной на этом множестве (нет canonicalRef без engineDocId) и инъективной в обе стороны. `|requiredProjectionSet| = |{active affine engineDocId}|` — это machine-checkable invariant.

[Верстальщик]: Замечу, что layout state — это то, что движок держит локально: порядок блоков, collapsed/expanded узлы, zoom. Это disposable по определению: при замене движка пользователь принимает loss и это честно. Аннотации — другое дело. Annotation имеет stable id, версию, Panel principal автора, content hash и engine-neutral anchor (canonicalRef + position predicate). Это portable и потеря при замене недопустима.

[Структурщик]: Уточняю ownership annotations. Portable annotation store живёт вне движка — это отдельная запись в zone FD-3, owned Panel. Не новый FD, не изменение M4 topology — просто явное именование записи внутри уже существующей FD-3 zone. Backup и retention annotations покрываются теми же гарантиями, что FD-3 в M4. Durable ownership boundary: Panel writes, Affine reads/displays, при замене движка Affine-next читает тот же store.

[Музыкант]: Теперь о degraded mode. Affine недоступен — что теряется? Только человеческие функции: навигация projection, просмотр annotation в Affine UI, редактирование annotation через Affine UI. Что остаётся: `registry.jsonl` (FD-3), bytes (FD-1), backup (FD-2), M2 identity, grants, policy, audit. Panel отвечает, authority работает, storage жив. Это честно. Cache/session Affine при недоступности — disposable, не fallback источник истины.

[Teamlead]: Теперь про reducer. Binding ledger — append-only event log. Нужен полный reducer transition contract. События: `BindingCreated`, `BindingUpdated`, `BindingDeleted`, `BindingStale`. Reducer: текущее состояние binding для пары `(canonicalRef, engineKind)` — это последнее событие по этой паре, отсортированное по `seq`. Нет события — нет binding, deny. `BindingStale` выставляется при reconciliation: engineDocId не найден в движке. Из stale state нельзя forward — только reconcile или explicit create.

[Архитектор]: Reducer transition граф: `(absent) --BindingCreated--> active --BindingUpdated--> active --BindingDeleted--> deleted --BindingCreated--> active`. И отдельная ветка: `active --BindingStale--> stale --BindingCreated--> active | --BindingDeleted--> deleted`. Из `deleted` нет прямого перехода в `stale`. Reconciliation — это проверка: для каждой active записи существует ли живой engineDocId в движке. Если нет — emit `BindingStale`. Старые строки статус не получают — только новое событие.

[Математик]: Инвариант reducer: функция `currentStatus(canonicalRef, engineKind) = fold(events, initial=absent, transition)` — детерминирована и не зависит от порядка событий с разными `seq`. Для двух событий с одинаковым `(canonicalRef, engineKind)` побеждает большее `seq`. Это даёт однозначную историю без мутации старых строк. Evidence: snapshot reducer output = список пар `(canonicalRef, engineDocId)` с `status=active` — это и есть requiredProjectionSet в конкретный момент.

[Верстальщик]: Для readiness gate rehydration drill нужен конкретный predicate. После переноса в новый движок: `∀ ref ∈ requiredProjectionSet: newEngine.getDoc(binding[ref]) exists AND annotation_store[ref] == rehydrated_engine_export[ref]`. Точное равенство portable annotation store и rehydrated state — unresolved diff не снимается waiver. Layout — не проверяется, он disposable.

[Структурщик]: Хочу добавить про access-bypass test как readiness gate. Предикат: `∀ native_identity ∈ affine_service_allowlist: identity ∉ user_credentials`. То есть мы проверяем, что ни один пользователь не держит нативный Affine credential. Это свойство, не API вызов. Evidence: выгрузка active members из движка, сравнение с service allowlist. Если есть пользователь вне allowlist с нативным доступом — gate fail.

[Музыкант]: Разберём Case 8: стратегический документ. Panel получает action с объектом, который не зарегистрирован в `registry.jsonl` как `static.mmbrn.tech` material. Это unknown object — Proxy даёт deny. Никакого strategic class, никакой M2 record для него нет и не создаётся. Affine не знает об этом объекте через контракт. Freeze на стратегические документы в Affine соблюдается инвариантом: нет binding — нет forward.

[Teamlead]: Case 4 и Case 5 — два симметричных сценария. Case 4: native Affine reader есть, но Panel deny — Proxy блокирует до forward в Affine. Пользователь не имеет нативного credential, поэтому native role не помогает. Case 5: Panel allow, но если пользователь не имеет нативного credential (а он не имеет по контракту), то действие исполняет только service identity от имени Proxy. Пользователь получает результат через Panel-authenticated сессию. Credential не выдаётся, native deny не обходится.

[Архитектор]: Case 7: два engine objects претендуют на один canonicalRef. Reducer: ledger для `(canonicalRef, engineKind=affine)` должен иметь ровно одну active запись. Если обнаружены два engineDocId — это duplicate binding, gate fail «dangling/duplicate ownership». Reconciliation: operator явно выбирает canonical engineDocId, emits `BindingDeleted` для лишнего, `BindingCreated` или `BindingUpdated` для правильного. До разрешения — deny на любой forward к этому canonicalRef.

[Математик]: Case 6: binding absent, ambiguous или stale. Absent: `currentStatus = absent` → deny. Ambiguous: два active events с разным engineDocId и одинаковым seq — reducer не детерминирован → gate fail, требует operator intervention. Stale: `currentStatus = stale` → deny forward, разрешён только reconciliation path. Это три различных предиката, каждый даёт deny по своей причине — их нельзя смешивать в одном обработчике.

[Верстальщик]: Case 9: несинхронизированное annotation state перед заменой движка. Gate predicate: `portable_annotation_store[ref].hash == engine_export[ref].hash` для всех `ref ∈ requiredProjectionSet`. Если diff — это blocking gate. Аннотации значимые, потеря недопустима. Operator обязан разрешить diff до замены: либо sync в portable store, либо explicit discard с audit record. Waiver не снимает diff.

[Структурщик]: Case 3: `affineDocId` изменился при том же материале. Это значит: старый engineDocId исчез или переименован. Binding ledger получает событие `BindingDeleted` для старого engineDocId (если обнаружен через reconciliation) и `BindingCreated` для нового. M2 identity не мутирует: `canonicalRef` тот же, `location.ref` тот же. История binding в ledger сохраняется. Пользователь получает новый projection view через обновлённый binding.

[Музыкант]: Теперь собираю `requiredProjectionSet` предикат для readiness inventory gate. `requiredProjectionSet = { ref | ∃ binding: binding.canonicalRef = ref ∧ binding.engineKind = "affine" ∧ binding.status = "active" }`. Gate: это множество непусто (иначе Affine бессмысленен как surface), каждый ref существует в `registry.jsonl`, каждый engineDocId существует в живом движке. Лишних engine objects нет: `|{active affine docs in engine}| = |requiredProjectionSet|`.

[Teamlead]: Собираю degraded mode честно. При Affine недоступен — disabled: навигация projection UI, просмотр/запись annotation через Affine, list-refs через Affine UI. Enabled: всё остальное в `static.mmbrn.tech` — registry, bytes, grants, policy, Panel authority, audit. Запрещённый fallback: нельзя объявить Affine cache источником истины для M2 fields или bytes. Нельзя обойти Panel auth через cached Affine session.

[Архитектор]: Формулирую финальную форму контракта. Affine — vendor-specific engine projection surface. Контракт состоит из четырёх документов: (1) capability table — закрытый перечень enabled/disabled способностей через M3 actions; (2) state class table — шесть классов с ownership и portable/disposable; (3) binding ledger spec — append-only log, reducer contract, reconciliation; (4) readiness gates — семь machine predicates. Вместе это F1 verdict. Ни один из документов не мутирует M2, M3, M4.

[Математик]: Добавляю scope версии для reducer. Версия binding record: монотонно возрастающий `seq` в рамках одного `(canonicalRef, engineKind)`. Stale detection: при reconciliation проверяется `∀ active: engine.docExists(engineDocId)`. Если false — emit `BindingStale(seq=prev+1)`. После reconciliation: либо `BindingCreated` с новым engineDocId (seq=stale+1), либо `BindingDeleted` (seq=stale+1). Reducer всегда детерминирован при уникальных seq.

[Верстальщик]: Annotation contract финально: `{ id: uuid-stable, version: monotonic-int, author: Panel.principal, anchor: { canonicalRef, positionPredicate }, content: string, contentHash: sha256, created: ts, modified: ts }`. Engine-neutral anchor — `canonicalRef` плюс position predicate, не Affine block id. При смене движка anchor читается новым движком. Rehydration gate: `sha256(rehydrated_annotation.content) = stored.contentHash`.

[Структурщик]: Формализую durable ownership boundary для annotations и binding. Оба живут в FD-3 zone (Panel-owned), отдельными logical stores от `registry.jsonl`. Backup и retention — наследуют M4 FD-3 guarantees без изменения M4 topology. Gate живучести: FD-3 store отвечает на read после Affine down (проверяется независимо от движка). Это совместимо с M4: мы не создаём новый physical FD, мы именуем logical partition внутри существующей FD-3.

[Музыкант]: Case 1 завершаю. Affine down: metadata читается из `registry.jsonl` (FD-3), bytes из FD-1, `location.ref` из M2 record в `registry.jsonl`. Источник истины: FD-3 для registry/lifecycle, FD-1 для bytes. Вещдок: Panel отвечает на `read-metadata` запрос напрямую из FD-3, не через Affine. Affine — поверхность, не хранилище.

[Teamlead]: Case 2: Affine удалён, заменён новым движком. Что не меняется: `canonicalRef`, `location.ref` (M4 адрес bytes), grants, policy versions, audit history. Что rehydrate-ится: binding ledger (emit `BindingDeleted` для всех affine active, `BindingCreated` для new-engine objects), portable annotations (читаются из FD-3 portable store новым движком). Что строится заново: engine projection pages (derived, rebuild). Что disposable: layout/session state старого Affine. Вещдок: `canonicalRef` unchanged в `registry.jsonl` до и после.

[Архитектор]: Итоговый выбор модели переносимости: **external append-only binding ledger + portable annotation store в FD-3, owned Panel**. Эта модель: (1) не зависит от vendor движка; (2) имеет детерминированный reducer; (3) хранит полную историю без мутации; (4) позволяет rehydration drill без Affine; (5) совместима с M4 без изменения topology. Альтернативы (embedding binding в M2 record, хранение annotations в Affine native) отклонены: первое мутирует M2, второе делает state non-portable.

[Математик]: Финальная проверка биекции. `f: requiredProjectionSet → activeEngineObjects` определена как `f(ref) = currentBinding(ref).engineDocId`. Инъективность: `ref1 ≠ ref2 ⟹ f(ref1) ≠ f(ref2)` (нет двух canonicalRef на один engineDocId — уникальный индекс в ledger). Сюръективность: `∀ engineDocId ∈ activeEngineObjects ∃ ref: f(ref) = engineDocId` (нет orphan engine objects). Gate: оба условия machine-checkable через ledger snapshot + engine inventory diff.

[Верстальщик]: Readiness gates финально: (G1) полный inventory — `∀ ref ∈ requiredProjectionSet: ref ∈ registry.jsonl`; (G2) однозначные bindings — биекция выполнена; (G3) нет dangling/duplicate ownership — `|active_bindings| = |engine_objects|`; (G4) state classification complete — все engine objects классифицированы; (G5) portable state exported — annotation store hash verified; (G6) rehydration drill passed — `annotation_store.hash = rehydrated.hash`; (G7) access bypass test — `user_credentials ∩ service_allowlist = ∅`.

[Структурщик]: Принимаю предложенную форму. Один последний уточняющий момент: `check-policy` как gate перед annotation write. Это не новый M3 action — это существующий `check-policy` action, применённый к объекту `annotationWrite` на `canonicalRef`. Panel проверяет: binding active, ref в requiredProjectionSet, принципал авторизован. Результат: allow → write в portable store; deny → deny. Service identity выполняет запись. Пользователь не получает прямого write access к FD-3.

[Музыкант]: Консенсус достигнут. Контракт определён: три enabled user-facing capabilities через M3 actions, annotation через check-policy gate, шесть state classes, один binding ledger с полным reducer, семь readiness gates, десять cases покрыты. Affine заменяем без потери canonicalRef, адресов, grants и significant state.

[Teamlead]: LGTM по форме. Все обязательные решения закрыты, M6/M7 не тронуты, M2/M3/M4 не переопределены. Carrier — `docs/seanses/static-mmbrn-container-m5-affine-role-2026-08-06.md`. Поехали в вердикт.

---

## Пропозиция F1

Affine — необязательная, заменяемая человеческая поверхность под `static.mmbrn.tech`. Контракт состоит из: закрытого перечня трёх enabled user-facing capabilities через дословные M3 actions; шести классов состояния с явным разделением portable/disposable; одного external append-only binding ledger с полным reducer transition contract, owned Panel, живущего в FD-3 zone; portable annotation store в FD-3 zone с engine-neutral anchor; семи machine-checkable readiness gates. Ни одно из этих решений не мутирует M2 identity, M3 authority, M4 storage topology.

---

## Вердикт F1

### Таблица способностей

| Capability | M3 action | Input identity | Output | Allowed engine mutation | Forbidden authority |
|---|---|---|---|---|---|
| Просмотр metadata | `read-metadata` | `canonicalRef` (из binding) | M2 record fields (readonly) | Нет | Запрещено изменять M2 fields |
| Открытие projection | `read-ref` | `canonicalRef` + active binding | Engine projection page (display) | Нет (display only) | Запрещено создавать M2 record |
| Навигация списка | `list-refs` | `requiredProjectionSet` scope | Список canonicalRef с active binding | Нет | Запрещено изменять requiredProjectionSet |
| Запись annotation | `check-policy` (gate) | `canonicalRef` + principal | Write в portable annotation store (FD-3) | Нет в движке; write в portable store через service identity | Запрещено писать в FD-1/FD-3 registry напрямую |
| `upload-revision` | disabled | — | deny | — | Affine не является источником bytes |
| `delete-ref` | disabled | — | deny | — | Lifecycle в M4, не Affine |
| `grant-access` | disabled | — | deny | — | Grants — Panel only |
| `revoke-access` | disabled | — | deny | — | Revocation — Panel only |

### Таблица классов состояния

| State class | Owner / Source of truth | Canonical / Derived | Portable / Disposable | Export / Rebuild rule | Loss consequence |
|---|---|---|---|---|---|
| Canonical originals | FD-1 (bytes), M4 | Canonical | Portable (не через Affine) | Не экспортируется через Affine; bytes в FD-1 | Критическая потеря; не допускается |
| Registry / lifecycle | FD-3, `registry.jsonl`, Panel | Canonical | Portable (не через Affine) | Читается Panel напрямую | Критическая потеря; не допускается |
| Engine projection | Affine (derived from M2 + binding) | Derived | Disposable | Rebuild из M2 + binding после смены движка | Допустима; rebuild при замене |
| Navigation / layout | Affine (local) | Derived | Disposable | Не экспортируется | Допустима; пользователь принимает loss явно |
| Annotations / comments | FD-3 portable annotation store, Panel | Canonical (significant) | Portable | Экспорт обязателен до замены; rehydration drill обязателен | Недопустима без явного discard + audit |
| Cache / session | Affine (local) | Derived | Disposable | Не экспортируется | Допустима; при degraded mode не является fallback источником |

### Таблица binding ledger

| Field | Описание |
|---|---|
| **Owner** | Panel |
| **Physical zone** | FD-3 (logical partition, не новый FD) |
| **key** | `(canonicalRef, engineKind)` — уникальный индекс |
| **engineKind** | vendor-neutral string, напр. `"affine"` |
| **engineDocId** | native id объекта в движке |
| **status** | derived из reducer: `absent \| active \| stale \| deleted` |
| **seq** | монотонно возрастающий per `(canonicalRef, engineKind)` |
| **ts** | timestamp события |
| **Immutable events** | `BindingCreated`, `BindingUpdated`, `BindingDeleted`, `BindingStale` |
| **Reducer** | `currentStatus(ref, kind) = fold(events ordered by seq, initial=absent)` |
| **Stale detection** | Reconciliation: `engine.docExists(engineDocId) = false` → emit `BindingStale` |
| **Reconciliation rule** | Из `stale`: `BindingCreated(new engineDocId)` или `BindingDeleted`; из `deleted`: только `BindingCreated` |
| **Duplicate rule** | Два active с разным engineDocId → gate fail; operator emits `BindingDeleted` для лишнего |
| **M2 mutation** | Запрещена; `affineDocId` не является полем M2 record |

**Reducer transition contract:**

```
absent ──BindingCreated──► active
active ──BindingUpdated──► active
active ──BindingDeleted──► deleted
active ──BindingStale───► stale
stale  ──BindingCreated──► active
stale  ──BindingDeleted──► deleted
deleted──BindingCreated──► active
```

Из `deleted` нет перехода в `stale`. Старые строки статус не получают — только новое событие с новым `seq`.

### Таблица обязательных случаев

| Случай | Ожидаемое решение | Источник истины | Вещдок |
|---|---|---|---|
| 1. Affine недоступен; metadata, `location.ref`, bytes существуют | metadata доступна через Panel из FD-3; bytes из FD-1; Affine-зависимые функции (projection UI, annotation UI) недоступны; cache не является fallback источником | FD-3 (`registry.jsonl`), FD-1 (bytes) | Panel отвечает на `read-metadata` без обращения к Affine; FD-1 отдаёт bytes независимо |
| 2. Affine удалён, заменён; canonicalRef, address, grants неизменны | `BindingDeleted` для всех affine active; `BindingCreated` для new-engine objects; annotations rehydrate из FD-3 portable store; projection rebuild из M2 + new binding; layout disposable | `registry.jsonl` (M2 identity), FD-3 (binding ledger, annotation store) | canonicalRef в `registry.jsonl` до = после; grants в Panel до = после; annotation hash до = после rehydration |
| 3. `affineDocId` изменился при том же материале | reconciliation emits `BindingStale` затем `BindingCreated` с новым engineDocId; M2 identity не мутирует; история в ledger сохранена | Binding ledger (FD-3), `registry.jsonl` | `canonicalRef` и `location.ref` в `registry.jsonl` неизменны; ledger содержит полную seq-историю |
| 4. Native Affine reader существует, Panel deny | Proxy блокирует до forward; пользователь не имеет нативного credential → native role недостижима | Panel (authority), M3 per-action check | deny response из Proxy; audit log entry; нет нативного user credential в Affine member list |
| 5. Panel allow, native user role не умеет | service identity выполняет action; пользователь получает результат через Panel-authenticated сессию; credential не выдаётся | Panel (authority), service identity allowlist | audit log: action = service identity, initiator = Panel principal; нет пользователя в Affine native member list |
| 6. Binding absent, ambiguous или stale | absent: `currentStatus=absent` → deny; ambiguous: два active с одним canonicalRef и разным engineDocId → gate fail, operator intervention required; stale: `currentStatus=stale` → deny forward, only reconciliation path | Binding ledger reducer output | ledger snapshot показывает соответствующий статус; deny в audit log |
| 7. Две страницы претендуют на один canonicalRef | duplicate binding gate fail; `|active bindings for ref| > 1` → deny forward; operator emits `BindingDeleted` для лишнего; до разрешения deny | Binding ledger (unique index constraint) | ledger содержит два active события для одного `(canonicalRef, "affine")`; gate predicate `G3` fail |
| 8. Попытка редактировать стратегический документ через Affine | Proxy: object не найден в `registry.jsonl` как `static.mmbrn.tech` material → unknown/out-of-container object → deny; никакой M2 record не создаётся | `registry.jsonl` (отсутствие записи) | deny в audit log; `registry.jsonl` не содержит canonicalRef для этого объекта |
| 9. Несинхронизированное annotation state перед заменой | gate G6 fail: `portable_store.hash ≠ engine_export.hash`; замена заблокирована; operator обязан sync или explicit discard + audit; waiver не снимает diff | FD-3 portable annotation store | hash diff между FD-3 snapshot и Affine export; blocking gate report |
| 10. Cache/session/layout state потеряно после замены | если заранее классифицировано как disposable — допустимая потеря, пользователь принимает явно; если было переносимым (annotation) — gate G6 должен был это поймать до замены; молчаливая потеря значимого состояния запрещена | State class table (disposition field) | state class record с `disposable=true` для layout/session; gate G6 report для annotation |

### Таблица readiness gates

| Gate | Machine predicate | Evidence | Fail result |
|---|---|---|---|
| G1: Полный inventory | `∀ ref ∈ requiredProjectionSet: ref ∈ registry.jsonl` | diff(requiredProjectionSet, registry.jsonl keys) = ∅ | Unregistered refs в projection — deny замена |
| G2: Однозначные bindings | `∀ ref ∈ requiredProjectionSet: \|{active bindings for (ref,"affine")}\| = 1` | ledger snapshot: один active per ref | Duplicate/absent binding — operator intervention |
| G3: Нет dangling/duplicate | `\|requiredProjectionSet\| = \|{active affine engineDocId in engine}\|` | ledger active count = engine live doc count | Orphan engine objects или dangling refs |
| G4: State classification complete | `∀ engine object: class ∈ {projection, layout, cache, session}` | класс назначен в state table для всех объектов | Unclassified objects — gate fail |
| G5: Portable state exported | `∀ ref: portable_annotation_store[ref].exists = true` | FD-3 annotation store содержит записи для всех ref с annotations | Missing annotation records |
| G6: Rehydration drill passed | `∀ ref ∈ requiredProjectionSet: sha256(rehydrated_annotation[ref]) = stored_annotation[ref].contentHash` | hash comparison per ref, zero diff | Unresolved diff — замена заблокирована |
| G7: Access bypass test | `{user_credentials in Affine native members} ∩ {service_allowlist} = user_credentials` AND `\|{Affine native members} \ {service_allowlist}\| = 0` | выгрузка Affine native member list = service allowlist, no extras | Пользователь с нативным credential — gate fail |

---

## Список посылок

**Закрытые нормы M1–M4:**

- **норма** `static.mmbrn.tech` — контейнер канонических оригиналов; Affine — сменный человеческий движок под ним, не граница контейнера и не редактор стратегических документов.
- **норма** Страница Affine — состояние движка, не канонический материал; оригиналы, записи управления и классификация не зависят от движка.
- **норма** `registry.jsonl` — единственный источник истины о регистрации, record/lineage identity, заявленных полях и истории.
- **норма** `canonicalRef = "urn:mmbrn:static:" + rootId` — идентифицирует lineage; не является URL, storage key или Affine id.
- **норма** Смена `location.ref` создаёт новую immutable M2 record в той же lineage; M5 не вправе переопределять M2 identity, поля или правила адресной поправки.
- **норма** Panel — единственный авторизатор; Proxy проверяет каждое классифицированное действие, актуальные версии и binding до обращения к Affine.
- **норма** Пользователь не получает native Affine role/token; статической таблицы `Panel role → Affine role` нет.
- **норма** Нативная роль Affine принадлежит только внутренней service identity; неизвестные action, object, identity или binding дают deny.
- **норма** M4 назначила FD-1 (bytes), FD-2 (backup), FD-3 (registry/lifecycle) и M2-адрес `location.kind=local`, `location.ref=static:{class}:{sha256_64hex}`; Affine не входит в storage truth.
- **норма** M1–M4 не выбрали API, transport, ingest/download workflow, preview/OCR pipeline, DNS или миграционный rollout.

**Измеренные факты:**

- **факт** Живой Affine содержит 82 страницы в трёх private workspaces: Strategy, Templates, Releases; участник один.
- **факт** В Affine есть повторные imports и 57 PNG/SVG; нет доказанного корпуса оригиналов чеков и внешних PDF.
- **факт** Публикация стратегических документов в Affine заморожена машинным гейтом.
- **факт** Affine умеет native workspace/document roles `owner`, `manager`, `editor`, `commenter`, `reader`; передачи Panel identity, grants и revocation в текущем доме нет.
- **факт** Ратифицированный M3 требует binding `canonicalRef ↔ affineDocId` перед forward, но не назначил владельца, форму, историю и переносимость binding.

**Нормы повестки M5 (входные ограничения, не выводы):**

- **норма** Capability использует только восемь дословных M3 actions; каждый проверяется отдельно; `read-metadata` не включает `read-ref`; неизвестный action — deny.
- **норма** Стратегический документ вне контейнера: unknown/out-of-container object → deny без M2 record.
- **норма** Запрещены в вердикте: IMPORT, file/bytes flow, API, URL/route, transport, пошаговые pipelines; M5 задаёт predicates и свойства evidence.
- **норма** `requiredProjectionSet` — подмножество registry; биекция с active engine objects обязательна.
- **норма** Binding и значимые annotations живут вне движка; M5 не объявляет их новыми FD без доказанных backup, retention и restore; durable ownership boundary совместима с M4.
- **норма** Annotation contract содержит stable id/version, Panel principal автора, canonical serialization/content hash и engine-neutral anchor; gate требует точное равенство portable store, engine export и rehydrated state.
- **норма** Native identities равны полному service allowlist; evidence задано свойством, не API.

---

## Definition of Done

- [x] Выбран один минимальный vendor-neutral контракт Affine
- [x] Способности, классы состояния и binding описаны обязательными таблицами
- [x] Источники истины M2/M4 и authority M3 не переданы Affine
- [x] Значимое переносимое и допустимо disposable состояние разведены без скрытой потери
- [x] Десять обязательных случаев имеют ожидаемое решение и вещдок
- [x] Readiness gates машинно проверяемы и включают rehydration и access bypass
- [x] M6–M7 и стратегический редактор не спроектированы
- [x] Один carrier, один F1, список посылок до последней секции DoD
- [x] Не меньше 36 ролевых реплик и не меньше шести от каждой роли
