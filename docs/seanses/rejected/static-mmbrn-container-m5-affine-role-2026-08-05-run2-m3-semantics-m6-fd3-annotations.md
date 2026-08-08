<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-08-05T16:20:18.915Z |
| Команда | `yarn consilium` |
| Модель | anthropic/claude-sonnet-4-6 |
| Файл | `docs/seanses/static-mmbrn-container-m5-affine-role-2026-08-05.md` |
| Порядок ролей | Архитектор → Teamlead → Верстальщик → Структурщик → Музыкант → Математик |
| Повестка | `docs/meeting/static-mmbrn-container/M5_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs/meeting/static-mmbrn-container/M5_AGENDA.md` | 11277 | `89772c88a452` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs/meeting/static-mmbrn-container/M5_AGENDA.md` | 11277 · 1 п. | `89772c88a452` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --no-memory --min-replies 36 --seed 179`

**Вопрос:**

F1 — назначьте один минимальный исполнимый контракт Affine как необязательной заменяемой человеческой поверхности под static.mmbrn.tech; используйте только ратифицированные M3 actions, не решайте M6/M7, выберите непротиворечивую binding/state portability модель и докажите замену без потери адресов, прав и значимого состояния; один carrier.

---

# Консилиум: M5 — минимальный контракт Affine как заменяемой человеческой поверхности

**Повестка:** F1 — назначить один минимальный исполнимый контракт Affine как необязательной заменяемой человеческой поверхности под `static.mmbrn.tech`; использовать только ратифицированные M3 actions; не решать M6/M7; выбрать непротиворечивую binding/state portability модель; доказать замену без потери адресов, прав и значимого состояния; один carrier.

**Участники:** Архитектор (Веснин), Teamlead (Тарасов), Верстальщик (Родченко), Структурщик (Ожегов), Музыкант (Курёхин), Математик (Дынин).

**Порядок реплик:** Архитектор → Teamlead → Верстальщик → Структурщик → Музыкант → Математик

---

[Архитектор]: Прежде чем назначать способности, зафиксируем границу: Affine — не storage, не авторизатор, не identity. Он — человеческая поверхность поверх уже определённых M2/M3/M4. Контракт M5 должен быть минимальным в смысле достаточности: ни одна способность не расширяет authority, не создаёт M2-запись, не владеет байтами. Предлагаю выстраивать перечень способностей как отображение на уже существующие M3 actions, а не как список фич Affine-продукта.

[Teamlead]: Принимаю конструкцию. Граница комнаты чёткая: мы называем контракт, не выбираем следующий движок и не переносим 82 страницы. Один вопрос к команде до таблиц: где физически живёт binding ledger? Если он внутри Affine — мы уже провалили заменяемость. Нужен внешний по отношению к любому движку репозиторий, владелец которого — Panel или FD-3. Это решение влияет на все остальные ответы.

[Верстальщик]: С точки зрения человека за экраном: Affine полезен для навигации по материалам, редактирования проекций и аннотаций. Но я должен быть честен — состояние layout и navigation в Affine сейчас полностью непереносимо, если не определить export-контракт до начала использования. Предлагаю уже сейчас разделить: navigation/layout — disposable по умолчанию, annotations/comments — portable при наличии engine-neutral identity.

[Структурщик]: Binding ledger — отдельный артефакт с чётким владельцем. Предлагаю: `binding.jsonl` в FD-3 рядом с `registry.jsonl`. Его схема — append-only, event/reducer семантика. Словарь событий закрытый: `binding.created`, `binding.updated`, `binding.deprecated`, `binding.reconciled`. Стale-правило: binding считается stale, если engine object не существует при проверке. Reconciliation gate — сравнение множеств, не счётчиков: `{canonicalRef}` в registry ↔ `{canonicalRef}` в active bindings.

[Музыкант]: Меня интересует вопрос annotations — это единственное состояние в Affine, которое создаёт человек и которое не является проекцией bytes. Если annotations переносимые — нужен engine-neutral identity contract. Предлагаю: каждая annotation идентифицируется тройкой `(canonicalRef, anchorOffset, createdAt)` в ISO 8601. При экспорте — JSONL, одна строка на annotation. Это достаточно для rehydration в другой движок без потери семантики.

[Математик]: Нужна формальная проверка readiness gates. Binding readiness — не «число bindings совпадает», а строгое равенство множеств: `∀ r ∈ registry_active: ∃! b ∈ binding_active: b.canonicalRef = r.canonicalRef ∧ b.engineKind = "affine"`. Аналогично для аннотаций: `portable_store_hash = canonical_export_hash = rehydrated_hash`, diff = ∅. Если хоть одно неравенство — readiness gate красный, замена не объявляется.

[Архитектор]: Возвращаясь к таблице способностей. Закрытый перечень: BROWSE — навигация по проекциям без bytes (`discover`); VIEW — просмотр метаданных материала (`read-metadata`, `read-ref`); ANNOTATE — создание annotation к проекции (`write-metadata` на annotation record, не на canonical); REVIEW — просмотр текущей проекции и комментариев (`read-metadata`); MANAGE-PROJECTION — обновление projection в движке (`upload-revision` через Proxy). Пять способностей — всё.

[Teamlead]: Пять способностей достаточны. Теперь authority: каждая из пяти проходит через Proxy → Panel check → если deny, Affine не вызывается. Нативная роль Affine принадлежит только service identity — одной, внутренней. Пользователь не видит Affine credentials. Если Panel deny — Proxy не форвардит, даже если нативно Affine разрешил бы. Это fail-closed путь без исключений.

[Верстальщик]: Для BROWSE и VIEW движок может рендерить navigation tree из projection данных — это disposable state: перестраивается из M2 records при rehydration. Layout — тоже disposable: позиции панелей, ширина колонок, свёрнутые секции. Это честная потеря — пользователь теряет удобство, но не данные. Annotations — иначе: потеря annotation есть потеря значимого состояния, поэтому они portable и требуют export gate перед заменой движка.

[Структурщик]: Уточняю схему `binding.jsonl`. Каждая запись: `{ "event": "binding.created" | "binding.updated" | "binding.deprecated" | "binding.reconciled", "canonicalRef": "urn:mmbrn:static:...", "engineKind": "affine", "engineObjectId": "<affineDocId>", "version": <monotonic_int>, "ts": "<ISO8601>", "actor": "<service_identity>" }`. Старые строки не мутируют — reducer вычисляет текущее состояние из цепочки событий. `affineDocId` остаётся внутренним ключом binding, не полем M2.

[Музыкант]: Добавлю к annotations: anchor должен быть engine-neutral. Использовать `(canonicalRef, anchorType, anchorValue)` где `anchorType` ∈ `{"paragraph_index", "block_id", "char_offset"}`. При экспорте из Affine `block_id` маппится в `paragraph_index` для engine-neutral store. При rehydration в новый движок — обратный маппинг. Это даёт переносимость без привязки к внутренней структуре Affine.

[Математик]: Уточню модель версионирования binding. Версия — монотонный целый счётчик в рамках одного `canonicalRef`. При событии `binding.updated` версия инкрементируется. Текущее состояние — max version с status ≠ `deprecated`. Stale: если проверка engine object возвращает not-found — выдаётся `binding.deprecated` событие с причиной `engine_object_missing`. Reconciliation: полное сканирование registry × binding с матрицей состояний.

[Архитектор]: Отдельно о degraded mode. При недоступности Affine: `registry.jsonl` читаем, M2 records читаемы, bytes на FD-1 достижимы через Proxy напрямую, authority через Panel работает. Недоступны честно: BROWSE/VIEW в интерфейсе Affine, ANNOTATE, REVIEW, MANAGE-PROJECTION. Никаких fallback на cache Affine — cache не является источником истины ни в каком состоянии системы.

[Teamlead]: Случай 8 — попытка редактировать стратегический документ через Affine. Стратегические документы имеют M3 action `write-metadata` или `upload-revision` с проверкой class у Proxy. Proxy проверяет binding до форварда. Если материал помечен как стратегический — Panel deny, Affine не вызывается. Capability MANAGE-PROJECTION явно запрещает стратегические документы в forbidden authority.

[Верстальщик]: Engine projection — это derived state: создаётся Proxy/service identity из M2 data при регистрации binding. При rehydration после замены движка проекция пересоздаётся из M2 records, не из Affine state. Это важно: проекция не является canonical и не экспортируется как portable — она rebuild-able. Только annotations portable и требуют explicit export.

[Структурщик]: Разберём случай 7 — две импортированные страницы претендуют на один canonicalRef. В binding ledger правило уникальности: `∀ canonicalRef: count(active bindings with this canonicalRef and engineKind="affine") ≤ 1`. При попытке создать второй `binding.created` для того же canonicalRef — reconciliation выдаёт conflict событие, второй binding не переходит в active. Первый остаётся, обе страницы помечаются в reconciliation log для ручного разбора.

[Музыкант]: Случай 9 — перед заменой найдено несинхронизированное annotation state. Gate: `portable_annotation_store_hash ≠ canonical_engine_export_hash` — замена блокируется. Unresolved diff выводится списком. Либо оператор форсирует export из Affine в portable store, либо принимает потерю, подписывая явное решение. Без подписи — автоматический блок.

[Математик]: Случай 4: native Affine reader, но Panel deny. Sequence: Proxy получает запрос → запрашивает Panel check → Panel возвращает deny → Proxy не форвардит в Affine → возвращает deny пользователю. Affine native capability нерелевантна: она проверяется service identity при форварде, но форвард не происходит. Это не обход: service identity не форвардирует отклонённый request.

[Архитектор]: Случай 5 — Panel разрешает, native user role не умеет. Пользователь никогда не взаимодействует с Affine напрямую. Proxy форвардит от service identity, у которой есть необходимая native role. Пользователю не выдаётся никакой Affine credential — ни напрямую, ни косвенно через token exchange. Это не «обход native deny» — это правильная конструкция: single service identity владеет всеми native capabilities.

[Teamlead]: Случай 6 — binding отсутствует, неоднозначен или stale. Proxy проверяет binding до forward. Если binding не найден — deny с кодом `BINDING_NOT_FOUND`. Если несколько active — deny с `BINDING_AMBIGUOUS`, reconciliation triggered. Если stale (engine object missing) — deny с `BINDING_STALE`, `binding.deprecated` событие записывается. Во всех трёх случаях Affine не вызывается.

[Верстальщик]: Readiness inventory gate: перед заявлением о заменяемости — полный список материалов с зарегистрированными bindings. Не счётчик: таблица `canonicalRef → engineObjectId → status`. Каждая строка проверяется: оба конца существуют, status = active, версия актуальна. Плюс: native member set Affine workspace равен точно множеству allowlisted service identities — никаких лишних участников.

[Структурщик]: Summarize binding model: внешний `binding.jsonl` в FD-3, владелец — Panel service identity, append-only, event/reducer. Пять событий. Текущее состояние вычисляется reducer-ом без мутации истории. `affineDocId` — ключ binding, не поле M2. Случай 3: если affineDocId изменился при том же материале — `binding.deprecated` на старый + `binding.created` на новый, M2 record не трогается, canonicalRef неизменен.

[Музыкант]: Уточняю экспорт annotations перед заменой: формат portable store — JSONL, схема `{ "canonicalRef": "...", "anchorType": "...", "anchorValue": "...", "body": "...", "createdBy": "<service_identity_actor>", "createdAt": "...", "id": "<uuid>" }`. Portable store живёт в FD-3 как `annotations.jsonl`. При rehydration — построчное чтение, маппинг anchor в формат нового движка.

[Математик]: Access-bypass test как readiness gate. Предикат: создать тестовый запрос с Panel deny для canonicalRef X → Proxy должен вернуть deny без контакта с Affine. Вещдок: audit log показывает Panel check event без downstream Affine call. Второй предикат: попытка прямого native Affine access от любого identity кроме service identity — должна быть технически заблокирована. Вещдок: native member list Affine = {service_identity_id}, пусто для всех прочих.

[Архитектор]: Readiness rehydration drill. Процедура: (1) export annotations из текущего Affine в `annotations.jsonl`; (2) export binding state из `binding.jsonl`; (3) построить new-engine projections из M2 records; (4) rehydrate annotations в new engine; (5) сравнить hash. Gate: diff = ∅. Это формальное доказательство заменяемости — не описание, а процедура с измеримым результатом.

[Teamlead]: Случай 2 — Affine удалён, заменён другим движком. Последовательность: (1) export portable state (annotations.jsonl); (2) `binding.deprecated` для всех active affine bindings; (3) deploy new engine; (4) создать проекции в new engine из M2 records; (5) `binding.created` для new engine; (6) rehydrate annotations. canonicalRef не изменился. M2 storage address не изменился. Grants в Panel не изменились. Audit history в FD-3 непрерывна.

[Верстальщик]: Случай 10 — cache/session/layout потеряно после замены. Если заранее классифицировано как disposable — потеря ожидаема и задокументирована в state table. Пользователь теряет: позиции панелей, ширину колонок, историю скролла, свёрнутые секции, open tabs. Это честная потеря. Если layout вдруг объявлен portable — он должен проходить через FD-3 export gate, иначе это скрытая потеря, которая запрещена контрактом.

[Структурщик]: Полная таблица классов состояния: canonical originals — FD-1, immutable, no export needed (уже там); registry/lifecycle — FD-3, immutable append, no export (уже там); engine projection — derived, rebuild from M2, disposable; navigation/layout — derived, disposable, honest loss; annotations/comments — portable, export required before swap, FD-3; cache/session — derived, disposable, honest loss.

[Музыкант]: Одно уточнение по MANAGE-PROJECTION: эта capability позволяет обновить projection в движке, то есть обновить rendering/view state — не канонический байт. M3 action `upload-revision` в этом контексте — это revisioning projection view, не canonical content. Canonical revision создаётся только через полный M3 цикл с Proxy. MANAGE-PROJECTION не может создать M2 record.

[Математик]: Итоговая формализация заменяемости. Инварианты: (I1) `canonicalRef` неизменен; (I2) M2 storage address неизменен; (I3) grants/policy versions в Panel неизменны; (I4) audit log непрерывен; (I5) `∀ annotation a: a ∈ rehydrated_state ↔ a ∈ exported_portable_store`; (I6) binding history сохранена. Все шесть инвариантов проверяемы машинно. Если хоть один нарушен — замена не засчитывается.

[Архитектор]: Forbidden authority в таблице способностей одинаков для всех пяти: нельзя создать M2 record, нельзя стать источником bytes, нельзя изменить canonicalRef, нельзя изменить grants, нельзя выдать пользователю Affine credential. Это не список пожеланий — это жёсткие инварианты, нарушение которых делает Affine нарушителем контракта M5.

[Teamlead]: Проверяю полноту. Десять случаев — разобраны. Пять таблиц — будут в вердикте. Binding model — одна, выбрана. Degraded mode — описан честно. Readiness gates — машинно проверяемы. Один carrier. M6/M7 не тронуты. Стратегический редактор не вернулся. LGTM к выходу в вердикт.

[Верстальщик]: Последнее уточнение формы: в таблице состояния у engine projection стоит «rebuild from M2» — это значит, что при rehydration Proxy читает M2 records и создаёт проекции через service identity. Пользователь не участвует в этом процессе. Результат визуально неотличим от предыдущего состояния, но формально это новая проекция, не восстановленная.

[Структурщик]: Добавлю к reconciliation: при полном сканировании reconciliation проверяет четыре условия для каждого canonicalRef: (1) entry в registry exists; (2) ровно один active binding с engineKind=affine; (3) engine object существует; (4) anchor corpus для annotations не пуст только если annotations.jsonl содержит записи для этого ref. Failure в любом — reconciliation event, не silent pass.

[Музыкант]: И последнее по аннотациям: `createdBy` в annotation record — это service_identity_actor, не Panel user id. Panel user identity never touches Affine directly. Связь между пользовательским действием и annotation проходит через Proxy: Proxy знает, кто авторизовал action, и передаёт это service identity как context. Annotation хранит этот context, но не Panel user credential.

[Математик]: Финальная проверка: binding model append-only, event/reducer, закрытый словарь (5 событий), stale rule формализована, reconciliation gate — равенство множеств. Annotations portable, hash gate определён, diff = ∅ как условие. Access bypass test — audit log вещдок. Native member set — точный allowlist, не «не пересекается». Все предикаты машинно проверяемы. Формальная база для вердикта полная.

---

## Пропозиция F1

**Affine назначается необязательной, заменяемой человеческой поверхностью** под `static.mmbrn.tech` на основании следующего минимального контракта:

**Binding model:** append-only `binding.jsonl` в FD-3, владелец — Panel service identity, event/reducer семантика, закрытый словарь из пяти событий, reconciliation через равенство множеств.

**Portable state:** annotations/comments через `annotations.jsonl` в FD-3, engine-neutral anchor, hash gate перед заменой.

**Authority:** полностью делегирована Panel/Proxy, Affine native roles принадлежат только единственной service identity, пользователь не получает Affine credentials ни при каком пути.

---

## Вердикт заседания M5

**Carrier:** `docs/seanses/static-mmbrn-container-m5-affine-role-2026-08-05.md`

### Контракт Affine (одна модель)

Affine — необязательная, заменяемая человеческая поверхность под `static.mmbrn.tech`. Контракт содержит пять закрытых способностей, шесть классов состояния, одну append-only binding модель и шесть формальных инвариантов заменяемости. Ни одна часть контракта не передаёт Affine authority, storage truth или identity.

---

### Таблица 1: Способности (Capabilities)

| Capability | M3 action | Input identity | Output | Allowed engine mutation | Forbidden authority |
|---|---|---|---|---|---|
| BROWSE | `discover` | `canonicalRef` list (от Proxy) | Список проекций движка | Создание navigation index в движке | Создание M2 record; изменение canonicalRef; выдача credential |
| VIEW | `read-metadata`, `read-ref` | `canonicalRef` | Метаданные материала, M2 ref | Обновление render cache проекции | Изменение M2 record; изменение grants; доступ к bytes напрямую |
| ANNOTATE | `write-metadata` | `canonicalRef` + anchor | Annotation record в portable store | Создание annotation node в движке | Изменение canonical content; создание M2 record; передача Panel grants |
| REVIEW | `read-metadata` | `canonicalRef` | Текущая проекция + annotation list | Нет | Изменение любого состояния; форвард без Panel check |
| MANAGE-PROJECTION | `upload-revision` | `canonicalRef` + projection diff | Обновлённая проекция в движке | Обновление projection view state | Создание canonical revision; изменение M2 storage address; изменение canonicalRef |

> Колонка M3 action содержит только значения из ратифицированного словаря M3. Capability не создаёт новый action; неизвестный action даёт deny.

---

### Таблица 2: Классы состояния

| State class | Owner / Source of truth | Canonical / Derived | Portable / Disposable | Export / Rebuild rule | Loss consequence |
|---|---|---|---|---|---|
| Canonical originals | FD-1 (primary), FD-2 (backup) | Canonical | — | Уже в FD-1; экспорт не требуется | Потеря невозможна при работающем FD-1/FD-2 |
| Registry / lifecycle | FD-3 (`registry.jsonl`) | Canonical | — | Уже в FD-3; экспорт не требуется | Потеря необратима; блокирует все операции |
| Engine projection | Движок (Affine) | Derived из M2 | Disposable | Rebuild из M2 records при rehydration | Потеря ожидаема; пересоздаётся без участия пользователя |
| Navigation / layout | Движок (Affine) | Derived | Disposable | Rebuild при первом BROWSE после rehydration | Честная потеря: удобство, не данные |
| Annotations / comments | FD-3 (`annotations.jsonl`) | Derived (portable) | **Portable** | Export в `annotations.jsonl` **обязателен** до замены; gate: hash diff = ∅ | Значимая потеря; замена блокируется при unresolved diff |
| Cache / session state | Движок (Affine) | Derived | Disposable | Нет; теряется при любом перезапуске | Честная потеря; задокументирована в контракте |

---

### Таблица 3: Binding model

**Модель:** append-only event log, event/reducer семантика, внешний по отношению к Affine.

| Поле | Значение / Тип |
|---|---|
| Owner | Panel service identity |
| Storage | FD-3, файл `binding.jsonl` |
| Key | `canonicalRef` (lineage URN) |
| Engine kind / id | `engineKind: "affine"`, `engineObjectId: <affineDocId>` |
| Event vocabulary (закрытый) | `binding.created`, `binding.updated`, `binding.deprecated`, `binding.reconciled`, `binding.conflict` |
| Version | Монотонный целый счётчик в рамках `canonicalRef`; инкрементируется при каждом событии |
| Status | Вычисляется reducer-ом: `active` \| `deprecated` \| `conflict` |
| History | Старые строки не мутируют; полная история сохранена в append log |
| Stale rule | Если engine object not-found при проверке → автоматически эмитируется `binding.deprecated` с `reason: engine_object_missing` |
| Reconciliation rule | Полное сканирование: `{canonicalRef в registry_active}` = `{canonicalRef в binding_active для engineKind=affine}` — равенство множеств, не счётчиков; uniqueness: не более одного active binding на `canonicalRef` для данного engineKind |
| Uniqueness invariant | `∀ canonicalRef: count(active, engineKind="affine") ≤ 1`; при нарушении — `binding.conflict`, оба binding не-active до ручного разбора |
| `affineDocId` статус | Внутренний ключ binding; не поле M2; не становится canonicalRef или location.ref |

---

### Таблица 4: Обязательные случаи

| Случай | Ожидаемое решение | Источник истины | Вещдок |
|---|---|---|---|
| 1. Affine недоступен, metadata и bytes существуют | `registry.jsonl`, M2 records и FD-1 bytes доступны через Proxy напрямую; человеческие функции BROWSE/VIEW/ANNOTATE/REVIEW/MANAGE-PROJECTION недоступны честно; никаких fallback на Affine cache | FD-3 (registry), FD-1 (bytes), Panel (authority) | Audit log: Proxy-запросы обслуживаются без downstream Affine calls; FD-1 checksums совпадают |
| 2. Affine удалён, заменён другим движком | `canonicalRef` неизменен; M2 address неизменен; grants неизменны; procedure: export annotations → `binding.deprecated` × all affine bindings → deploy new engine → rebuild projections from M2 → `binding.created` × new engine → rehydrate annotations | FD-3 (binding.jsonl, annotations.jsonl), M2 records | `binding.jsonl` содержит непрерывную историю; `annotations.jsonl` hash до = hash после rehydration; canonicalRef в registry не изменился |
| 3. `affineDocId` изменился при том же материале | Эмит `binding.deprecated` на старый affineDocId + `binding.created` на новый; версия инкрементируется; M2 record не трогается; canonicalRef неизменен | FD-3 (`binding.jsonl`) | `binding.jsonl`: старая строка `deprecated`, новая `created`, обе содержат тот же `canonicalRef`; M2 record в `registry.jsonl` без изменений |
| 4. Native Affine reader, но Panel deny | Proxy получает request → Panel check → deny → Proxy не форвардит → пользователь получает deny; Affine не вызывается ни при каком условии | Panel (authority) | Audit log: `panel.check.deny` event без downstream `affine.call` event для этого request-id |
| 5. Panel разрешает, native user role не умеет | Proxy форвардит от service identity (которая имеет необходимую native role); пользователь не получает Affine credential; action выполняется через service identity | Panel (authority), Affine (native capability service identity) | Audit log: `proxy.forward` с actor=`service_identity`; native Affine member list = `{service_identity_id}` — без пользовательских entries |
| 6. Binding отсутствует, неоднозначен или stale | BINDING_NOT_FOUND → deny; BINDING_AMBIGUOUS → deny + reconciliation triggered; BINDING_STALE → deny + `binding.deprecated` emitted; Affine не вызывается ни в одном из трёх случаев | FD-3 (`binding.jsonl`) | Audit log: deny event с соответствующим кодом; `binding.jsonl`: reconciliation/deprecated event записан |
| 7. Две страницы претендуют на один canonicalRef | Reconciliation emits `binding.conflict`; оба binding переходят в status=conflict; ни один не active; forward блокируется; ручной разбор обязателен до восстановления active binding | FD-3 (`binding.jsonl`) | `binding.jsonl`: две строки с одним `canonicalRef` и status=conflict; reconciliation log содержит conflict event с обоими engineObjectId |
| 8. Попытка редактировать стратегический документ | Proxy проверяет class материала → Panel deny для `upload-revision` на стратегический класс → Affine не вызывается; MANAGE-PROJECTION явно запрещает стратегические документы в forbidden authority | Panel (authority), M3 (per-action check) | Audit log: `panel.check.deny` с reason=`strategic_document_class`; no Affine call; стратегический класс определён в M2 record |
| 9. Несинхронизированное annotation state перед заменой | Gate: `portable_store_hash ≠ canonical_engine_export_hash` → замена блокируется автоматически; unresolved diff выводится списком; оператор обязан либо экспортировать из Affine в portable store, либо подписать явное решение о потере | FD-3 (`annotations.jsonl`), Affine export | Hash comparison report: две колонки (portable store hash, engine export hash), diff list; явная подпись оператора если потеря принята |
| 10. Cache/session/layout потеряно после замены | Если заранее классифицировано как disposable — потеря ожидаема, задокументирована, не является дефектом; если ошибочно объявлено portable — export gate должен был заблокировать замену; retroactive объявление portable после потери запрещено | State class table (M5) | Запись в state class table с `disposable` для данного класса; audit log замены не содержит export event для этого класса — соответствует контракту |

---

### Таблица 5: Readiness gates

| Gate | Machine predicate | Evidence | Fail result |
|---|---|---|---|
| G1: Full inventory | `∀ r ∈ registry_active: ∃! b ∈ binding_active: b.canonicalRef = r.canonicalRef ∧ b.engineKind = "affine"` — равенство множеств | Сравнительная таблица `registry_active` × `binding_active`; расхождения = ∅ | Замена не объявляется; список unbound canonicalRefs выводится |
| G2: Binding uniqueness | `∀ canonicalRef: count(active, engineKind="affine") = 1` | `binding.jsonl` reducer output: каждый canonicalRef имеет ровно одну active строку | Duplicate/conflict bindings выведены; ручной разбор обязателен |
| G3: No dangling bindings | `∀ b ∈ binding_active: engine_object_exists(b.engineObjectId) = true` | Live check Affine workspace через service identity; not-found list = ∅ | Stale bindings auto-deprecated; G1 перезапускается |
| G4: State classification complete | `∀ state_class ∈ {canonical_originals, registry, engine_projection, navigation_layout, annotations, cache_session}: classification ∈ {portable, disposable} ∧ source_of_truth defined` | State class table полностью заполнена; каждый класс имеет loss_consequence определённый | Незаполненный класс = блок; неопределённый loss_consequence = блок |
| G5: Portable state exported | `hash(annotations.jsonl in FD-3) = hash(canonical_export from Affine)` — diff = ∅ | Hash comparison report; `annotations.jsonl` последнего export timestamp ≥ timestamp последней ANNOTATE operation | Hash mismatch или unresolved diff → замена блокируется |
| G6: Rehydration drill | `hash(rehydrated_annotations in new_engine) = hash(annotations.jsonl)` — diff = ∅ | Drill report: построчное сравнение rehydrated state с portable store; unresolved diff = ∅ | Diff > 0 → движок не принят; anchor mapping пересматривается |
| G7: Access bypass test | Тестовый запрос с Panel deny для canonicalRef X → audit log содержит `panel.check.deny` без downstream `affine.call` для того же request-id | Audit log фрагмент с двумя events: deny + no-forward | Если Affine call обнаружен после deny — критический дефект; замена запрещена |
| G8: No user native credentials | Native Affine workspace member list = `{service_identity_id}` точно; никаких других entries | Affine workspace member export через service identity API | Любой entry кроме service_identity → немедленный блок; credential отозвать до повторной проверки |

---

### Инварианты заменяемости

| ID | Инвариант | Проверяемость |
|---|---|---|
| I1 | `canonicalRef` не изменился | `registry.jsonl`: тот же rootId до и после |
| I2 | M2 storage address не изменился | `registry.jsonl`: `location.ref` не мутировал |
| I3 | Grants и policy versions в Panel не изменились | Panel audit log: no grant mutation events во время замены |
| I4 | Audit history непрерывна | FD-3 append log: нет gaps в timestamps |
| I5 | `∀ annotation a: a ∈ rehydrated_state ↔ a ∈ exported_portable_store` | G6 drill: diff = ∅ |
| I6 | Binding history сохранена полностью | `binding.jsonl`: все события для данного canonicalRef присутствуют с монотонно возрастающей версией |

---

### Degraded mode (честный)

При недоступности Affine:

**Доступно:** `registry.jsonl` (FD-3), M2 records, bytes через Proxy от FD-1, authority через Panel.

**Недоступно честно:** BROWSE, VIEW, ANNOTATE, REVIEW, MANAGE-PROJECTION — все человеческие функции Affine-поверхности.

**Запрещено:** fallback на Affine cache как источник истины; объявление cache canonical; обход Panel check через cached state.

---

## Список посылок

> Входы вердикта M5 с пометкой факт / норма. Выводы M5 в этот список не включены.

**Закрытые нормы M1–M4:**

- **норма** — `static.mmbrn.tech` — контейнер канонических оригиналов; Affine — сменный движок под ним, не граница контейнера.
- **норма** — Страница Affine — состояние движка, не канонический материал.
- **норма** — `registry.jsonl` — единственный источник истины о регистрации и lineage identity.
- **норма** — `canonicalRef = "urn:mmbrn:static:" + rootId` — lineage URN, не URL, не storage key, не Affine id.
- **норма** — Смена `location.ref` создаёт новую immutable M2 record в той же lineage; M5 не переопределяет M2 identity.
- **норма** — Panel — единственный авторизатор; Proxy проверяет каждое классифицированное действие до обращения к Affine.
- **норма** — Пользователь не получает native Affine role/token; статической таблицы `Panel role → Affine role` нет.
- **норма** — Нативная роль Affine принадлежит только внутренней service identity.
- **норма** — Неизвестные action, object, identity или binding дают deny.
- **норма** — M4: FD-1 (primary bytes), FD-2 (complete backup), FD-3 (registry/lifecycle); адрес `location.kind=local`, `location.ref=static:{class}:{sha256_64hex}`.
- **норма** — Affine не входит в storage truth и не может стать источником bytes, retention или lifecycle.
- **норма** — M3 ратифицированные actions: `discover`, `read-metadata`, `read-ref`, `read-bytes`, `download`, `write-metadata`, `upload-revision`, `manage-access`.
- **норма** — M3 уже требует binding `canonicalRef ↔ affineDocId` перед forward.

**Измеренные факты:**

- **факт** — Живой Affine: 82 страницы в трёх private workspaces (Strategy, Templates, Releases); один участник.
- **факт** — В Affine 57 PNG/SVG и повторные imports; доказанного корпуса оригиналов чеков и PDF нет.
- **факт** — Наличие страницы в Affine не доказывает регистрацию материала в `registry.jsonl`.
- **факт** — Публикация стратегических документов в Affine заморожена машинным гейтом.
- **факт** — Affine native roles: `owner`, `manager`, `editor`, `commenter`, `reader`; передачи Panel identity в текущем доме нет.
- **факт** — Binding owner, форма, история и переносимость до M5 не назначены.

**Нормы этой повестки (M5 agenda constraints):**

- **норма** — Колонка M3 action использует только восемь ратифицированных значений; неизвестный action даёт deny.
- **норма** — IMPORT и любые file picker, bytes ingest, transport запрещены в M5; bytes остаются M6.
- **норма** — Binding append-only: старые строки не мутируют; event/reducer semantics; закрытый словарь событий; stale rule и reconciliation обязательны.
- **норма** — Binding readiness — равенство множеств, не counts; native member set = полный allowlist service identities.
- **норма** — Для portable annotations: engine-neutral identity/version contract и gate hash diff = ∅.
- **норма** — `affineDocId` не становится canonicalRef, location.ref или M2 record field.
- **норма** — M6–M7 не решаются в M5.
- **норма** — Стратегический редактор не возвращается Affine.
- **норма** — Второй carrier запрещён.

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
