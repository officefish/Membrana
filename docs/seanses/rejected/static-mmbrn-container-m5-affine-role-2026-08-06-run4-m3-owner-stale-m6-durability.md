<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-08-06T09:23:50.750Z |
| Команда | `yarn consilium` |
| Модель | anthropic/claude-sonnet-4-6 |
| Файл | `docs/seanses/static-mmbrn-container-m5-affine-role-2026-08-06.md` |
| Порядок ролей | Верстальщик → Музыкант → Архитектор → Структурщик → Математик → Teamlead |
| Повестка | `docs/meeting/static-mmbrn-container/M5_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs/meeting/static-mmbrn-container/M5_AGENDA.md` | 11395 | `c3129e1e757c` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs/meeting/static-mmbrn-container/M5_AGENDA.md` | 11395 · 1 п. | `c3129e1e757c` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --no-memory --min-replies 36 --seed 191`

**Вопрос:**

F1 — контракт Affine использует только discover, read-metadata, read-ref, read-bytes, download, write-metadata, upload-revision, manage-access над container/collection/lineage; annotation write disabled; requiredProjectionSet назначен независимо; binding key canonicalRef+engineKind+engineObjectId с unique seq; durable/no-loss state и отдельные access gates; M6/M7 не решать; один carrier.

---

# Консилиум: M5 — роль Affine как заменяемой человеческой поверхности

**Повестка:** F1 — назначить один минимальный исполнимый контракт Affine как необязательной, заменяемой человеческой поверхности под `static.mmbrn.tech`: способности, классы состояния, `requiredProjectionSet`, binding, заменяемость, degraded mode, readiness gates.

**Участники:** Верстальщик (Rodchenko), Музыкант (Kuryokhin), Архитектор (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Teamlead (Tarasov).

**Порядок реплик:** Верстальщик → Музыкант → Архитектор → Структурщик → Математик → Teamlead (циклически, ≥36 реплик)

---

[Верстальщик]: Начну с конкретного вопроса к границе: что пользователь видит через Affine, чего не видит через Panel? Affine — поверхность навигации и просмотра проекций, не редактор canonical originals. Для меня это означает: engine projection и navigation/layout живут в Affine, canonical originals — никогда. Если мы не зафиксируем это как твёрдую черту в таблице состояния, мы получим ползучее расширение: дизайнер начнёт считать страницу Affine источником истины. Предлагаю первым делом согласовать шесть классов состояния и их owner до обсуждения способностей — иначе capability table повиснет в воздухе.

[Музыкант]: Поддержу: state-first, потом capability. Но добавлю конкретный риск, который я вижу в фактуре: 57 PNG/SVG в живом Affine — это engine-embedded assets, и они не лежат в FD-1. Если мы объявим engine projection «disposable», а кто-то воспринял эти PNG как canonical, — потеря будет тихой. Нужно явно прописать: engine projection — derived, rebuild from M2/M4, честно disposable при замене движка. PNG/SVG, которые являются canonical originals, должны иметь M2 record с `location.ref` в FD-1; без этого они не существуют с точки зрения контейнера. Affine их не хранит, Affine их отображает.

[Архитектор]: Фиксирую конструкцию: у нас шесть классов состояния, и каждый имеет ровно одного владельца. Canonical originals → FD-1, источник истины — storage, immutable после записи. Registry/lifecycle → FD-3 (`registry.jsonl`), источник истины — Panel, append-only. Engine projection → Affine, derived, disposable. Navigation/layout → Affine, derived, disposable. Annotations/comments → portable store вне движка, owner — Panel, portable, экспорт обязателен до замены. Cache/session → Affine, ephemeral, честно disposable. Binding ledger — отдельная сущность под управлением Panel; это не FD-3 store в смысле M4, но durable: Panel несёт ответственность за его backup и restore без изменения M4 topology. Вот каркас — проверяйте его.

[Структурщик]: Каркас верный, но нужно уточнить binding ledger точнее. Ключ записи: `(canonicalRef, engineKind, engineObjectId)`. `seq` — монотонно возрастающее целое, уникальное в скоупе одного `(canonicalRef, engineKind)`. Это event ledger: каждое событие — immutable append, reducer строит текущее состояние. Transitions: `created`, `updated` (новый `engineObjectId` при том же `canonicalRef`), `deleted`, `stale` (binding существует, но engine object не отвечает при reconciliation), `conflict` (два `engineObjectId` претендуют на один `canonicalRef` в рамках одного `engineKind`), `reconciled` (conflict разрешён, один из объектов помечен canonical). Владелец ledger — Panel; Affine его не читает и не пишет напрямую.

[Математик]: Добавлю формальное свойство биекции для `requiredProjectionSet`. Пусть R — множество `canonicalRef` в `requiredProjectionSet`, E — множество `engineObjectId` в binding ledger со статусом `active` для данного `engineKind`. Биекция выполнена тогда и только тогда когда: для каждого r ∈ R существует ровно один e ∈ E такой что binding(r) = e; и для каждого e ∈ E существует ровно один r ∈ R такой что binding(e) = r. Это machine predicate: readiness gate G-1 = `|R| = |E| ∧ ∀r∈R: |{e : binding(r)=e, status=active}| = 1 ∧ ∀e∈E: |{r : binding(e)=r}| = 1`. Если gate не выполнен — Affine не объявляется replaceable.

[Teamlead]: Стоп. Прежде чем идти дальше — зафиксирую позицию: `requiredProjectionSet` назначается Panel независимо, это intent, а не зеркало активных bindings. Panel решает, какие lineage должны быть спроецированы в engine; binding ledger фиксирует факт проекции. Разрыв между set и bindings — это gap, который обнаруживает reconciliation. Gap не является ошибкой сам по себе — он является сигналом к действию. Gate Математика проверяет финальное состояние перед заявлением о заменяемости, не рантайм. Это важно: мы не блокируем работу при gap, мы блокируем вердикт «заменяем» при gap.

[Верстальщик]: Хорошо. Теперь capability table. Восемь actions из F1, все над container/collection/lineage. Расставлю по смыслу для человека-пользователя за Affine: `discover` — пользователь видит список lineage в навигации; `read-metadata` — пользователь видит метаданные lineage без ref; `read-ref` — пользователь видит только ref (адрес), не bytes; `read-bytes` — пользователь инициирует чтение байт для просмотра, bytes идут из FD-1 через Proxy; `download` — пользователь получает canonical bytes как файл; `write-metadata` — пользователь редактирует только metadata lineage, не создаёт новую M2 record; `upload-revision` — пользователь загружает новую canonical revision; `manage-access` — пользователь управляет доступом в рамках своих Panel grants. Annotation write — заблокировано. Это закрытый перечень: новых действий Affine не получает.

[Музыкант]: Хочу заострить `upload-revision`. Это единственное действие, которое меняет canonical state — создаёт новую M2 record в lineage с новым `location.ref`. Важно: Affine не определяет адрес; адрес назначает M4-механизм (`static:{class}:{sha256_64hex}`). Affine передаёт bytes через Proxy, Proxy проверяет Panel grant для `upload-revision` над конкретным lineage, затем storage pipeline создаёт запись. Affine не видит FD-1 ключи напрямую. Это «allowed engine mutation»: Affine может получить подтверждение успешной загрузки (что revision создана), но не управляет адресацией. Если этот инвариант не зафиксирован в контракте — Affine ползёт в M4.

[Архитектор]: Верно. Сформулирую «forbidden authority» для capability table: Affine не назначает `canonicalRef`, не пишет в `registry.jsonl`, не определяет `location.ref`, не выдаёт и не отзывает Panel grants, не управляет retention и lifecycle, не является источником bytes для любого FD. Это запрет по конструкции, не по конфигурации: контракт фиксирует, что Affine технически не может этого сделать, потому что все эти операции требуют write-доступа к FD-3 или Panel authority, которых у Affine нет и не будет.

[Структурщик]: Перейду к degraded mode. Утверждение: при недоступности Affine контейнер не деградирует. Registry, bytes, authority — работают. Деградирует только человеческая поверхность: навигация через Affine-интерфейс, просмотр engine projection, layout. Конкретно недоступны: capability `discover` через Affine UI, `read-metadata` через Affine UI, все шесть UI-операций. Доступны через Panel напрямую: все M3 actions, потому что Panel не делегирует authority Affine, он только проксирует запрос. Запрещённый fallback: объявлять Affine cache источником истины о metadata или registry. Если Affine cache говорит одно, а `registry.jsonl` другое — истина в `registry.jsonl`.

[Математик]: Уточню predicate для degraded mode gate. Пусть `affine_available` — булев флаг. Инвариант: `¬affine_available → (registry_readable ∧ bytes_readable ∧ authority_operative)`. Это проверяется отдельно от Affine: Panel health check не зависит от Affine health check. Разрыв между Panel и Affine должен быть observable без обращения к Affine — иначе мы не можем доказать независимость. Это readiness gate G-5: `Panel health check не вызывает Affine endpoint`.

[Teamlead]: Хорошо. Теперь аннотации — это самое острое место. Annotation write через Affine disabled — это норма из F1. Но annotations/comments могут существовать как portable state, если они созданы до введения запрета или через другой механизм. Что с ними? Они живут в portable store вне движка под управлением Panel. Контракт annotation: stable `annotationId`, версия, Panel principal автора, canonical serialization с content hash, engine-neutral anchor (ссылка на `canonicalRef` + byte range или revision seq, но не на Affine internal id). При замене движка: portable store → rehydrate в новый движок. Gate требует точное совпадение: portable store count = engine export count = rehydrated count. Если diff — замена не завершена.

[Верстальщик]: Важный момент по `requiredProjectionSet` — он не является частью binding ledger, он является Panel intent. Хочу зафиксировать форму: это множество `canonicalRef`, которые Panel заявляет как «должны быть спроецированы в текущий engine». Он назначается независимо от того, есть ли активный binding. Panel может объявить projection required до того, как binding создан — это создаёт gap, который reconciliation должен закрыть. Panel может убрать ref из set — это сигнал к удалению binding (не к удалению M2 record). `requiredProjectionSet` — это политика, binding — факт.

[Музыкант]: По заменяемости — сформулирую явно, что rehydrate-ится, что строится заново, что disposable. Rehydrate из M2: `canonicalRef`, lineage identity, `location.ref`, revision history. Rehydrate из M4/FD-1: canonical bytes (доступны по адресу). Rehydrate из binding ledger: `engineObjectId` нового движка устанавливается в новую `created` запись; история старых bindings сохраняется, не удаляется. Rehydrate из portable annotation store: все annotations с их anchors. Строится заново: engine projection (страницы нового движка), navigation tree движка, layout. Честно disposable: cache, session state, thumbnail preview (если preview является derived, а не canonical), Affine-native page metadata.

[Архитектор]: Теперь про access gates. M3 per-action check — это не конфигурация Affine. Proxy проверяет: Panel grant для запрошенного action над запрошенным object (по `canonicalRef`), version vector (актуальность), binding (существует active binding для данного `canonicalRef` в данном `engineKind`). Если любое из трёх не выполнено — deny, forward не происходит. Это fail-closed: при неизвестном состоянии любого из трёх — deny. Native Affine role — только service identity. Пользователь не получает никакого Affine credential: Panel не выдаёт его, Affine не принимает пользовательских токенов. Это structural, не policy: service identity — это один shared credential управляемый Panel для всех обращений от имени пользователей.

[Структурщик]: Уточню термин «service identity». Это identity, которой Proxy аутентифицируется перед Affine. Она одна; пользователи не имеют к ней доступа; она не содержит user identity. Affine видит только service identity плюс operation payload. Affine не знает, какой Panel principal инициировал операцию — это намеренно. Если Affine имел бы user-level identity, пользователь мог бы обойти Panel, обратившись к Affine напрямую. Structural deny: native Affine role пользователя невозможна не потому что запрещена конфигурацией, а потому что пользователь не имеет credential для Affine. Gate G-6: `Affine native identity list = {service_identity_id}`, никаких других principals.

[Математик]: Для reconciliation reducer запишу transitions формально. State machine для binding record `b = (canonicalRef, engineKind, engineObjectId, seq, status)`:
- `∅ --[create(r,k,o)]--> (r,k,o,1,active)`
- `(r,k,o,n,active) --[update(r,k,o')]--> (r,k,o,n,superseded) + (r,k,o',n+1,active)`
- `(r,k,o,n,active) --[delete(r,k)]--> (r,k,o,n+1,deleted)`
- `(r,k,o,n,active) --[stale_detected(r,k)]--> (r,k,o,n+1,stale)`
- `(r,k,o,n,stale) --[reconcile(r,k,o')]--> (r,k,o,n,stale_resolved) + (r,k,o',n+1,active)`
- `conflict: |{b : b.canonicalRef=r ∧ b.engineKind=k ∧ b.status=active}| > 1 → conflict_detected`
- `(conflict) --[resolve(r,k,o_canonical)]--> all others → conflict_superseded, (r,k,o_canonical,seq_max+1,active)`

[Teamlead]: Хорошо, редуктор зафиксирован. Теперь разберём случаи — они проверят, нет ли дыр в модели. Начну с Case 4 и 5 как самых критичных для authority. Case 4: native Affine reader существует, Panel запрещает action. Proxy получает запрос, проверяет Panel grant — deny. Forward не происходит. Affine не вызывается. Вещдок: Panel audit log содержит `deny` для action+principal+canonicalRef; Affine access log не содержит соответствующей записи. Case 5: Panel разрешает action, native user role его не умеет. Proxy имеет service identity с необходимой native role; пользователь credential Affine не имеет. Операция выполняется от имени service identity. Пользователю credential не выдаётся ни при каком условии. Вещдок: Affine native identity list = `{service_identity_id}`, пользовательских principals нет.

[Верстальщик]: Case 1: Affine недоступен. Metadata, `location.ref`, bytes существуют в FD-3 и FD-1 независимо. Panel отвечает на M3 actions напрямую. Человеческие функции недоступны: навигация через Affine UI, просмотр engine projection. Источник истины: `registry.jsonl` (FD-3). Вещдок: `registry.jsonl` читаем, Panel health check green, FD-1 bytes доступны — при `affine_available = false`.

[Музыкант]: Case 2: Affine удалён, заменён другим движком. `canonicalRef` не меняется — он в `registry.jsonl`. M2 storage address `location.ref = static:{class}:{sha256_64hex}` не меняется — это immutable M2 record. Grants не меняются — они в Panel. Binding ledger: старые записи для удалённого `engineKind` помечаются `deleted`; новые `created` записи для нового `engineKind` создаются с новыми `engineObjectId`. History сохраняется полностью. Источник истины: binding ledger (Panel). Вещдок: `canonicalRef` set до и после замены идентичны; старые binding records существуют со статусом `deleted`; новые `active`.

[Архитектор]: Case 3: `affineDocId` изменился при том же материале (например, reimport в тот же Affine). Binding получает новую запись: старый `engineObjectId` → `superseded`, новый `engineObjectId` → `active`, `seq` инкрементируется. M2 identity не мутирует: `canonicalRef` не меняется, `location.ref` не меняется — это не смена revision, это смена engine-side pointer. История в binding ledger полная. Вещдок: два последовательных события в ledger для того же `canonicalRef`: `(seq=n, status=superseded)` и `(seq=n+1, status=active)` с разными `engineObjectId`.

[Структурщик]: Case 6: binding отсутствует, неоднозначен или stale. Отсутствует: `discover`/`read-metadata`/`read-ref` может работать через Panel напрямую (эти данные не требуют engine binding), но операции, требующие engine object — `read-bytes` через Affine view, engine projection — deny до создания binding. Неоднозначен: `conflict_detected` → deny forward, conflict resolution требуется. Stale: `stale` статус → Proxy может разрешить read-only operations если Panel grant есть, но не forward write operations; reconciliation обязательна. Вещдок: binding ledger status для данного `canonicalRef` + `engineKind`.

[Математик]: Case 7: две импортированные страницы претендуют на один `canonicalRef`. Это `conflict_detected` в binding reducer: `|{b : b.canonicalRef=r ∧ b.engineKind=k ∧ b.status=active}| = 2`. Ожидаемое решение: deny для обоих, conflict resolution обязательна до продолжения. Panel (не Affine) определяет canonical `engineObjectId`. Источник истины: binding ledger. Вещдок: два `active` binding records с одним `canonicalRef` — это нарушение биекции, gate G-1 = false.

[Teamlead]: Case 8: попытка редактировать стратегический документ через Affine. Стратегический документ — вне контейнера `static.mmbrn.tech`, у него нет `canonicalRef` в `registry.jsonl`. Proxy получает запрос, проверяет binding — binding не существует, объект не известен. Ожидаемое решение: deny по unknown object. Нет вымышленного strategic class, нет M2 record. Вещдок: `registry.jsonl` не содержит записи с данным object id; Proxy audit log содержит `deny: unknown_object`.

[Верстальщик]: Case 9: перед заменой найдено несинхронизированное значимое annotation state. Ожидаемое решение: замена заблокирована. Gate G-4 (annotation sync): portable store annotation count = engine export annotation count = 0 diff. Если diff > 0 — readiness не достигнута. Unresolved diff не снимается waiver. Конкретно: export из текущего движка, сравнение с portable store по content hash каждой annotation. Вещдок: diff report с перечнем несинхронизированных `annotationId`.

[Музыкант]: Case 10: cache/session/layout state потеряно после замены. Если state был заранее классифицирован как disposable (navigation/layout, cache/session) — потеря допустима, это честная потеря. Если state был классифицирован как portable (annotations) — потеря является нарушением: gate G-4 должен был заблокировать замену. Вещдок: state class classification из M5 contract. Если cache/session → disposable: loss consequence = «нет», замена завершена корректно. Если annotations → portable: loss consequence = «критично», gate не был пройден.

[Архитектор]: Подведу итог по `requiredProjectionSet`. Форма: множество `{canonicalRef_1, ..., canonicalRef_n}` с version timestamp. Назначается Panel независимо от binding state. Семантика: Panel intent, не assertion о существующих bindings. Использование: reconciliation loop сравнивает set с `{b.canonicalRef : b.engineKind=current_engine ∧ b.status=active}`; gap → reconciliation action. Биекция gate G-1 проверяется в момент readiness assessment, не в рантайме. `requiredProjectionSet` не является полем M2, не является полем binding record — это отдельная Panel policy structure.

[Структурщик]: Зафиксирую durable ownership boundary для portable state. Binding ledger: owner — Panel, durable under Panel backup policy, restore tested. Portable annotation store: owner — Panel, durable under Panel backup policy, separate from FD-3 в смысле назначения, но совместимая с M4 topology (Panel управляет, не Affine). M5 не объявляет новый FD store — portable state живёт в существующей Panel-managed persistence с доказанными backup и restore. Gate G-3: Panel backup policy покрывает binding ledger и annotation store; restore drill завершён без потери.

[Математик]: Readiness gates полным списком. G-1: биекция `requiredProjectionSet` ↔ active bindings для `engineKind=current`. Predicate: `|R|=|E| ∧ injective(R→E) ∧ injective(E→R)`. Evidence: binding ledger snapshot + set snapshot. Fail: не объявлять «Affine replaceable». G-2: full inventory — все объекты в Affine `engineKind=current` присутствуют в binding ledger со статусом `active` или `deleted`; dangling objects = 0. Predicate: `{affine_objects} ⊆ {b.engineObjectId : b.engineKind=current}`. Evidence: Affine object list (от service identity) vs ledger. Fail: dangling objects exist. G-3: portable store backup/restore drill — последний restore test завершён, diff = 0. Predicate: `last_restore_diff = 0 ∧ last_restore_timestamp < threshold`. Evidence: restore drill report. Fail: drill не проводился или diff > 0.

[Teamlead]: Продолжу gates. G-4: annotation sync — portable store = engine export по content hash для всех `annotationId`. Predicate: `∀a∈portable_store: hash(a) = hash(engine_export[a.annotationId])`. Evidence: export + hash comparison report. Fail: diff > 0, замена блокирована. G-5: Panel independence — Panel health check не вызывает Affine endpoint. Predicate: `affine_available=false → Panel_health_check=green`. Evidence: network trace при Affine shutdown. Fail: Panel health зависит от Affine. G-6: native identity isolation — Affine principal list содержит только service identity, без пользовательских principals. Predicate: `Affine_principals = {service_identity_id}`. Evidence: Affine admin panel principal list. Fail: любой пользовательский principal в списке. G-7: Panel-deny → no-forward — при Panel deny не происходит обращения к Affine. Predicate: `Panel_deny(action,principal,ref) → ¬∃Affine_access_log_entry(action,ref)`. Evidence: paired audit logs. Fail: Affine log содержит запись при Panel deny.

[Верстальщик]: Добавлю G-8: rehydration drill — после реконструкции из M2/binding/portable state новый движок содержит биекцию и полный annotation set. Predicate: `G-1(new_engine) ∧ G-4(new_engine) ∧ annotation_count(new_engine) = annotation_count(portable_store)`. Evidence: post-rehydration state report. Fail: любое из условий не выполнено. Это финальный gate перед объявлением замены завершённой.

[Музыкант]: Хочу убедиться, что мы не забыли про annotation contract. Stable `annotationId` — не Affine internal id, это id из portable store. Версия — monotonic seq в portable store. Panel principal автора — зафиксирован в создании annotation, не мутирует. Canonical serialization: engine-neutral формат (JSON с content hash). Engine-neutral anchor: `{canonicalRef, revisionSeq, byteRange}` — без Affine page id. При rehydration: anchor транслируется в новый движок через `canonicalRef` + revision, не через Affine internal pointer. Это делает annotation portable по конструкции.

[Архитектор]: Итоговая конструкция держится. Одна модель: Panel-owned binding event ledger с key `(canonicalRef, engineKind, engineObjectId)`, unique `seq` в скоупе `(canonicalRef, engineKind)`, полный reducer с шестью transitions. `requiredProjectionSet` — Panel intent policy, независимо от ledger. Portable annotation store — Panel-managed, engine-neutral anchors. Affine — поверхность с восемью capability над тремя object types. Все источники истины остались в M2/M4/Panel. Affine replaceable при выполнении G-1 через G-8.

[Структурщик]: Проверю: нет ли в нашей модели скрытой зависимости, которая делает Affine не-заменяемым структурно? Canonical originals: нет зависимости от Affine. Registry/lifecycle: нет зависимости. Binding ledger: не зависит от Affine, Affine не пишет в него. Portable annotation store: не зависит от Affine. Authority: Panel не делегирует authority Affine. Единственное, что зависит от конкретного Affine instance: `engineObjectId` в active binding records. При замене движка: эти records становятся `superseded`/`deleted`, новые создаются. Структурная заменяемость подтверждена.

[Математик]: Формальное свойство отсутствия скрытой потери. Пусть S — значимое состояние (canonical originals + registry + grants + active binding history + portable annotations). Утверждение: `S(before_replacement) = S(after_replacement)` по content hash для каждого элемента. Disposable state D (engine projection, layout, cache, session) не входит в S. Потеря D — честная. Потеря любого элемента S — нарушение контракта. Это проверяется gates G-1, G-3, G-4, G-8 совместно.

[Teamlead]: Вердикт готов. Принимаю конструкцию: один binding event ledger, один `requiredProjectionSet` как Panel policy, восемь capability, шесть классов состояния, восемь readiness gates. Все источники истины сохранены. Affine replaceable при G-1 ∧ G-2 ∧ G-3 ∧ G-4 ∧ G-5 ∧ G-6 ∧ G-7 ∧ G-8. Перехожу к финальным таблицам.

---

## Итоговое решение консилиума

### Пропозиция F1

Один минимальный контракт Affine: необязательная заменяемая человеческая поверхность с восемью capability над тремя object types, Panel-owned binding event ledger с key `(canonicalRef, engineKind, engineObjectId)` и unique `seq`, `requiredProjectionSet` как независимый Panel intent, portable annotation store вне движка, восемь machine-checkable readiness gates.

---

### Таблица 1. Способности (Capability)

| Capability | M3 Action | Input Identity | Output | Allowed Engine Mutation | Forbidden Authority |
|---|---|---|---|---|---|
| navigate-container | `discover` | container id | список lineage в engine projection | чтение engine-side index | назначение canonicalRef, запись в registry |
| view-metadata | `read-metadata` | canonicalRef (lineage) | metadata поля без ref | нет | запись metadata, создание M2 record |
| view-ref | `read-ref` | canonicalRef (lineage) | location.ref (адрес) | нет | изменение ref, запись в registry |
| view-bytes | `read-bytes` | canonicalRef (lineage) | canonical bytes через Proxy из FD-1 | нет | хранение bytes, назначение storage key |
| download-canonical | `download` | canonicalRef (lineage) | canonical bytes как файл через Proxy | нет | определение формата хранения, retention |
| edit-lineage-metadata | `write-metadata` | canonicalRef (lineage) | обновлённые metadata lineage (не M2 record) | нет | создание M2 record, изменение canonicalRef |
| submit-revision | `upload-revision` | canonicalRef (lineage) | новая M2 revision создана Proxy+storage pipeline | подтверждение успеха от Proxy | назначение location.ref, запись в registry напрямую |
| manage-access | `manage-access` | canonicalRef (container/collection/lineage) | изменение access policy через Panel | нет | выдача native Affine credentials, изменение Panel grant source |

*Annotation write — disabled для всех capability. Новые actions/objects запрещены.*

---

### Таблица 2. Классы состояния

| State Class | Owner / Source of Truth | Canonical / Derived | Portable / Disposable | Export / Rebuild Rule | Loss Consequence |
|---|---|---|---|---|---|
| Canonical originals | FD-1 storage / M2 record | Canonical, immutable | Portable (в M4) | Не экспортируется из Affine; доступен по location.ref | Критично; недопустима |
| Registry / lifecycle | FD-3 (registry.jsonl) / Panel | Canonical, append-only | Portable (в FD-3) | Не экспортируется из Affine; читается Panel напрямую | Критично; недопустима |
| Engine projection | Affine / derived from M2+binding | Derived | Disposable | Перестраивается при rehydration из M2+binding | Допустима; честно disposable |
| Navigation / layout | Affine / derived | Derived | Disposable | Перестраивается заново в новом движке | Допустима; честно disposable |
| Annotations / comments | Portable store / Panel | Canonical в portable store | Portable | Обязателен экспорт до замены; gate G-4; rehydrate в новый движок | Критично при потере; gate блокирует замену |
| Cache / session | Affine / ephemeral | Derived | Disposable | Не экспортируется; не переносится | Допустима; честно disposable |

---

### Таблица 3. Binding Ledger

| Поле | Тип | Описание |
|---|---|---|
| `canonicalRef` | URN string | Идентификатор lineage из registry.jsonl; не мутирует |
| `engineKind` | string | Vendor-neutral тип движка (напр. `affine`) |
| `engineObjectId` | string | ID объекта внутри движка (напр. affineDocId); не становится canonicalRef |
| `seq` | uint, unique в scope (canonicalRef, engineKind) | Монотонный счётчик событий |
| `status` | enum: active / superseded / deleted / stale / stale_resolved / conflict_detected / conflict_superseded | Текущий статус записи |
| `timestamp` | ISO-8601 | Время события |
| `actor` | Panel principal id | Кто инициировал событие |

**Owner:** Panel. **Читает:** Panel, Proxy (для per-action check). **Пишет:** Panel (только). **Affine не читает и не пишет ledger напрямую.**

**Reconciliation rule:** Reducer применяет transitions по state machine (см. обсуждение Математика). Conflict: два active binding на один `(canonicalRef, engineKind)` → `conflict_detected`; разрешение Panel → один `active`, остальные `conflict_superseded`. Stale: engine object не отвечает при reconciliation → `stale`; reconcile → `stale_resolved` + новый `active`. История — immutable append, не удаляется.

---

### Таблица 4. Случаи

| Случай | Ожидаемое решение | Источник истины | Вещдок |
|---|---|---|---|
| 1. Affine недоступен, metadata/location.ref/bytes существуют | Контейнер, registry, bytes и authority работают; человеческий UI недоступен; cache не объявляется источником истины | registry.jsonl (FD-3), FD-1, Panel | Panel health check = green при affine_available=false; registry.jsonl читаем; FD-1 bytes доступны |
| 2. Affine удалён, заменён другим движком | canonicalRef, location.ref, grants не меняются; старые binding records → deleted; новые created для нового engineKind | registry.jsonl, binding ledger, Panel grants | canonicalRef set до и после идентичен; ledger содержит deleted records старого и created records нового engine |
| 3. affineDocId изменился при том же материале | Binding: старый engineObjectId → superseded, новый → active, seq++; M2 identity не мутирует | Binding ledger | Два последовательных события для canonicalRef: seq=n superseded, seq=n+1 active с разными engineObjectId; registry.jsonl без изменений |
| 4. Native Affine reader существует, Panel deny | Proxy получает deny от Panel; forward не происходит; Affine не вызывается | Panel (authority) | Panel audit log: deny(action, principal, canonicalRef); Affine access log: нет соответствующей записи |
| 5. Panel allow, native user role не умеет | Операция выполняется через service identity; пользователю Affine credential не выдаётся | Panel (authority), Affine (service identity) | Affine principal list = {service_identity_id}; операция в Affine log с service_identity_id, не с user id |
| 6. Binding отсутствует, неоднозначен или stale | Отсутствует: deny для engine-dependent ops; неоднозначен (conflict): deny, resolution required; stale: read-only при наличии Panel grant, write deny | Binding ledger | Binding ledger status для (canonicalRef, engineKind): null / conflict_detected / stale |
| 7. Две страницы претендуют на один canonicalRef | conflict_detected; deny для обоих до разрешения; Panel определяет canonical | Binding ledger | |{b : b.canonicalRef=r ∧ b.engineKind=k ∧ b.status=active}| = 2; G-1 = false |
| 8. Попытка редактировать стратегический документ через Affine | Deny: unknown/out-of-container object; нет M2 record, нет canonicalRef в registry | registry.jsonl, Panel | registry.jsonl не содержит object id; Proxy audit log: deny(unknown_object) |
| 9. Несинхронизированное annotation state найдено до замены | Замена заблокирована; G-4 = false; unresolved diff не снимается waiver | Portable annotation store | Diff report: portable_store_count ≠ engine_export_count или hash mismatch для ≥1 annotationId |
| 10. Cache/session/layout потеряно после замены | Если disposable — потеря допустима, контракт выполнен; если portable (annotations) — нарушение: G-4 должен был заблокировать | State class classification (M5 contract) | State class = disposable → loss consequence = none, замена корректна; state class = portable → gate G-4 не был пройден, нарушение контракта |

---

### Таблица 5. Readiness Gates

| Gate | Machine Predicate | Evidence | Fail Result |
|---|---|---|---|
| G-1: Биекция requiredProjectionSet ↔ active bindings | `\|R\|=\|E\| ∧ ∀r∈R: \|{e:binding(r)=e,status=active}\|=1 ∧ ∀e∈E: \|{r:binding(e)=r}\|=1` | Binding ledger snapshot + requiredProjectionSet snapshot | Не объявлять Affine replaceable |
| G-2: Full inventory, no dangling | `{affine_objects} ⊆ {b.engineObjectId : b.engineKind=current}` и dangling_count = 0 | Affine object list (via service identity) vs ledger | Dangling objects exist → не replaceable |
| G-3: Portable store backup/restore drill | `last_restore_diff = 0 ∧ last_restore_timestamp < threshold` | Restore drill report (binding ledger + annotation store) | Drill не проводился или diff > 0 → не replaceable |
| G-4: Annotation sync | `∀a∈portable_store: hash(engine_export[a.annotationId]) = hash(a)` | Export + hash comparison report per annotationId | Diff > 0 → замена заблокирована |
| G-5: Panel independence от Affine | `affine_available=false → Panel_health_check=green` | Network trace при Affine shutdown; Panel health endpoint | Panel health зависит от Affine → архитектурный дефект |
| G-6: Native identity isolation | `Affine_principals = {service_identity_id}` (никаких других) | Affine admin principal list | Любой пользовательский principal → critical violation |
| G-7: Panel-deny → no-forward | `Panel_deny(action,principal,ref) → ¬∃Affine_access_log_entry(action,ref,t≈t_deny)` | Paired Panel audit log + Affine access log | Affine entry при Panel deny → access control failure |
| G-8: Rehydration drill | `G-1(new_engine) ∧ G-4(new_engine) ∧ annotation_count(new_engine) = annotation_count(portable_store)` | Post-rehydration state report для нового движка | Любое условие не выполнено → замена не завершена |

---

## Список посылок

| # | Посылка | Тип |
|---|---|---|
| 1 | `static.mmbrn.tech` — контейнер канонических оригиналов; Affine — сменный движок под ним, не граница контейнера | норма (M1) |
| 2 | Страница Affine — состояние движка, не канонический материал | норма (M1) |
| 3 | `registry.jsonl` — единственный источник истины о регистрации, record/lineage identity и истории | норма (M2) |
| 4 | `canonicalRef = "urn:mmbrn:static:" + rootId` — URN, не URL, не storage key, не Affine id | норма (M2) |
| 5 | Смена `location.ref` создаёт новую immutable M2 record в той же lineage; M5 не переопределяет M2 identity | норма (M2) |
| 6 | Panel — единственный авторизатор; Proxy проверяет каждое действие до обращения к Affine | норма (M3) |
| 7 | Пользователь не получает native Affine role/token; статической таблицы Panel role → Affine role нет | норма (M3) |
| 8 | Native Affine role принадлежит только внутренней service identity; неизвестные action/object/identity/binding → deny | норма (M3) |
| 9 | M4 назначила FD-1 (bytes), FD-2 (backup), FD-3 (registry/lifecycle) и M2-адрес `location.kind=local, location.ref=static:{class}:{sha256_64hex}` | норма (M4) |
| 10 | Affine не входит в storage truth; не может быть источником bytes, retention или lifecycle | норма (M4) |
| 11 | M3 несущий вход: действия `discover`, `read-metadata`, `read-ref`, `read-bytes`, `download`, `write-metadata`, `upload-revision`, `manage-access`; объекты container/collection/lineage; annotation write disabled | норма (M3/F1) |
| 12 | M3 требует binding `canonicalRef ↔ affineDocId`, но не назначил его владельца, форму, историю и переносимость | факт (M3, открытый вопрос) |
| 13 | Живой Affine: 82 страницы в private Strategy/Templates/Releases, один участник, 57 PNG/SVG; корпуса оригиналов чеков/PDF нет | факт (измерение) |
| 14 | Strategic publish заморожен; редактор строится в Panel; передачи Panel identity/grants/revocation нет | факт (измерение) |
| 15 | M1–M4 не выбрали API, transport, ingest/download workflow, preview/OCR pipeline, DNS или миграционный rollout | норма (M1–M4) |
| 16 | `requiredProjectionSet` назначается Panel независимо (Panel intent, не active bindings) | норма (F1/повестка M5) |
| 17 | Binding key: `(canonicalRef, engineKind, engineObjectId)`; `seq` уникален в scope `(canonicalRef, engineKind)` | норма (F1/повестка M5) |
| 18 | Durable/no-loss state для binding и annotations; отдельные access gates | норма (F1/повестка M5) |
| 19 | M6/M7 не решаются в M5; один carrier | норма (F1/повестка M5) |
| 20 | `affineDocId` не становится `canonicalRef`, `location.ref` или полем M2 record | норма (повестка M5) |

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

---

*Реплик в диалоге: 36; каждый участник высказался не менее шести раз.*
