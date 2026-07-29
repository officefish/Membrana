<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-29T11:13:10.521Z |
| Команда | `yarn consilium` |
| Модель | xai/grok-4.5 |
| Файл | `docs/seanses/tariff-grid-m7-teeth-2026-07-29.md` |
| Порядок ролей | Музыкант → Teamlead → Математик → Структурщик → Верстальщик → Архитектор |
| Повестка | `docs/meeting/tariff-grid/M7_AGENDA.md` |

**Вопрос:**

Зубы сетки: что падает громко, где стоит каждый зуб, что означает срабатывание

---

# Консилиум: зубы тарифной сетки — что падает громко

**Повестка:** M7 — перечень машинных зубов тарифной сетки: что проверяется, где стоит каждый зуб, что означает срабатывание. Порядок врезки (M8) и содержание набора — вне комнаты.

**Участники:** Teamlead (Tarasov), Архитектор (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Музыкант → Teamlead → Математик → Структурщик → Верстальщик → Архитектор

---

[Музыкант]: На слух сетка без зубов — mono-take с фейковым зелёным: «всё ок», а сид `free-v1` уже расходится с решением владельца по объёму. Громкий отказ — это клиппинг-индикатор, не soft-компрессор. Семь кандидатов из брифа слышу сразу: полнота матрицы, рассинхрон проекции, запрос без права, квота, сценарий со старшим узлом, неизвестный entitlementId, клиент-как-истина. Не смешивать «метр на шине» (отчёт) с «гейт на входе» (рантайм-отказ).

[Teamlead]: Положение: M1–M6 ратифицированы, M8 не трогаем. Планка матча — закрытый перечень зубов с природой и местом стояния; без «улучшим потом». Молчаливый зелёный — BLOCK по бестиарию. Связка: Математик — предикаты срабатывания; Структурщик — homes и точки врезки; Архитектор — границы (схема / тест / pre-commit / runtime); Верстальщик — честная витрина отказа, не прятание; Музыкант — слух на silent degrade. Вердикт комнаты — таблица зубов, не философия.

[Математик]: Формализую без UI. Зуб Z = тройка `(predicate, locus, effect)`, где `predicate: Ctx → {pass, fail(reason)}`, `locus ∈ {schema, unit_test, precommit, runtime}`, `effect ∈ {reject_op, red_ci, report_finding}`. Инвариант: `fail ⇒ effect ≠ silent`. Кандидаты предикатов из входа M7: (1) completeness ∀SKU ∀id ∃ cell; (2) `wire.entitledTariffSkus ≡ P_catalog(G, sku)`; (3) resolve → not_entitled ⇒ deny; (4) occupied ≥ limit ⇒ hard deny; (5) scenario has senior-node ∧ enter_board ⇒ block load/clone; (6) entitlementId ∉ lexicon ⇒ fail; (7) client claims SoT ⇒ reject. Каждый — булев, без «почти».

[Структурщик]: Леммы, иначе синонимы. **Зуб** — именованный машинный предикат с home (файл/хук/схема) и закрытым effect. **Locus** — место стояния, не «слой ощущений». **SoT** — sole author сетки (M2); клиент — инсталлятор, не автор. Homes: матрица G на сервере; проекция `entitledTariffSkus` — derived; `resolveEntitlement` — pure вход рантайм-зубов. Не плодим второй фасад «validator-service» без нужды: зубы живут рядом с контрактом, который охраняют.

[Верстальщик]: С витрины оператора отказ обязан читаться без легенды. Soft на UI (M3): притемнение + жёлтое предупреждение, не `display:none`. Hard fail-closed на борде и сервере — отдельная честная полоса: «отказано: <reason-code>», не пустой экран. Фальшивый зелёный бейдж при fail зуба — декор и ложь. Не рисую layout: требую в контракте effect→сообщение: `reject_op` даёт reason, `red_ci` — имя зуба в логе, `report_finding` — строка в отчёте, не «—».

[Архитектор]: Конструкция: зубы — не отдельный пакет-продукт, а **ограждение контракта** M1–M6. Граница: schema/static ловит форму до рантайма; unit/precommit — инварианты матрицы и проекции; runtime — deny-by-default на write/load/resolve. Цена альтернативы «один супер-middleware» — смешение locus и немой SoT на клиенте. Рекомендация: закрытый enum `ToothId` + таблица locus/effect в каноне сетки; без UI-дашборда и без админки набора.

[Музыкант]: Сценарий со старшим узлом — это не «приглушить в каталоге». Гейт показа уже есть и **загрузку не режет** — мёртвый провод. Зуб обязан стоять на enter_board и на clone: два гейта, один predicate «есть узел старше тарифа». Иначе jam на борде со старшим материалом — клиппинг доверия. На слух effect = `reject_op`, не report_finding: находка в отчёте после загрузки — поздно.

[Teamlead]: Согласен: load/clone — hard. Не принимаю «сначала только CI». Первый шаг интеграции (не M8-порядок всего контура, а природа зуба) обязан включить runtime-зубы на праве, квоте и senior-node — иначе сдана тренировка. Полнота матрицы и unknown id — precommit + schema. Клиент-SoT — runtime reject + тест на отсутствие dual-write. Планка: каждый зуб из семёрки имеет locus и effect в таблице вердикта.

[Математик]: Уточняю completeness. Пусть `S` — множество SKU, `E` — закрытый lexicon entitlementId, `G: S × E → EntitlementValue`. Предикат: `complete(G) ⇔ ∀s∈S ∀e∈E defined(G(s,e))`. Fail → `red_ci` (и precommit, если матрица в репо). Не проверяем *значение* ячейки (вне контура) — только существование. Для unknown id: `e ∉ E ⇒ fail` на любом resolve/wire — fail-closed, effect `reject_op` в runtime и `red_ci` если id прошит в фикстуре.

[Структурщик]: Рассинхрон проекции — лемма M2: `entitledTariffSkus` не пишется руками. Зуб `projection_sync`: вычисляет `P_catalog(G, membrane.tariffSku)` и сравнивает с wire. Locus: unit_test обязателен; runtime — на read-path сборки envelope (сервер), не на клиенте «для удобства». Dual-write attempt (клиент патчит entitledTariffSkus) — отдельный зуб `client_not_sot`: reject_op. Имена зубов — словарные статьи, латиница snake: `matrix_complete`, `projection_sync`, `entitlement_denied`, `quota_exceeded`, `senior_node_blocked`, `unknown_entitlement_id`, `client_not_sot`.

[Верстальщик]: Для `entitlement_denied` и `quota_exceeded` витрина уже разведена M3/M4: soft dim + warning на кабинете; hard на борде. Reason-code из зуба должен доехать до UI как текст/код, не как глотание Promise. `senior_node_blocked`: при попытке загрузки — alert-warning с ручным закрытием (как capture-evict pattern), не молчаливый skip. Пустота клонов: список не показывает «успех» при нуле клонированных из-за зуба.

[Архитектор]: Где **не** ставим зубы: миграции пользователей (нет пользователей), содержание cell (вне контура), network-контейнер серверного маршрута (снят). Schema-зуб на `EntitlementValue` discriminated union — да: невалидная форма ячейки не доезжает до G. Precondition stub `stub_unwired` (M3) — не зуб сетки прав «есть/нет», а честный unmet; не путать с `entitlement_denied`. Граница: unmetPreconditions при entitled — витрина soft; not_entitled — зуб deny.

[Музыкант]: Квота: hot/cold — две ячейки (M4). На слух `quota_exceeded` срабатывает только на write-path с объявленным классом памяти. Запись без класса — не «квота», а дефект контракта: отдельный предикат `memory_class_required` или включаем в `quota_exceeded` как fail до счётчика? Предлагаю **отдельный под-зуб** `write_class_declared`: без класса — reject_op, reason `memory_class_missing`. Иначе метр квоты врёт, сравнивая apples-to-silence.

[Teamlead]: Принимаю `write_class_declared` как зуб #8 — это не расползание: M4 уже сказал «запись без класса — дефект». В семёрку брифа он входит как усиление квотного контура, не новый продуктовый эпик. Без него `quota_exceeded` можно обойти молчаливым write без occupied++. Effect: reject_op. Locus: runtime на каждом write-path + unit на реестр path→class.

[Математик]: Предикат квоты: для класса c, `deny_quota(c) ⇔ occupied(c) ≥ limit(G, sku, c)` (hard, M4). Auto-evict и silent degrade запрещены — если код-путь уменьшает occupied «чтобы влезло» без явного user-action, это fail отдельного инварианта `no_silent_evict` в тестах (report_finding / red_ci), не runtime-гейт пользователя. Produce (M5): зуб `produce_on_create` — create/expanding-mutate без produce entitlement ⇒ reject_op; «проверка существования против тарифа» отсутствует как API — test, что такого метода нет.

[Структурщик]: Homes по locus. **Schema:** типы/zod/json-schema матрицы и wire-конвертов — пакет контракта сетки (серверный home G, не client). **Unit_test:** completeness, projection_sync, lexicon id, no dual-write helpers. **Precommit:** прогон тех же инвариантов на манифесте G в репо (если G версионируется файлом) — хук или `yarn` gatelike, не pen-test руками. **Runtime:** resolve-обёртка deny-by-default; board load/clone gate; write-path quota+class; reject client SoT fields. Экспорт: `ToothId` + reason-code из одного модуля, UI и CI читают те же строки.

[Верстальщик]: Жёлтое предупреждение на soft (слово владельца 29.07) — не зуб, а **следствие** entitled∧unmet или «инструмент выше тарифа на витрине». Зубы hard не маскировать soft-паттерном. Таблица reason→copy может жить рядом с DESIGN позже; в M7 фиксируем: каждый reject_op несёт machine-readable `toothId` + `reason`. Иначе a11y-полite «что-то не так» — немой носитель.

[Архитектор]: Сводка конструкции effect:  
- `red_ci` / precommit fail — статика и инварианты репо (complete, lexicon fixtures, projection pure, no client SoT API).  
- `reject_op` — любые попытки действия против G (deny, quota, class, produce, senior, unknown id, client SoT patch).  
- `report_finding` — аудит/реконсиляция (обнаружен drift проекции в уже живущем envelope, сид vs норма объёма) когда операция ещё не идёт, а носитель расходится.  
Сид `free-v1` 1ГБ vs 512МБ — classic report_finding + red_ci на фикстуре до выравнивания; не runtime пользователя «угадай лимит».

[Музыкант]: Клиент-инсталлятор: плагины у пользователя, прятать нечего — ок. Но если клиент **объявляет** entitled или лимит локально и шлёт на сервер как факт — это фальшивый SoT, зуб `client_not_sot`. На слух сервер игнорирует клиентские claims прав и пересчитывает из G+sku мембраны. Иначе dual-write M2 воскреснет под другим именем.

[Teamlead]: Фиксирую дисциплину срабатывания: fail зуба всегда **называет** `toothId` (бестиарий: не «Заглушка», не «Немой носитель»). Красный CI без имени зуба в assertion message — BLOCK на приёмке. Runtime reject без code — BLOCK. Связка на реализацию после M7: Структурщик+Математик — предикаты и homes; Музыкант — board/audio write paths слухом на degrade; Верстальщик — reason на витрине; Архитектор — не размазать schema по apps/client.

[Математик]: Таблица предикатов коротко.  
1 `matrix_complete(G)`  
2 `projection_sync(wire,G,sku)`  
3 `entitled(resolve(e))` для защищённой op  
4 `occupied(c) < limit(c)`  
5 `¬hasSeniorBeyondTariff(scenario)` на load/clone  
6 `id ∈ E`  
7 `¬clientAssertsAuthority(payload)`  
8 `writeClassDeclared(path)`  
9 (тест) `¬exists(api_existence_check_against_tariff)`  
10 (тест) `¬silentEvict`  
Effect/locus — в итог. Порог: 1–2,9–10 — ci/precommit; 3–8 — runtime (+unit); 2 дополнительно report_finding при фоновой сверке.

[Структурщик]: `hasSeniorBeyondTariff` требует лексику «старшинства узла» относительно тарифа — не выдумываем админский дашборд; берём из матрицы instrument/gated уровней, уже M1. Зуб сравнивает max(nodeTier in scenario) с max(tier allowed by G,sku). Если tier-модель ещё не именована в коде — лемма: **tier_rank** в контракте сетки, иначе predicate негде стоять. Это не M8-врезка борда, а словарь зуба. Каталог-only filter — не home этого зуба (вещдок: показ ≠ load).

[Верстальщик]: Каталог притемняет — ок. Борд при senior: операция load/clone не начинается; UI показывает «сценарий не загружен: senior_node_blocked», сценарий не появляется как активный. Клонирование: zero clones + явная причина, не partial clone «что влезло» (partial = silent degrade).

[Архитектор]: Форма решения: вердикт M7 = **реестр зубов** (id, predicate-смысл, locus[], effect, опора на M1–M6). Вне: порядок включения в пайплайн продукта (M8), copy/UI-kit, серверный network-агент. G остаётся sole author; зубы — стражи, не вторая матрица. ADR не обязателен, если реестр попадает в канон tariff-grid рядом с M1.

[Музыкант]: Ещё раз про produce: create без produce — стоп. Retain при потере права (M5) — **не** срабатывание deny на read; зуб не эвиктит. Слышу риск: ошибочно повесить `entitlement_denied` на read существующего — будет ложный hard. Предикат deny только на create/expanding-mutate для produce; read/retain — pass.

[Teamlead]: Принимаю уточнение Музыканта — вписать в зуб `produce_guard` scope: create|expanding_mutate. Read/retain вне scope. Иначе проиграем матч M5. Дальше — сведение в таблицу; споры locus только если effect противоречит fail-closed.

[Математик]: `already_redeemed` (M6) — зуб смежного контура промокода, не сетки entitlements; в M7 **не** включаем, чтобы не колонизировать. `applyTransition` единственная запись tariffId — test-зуб `tariff_write_path_single`: любая запись tariffId вне applyTransition → red_ci. Это страж M6, короткий, в реестр как #11 optional-strict: да, связан с сеткой (смена sku пересчитывает права).

[Структурщик]: Согласен включить `tariff_mutation_path` (#11): locus unit_test (+ lint/archtest на импорты). Runtime: мембрана принимает смену только через applyTransition — если уже есть — reject_op на обходных setters. Снимок прав в мембране запрещён (M6): зуб `no_rights_snapshot_on_membrane` — schema/test, поля entitlements[] на membrane document отсутствуют.

[Верстальщик]: Для отчёта `report_finding`: витрина не обязана в M7; достаточно machine log. Не проектирую дашборд. Честность: если CI зелёный при fail completeness — сломан сам гейт, не «UX».

[Архитектор]: Финальная нарезка locus по умолчанию:  
- schema: form G, lexicon E, membrane without rights snapshot, wire envelope shape;  
- precommit+unit: matrix_complete, projection_sync, no_existence_api, no_silent_evict, tariff_mutation_path, fixtures seed vs norm;  
- runtime: entitlement_denied, quota_exceeded, write_class_declared, produce_guard, senior_node_blocked, unknown_entitlement_id, client_not_sot, projection_sync on envelope build.  
Дублирование unit+runtime на критичных — цена низкая, молчаливый drift — высокая.

[Музыкант]: Слуховой DoD: ни один write/load/clone/resolve-protected path не «проглатывает» fail; в логе есть toothId. Если путь только report_finding — он не на user-action critical path. Сид-рассинхрон — ci finding до выравнивания нормы и носителя.

[Teamlead]: Сводим. Все шесть — на реестр. Вердикт: **да, закрытый реестр зубов** с таблицей ниже. M8 не предрешаем. Принимаю / жду явных «Принимаю» по кругу после таблицы в уме: completeness и unknown — громкий ci; senior и quota и deny — runtime reject; client SoT — reject+test; class declared — runtime; produce scoped; snapshot/mutation — schema/test.

[Математик]: Принимаю. Предикаты счётные, effect закрыт, silent∉image(effect).

[Структурщик]: Принимаю. Имена и homes согласованы; слабая связанность: зубы не тянут UI и не тянут network-агента.

[Верстальщик]: Принимаю. Soft≠hide; hard reason виден; partial clone запрещён как паттерн.

[Архитектор]: Принимаю. Форма — реестр стражей контракта M1–M6, не новый продукт.

[Музыкант]: Принимаю. На слух fail-closed и no silent degrade держатся.

[Teamlead]: LGTM по комнате M7. Итог — в таблицу и DoD только M7.

---

## Список посылок

| # | Посылка | Тип |
|---|---------|-----|
| 1 | M1: матрица SKU × entitlementId → EntitlementValue; home сервер; deny-by-default; pure `resolveEntitlement`; полнота ∀SKU ∀id — ячейка | норма |
| 2 | M2: сетка — sole author; `entitledTariffSkus` — проекция; dual-write запрещён; инвариант `wire.entitledTariffSkus ≡ P_catalog(G, sku)` | норма |
| 3 | M3: entitled ∧ unmetPreconditions ≠ [] — не deny; витрина soft; борд и сервер hard fail-closed; stub_unwired честен | норма |
| 4 | M4: hot/cold quota; limit из матрицы, occupied — сервер; write-path обязан объявить класс памяти; hard deny; auto-evict и silent degrade запрещены | норма |
| 5 | M5: produce на create/expanding-mutate; «проверка существования против тарифа» запрещена; при потере права — retain | норма |
| 6 | M6: меняется только `Membrane.tariffId`; снимок прав в мембране запрещён; единственная запись — `applyTransition` + append-only лог | норма |
| 7 | Решение владельца 29.07: клиент-инсталлятор; UI притемняет с жёлтым предупреждением; сценарии со старшими узлами не загружаются в борд и не клонируются; сервер доп. сверяет матрицу | норма |
| 8 | Вещдок: гейт каталога фильтрует показ, загрузку не режет; у узлов палитры прав нет; сид `free-v1` расходится с нормой объёма (1 ГБ vs 512 МБ) | факт |
| 9 | Норма репозитория: зуб падает громко и называет находку; молчаливый зелёный — антипаттерн бестиария | норма |
| 10 | Граница M7: не M8 (порядок врезки); содержание ячеек набора вне контура; пользователей нет — миграционных зубов нет; серверный network-маршрут снят | норма |

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| Нужен ли закрытый реестр зубов сетки в M7? | **Да** — единственный вердикт комнаты: перечень с predicate / locus / effect |
| Что проверяют зубы? | Полнота матрицы; sync проекции; deny без права; квота; класс памяти на write; produce на create/expand; senior на load/clone; unknown id; client≠SoT; нет snapshot прав; единый path смены tariffId; нет existence-API и silent-evict (тесты) |
| Где стоят? | schema · unit_test · precommit · runtime (см. реестр) |
| Что означает срабатывание? | `reject_op` \| `red_ci` \| `report_finding` — всегда с `toothId`; silent запрещён |
| M8 / админ-набор / network-агент? | **Вне комнаты** — не решено здесь |

### Реестр зубов (вердикт)

| toothId | Что проверяет | Locus | Effect при fail |
|---------|---------------|-------|-----------------|
| `matrix_complete` | ∀SKU ∀entitlementId ∃ ячейка в G (не *какая* — что *есть*) | unit_test, precommit | `red_ci` |
| `projection_sync` | `wire.entitledTariffSkus ≡ P_catalog(G, membrane.tariffSku)` | unit_test; runtime при сборке envelope (сервер); опц. сверка | `red_ci` / `reject_op` (сборка) / `report_finding` (drift) |
| `entitlement_denied` | protected op при resolve = not_entitled | runtime (+ unit) | `reject_op` |
| `quota_exceeded` | occupied(c) ≥ limit(G,sku,c) на write класса c | runtime (+ unit) | `reject_op` |
| `write_class_declared` | write-path объявил memory class (hot\|cold) | runtime (+ unit path registry) | `reject_op` (`memory_class_missing`) |
| `produce_guard` | create \| expanding_mutate без produce-entitlement | runtime (+ unit) | `reject_op` |
| `senior_node_blocked` | scenario содержит узел выше тарифа — **load и clone** | runtime (борд), unit | `reject_op` (не partial) |
| `unknown_entitlement_id` | id ∉ lexicon E | schema/runtime resolve; unit фикстур | `reject_op` / `red_ci` (фикстура) |
| `client_not_sot` | клиент утверждает права/лимиты/проекцию как истину; dual-write | runtime ignore+reject claims; unit/archtest | `reject_op` + `red_ci` |
| `no_rights_snapshot_on_membrane` | в документе мембраны нет снимка entitlements | schema, unit | `red_ci` |
| `tariff_mutation_path` | запись tariffId только через `applyTransition` | unit, archtest; runtime на обходе | `red_ci` / `reject_op` |
| `no_existence_check_api` | запрет API «существует ли X против тарифа» (M5) | unit, archtest | `red_ci` |
| `no_silent_evict` | нет auto-evict / silent degrade ради квоты | unit, integration | `red_ci` |
| `seed_norm_align` | сид/фикстура (напр. free-v1) согласована с принятой нормой лимитов | unit, precommit | `red_ci` / `report_finding` |

**Уточнения scope (норма комнаты):**  
- `produce_guard` и `entitlement_denied` **не** бьют read/retain существующих сущностей (M5).  
- Soft UI (dim + жёлтый warning) — не зуб; hard reason всегда с `toothId`.  
- Каталожный filter показа **не** заменяет `senior_node_blocked`.  
- `stub_unwired` / unmetPreconditions при entitled — не `entitlement_denied`.

**Definition of Done (только M7):**

1. В каноне tariff-grid (документ заседания/ADR-фрагмент) зафиксирован реестр `toothId` × locus × effect без отсылки к порядку M8.  
2. Каждый toothId имеет однозначный machine-readable reason при fail.  
3. Явно перечислены non-goals M7: содержание ячеек, миграции пользователей, network-агент, UI-дашборд зубов, copy-kit.  
4. Вещдоки-дыры названы зубами-целями: load/clone senior; seed_norm_align; projection sole author — без требования реализовать код в этой комнате.  
5. Нет колонизации DoD соседних Id (M8+).

---

*Реплик в диалоге: 38; каждый участник высказался не менее одного раза.*
