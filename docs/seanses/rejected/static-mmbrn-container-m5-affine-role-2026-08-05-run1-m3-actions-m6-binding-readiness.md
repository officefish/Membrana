<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-08-05T15:47:49.281Z |
| Команда | `yarn consilium` |
| Модель | anthropic/claude-sonnet-4-6 |
| Файл | `docs/seanses/static-mmbrn-container-m5-affine-role-2026-08-05.md` |
| Порядок ролей | Архитектор → Математик → Структурщик → Верстальщик → Музыкант → Teamlead |
| Повестка | `docs/meeting/static-mmbrn-container/M5_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs/meeting/static-mmbrn-container/M5_AGENDA.md` | 9519 | `b8764223567b` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs/meeting/static-mmbrn-container/M5_AGENDA.md` | 9519 · 1 п. | `b8764223567b` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --no-memory --min-replies 36 --seed 173`

**Вопрос:**

F1 — назначьте один минимальный исполнимый контракт Affine как необязательной заменяемой человеческой поверхности под static.mmbrn.tech; решите способности, классы состояния, внешний binding и доказуемую замену без потери адресов, прав и значимого состояния; один carrier, M6–M7 не решать.

---

# Консилиум: M5 — роль Affine как заменяемой человеческой поверхности

**Повестка:** F1 — назначить один минимальный исполнимый контракт Affine как необязательной заменяемой человеческой поверхности под `static.mmbrn.tech`; решить способности, классы состояния, внешний binding и доказуемую замену без потери адресов, прав и значимого состояния.

**Участники:** Архитектор (Vesnin), Математик (Dynin), Структурщик (Ozhegov), Верстальщик (Rodchenko), Музыкант (Kuryokhin), Teamlead (Tarasov).

**Порядок реплик:** Архитектор → Математик → Структурщик → Верстальщик → Музыкант → Teamlead

---

[Архитектор]: Начнём с границы. Affine — это человеческая поверхность, не слой данных. Его контракт должен описывать ровно то, что умеет делать человек с материалом через движок, и не дальше. Я предлагаю зафиксировать четыре capability: VIEW (читать проекцию), ANNOTATE (писать комментарии), NAVIGATE (открывать по canonicalRef) и IMPORT (передавать байты в ingest-очередь). Всё, что сверх этого, — за границей контракта.

[Математик]: Прежде чем называть способности, нужно назвать инварианты, которые они не нарушают. Первый: `affineDocId` — не поле M2 и не `canonicalRef`. Второй: любой binding-переход — это append в ledger, не мутация записи. Третий: потеря binding — это deny, а не деградированное allow. Без этих трёх инвариантов «способности» — список желаний, а не контракт.

[Структурщик]: Хочу уточнить форму binding ledger. Внешний по отношению к Affine ledger — это файл или сервис под управлением Panel, не Affine. Минимальная запись должна содержать: `canonicalRef`, `engineKind` (например `"affine"`), `engineDocId`, `status` (`active|superseded|dangling`), `version` (монотонно растущий счётчик), `createdAt`, `updatedAt`. Это engine-neutral: при смене движка `engineKind` и `engineDocId` меняются, `canonicalRef` — нет.

[Верстальщик]: Со стороны человека: если binding absent или dangling — пользователь видит состояние «материал не привязан к движку», а не пустой экран. Это не fallback через Affine-cache, это честный ответ Panel: «binding отсутствует, действие заблокировано». Важно чётко назвать, что именно недоступно человеку в degraded mode: VIEW недоступен, ANNOTATE недоступен, NAVIGATE недоступен, IMPORT через очередь доступен при наличии Panel grant.

[Музыкант]: Аналогия с аудиопотоком: Affine — это мониторная колонка, не источник сигнала. Можно отключить мониторную колонку, но мастер-запись никуда не денется. Engine projection — это rendered view сигнала, не сам сигнал. Тогда классификация состояния строится аналогично: есть master (canonical bytes, M2 record, registry), есть rendered (engine projection, navigation layout), есть ephemeral (cache, session). Rendered можно пересоздать из master; ephemeral — честно потерять.

[Teamlead]: Формула пока правильная, но неполная: аннотации — не rendered и не ephemeral. Это значимое состояние, которое создаёт человек поверх projection. Нужен отдельный класс: annotations/comments. Он portable, источник истины — binding ledger или отдельный annotations store под Panel, не Affine. Если перед заменой движка аннотации не экспортированы — блокируем замену. Это не опция, это hard gate.

[Архитектор]: Принимаю. Обновлю структуру классов состояния. Итого шесть классов: (1) canonical originals — M4 FD-1/FD-2/FD-3, immutable; (2) registry/lifecycle — `registry.jsonl`, M2 records, immutable после записи; (3) engine projection — страница Affine как render canonicalRef, derived, rebuilable; (4) navigation/layout — workspace structure, page order, derived, disposable; (5) annotations/comments — значимое переносимое состояние, portable, требует экспорта до замены; (6) cache/session — ephemeral, disposable. Источники истины у первых двух — вне Affine; у пятого — portable annotations store.

[Математик]: Формализую условие замены как предикат. Пусть S — состояние системы до замены движка, S' — после. Замена корректна тогда и только тогда, когда: registry(S) = registry(S'), bindings(S) ⊆ bindings_history(S'), annotations(S) ⊆ annotations(S'), grants(S) = grants(S'), и ∀ canonicalRef ∈ registry: location.ref(canonicalRef, S) = location.ref(canonicalRef, S'). Это формальный инвариант, а не описание процесса.

[Структурщик]: Чтобы предикат был машинно проверяем, binding ledger должен быть единственным местом с history. Предлагаю: ledger-файл `binding.jsonl` под владением Panel, append-only, каждая строка — JSON-объект с полями `{id, canonicalRef, engineKind, engineDocId, status, version, createdAt, updatedAt, supersededBy?}`. Reconciliation: при несоответствии между ledger и живым Affine — deny до ручного resolution; никаких auto-heal.

[Верстальщик]: Для NAVIGATE capability нужно уточнить входной объект: это всегда `canonicalRef`, не `affineDocId`. Proxy разрешает `affineDocId` из ledger и передаёт service identity. Пользователь никогда не видит `affineDocId` в URL или интерфейсе. Это важно для заменяемости: если сменить движок, URL пользователя остаётся тем же, потому что он основан на `canonicalRef`.

[Музыкант]: Хочу закрыть случай 4: native reader есть, но Panel deny. Тут важно понять: Panel deny не означает, что Affine технически недоступен. Proxy просто не передаёт запрос в Affine при deny. Service identity имеет доступ, но она используется только для операций, которые Panel уже авторизовал. Нельзя обойти deny, попросив прямой нативный credential — его просто нет в руках пользователя.

[Teamlead]: Это и есть fail-closed. Подчеркну: статической таблицы Panel role → Affine role не существует. Если у пользователя нет Panel grant на action, Proxy не идёт дальше. Даже если Affine технически позволяет действие — это не имеет значения. Техническое native deny тоже не обходится: пользователю не выдаётся отдельный credential для обхода. Оба пути закрыты.

[Архитектор]: Теперь о readiness gates. Нужно семь машинно проверяемых предикатов перед объявлением «Affine заменяем». Первый: inventory complete — каждая страница в живом Affine имеет binding запись или явно помечена как unregistered. Второй: bindings unambiguous — для каждого `canonicalRef` не более одного active binding. Третий: no dangling ownership — нет orphan affineDocId без `canonicalRef` в registry. Четвёртый: state classified — каждый класс состояния назначен и документирован. Пятый: portable state exported — annotations/comments экспортированы и верифицированы. Шестой: rehydration drill passed — новый движок успешно принял import и bindings разрешены. Седьмой: access bypass test — ни один пользователь не имеет прямого native credential.

[Математик]: Добавлю предикаты точнее. Inventory complete: `|{pages in Affine}| = |{active bindings}| + |{explicit unregistered}|`. Bindings unambiguous: `∀ cr ∈ registry: |{b ∈ binding.jsonl : b.canonicalRef = cr ∧ b.status = "active"}| ≤ 1`. No dangling: `∀ b ∈ binding.jsonl: b.status = "active" → b.canonicalRef ∈ registry`. Это три конкретных SQL/jq-запроса к ledger.

[Структурщик]: Реhydration drill нужно описать точнее как операцию. Это не «запустить и посмотреть». Drill: (1) взять `binding.jsonl` и `annotations_export.jsonl`; (2) создать пустой новый движок; (3) для каждого active binding — создать engine object в новом движке, записать новый `engineDocId`, добавить superseded запись в ledger; (4) для каждой аннотации — импортировать, привязать к новому `engineDocId`; (5) проверить, что все `canonicalRef` разрешаются через новый ledger. Только пройденный drill закрывает gate.

[Верстальщик]: Для gate «access bypass test» важно описать процедуру: (1) получить список всех пользователей с Panel grants; (2) проверить, что ни один из них не фигурирует в списке native Affine workspace members с ролями owner/manager/editor/commenter/reader; (3) единственный участник native workspace — service identity. Это проверяется экспортом членов workspace из Affine API под service identity.

[Музыкант]: Теперь о случае 9: перед заменой нашли несинхронизированное annotation state. Это hard blocker. Процедура: Proxy сигнализирует в Panel, что annotations в Affine расходятся с `annotations_store`; замена движка блокируется до manual resolution; пользователь, создавший аннотацию через Affine, должен подтвердить экспорт или явно отказаться. Нет способа «тихо потерять» значимые аннотации под видом degraded mode.

[Teamlead]: Хорошо. Давайте закроем случай 8: попытка редактировать стратегический документ через Affine. Panel action «EDIT_STRATEGIC» не существует в M3-контракте Affine surface. Proxy отвечает deny на любую операцию mutation для стратегических документов, независимо от того, что Affine технически позволяет. Это не вопрос native role — это отсутствие action в Affine surface contract. Стратегический редактор — отдельный продукт, вне `static.mmbrn.tech`.

[Архитектор]: Вернусь к случаю 7: две импортированные страницы претендуют на один canonicalRef. Reconciliation rule: любой binding creation, где `canonicalRef` уже имеет active binding, автоматически переводит новую запись в статус `conflict`. Proxy блокирует оба engineDocId до ручного resolution в Panel. Разрешение конфликта добавляет запись в ledger: один binding становится `active`, второй — `superseded`. M2 record не мутирует.

[Математик]: Уточнение к случаю 3: `affineDocId` изменился при том же материале. Это нормальный lifecycle event. В ledger добавляется новая строка: старый binding получает `status: "superseded"`, `supersededBy: <new_id>`. Новый binding активен с новым `engineDocId`, тем же `canonicalRef`. `location.ref` в M2 не меняется, потому что `location.ref = static:{class}:{sha256_64hex}` — это адрес байтов, не адрес страницы в Affine. Эти два адресных пространства независимы.

[Структурщик]: Хочу чётко разделить, что rehydrate-ится автоматически и что строится заново. Из M2/M4: `canonicalRef`, `location.ref`, `sha256_64hex`, FD-class, все поля registry — всё это существует независимо от Affine и rehydrate-ится без движка. Из binding ledger: пары `canonicalRef ↔ engineDocId` для нового движка — строятся заново через drill. Из portable state: аннотации — импортируются из `annotations_store`. Navigation/layout — честно disposable, строится заново пользователем. Cache/session — disposable без оговорок.

[Верстальщик]: С точки зрения человека в интерфейсе: после успешного rehydration drill пользователь открывает новый движок, видит те же `canonicalRef`-адреса в URL, видит те же аннотации. Он не видит старые navigation/layout предпочтения — и это честно задокументировано заранее как disposable. Нет сюрприза, нет молчаливой потери значимого состояния.

[Музыкант]: Уточню случай 1: Affine недоступен полностью. Метаданные живут в `registry.jsonl` под Panel. Байты живут в FD-1/FD-2/FD-3 с адресом `location.ref`. Grants живут в Panel. Всё это продолжает работать. Недоступно только то, что требует движка: VIEW, ANNOTATE, NAVIGATE через Affine-поверхность. Эти функции честно помечены как «недоступны при Affine down», без fallback на cache как источник истины.

[Teamlead]: Случай 5: Panel разрешает action, а native user role его не умеет. Ответ: работает service identity, не пользователь. Proxy, получив Panel allow, совершает действие через service identity Affine. Пользователю не выдаётся credential, он не видит и не контролирует native role. Это техническая делегация через service account, не повышение прав пользователя. Если service identity тоже не может — это infrastructure failure, не authority bypass.

[Архитектор]: Теперь окончательно зафиксирую одну модель binding. Модель: **external append-only ledger under Panel authority**. Владелец: Panel service. Файл: `binding.jsonl`. Поля записи: `id` (UUID), `canonicalRef`, `engineKind`, `engineDocId`, `status` (`active|superseded|conflict|dangling`), `version` (int, monotonic), `createdAt`, `updatedAt`, `supersededBy` (optional UUID). Reconciliation: при расхождении ledger/Affine → conflict → deny → ручной resolution → новая ledger запись. Ни одно поле не попадает в M2 record.

[Математик]: Формально покажу, что эта модель доказывает замену. До замены: ledger содержит set B = {(cr, affine, docId_old) : status=active}. После замены: ledger содержит set B' = {(cr, new_engine, docId_new) : status=active} и историю {(cr, affine, docId_old) : status=superseded}. Инвариант: π₁(B) = π₁(B') = {canonicalRef ∈ registry}. Первая проекция (набор canonicalRef) не меняется. M2-адреса, grants, audit — вне пересечения с B, не затронуты.

[Структурщик]: Отдельно зафиксирую case 6: binding absent, ambiguous or stale. Absent: `canonicalRef` не найден в ledger как active — deny всех Affine capabilities, IMPORT через очередь доступен если Panel grant есть. Ambiguous: два active binding для одного `canonicalRef` — conflict статус, deny до resolution. Stale: `updatedAt` старше порога И Affine не отвечает на ping service identity — dangling статус, deny до reconciliation. Нет автоматического allow при stale.

[Верстальщик]: Для случая 10: cache/session/layout потеряно после замены. Это заранее классифицировано как disposable. Пользователь видит это в документации контракта до замены: «navigation/layout и cache/session не переносятся, это ожидаемое поведение». Нет ошибки, нет компенсации. Аннотации же — portable: если они потеряны при замене без прохождения export gate — это failure drill, замена не должна была состояться.

[Музыкант]: Хочу закрыть круг по degraded mode. При Affine down: Panel отвечает на запрос capacity check — возвращает `{affine: unavailable, capabilities: [], registry: available, bytes: available, authority: available}`. Никакого fallback к cached projection. Никакого «попробуй позже через старый snapshot». Единственные честно работающие вещи — это registry lookup, bytes download через FD и authority check через Panel.

[Teamlead]: Принимаю всё сказанное. Подведу итог по форме пропозиции. Один контракт: Affine — необязательная заменяемая человеческая поверхность с четырьмя capabilities (VIEW, ANNOTATE, NAVIGATE, IMPORT), шестью классами состояния, одним external ledger под Panel. Замена доказывается семью readiness gates и математическим инвариантом проекции canonicalRef. Authority всегда Panel-first, fail-closed. Стратегический редактор — вне контракта. M6/M7 — не тронуты.

[Архитектор]: Уточню IMPORT capability: это не загрузка в Affine, это передача байтов в ingest-очередь Panel. Affine-поверхность предоставляет только UI-триггер для выбора файла и подтверждения. Сам ingest — под Panel и M4 storage pipeline. Это важно: Affine не становится источником bytes даже при IMPORT action. Bytes всегда идут через M4-путь.

[Математик]: Важное следствие для readiness gate «portable state exported»: `annotations_export.jsonl` должен содержать для каждой аннотации: `canonicalRef`, `engineDocId` (для трассировки, не для identity), `author_panel_id` (Panel identity, не native Affine user), `content`, `createdAt`, `updatedAt`. Поле `author_panel_id` критично: при rehydration мы восстанавливаем аннотацию с тем же Panel-идентификатором автора, а не с native Affine user id.

[Структурщик]: Добавлю reconciliation rule для binding при обнаружении дубля (случай 7). Conflict resolution protocol: (1) Panel admin видит оба conflicting binding; (2) выбирает один как canonical через Panel UI; (3) ledger получает две записи: `{status: active}` для выбранного и `{status: superseded, supersededBy: active_id}` для отвергнутого; (4) M2 records обоих оригиналов не меняются; (5) audit trail записывает: кто разрешил, когда, какой выбор. Дубль не уничтожается из истории.

[Верстальщик]: Финальная деталь по UI-контракту: в интерфейсе Affine-поверхности пользователь никогда не видит `engineDocId`, `affineDocId` или native workspace path. Единственный видимый идентификатор — это `canonicalRef` или его human-readable label из registry. Это обеспечивает заменяемость на уровне UX: человек привязан к `canonicalRef`, не к Affine-специфичному адресу.

[Музыкант]: Последнее: failure mode для случая когда annotations_store расходится с Affine в момент замены (случай 9). Детектировать: при каждом successful ANNOTATE action через Panel proxy — sync checkpoint записывается в `annotations_store`. Перед заменой: diff между annotations_store и Affine export. Если diff непуст — это unsynchronized state, замена блокируется, diff показывается пользователю для ручного решения. Auto-merge запрещён.

[Teamlead]: Достаточно. Выходим на вердикт. Контракт полный, инварианты формализованы, все десять случаев покрыты, readiness gates машинно проверяемы. M6/M7 не тронуты. Стратегический редактор — вне. Один carrier. Готовлю пропозицию F1.

---

## Пропозиция F1

**Affine** назначается единственной необязательной заменяемой человеческой поверхностью под `static.mmbrn.tech` со следующим минимальным исполнимым контрактом.

---

## Вердикт M5

### Таблица 1. Способности (Capabilities)

| Capability | M3 action | Input identity | Output | Allowed engine mutation | Forbidden authority |
|---|---|---|---|---|---|
| **VIEW** | `view_projection` | `canonicalRef` + active binding | Rendered read-only view страницы в Affine | None; projection read-only | Нельзя изменять canonical bytes, M2 record, grants |
| **ANNOTATE** | `add_annotation` | `canonicalRef` + active binding + Panel grant | Запись в `annotations_store`; sync checkpoint | Создание comment/annotation object в Affine (engine-local) | Нельзя мутировать canonical content; нельзя создавать native Affine user role |
| **NAVIGATE** | `navigate_to` | `canonicalRef` | Proxy резолвит `engineDocId` из ledger, открывает через service identity | None | Нельзя экспонировать `engineDocId` пользователю; нельзя создавать прямую ссылку на native Affine path |
| **IMPORT** | `ingest_request` | File bytes + `target_class` + Panel grant | Помещение в ingest-очередь Panel; M4 storage pipeline получает bytes | None (Affine — только UI-триггер) | Нельзя помещать bytes напрямую в Affine storage; Affine не становится source of bytes |

---

### Таблица 2. Классы состояния

| State class | Owner / Source of truth | Canonical / Derived | Portable / Disposable | Export / Rebuild rule | Loss consequence |
|---|---|---|---|---|---|
| **Canonical originals** | M4 FD-1/FD-2/FD-3; `location.ref=static:{class}:{sha256_64hex}` | Canonical, immutable | Portable (вне Affine) | Не экспортируется из Affine; уже в FD | Недопустима; блокирует всё |
| **Registry / lifecycle** | `registry.jsonl`; M2 records | Canonical, append-only | Portable (вне Affine) | Не экспортируется из Affine; уже в Panel | Недопустима; блокирует всё |
| **Engine projection** | Affine (derived render) | Derived | Disposable | Rebuild из canonical originals через новый движок | Допустима; ожидаемо при смене движка |
| **Navigation / layout** | Affine workspace state | Derived | Disposable | Не переносится; пересоздаётся пользователем | Допустима; задокументировано заранее |
| **Annotations / comments** | `annotations_store` под Panel; Affine — зеркало | Derived, значимое | **Portable** | Обязательный экспорт `annotations_export.jsonl` до замены; импорт в новый движок | Недопустима без explicit user waiver; блокирует drill |
| **Cache / session** | Affine runtime | Derived | Disposable | Не переносится | Допустима; задокументировано заранее |

---

### Таблица 3. Binding ledger

| Field | Описание |
|---|---|
| **Owner** | Panel service |
| **File** | `binding.jsonl` (append-only) |
| **key** | `id` (UUID) |
| **canonicalRef** | `urn:mmbrn:static:{rootId}` — не меняется при смене движка |
| **engineKind** | строка `"affine"` / `"notion"` / etc — меняется при смене |
| **engineDocId** | native id объекта в конкретном движке |
| **status** | `active` / `superseded` / `conflict` / `dangling` |
| **version** | int, монотонно растущий |
| **createdAt / updatedAt** | ISO 8601 |
| **supersededBy** | UUID ссылка на новую запись (optional) |
| **Reconciliation rule** | Расхождение ledger/Affine → `conflict` → deny → ручной resolution → новая ledger-запись. Auto-heal запрещён. |

> Ни одно поле binding ledger не является полем M2 record. `affineDocId` / `engineDocId` не становится `canonicalRef`, `location.ref` или любым M2-идентификатором.

---

### Таблица 4. Обязательные случаи

| # | Случай | Ожидаемое решение | Источник истины | Вещдок |
|---|---|---|---|---|
| 1 | Affine недоступен; metadata, `location.ref` и bytes существуют | Panel возвращает `{affine: unavailable, capabilities: []}`. Registry, bytes, authority работают. VIEW/ANNOTATE/NAVIGATE недоступны. Fallback на cache как источник истины запрещён. | `registry.jsonl`, FD-1/FD-2/FD-3, Panel grants | Panel health-check response; `registry.jsonl` доступен; bytes доступны по `location.ref` |
| 2 | Affine удалён, заменён другим движком | `canonicalRef` не меняется. `location.ref` не меняется. Grants не меняются. Старые binding entries получают `status: superseded`. Новые binding entries создаются с `engineKind: new_engine`. Rehydration drill пройден. | `registry.jsonl` (canonicalRef), `binding.jsonl` (history), Panel (grants) | `binding.jsonl` содержит superseded + new active записи; `canonicalRef` одинаков в обоих |
| 3 | `affineDocId` изменился при том же материале | Новая запись в `binding.jsonl`: старый `engineDocId` → `status: superseded, supersededBy: new_id`. Новый active binding с новым `engineDocId`, тем же `canonicalRef`. M2 record не мутирует. | `binding.jsonl` (history), `registry.jsonl` (M2 identity) | diff `binding.jsonl` до/после: два entry с одним `canonicalRef`, один superseded |
| 4 | Native Affine reader существует, но Panel deny | Proxy не передаёт запрос в Affine. Пользователь получает deny. Affine технически доступен — не важно. | Panel grants, M3 per-action check | Panel audit log: deny event с `action=view_projection`, `reason=no_grant` |
| 5 | Panel allow, но native user role не умеет action | Proxy выполняет action через service identity. Пользователь не получает credential. Native user role не повышается. | Panel grants (allow), Affine service identity | Affine workspace member list: только service identity; Panel audit log: allow через service identity |
| 6 | Binding absent, ambiguous or stale | Absent → deny всех capabilities кроме IMPORT (если grant есть). Ambiguous (два active) → `conflict` → deny до resolution. Stale → `dangling` → deny до reconciliation. Нет автоматического allow. | `binding.jsonl` | `binding.jsonl` запись с соответствующим status; Panel deny response |
| 7 | Две импортированные страницы претендуют на один canonicalRef | Второй binding creation → `status: conflict`. Proxy блокирует оба engineDocId. Ручной resolution в Panel: один → active, другой → superseded. M2 records обоих не меняются. Audit trail фиксирует resolution. | `binding.jsonl` (conflict → resolution), `registry.jsonl` (M2 identity) | `binding.jsonl`: два entry с одним `canonicalRef`, один active один superseded; audit record resolution |
| 8 | Попытка редактировать стратегический документ через Affine | Action `edit_strategic` отсутствует в Affine surface contract. Proxy отвечает deny. Независимо от native Affine capabilities. Стратегический редактор — отдельный продукт вне `static.mmbrn.tech`. | M3 Affine surface contract (closed set of actions) | Panel deny log: `action=edit_strategic, reason=action_not_in_surface_contract` |
| 9 | Перед заменой найдено несинхронизированное annotation state | Diff между `annotations_store` и Affine export непуст → замена блокируется. Пользователь видит diff. Ручное resolution: подтвердить экспорт или explicit waiver. Auto-merge запрещён. Drill не может быть пройден до resolution. | `annotations_store` (source of truth), Affine export (delta) | Diff report `annotations_diff.jsonl`; drill failure log; manual resolution record в Panel |
| 10 | Cache/session/layout потеряно после замены | Заранее классифицировано как disposable. Нет ошибки, нет компенсации. Документировано в контракте до замены. Аннотации — portable, их потеря → failure drill (см. случай 9). | Контракт классификации состояния M5 (Таблица 2) | Предупреждение пользователю до drill: «navigation/layout/cache не переносятся» |

---

### Таблица 5. Readiness gates

| Gate | Machine predicate | Evidence | Fail result |
|---|---|---|---|
| **G1. Inventory complete** | `\|{pages in Affine}\| = \|{active bindings}\| + \|{explicit unregistered}\|` | Экспорт страниц Affine (service identity) + `binding.jsonl` count | Блокировка: неучтённые страницы требуют manual classification |
| **G2. Bindings unambiguous** | `∀ cr ∈ registry.jsonl: \|{b ∈ binding.jsonl : b.canonicalRef=cr ∧ b.status="active"}\| ≤ 1` | jq-запрос к `binding.jsonl` | Блокировка: conflict entries требуют resolution |
| **G3. No dangling ownership** | `∀ b ∈ binding.jsonl: b.status="active" → b.canonicalRef ∈ registry.jsonl` | join `binding.jsonl` × `registry.jsonl` по `canonicalRef` | Блокировка: dangling bindings требуют resolution или удаления через Panel |
| **G4. State classified** | Все шесть классов состояния задокументированы с source of truth, portable/disposable тегом | Наличие M5 contract document в carrier | Блокировка: неклассифицированное состояние — потенциальная молчаливая потеря |
| **G5. Portable state exported** | `annotations_export.jsonl` содержит `\|{annotations in annotations_store}\|` записей; checksum совпадает | sha256 `annotations_export.jsonl` сравнён с `annotations_store` hash | Блокировка: несинхронизированные аннотации (см. случай 9) |
| **G6. Rehydration drill passed** | Новый движок: все active `canonicalRef` из `binding.jsonl` разрешаются; все аннотации из export импортированы; `author_panel_id` совпадает | Drill log: 0 unresolved canonicalRef, 0 import errors | Блокировка: drill не пройден — замена не состоялась |
| **G7. Access bypass test** | `{Affine workspace members} ∩ {Panel users} = ∅` (кроме service identity) | Экспорт workspace members из Affine API — только service identity | Блокировка: пользователь с native credential → immediate revocation required |

---

## Список посылок

### Закрытые нормы (из M1–M4)

- **норма** `static.mmbrn.tech` — контейнер канонических оригиналов; Affine — сменный движок под ним, не граница контейнера.
- **норма** Страница Affine — состояние движка, не канонический материал. Оригиналы и записи управления не зависят от выбранного движка.
- **норма** `registry.jsonl` — единственный источник истины о регистрации, record/lineage identity, заявленных полях и истории.
- **норма** `canonicalRef = "urn:mmbrn:static:" + rootId` — идентификатор lineage; не является URL, storage key или Affine id.
- **норма** Смена `location.ref` создаёт новую immutable M2 record в той же lineage; M5 не вправе переопределять M2 identity или поля.
- **норма** Panel — единственный авторизатор; Proxy проверяет каждое классифицированное действие, актуальные версии и binding до обращения к Affine.
- **норма** Пользователь не получает native Affine role/token; статической таблицы `Panel role → Affine role` нет.
- **норма** Нативная роль Affine принадлежит только внутренней service identity и является технической способностью, не authority пользователя.
- **норма** Неизвестные action, object, identity или binding дают deny (fail-closed).
- **норма** M4 назначила FD-1/FD-2/FD-3 и M2-адрес `location.kind=local`, `location.ref=static:{class}:{sha256_64hex}`; Affine не входит в storage truth.
- **норма** M3 требует binding `canonicalRef ↔ affineDocId` перед forward к Affine.

### Измеренные факты (из фактуры M5)

- **факт** Живой Affine содержит 82 страницы в трёх private workspaces: Strategy, Templates, Releases; участник один.
- **факт** В Affine есть повторные imports и 57 PNG/SVG; доказанного корпуса оригиналов чеков и внешних PDF нет.
- **факт** Наличие страницы в Affine не доказывает регистрацию материала в `registry.jsonl`.
- **факт** Публикация стратегических документов в Affine заморожена машинным гейтом.
- **факт** Affine поддерживает native roles: `owner`, `manager`, `editor`, `commenter`, `reader`; передачи Panel identity в текущем доме нет.
- **факт** M3 требует binding перед forward, но владелец, форма, история и переносимость binding не были назначены до M5.

### Нормы, установленные в M5

- **норма (M5)** Контракт Affine содержит ровно четыре capabilities: VIEW, ANNOTATE, NAVIGATE, IMPORT.
- **норма (M5)** Binding ledger — `binding.jsonl`, append-only, под управлением Panel; поля: `id`, `canonicalRef`, `engineKind`, `engineDocId`, `status`, `version`, `createdAt`, `updatedAt`, `supersededBy`.
- **норма (M5)** Annotations/comments — portable state; обязательный экспорт до замены движка; потеря без explicit waiver блокирует rehydration drill.
- **норма (M5)** Navigation/layout и cache/session — disposable; потеря при замене ожидаема и задокументирована.
- **норма (M5)** Замена движка корректна тогда и только тогда, когда π₁(active bindings до) = π₁(active bindings после) = {canonicalRef ∈ registry}.
- **норма (M5)** Семь readiness gates (G1–G7) машинно проверяемы и обязательны до объявления «Affine заменяем».

---

## Definition of Done

- [x] Выбран один минимальный vendor-neutral контракт Affine (четыре capabilities, шесть классов состояния, одна модель binding)
- [x] Способности, классы состояния и binding описаны обязательными таблицами (Таблицы 1–3)
- [x] Источники истины M2/M4 и authority M3 не переданы Affine (canonical originals в FD; registry в `registry.jsonl`; authority в Panel; Affine — только derived projection)
- [x] Значимое переносимое и допустимо disposable состояние разведены без скрытой потери (annotations — portable с hard block; nav/layout/cache — disposable с документированием)
- [x] Десять обязательных случаев имеют ожидаемое решение и вещдок (Таблица 4, строки 1–10)
- [x] Readiness gates машинно проверяемы и включают rehydration drill (G6) и access bypass test (G7) (Таблица 5, гейты G1–G7)
- [x] M6–M7 и стратегический редактор не спроектированы (случай 8 закрывает стратегический редактор deny; endpoints, transport, DNS не определялись)
- [x] Один carrier, один F1, список посылок до последней секции DoD
- [x] Не меньше 36 ролевых реплик и не меньше шести от каждой роли (Архитектор: 6, Математик: 6, Структурщик: 6, Верстальщик: 6, Музыкант: 6, Teamlead: 6; итого 36)

---

*Реплик в диалоге: 36; каждый участник высказался не менее шести раз. Carrier: `docs/seanses/static-mmbrn-container-m5-affine-role-2026-08-05.md`.*
